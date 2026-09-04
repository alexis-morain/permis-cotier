#!/usr/bin/env python3
"""Récupère les textes réglementaires qui servent de source aux questions.

Deux origines, deux traitements :

- Légifrance, via l'API PISTE (fonds LODA). Sert pour l'arrêté du 28 septembre
  2007 et tout texte consolidé. Licence Ouverte 2.0, redistribuable, cité.
  Le site legifrance.gouv.fr bloque les scripts : on passe par l'API, jamais
  par le site.
- Le RIPAM. Légifrance n'en publie qu'un fac-similé PDF. Le texte de travail
  est le PDF du ministère chargé de la mer ; la référence juridique reste le
  décret n° 77-733 du 6 juillet 1977.

    python3 scripts/sources.py chercher "division 240"
    python3 scripts/sources.py legifrance --texte arrete-2007-09-28 --ref arrete-2007-09-28
    python3 scripts/sources.py legifrance --texte JORFTEXT000000841523 --ref division-240 \\
        --section "division 240"
    python3 scripts/sources.py ripam --pdf data/sources/_brut/texte-colreg.pdf --regles 20-31

Un texte consolidé garde ses articles abrogés à côté de ceux qui les
remplacent, parfois sous le même numéro : l'extraction ne prend que la
vigueur, sauf `--tout`.

Sortie : `data/sources/<ref>/<article>.md`, un fichier par article ou par
règle, avec un en-tête qui porte la référence et la date de la version.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
SOURCES = RACINE / "data" / "sources"

# Une application PISTE vit dans un seul environnement. La nôtre est en
# production, ses clés ne passent pas en sandbox : on tape la production par
# défaut, --sandbox reste là pour une application de test.
ENVIRONNEMENTS = {
    "sandbox": (
        "https://sandbox-oauth.piste.gouv.fr/api/oauth/token",
        "https://sandbox-api.piste.gouv.fr/dila/legifrance/lf-engine-app",
    ),
    "prod": (
        "https://oauth.piste.gouv.fr/api/oauth/token",
        "https://api.piste.gouv.fr/dila/legifrance/lf-engine-app",
    ),
}

# Textes utiles, pour ne pas rechercher l'identifiant à chaque fois.
# L'API veut l'identifiant JORFTEXT du texte d'origine, pas le LEGITEXT :
# /consult/legiPart refuse ce dernier avec « L'expression à valider est fausse ».
TEXTES = {
    # Programme (art. 1er § 1.2), format de l'épreuve (§ 1.1), titre de conduite.
    "arrete-2007-09-28": "JORFTEXT000000428843",
    # Arrêté du 23 novembre 1987 sur la sécurité des navires. Le texte porte
    # toutes les divisions ; la 240 est celle de la plaisance, à extraire avec
    # --section « division 240 ». Les arrêtés qui la modifient ne portent que
    # la mention du changement : c'est bien le texte de 1987 qu'on consulte.
    "arrete-1987-11-23": "JORFTEXT000000841523",
}


def charger_env() -> dict[str, str]:
    """Lit le .env local sans dépendance. Les variables d'environnement gagnent."""
    valeurs: dict[str, str] = {}
    fichier = RACINE / ".env"
    if fichier.is_file():
        for ligne in fichier.read_text(encoding="utf-8").splitlines():
            ligne = ligne.strip()
            if not ligne or ligne.startswith("#") or "=" not in ligne:
                continue
            cle, _, valeur = ligne.partition("=")
            valeurs[cle.strip()] = valeur.strip().strip('"').strip("'")
    valeurs.update({k: v for k, v in os.environ.items() if k.startswith("LEGIFRANCE_")})
    return valeurs


