#!/usr/bin/env python3
"""Génère des brouillons de questions depuis un extrait de texte réglementaire.

Appelle `claude -p` avec le gabarit `prompts/question.md`, dépose la sortie dans
`data/questions/_inbox/` au statut `brouillon`, puis valide ce qui est sorti.
Rien n'est publié ici : la relecture est une étape humaine.

    python3 scripts/generer.py --source data/sources/decret-77-733/regle-26.md \
        --theme feux-marques --n 5

Le script numérote les identifiants en évitant ceux déjà pris, refuse un
énoncé trop proche d'un énoncé existant, et jette ce qui ne valide pas.
"""
from __future__ import annotations

import argparse
import difflib
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from valider import CODES_THEMES, fichiers_questions, valider_question  # noqa: E402

RACINE = Path(__file__).resolve().parents[1]
INBOX = RACINE / "data" / "questions" / "_inbox"
GABARIT = RACINE / "prompts" / "question.md"
NOTIONS_TS = RACINE / "src" / "lib" / "notions.ts"

# `notions.ts` écrit ses libellés tantôt en apostrophes, tantôt en guillemets
# — un nom qui contient une apostrophe passe en guillemets. On lit donc ligne
# à ligne au lieu d'un motif multi-lignes qui trébucherait sur ce détail.
_RE_CHAMP = re.compile(r"^\s+(code|theme|nom): ('[^']*'|\"[^\"]*\"),\s*$")

# Au-dessus de ce seuil, deux énoncés disent la même chose.
SEUIL_DOUBLON = 0.82


