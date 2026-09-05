#!/usr/bin/env python3
"""Rapport de couverture de la banque : notion par notion, et format des questions.

Le compte par thème ne dit pas grand-chose : un thème à vingt questions peut
n'en avoir aucune sur la moitié de son programme. Ce rapport descend d'un
cran et compare, pour chaque notion, le nombre de questions publiées à la
cible du référentiel.

Second volet, `--propositions` : le nombre de propositions par question, thème
par thème, avec l'écart à la cible. Une banque uniformément à quatre
propositions n'entraîne pas sur le format que le candidat rencontrera, et
l'écart ne se devine pas, il se mesure.

    python scripts/couverture.py                  # tableau lisible
    python scripts/couverture.py --trous          # seulement les notions à zéro
    python scripts/couverture.py --propositions   # répartition et écart à la cible
    python scripts/couverture.py --json           # pour un autre outil
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Iterable

import yaml

RACINE = Path(__file__).resolve().parents[1]
NOTIONS_TS = RACINE / "src" / "lib" / "notions.ts"
THEMES_TS = RACINE / "src" / "lib" / "themes.ts"

# Répartition visée du nombre de propositions par question. L'arrêté du
# 28 septembre 2007 ne dit rien du nombre : il ne parle que de « questionnaire à
# choix multiple ». 268 questions relevées chez deux éditeurs qui se réclament
# du format donnent trois pour mode, 21 % de questions à deux propositions, et
# jamais cinq. `src/lib/schema.ts` borne en conséquence de 2 à 4.
CIBLE_PROPOSITIONS: dict[int, float] = {2: 0.20, 3: 0.55, 4: 0.25}


def lire_notions() -> list[dict]:
    """Extrait le référentiel du TypeScript, qui en reste la source de vérité."""
    texte = NOTIONS_TS.read_text(encoding="utf-8")
    notions = []
    for bloc in re.findall(r"  \{\n(.*?)\n  \},", texte, re.S):
        champs = {}
        for cle in ("code", "theme", "nom", "ancrage"):
            # prettier bascule en guillemets doubles dès que le texte contient
            # une apostrophe : on accepte les deux formes.
            m = re.search(
                rf"{cle}:\s*\n?\s*(?:'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\")",
                bloc,
            )
            if m:
                champs[cle] = (m.group(1) or m.group(2) or "").replace("\\'", "'")
        for cle in ("ordre", "cible"):
            m = re.search(rf"{cle}: (\d+)", bloc)
            if m:
                champs[cle] = int(m.group(1))
        if {"code", "theme", "ordre", "cible"} <= champs.keys():
            notions.append(champs)
    return notions


def lire_cibles_themes() -> dict[str, int]:
    texte = THEMES_TS.read_text(encoding="utf-8")
    cibles = {}
    for bloc in re.findall(r"  \{\n(.*?)\n  \},", texte, re.S):
        code = re.search(r"code: '([a-z0-9-]+)'", bloc)
        cible = re.search(r"cibleJ1: (\d+)", bloc)
        if code and cible:
            cibles[code.group(1)] = int(cible.group(1))
    return cibles


def lire_questions_publiees(racine: Path = RACINE) -> list[dict]:
    """Les questions publiées de `data/questions/`, brouillons de `_inbox` exclus."""
    questions = []
    for f in sorted((racine / "data" / "questions").glob("*/*.yaml")):
        if "_inbox" in f.parts:
            continue
        q = yaml.safe_load(f.read_text(encoding="utf-8"))
        if isinstance(q, dict) and q.get("statut") == "publie":
            questions.append(q)
    return questions


def compter_publiees(questions: Iterable[dict]) -> tuple[Counter, Counter, int]:
    """Questions publiées par notion et par thème, plus les non classées."""
    par_notion: Counter = Counter()
    par_theme: Counter = Counter()
    sans_notion = 0
    for q in questions:
        par_theme[q.get("theme")] += 1
        notion = q.get("notion")
        if notion:
            par_notion[notion] += 1
        else:
            sans_notion += 1
    return par_notion, par_theme, sans_notion


def repartition_propositions(questions: Iterable[dict]) -> dict[str, Counter]:
    """Nombre de propositions par question, thème par thème."""
    par_theme: dict[str, Counter] = {}
    for q in questions:
        propositions = q.get("propositions") or []
        par_theme.setdefault(q.get("theme"), Counter())[len(propositions)] += 1
    return par_theme


def cibles_propositions(total: int, parts: dict[int, float] = CIBLE_PROPOSITIONS) -> dict[int, int]:
    """La cible en nombre de questions, au plus fort reste.

    Les parts tombent rarement juste : 20 % de 191 fait 38,2. On arrondit vers
    le bas puis on distribue les places restantes aux plus gros restes, pour que
    la somme des cibles fasse exactement le total. Sinon un thème se voit
    reprocher un écart qui n'est qu'une erreur d'arrondi.
    """
    exact = {n: total * part for n, part in parts.items()}
    cibles = {n: int(v) for n, v in exact.items()}
    reste = total - sum(cibles.values())
    ordre = sorted(exact, key=lambda n: (-(exact[n] - cibles[n]), n))
    for n in ordre[:reste]:
        cibles[n] += 1
    return cibles


def ecarts_propositions(compte: Counter) -> dict[int, tuple[int, int, int]]:
    """Pour chaque format : questions observées, cible, écart.

    Un format absent de la cible, cinq propositions par exemple, apparaît avec
    une cible à zéro : tout ce qui s'y trouve est en surplus.
    """
    total = sum(compte.values())
    cibles = cibles_propositions(total)
    formats = sorted(set(cibles) | set(compte))
    return {n: (compte.get(n, 0), cibles.get(n, 0), compte.get(n, 0) - cibles.get(n, 0)) for n in formats}


def a_convertir(compte: Counter) -> int:
    """Combien de questions changer de format pour atteindre la cible.

    La somme des surplus : chaque question convertie quitte un format
    excédentaire pour un format déficitaire, elle compte une fois.
    """
    return sum(e for _, _, e in ecarts_propositions(compte).values() if e > 0)


def afficher_propositions(par_theme: dict[str, Counter]) -> None:
    total = sum(par_theme.values(), Counter())
    formats = sorted(set(CIBLE_PROPOSITIONS) | set(total))
    parts = "  ".join(f"{n} → {CIBLE_PROPOSITIONS.get(n, 0):.0%}" for n in formats)
    print(f"\n\033[1mPropositions par question\033[0m   cible {parts}\n")

    entetes = "".join(f"{f'{n} props':>16}" for n in formats)
    print(f"  {'thème':<22}{'n':>5}{entetes}{'à convertir':>14}")

    def ligne(nom: str, compte: Counter, gras: bool = False) -> None:
        cellules = ""
        for n, (obs, _, ecart) in ecarts_propositions(compte).items():
            signe = "+" if ecart > 0 else ""
            cellules += f"{obs:>9} {f'({signe}{ecart})':>6}"
        etiquette = f"\033[1m{nom}\033[0m" if gras else nom
        rembourrage = " " * max(0, 22 - len(nom))
        print(f"  {etiquette}{rembourrage}{sum(compte.values()):>5}{cellules}{a_convertir(compte):>14}")

    for theme in sorted(par_theme):
        ligne(theme, par_theme[theme])
    ligne("total", total, gras=True)


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__)
    parseur.add_argument("--trous", action="store_true", help="seulement les notions sans question")
    parseur.add_argument(
        "--propositions",
        action="store_true",
        help="répartition du nombre de propositions et écart à la cible",
    )
    parseur.add_argument("--json", action="store_true", help="sortie machine")
    args = parseur.parse_args(argv)

    notions = lire_notions()
    cibles_themes = lire_cibles_themes()
    questions = lire_questions_publiees()
    par_notion, par_theme, sans_notion = compter_publiees(questions)
    formats = repartition_propositions(questions)

    if args.json:
        print(json.dumps(
            {
                "notions": [
                    {**n, "publiees": par_notion.get(n["code"], 0)} for n in notions
                ],
                "sans_notion": sans_notion,
                "propositions": {
                    theme: {
                        str(n): {"publiees": obs, "cible": cible, "ecart": ecart}
                        for n, (obs, cible, ecart) in ecarts_propositions(compte).items()
                    }
                    for theme, compte in sorted(formats.items())
                },
            },
            ensure_ascii=False,
            indent=2,
        ))
        return 0

    if args.propositions:
        afficher_propositions(formats)
        return 0

    themes = []
    for n in notions:
        if n["theme"] not in themes:
            themes.append(n["theme"])

    total_pub = total_cible = 0
    trous = []
    for theme in themes:
        du_theme = sorted((n for n in notions if n["theme"] == theme), key=lambda n: n["ordre"])
        pub_theme = sum(par_notion.get(n["code"], 0) for n in du_theme)
        cible_notions = sum(n["cible"] for n in du_theme)
        cible_j1 = cibles_themes.get(theme, 0)
        total_pub += pub_theme
        total_cible += cible_notions

        ecart = ""
        if cible_notions != cible_j1:
            signe = "+" if cible_notions > cible_j1 else ""
            ecart = f"   ⚠ cible du thème {cible_j1}, somme des notions {cible_notions} ({signe}{cible_notions - cible_j1})"
        if not args.trous:
            print(f"\n\033[1m{theme}\033[0m  {pub_theme}/{cible_notions}{ecart}")

        for n in du_theme:
            p = par_notion.get(n["code"], 0)
            if p == 0:
                trous.append(n)
            if args.trous:
                continue
            marque = "·" if p >= n["cible"] else ("○" if p else "✗")
            print(f"  {marque} {n['code']:<36} {p}/{n['cible']}   {n.get('nom','')}")

    if args.trous:
        print(f"\n\033[1m{len(trous)} notion(s) sans aucune question\033[0m\n")
        courant = None
        for n in trous:
            if n["theme"] != courant:
                courant = n["theme"]
                print(f"\n  {courant}")
            print(f"    {n['code']:<36} cible {n['cible']}   {n.get('nom','')}")

    print(f"\n\033[1mTotal\033[0m  {total_pub} publiées, cible {total_cible}, "
          f"{len(trous)} notion(s) à zéro sur {len(notions)}")
    if sans_notion:
        print(f"\033[33m{sans_notion} question(s) publiée(s) sans notion\033[0m")
    return 0


if __name__ == "__main__":
    sys.exit(main())