def jeton(env: dict[str, str], oauth: str) -> str:
    identifiant = env.get("LEGIFRANCE_CLIENT_ID")
    secret = env.get("LEGIFRANCE_CLIENT_SECRET")
    if not identifiant or not secret:
        raise SystemExit(
            "Clés PISTE absentes.\n"
            "  1. Compte sur https://piste.gouv.fr/registration (gratuit)\n"
            "  2. Créer une application, l'abonner à « API Légifrance »\n"
            "  3. Copier le client_id et le client_secret de l'application\n"
            "  4. Les poser dans .env : LEGIFRANCE_CLIENT_ID, LEGIFRANCE_CLIENT_SECRET\n"
            "Référence : ~/Documents/08_IA/02_Outputs/permis-cotier/.env"
        )
    corps = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": identifiant,
        "client_secret": secret,
        "scope": "openid",
    }).encode()
    requete = urllib.request.Request(oauth, data=corps, headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(requete, timeout=30) as reponse:
        return json.load(reponse)["access_token"]


def appeler(chemin: str, charge: dict, acces: str, api: str) -> dict:
    requete = urllib.request.Request(
        f"{api}{chemin}",
        data=json.dumps(charge).encode(),
        headers={"Authorization": f"Bearer {acces}", "Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(requete, timeout=60) as reponse:
            return json.load(reponse)
    except urllib.error.HTTPError as erreur:
        detail = erreur.read().decode("utf-8", "replace")[:500]
        raise SystemExit(f"API Légifrance {erreur.code} sur {chemin} : {detail}")


ENTITES = {"&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&#339;": "œ", "&quot;": '"'}


def sans_entites(texte: str) -> str:
    for avant, apres in ENTITES.items():
        texte = texte.replace(avant, apres)
    return texte


class LecteurDeTableau(HTMLParser):
    """Ramène un <table> à ses lignes de cellules.

    Un `colspan` est reporté sur chaque colonne qu'il couvre : sans ça, la
    ligne est plus courte que l'en-tête et tout ce qui suit glisse d'une
    colonne. Dans la division 240, « Basique » couvre deux zones de
    navigation, et le décalage mettrait « Côtier » en face de la mauvaise
    distance d'un abri."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.lignes: list[list[str]] = []
        self._ligne: list[str] | None = None
        self._cellule: list[str] | None = None
        self._portee = 1

    def handle_starttag(self, balise, attributs):
        if balise == "tr":
            self._ligne = []
        elif balise in ("td", "th"):
            self._cellule = []
            valeur = dict(attributs).get("colspan") or "1"
            self._portee = int(valeur) if valeur.isdigit() and int(valeur) > 0 else 1
        elif balise in ("br", "p") and self._cellule is not None:
            # Une cellule tient sur une ligne : un saut devient une espace.
            self._cellule.append(" ")

    def handle_endtag(self, balise):
        if balise in ("td", "th") and self._cellule is not None:
            texte = " ".join("".join(self._cellule).split())
            if self._ligne is None:
                self._ligne = []
            self._ligne.extend([texte] * self._portee)
            self._cellule = None
            self._portee = 1
        elif balise == "tr" and self._ligne is not None:
            self.lignes.append(self._ligne)
            self._ligne = None

    def handle_data(self, donnees):
        if self._cellule is not None:
            self._cellule.append(donnees)


def rendre_tableau(html: str) -> str:
    lecteur = LecteurDeTableau()
    lecteur.feed(html)
    lecteur.close()
    lignes = [l for l in lecteur.lignes if l]
    if not lignes:
        return ""

    largeur = max(len(l) for l in lignes)
    rendues = ["| " + " | ".join(l + [""] * (largeur - len(l))) + " |" for l in lignes]
    separateur = "| " + " | ".join(["---"] * largeur) + " |"
    return "\n\n" + "\n".join([rendues[0], separateur, *rendues[1:]]) + "\n\n"


def etendues_de_tableaux(html: str) -> list[tuple[int, int]]:
    """Les bornes des <table> de premier niveau, imbrications comprises."""
    etendues: list[tuple[int, int]] = []
    profondeur = 0
    debut = 0
    for balise in re.finditer(r"</?table\b[^>]*>", html, flags=re.IGNORECASE):
        if not balise.group(0).startswith("</"):
            if profondeur == 0:
                debut = balise.start()
            profondeur += 1
        elif profondeur:
            profondeur -= 1
            if profondeur == 0:
                etendues.append((debut, balise.end()))
    return etendues


def tableaux_en_markdown(html: str) -> str:
    """Remplace chaque tableau par un tableau markdown, lisible en ligne.

    Sans ça, les balises sautent et les cellules se suivent en colonne :
    on ne sait plus quelle valeur va avec quelle ligne."""
    morceaux = []
    curseur = 0
    for debut, fin in etendues_de_tableaux(html):
        morceaux.append(html[curseur:debut])
        morceaux.append(rendre_tableau(html[debut:fin]))
        curseur = fin
    morceaux.append(html[curseur:])
    return "".join(morceaux)


def sans_balises(html: str) -> str:
    texte = tableaux_en_markdown(html or "")
    texte = re.sub(r"<br\s*/?>", "\n", texte)
    texte = re.sub(r"</p>", "\n\n", texte)
    texte = re.sub(r"<[^>]+>", "", texte)
    texte = sans_entites(texte)
    return re.sub(r"\n{3,}", "\n\n", texte).strip()


def ecrire(dossier: Path, nom: str, titre: str, reference: str, corps: str, url: str = "") -> Path:
    dossier.mkdir(parents=True, exist_ok=True)
    chemin = dossier / f"{nom}.md"
    entete = [
        f"# {titre}",
        "",
        f"- Référence : {reference}",
        f"- Version consultée le : {date.today().isoformat()}",
    ]
    if url:
        entete.append(f"- Source : {url}")
    entete += ["- Licence : Licence Ouverte 2.0 (Etalab)", "", "---", ""]
    chemin.write_text("\n".join(entete) + corps.strip() + "\n", encoding="utf-8")
    return chemin


def parcourir_articles(noeud: dict, recolte: list[dict]) -> None:
    for article in noeud.get("articles", []) or []:
        recolte.append(article)
    for section in noeud.get("sections", []) or []:
        parcourir_articles(section, recolte)


# Un article sorti de vigueur reste dans le texte consolidé, à côté de celui
# qui l'a remplacé, souvent sous le même numéro. Écrire une question sur du
# droit abrogé serait la pire faute possible : on ne garde que la vigueur.
ETATS_MORTS = {"ABROGE", "ABROGE_DIFF", "PERIME", "ANNULE", "MODIFIE_MORT_PERIME"}


def sans_accents(texte: str) -> str:
    decompose = unicodedata.normalize("NFD", texte)
    return "".join(c for c in decompose if unicodedata.category(c) != "Mn").lower()


def section_par_titre(noeud: dict, motif: str) -> dict | None:
    """La première section dont le titre contient `motif`, à n'importe quelle
    profondeur. Comparaison sans casse ni accents : les titres de Légifrance
    mélangent « Quatrième section » et « Section 4 »."""
    cherche = sans_accents(motif)
    for section in noeud.get("sections", []) or []:
        if cherche in sans_accents(section.get("title") or ""):
            return section
        trouve = section_par_titre(section, motif)
        if trouve is not None:
            return trouve
    return None


def articles_utiles(noeud: dict, en_vigueur_seulement: bool = True) -> list[dict]:
    """Les articles du sous-arbre, en vigueur, sans doublon et non vides.

    Légifrance garde les anciennes coquilles de section : le même article
    reparaît sous deux titres différents, avec le même identifiant. On
    dédoublonne dessus, et on garde l'ordre de l'arbre."""
    bruts: list[dict] = []
    parcourir_articles(noeud, bruts)

    vus: set[str] = set()
    gardes: list[dict] = []
    for article in bruts:
        if en_vigueur_seulement and (article.get("etat") or "").upper() in ETATS_MORTS:
            continue
        if not (article.get("content") or "").strip():
            continue
        identifiant = article.get("id") or ""
        if identifiant and identifiant in vus:
            continue
        if identifiant:
            vus.add(identifiant)
        gardes.append(article)
    return gardes


def nom_article(numero: str, identifiant: str = "") -> str:
    """Nom de fichier d'un article : « 240-1.01 » donne « article-240-1-01 »."""
    propre = re.sub(r"[^a-z0-9]+", "-", (numero or "").lower()).strip("-")
    return f"article-{propre}" if propre else (identifiant or "sans-numero")


def invite_recherche(mots: str, fond: str = "LODA_DATE", nombre: int = 10) -> dict:
    """Charge utile d'une recherche par titre. Sert à retrouver l'identifiant
    d'un texte sans passer par le site, qui bloque les scripts."""
    return {
        "recherche": {
            "champs": [
                {
                    "typeChamp": "TITLE",
                    "criteres": [
                        {
                            "typeRecherche": "TOUS_LES_MOTS_DANS_UN_CHAMP",
                            "valeur": mots,
                            "operateur": "ET",
                        }
                    ],
                    "operateur": "ET",
                }
            ],
            "filtres": [],
            "pageNumber": 1,
            "pageSize": nombre,
            "sort": "PERTINENCE",
            "typePagination": "DEFAUT",
        },
        "fond": fond,
    }


def commande_chercher(args) -> int:
    """Retrouve l'identifiant d'un texte à partir de mots de son titre."""
    oauth, api = ENVIRONNEMENTS["sandbox" if args.sandbox else "prod"]
    acces = jeton(charger_env(), oauth)
    reponse = appeler("/search", invite_recherche(args.mots, nombre=args.nombre), acces, api)

    resultats = reponse.get("results") or []
    if not resultats:
        print("aucun texte pour ces mots", file=sys.stderr)
        return 1

    print(f"{reponse.get('totalResultNumber', len(resultats))} résultat(s), les {len(resultats)} premiers :\n")
    for resultat in resultats:
        for titre in (resultat.get("titles") or [])[:1]:
            # L'API surligne les mots trouvés : illisible en console.
            libelle = re.sub(r"</?mark>", "", titre.get("title") or "")
            print(f"  {titre.get('cid')}  {libelle}")
    print("\nPasse le CID à « sources.py legifrance --texte <CID> ».")
    return 0


def commande_legifrance(args) -> int:
    oauth, api = ENVIRONNEMENTS["sandbox" if args.sandbox else "prod"]
    texte = TEXTES.get(args.texte, args.texte)
    acces = jeton(charger_env(), oauth)
    # lawDecree rend la version consolidée à la date demandée, articles et
    # sections compris. legiPart ne prend pas les identifiants JORFTEXT.
    donnees = appeler("/consult/lawDecree", {"textId": texte, "date": date.today().isoformat()}, acces, api)
    titre = donnees.get("title") or texte

    racine_arbre: dict | None = donnees
    if args.section:
        racine_arbre = section_par_titre(donnees, args.section)
        if racine_arbre is None:
            print(f"aucune section dont le titre contient « {args.section} »", file=sys.stderr)
            return 1
        titre = (racine_arbre.get("title") or titre).strip()
        print(f"section retenue : {titre}")

    articles = articles_utiles(racine_arbre, en_vigueur_seulement=not args.tout)
    if not articles:
        print("aucun article en vigueur ; vérifie l'identifiant du texte", file=sys.stderr)
        return 1

    dossier = SOURCES / args.ref
    ecrits = 0
    for article in articles:
        numero = (article.get("num") or "").strip()
        corps = sans_balises(article.get("content", ""))
        chemin = ecrire(
            dossier, nom_article(numero, article.get("id", "")),
            f"{titre}, article {numero}".strip(", "), args.ref, corps,
            f"https://www.legifrance.gouv.fr/loda/article_lc/{article.get('id', '')}",
        )
        print(f"écrit {chemin.relative_to(RACINE)}")
        ecrits += 1

    print(f"\n{ecrits} article(s) dans data/sources/{args.ref}/")
    return 0


def texte_du_pdf(pdf: Path) -> str:
    """Extrait le texte du PDF. Utilise pdftotext s'il est là, sinon pypdf."""
    import shutil
    import subprocess

    if shutil.which("pdftotext"):
        resultat = subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True)
        if resultat.returncode == 0:
            return resultat.stdout
    try:
        from pypdf import PdfReader
    except ImportError:
        raise SystemExit(
            "Ni pdftotext ni pypdf. Installe l'un des deux :\n"
            "  brew install poppler\n"
            "  uv pip install pypdf"
        )
    return "\n".join(page.extract_text() or "" for page in PdfReader(str(pdf)).pages)


# Le PDF répète le nom de la partie et de l'annexe sur chaque page, en onglet
# latéral. pdftotext les rend au milieu du texte : on les enlève, ils polluent
# l'extrait sans rien apporter.
# `[^\S\n]` plutôt que `[ \t]` : pdftotext préfixe les débuts de page d'un saut
# de page (\f), et l'onglet latéral se retrouve juste derrière.
MOBILIER = re.compile(
    r"^[^\S\n]*("
    r"PARTIE[^\S\n]+[A-F].*"          # onglet latéral de partie
    r"|ANNEXE[^\S\n]+[IVX]+.*"        # onglet latéral d'annexe
    r"|.*CORLEG 72.*"                  # pied de page « n° Règle N - Titre | CORLEG 72 »
    r"|\d{1,3}"                        # numéro de page seul
    r")[^\S\n]*$",
    flags=re.MULTILINE,
)


def nettoyer(texte: str) -> str:
    sans_saut_de_page = texte.replace("\f", "\n")
    sans_mobilier = MOBILIER.sub("", sans_saut_de_page)
    return re.sub(r"\n{3,}", "\n\n", sans_mobilier).strip()


def commande_ripam(args) -> int:
    if not args.pdf.is_file():
        raise SystemExit(
            f"PDF introuvable : {args.pdf}\n"
            "Récupère-le sur https://www.mer.gouv.fr/sites/default/files/2020-11/texte-colreg.pdf\n"
            f"et dépose-le dans {args.pdf.parent}/"
        )

    texte = texte_du_pdf(args.pdf)
    debut, fin = (int(x) for x in args.regles.split("-"))

    # Un en-tête de règle a toujours la forme « Règle N - Titre ». Exiger le
    # tiret et le titre écarte les renvois du type « règle 30, les feux… » que
    # le retour à la ligne du PDF met en début de ligne. Le PDF du ministère
    # écrit une fois « Régle28 », sans espace ni accent grave : le motif tolère
    # les deux accents et l'absence d'espace. Le sommaire du PDF
    # a la même forme, en finissant par des points de conduite et un numéro de
    # page : on l'écarte, sinon on prend la table des matières pour le texte.
    def dans_le_sommaire(depart: int) -> bool:
        # Une entrée de sommaire porte des points de conduite vers son numéro de
        # page. Quand le titre est long il passe à la ligne, et la ligne d'en-tête
        # n'a plus de points : on regarde donc la fenêtre qui suit, pas la ligne.
        return bool(re.search(r"\.{5,}", texte[depart : depart + 300]))

    coupes = [
        c
        for c in re.finditer(r"^[ \t]*R[èéÈÉ]gle\s*(\d+)\s*[-–—]\s*\S.*$", texte, flags=re.MULTILINE)
        if not dans_le_sommaire(c.start())
    ]
    if not coupes:
        raise SystemExit("aucune règle repérée dans le PDF ; vérifie l'extraction du texte")

    # Une règle peut apparaître plusieurs fois (rappel en annexe). On garde
    # l'extrait le plus long, qui est le corps de la règle.
    meilleurs: dict[int, str] = {}
    for i, coupe in enumerate(coupes):
        numero = int(coupe.group(1))
        if not debut <= numero <= fin:
            continue
        borne = coupes[i + 1].start() if i + 1 < len(coupes) else len(texte)
        corps = nettoyer(texte[coupe.start():borne])
        if len(corps) > len(meilleurs.get(numero, "")):
            meilleurs[numero] = corps

    dossier = SOURCES / args.ref
    ecrits = 0
    for numero, corps in sorted(meilleurs.items()):
        chemin = ecrire(
            dossier, f"regle-{numero:02d}", f"RIPAM, règle {numero}", args.ref, corps,
            "https://www.mer.gouv.fr/sites/default/files/2020-11/texte-colreg.pdf",
        )
        print(f"écrit {chemin.relative_to(RACINE)} ({len(corps)} caractères)")
        ecrits += 1

    if not ecrits:
        print(f"aucune règle entre {debut} et {fin} trouvée", file=sys.stderr)
        return 1
    print(f"\n{ecrits} règle(s) dans data/sources/{args.ref}/")
    return 0


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sous = parseur.add_subparsers(dest="commande", required=True)

    lf = sous.add_parser("legifrance", help="extrait un texte consolidé via l'API PISTE")
    lf.add_argument(
        "--texte", required=True,
        help="identifiant LEGITEXT, ou une clé de TEXTES comme « arrete-2007-09-28 »",
    )
    lf.add_argument("--ref", required=True, help="clé du dossier dans data/sources/")
    lf.add_argument(
        "--section", default=None,
        help="ne garde que la section dont le titre contient ces mots, par exemple « division 240 »",
    )
    lf.add_argument(
        "--tout", action="store_true",
        help="garde aussi les articles abrogés (par défaut, la vigueur seule)",
    )
    lf.add_argument("--sandbox", action="store_true", help="tape la sandbox plutôt que la production")
    lf.set_defaults(fonction=commande_legifrance)

    ch = sous.add_parser("chercher", help="retrouve l'identifiant d'un texte par son titre")
    ch.add_argument("mots", help="mots du titre, par exemple « division 240 »")
    ch.add_argument("--nombre", type=int, default=10)
    ch.add_argument("--sandbox", action="store_true")
    ch.set_defaults(fonction=commande_chercher)

    ri = sous.add_parser("ripam", help="découpe le PDF du RIPAM en règles")
    ri.add_argument("--pdf", type=Path, default=SOURCES / "_brut" / "texte-colreg.pdf")
    ri.add_argument("--ref", default="decret-77-733")
    ri.add_argument("--regles", default="1-38", help="intervalle, par exemple 20-31")
    ri.set_defaults(fonction=commande_ripam)

    args = parseur.parse_args(argv)
    return args.fonction(args)


if __name__ == "__main__":
    raise SystemExit(main())
