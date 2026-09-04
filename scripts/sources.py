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

    python3 scripts/sources.py legifrance --texte LEGITEXT000006057206 --ref arrete-2007-09-28
    python3 scripts/sources.py ripam --pdf data/sources/_brut/texte-colreg.pdf --regles 20-31

Sortie : `data/sources/<ref>/<article>.md`, un fichier par article ou par
règle, avec un en-tête qui porte la référence et la date de la version.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
SOURCES = RACINE / "data" / "sources"

OAUTH = "https://oauth.piste.gouv.fr/api/oauth/token"
API = "https://api.piste.gouv.fr/dila/legifrance/lf-engine-app"


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


def jeton(env: dict[str, str]) -> str:
    identifiant = env.get("LEGIFRANCE_CLIENT_ID")
    secret = env.get("LEGIFRANCE_CLIENT_SECRET")
    if not identifiant or not secret:
        raise SystemExit(
            "Clés PISTE absentes. Inscris-toi sur https://piste.gouv.fr, abonne-toi à l'API\n"
            "Légifrance, puis renseigne LEGIFRANCE_CLIENT_ID et LEGIFRANCE_CLIENT_SECRET\n"
            "dans .env (référence : ~/Documents/08_IA/02_Outputs/permis-cotier/.env)."
        )
    corps = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": identifiant,
        "client_secret": secret,
        "scope": "openid",
    }).encode()
    requete = urllib.request.Request(OAUTH, data=corps, headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(requete, timeout=30) as reponse:
        return json.load(reponse)["access_token"]


def appeler(chemin: str, charge: dict, acces: str) -> dict:
    requete = urllib.request.Request(
        f"{API}{chemin}",
        data=json.dumps(charge).encode(),
        headers={"Authorization": f"Bearer {acces}", "Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(requete, timeout=60) as reponse:
            return json.load(reponse)
    except urllib.error.HTTPError as erreur:
        detail = erreur.read().decode("utf-8", "replace")[:500]
        raise SystemExit(f"API Légifrance {erreur.code} sur {chemin} : {detail}")


def sans_balises(html: str) -> str:
    texte = re.sub(r"<br\s*/?>", "\n", html or "")
    texte = re.sub(r"</p>", "\n\n", texte)
    texte = re.sub(r"<[^>]+>", "", texte)
    remplacements = {"&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&#339;": "œ", "&quot;": '"'}
    for avant, apres in remplacements.items():
        texte = texte.replace(avant, apres)
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


def commande_legifrance(args) -> int:
    acces = jeton(charger_env())
    donnees = appeler("/consult/legiPart", {"textId": args.texte, "date": date.today().isoformat()}, acces)
    titre = donnees.get("title") or args.texte

    articles: list[dict] = []
    parcourir_articles(donnees, articles)
    if not articles:
        print("aucun article renvoyé ; vérifie l'identifiant du texte", file=sys.stderr)
        return 1

    dossier = SOURCES / args.ref
    ecrits = 0
    for article in articles:
        numero = (article.get("num") or "").strip()
        corps = sans_balises(article.get("content", ""))
        if not corps:
            continue
        nom = "article-" + re.sub(r"[^a-z0-9]+", "-", numero.lower()).strip("-") if numero else article.get("id", "sans-numero")
        chemin = ecrire(
            dossier, nom, f"{titre}, article {numero}".strip(", "), args.ref, corps,
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
    lf.add_argument("--texte", required=True, help="identifiant LEGITEXT du texte")
    lf.add_argument("--ref", required=True, help="clé du dossier dans data/sources/")
    lf.set_defaults(fonction=commande_legifrance)

    ri = sous.add_parser("ripam", help="découpe le PDF du RIPAM en règles")
    ri.add_argument("--pdf", type=Path, default=SOURCES / "_brut" / "texte-colreg.pdf")
    ri.add_argument("--ref", default="decret-77-733")
    ri.add_argument("--regles", default="1-38", help="intervalle, par exemple 20-31")
    ri.set_defaults(fonction=commande_ripam)

    args = parseur.parse_args(argv)
    return args.fonction(args)


if __name__ == "__main__":
    raise SystemExit(main())