def normaliser(texte: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", texte.lower()).strip()


def notions_du_theme(theme: str, source: Path = NOTIONS_TS) -> list[dict[str, str]]:
    """Les notions d'un thème, dans l'ordre du référentiel.

    Le TypeScript reste la source de vérité, comme pour `valider.py` : un
    référentiel de cent notions recopié dans un script finit toujours par
    diverger de celui que le site sert.
    """
    if not source.exists():
        return []
    trouvees: list[dict[str, str]] = []
    courante: dict[str, str] = {}
    for ligne in source.read_text(encoding="utf-8").splitlines():
        m = _RE_CHAMP.match(ligne)
        if not m:
            continue
        champ, valeur = m.group(1), m.group(2)[1:-1]
        if champ == "code":
            courante = {"code": valeur}
        elif courante:
            courante[champ] = valeur
            if champ == "nom":
                if courante.get("theme") == theme:
                    trouvees.append({"code": courante["code"], "nom": valeur})
                courante = {}
    return trouvees


def enonces_existants(theme: str) -> list[str]:
    enonces = []
    for fichier in fichiers_questions(RACINE, avec_inbox=True):
        try:
            q = yaml.safe_load(fichier.read_text(encoding="utf-8"))
        except yaml.YAMLError:
            continue
        if isinstance(q, dict) and q.get("theme") == theme and isinstance(q.get("enonce"), str):
            enonces.append(q["enonce"])
    return enonces


def identifiants_pris() -> set[str]:
    pris = set()
    for fichier in fichiers_questions(RACINE, avec_inbox=True):
        try:
            q = yaml.safe_load(fichier.read_text(encoding="utf-8"))
        except yaml.YAMLError:
            continue
        if isinstance(q, dict) and isinstance(q.get("id"), str):
            pris.add(q["id"])
    return pris


def prochain_identifiant(theme: str, pris: set[str]) -> str:
    n = 1
    while f"{theme}-{n:04d}" in pris:
        n += 1
    ident = f"{theme}-{n:04d}"
    pris.add(ident)
    return ident


def bloc_notions(theme: str, visee: str | None) -> str:
    """Ce que le modèle reçoit pour classer ses questions.

    La couverture se mesure par notion, pas par thème : une question sans
    notion ne compte nulle part, et c'est par notion qu'on sait où la banque
    est maigre. Quand on vise une notion, on la nomme seule — sinon le modèle
    dérive vers ce que la source contient de plus facile.
    """
    notions = notions_du_theme(theme)
    if visee:
        nom = next((n["nom"] for n in notions if n["code"] == visee), None)
        if nom is None:
            raise ValueError(f"notion {visee!r} inconnue dans le thème {theme!r}")
        return (
            f"NOTION : {visee} — {nom}\n"
            f"Chaque question porte « notion: {visee} ». Tout ce que la source dit "
            f"hors de cette notion est hors sujet ici : n'écris pas la question, "
            f"dis-le en note.\n"
        )
    liste = "\n".join(f"- {n['code']} — {n['nom']}" for n in notions) or "- (aucune)"
    return (
        "NOTIONS DU THEME, une par question, code exact :\n"
        f"{liste}\n"
        "Chaque question porte « notion: <code> ». Une question qui n'entre dans "
        "aucune de ces notions n'a pas sa place dans ce thème : dis-le en note.\n"
    )


def construire_invite(
    gabarit: str,
    source: str,
    reference: str,
    theme: str,
    n: int,
    deja: list[str],
    notion: str | None = None,
) -> str:
    liste = "\n".join(f"- {e}" for e in deja) or "- (aucune)"
    return (
        f"{gabarit}\n\n"
        f"---\n\n"
        f"THEME : {theme}\n"
        f"N : {n}\n"
        f"REF : {reference}\n"
        f"DATE : {date.today().isoformat()}\n\n"
        f"{bloc_notions(theme, notion)}\n"
        f"DEJA_ECRITES :\n{liste}\n\n"
        f"SOURCE :\n\n{source}\n"
    )


def appeler_claude(invite: str, modele: str | None) -> str:
    commande = ["claude", "-p"]
    if modele:
        commande += ["--model", modele]
    resultat = subprocess.run(
        commande, input=invite, capture_output=True, text=True, check=False,
    )
    if resultat.returncode != 0:
        raise RuntimeError(f"claude -p a échoué ({resultat.returncode}) : {resultat.stderr.strip()}")
    return resultat.stdout


def extraire_documents(sortie: str) -> list[dict]:
    # Le modèle emballe parfois sa réponse dans un bloc de code, malgré la consigne.
    nettoye = re.sub(r"^```[a-z]*\n|\n```$", "", sortie.strip(), flags=re.MULTILINE)
    documents = []
    for doc in yaml.safe_load_all(nettoye):
        if isinstance(doc, dict):
            documents.append(doc)
    return documents


class Bloc(str):
    """Une chaîne à écrire en bloc plié, plus lisible en relecture."""


def _bloc(vidangeur, valeur):
    return vidangeur.represent_scalar("tag:yaml.org,2002:str", str(valeur), style=">")


class Vidangeur(yaml.SafeDumper):
    """Indente les listes, comme le gabarit les montre."""

    def increase_indent(self, flow=False, indentless=False):
        return super().increase_indent(flow, False)


Vidangeur.add_representer(Bloc, _bloc)

CHAMPS_LONGS = ("enonce", "explication")


def rendre(doc: dict) -> str:
    """Sérialise une question : champs dans l'ordre du gabarit, textes en bloc."""
    propre: dict = {}
    for cle in ("id", "option", "theme", "notion", "famille", "statut", "difficulte",
                "enonce", "visuel", "propositions", "reponses", "explication",
                "sources", "meta"):
        if cle not in doc:
            continue
        valeur = doc[cle]
        if cle in CHAMPS_LONGS and isinstance(valeur, str):
            valeur = Bloc(" ".join(valeur.split()))
        propre[cle] = valeur
    return yaml.dump(
        propre, Dumper=Vidangeur, allow_unicode=True, sort_keys=False, width=84, default_flow_style=False,
    )


def nettoyer_textes(doc: dict) -> dict:
    """Enlève les espaces de bord partout, la sortie du modèle en traîne."""
    for cle in ("enonce", "explication"):
        if isinstance(doc.get(cle), str):
            doc[cle] = " ".join(doc[cle].split())
    for prop in doc.get("propositions", []) or []:
        if isinstance(prop, dict) and isinstance(prop.get("texte"), str):
            prop["texte"] = " ".join(prop["texte"].split())
    for source in doc.get("sources", []) or []:
        if isinstance(source, dict):
            for cle in ("texte", "ref"):
                if isinstance(source.get(cle), str):
                    source[cle] = source[cle].strip()
    return doc


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parseur.add_argument("--source", type=Path, required=True, help="extrait dans data/sources/<ref>/")
    parseur.add_argument("--theme", required=True, choices=CODES_THEMES)
    parseur.add_argument("--n", type=int, default=5)
    parseur.add_argument(
        "--notion",
        default=None,
        help="code de la notion visée ; sans elle, le modèle classe lui-même",
    )
    parseur.add_argument("--modele", default=None, help="passé à claude --model")
    parseur.add_argument("--sec", action="store_true", help="montre l'invite sans appeler claude")
    args = parseur.parse_args(argv)

    if not args.source.is_file():
        print(f"source introuvable : {args.source}", file=sys.stderr)
        return 1

    reference = args.source.parent.name
    try:
        invite = construire_invite(
            GABARIT.read_text(encoding="utf-8"),
            args.source.read_text(encoding="utf-8"),
            reference,
            args.theme,
            args.n,
            enonces_existants(args.theme),
            args.notion,
        )
    except ValueError as erreur:
        print(str(erreur), file=sys.stderr)
        return 1

    if args.sec:
        print(invite)
        return 0

    try:
        sortie = appeler_claude(invite, args.modele)
    except (RuntimeError, FileNotFoundError) as erreur:
        print(str(erreur), file=sys.stderr)
        return 1

    try:
        documents = extraire_documents(sortie)
    except yaml.YAMLError as erreur:
        print(f"sortie illisible : {erreur}", file=sys.stderr)
        (INBOX / "sortie-illisible.txt").write_text(sortie, encoding="utf-8")
        return 1

    INBOX.mkdir(parents=True, exist_ok=True)
    pris = identifiants_pris()
    deja = [normaliser(e) for e in enonces_existants(args.theme)]
    gardees = rejetees = 0

    for doc in documents:
        if "note" in doc and "enonce" not in doc:
            print(f"note du modèle : {str(doc['note']).strip()}")
            continue

        doc = nettoyer_textes(doc)
        doc["id"] = prochain_identifiant(args.theme, pris)
        doc["theme"] = args.theme
        doc["option"] = "cotier"
        if args.notion:
            doc["notion"] = args.notion
        doc["statut"] = "brouillon"
        doc.setdefault("meta", {})
        doc["meta"]["cree_le"] = date.today().isoformat()
        doc["meta"]["genere_par"] = "claude"
        doc["meta"].pop("relu_par", None)

        enonce = normaliser(str(doc.get("enonce", "")))
        proche = next((e for e in deja if difflib.SequenceMatcher(None, enonce, e).ratio() > SEUIL_DOUBLON), None)
        if proche:
            print(f"rejet, trop proche d'une question existante : {str(doc.get('enonce'))[:70]}…", file=sys.stderr)
            rejetees += 1
            continue

        problemes = valider_question(doc, INBOX / f"{doc['id']}.yaml", RACINE)
        # Un brouillon peut ne pas encore avoir son visuel sur le disque.
        problemes = [p for p in problemes if not p.code.startswith("visuel.fichier")]
        if problemes:
            for p in problemes:
                print(f"rejet [{p.code}] {p.message}", file=sys.stderr)
            rejetees += 1
            continue

        chemin = INBOX / f"{doc['id']}.yaml"
        chemin.write_text(rendre(doc), encoding="utf-8")
        deja.append(enonce)
        gardees += 1
        print(f"écrit {chemin.relative_to(RACINE)}")

    print(f"\n{gardees} brouillon(s) gardé(s), {rejetees} rejeté(s).")
    print(f"Relis-les, puis déplace-les dans data/questions/{args.theme}/ au statut « relu ».")
    return 0 if gardees else 1


if __name__ == "__main__":
    raise SystemExit(main())
