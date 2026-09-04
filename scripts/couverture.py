#!/usr/bin/env python3
"""Rapport de couverture de la banque, notion par notion.

Le compte par thème ne dit pas grand-chose : un thème à vingt questions peut
n'en avoir aucune sur la moitié de son programme. Ce rapport descend d'un
cran et compare, pour chaque notion, le nombre de questions publiées à la
cible du référentiel.

    python scripts/couverture.py             # tableau lisible
    python scripts/couverture.py --trous     # seulement les notions à zéro
    python scripts/couverture.py --json      # pour un autre outil
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

import yaml

RACINE = Path(__file__).resolve().parents[1]
NOTIONS_TS = RACINE / "src" / "lib" / "notions.ts"
THEMES_TS = RACINE / "src" / "lib" / "themes.ts"

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


def compter_publiees() -> tuple[Counter, Counter, int]:
    """Questions publiées par notion et par thème, plus les non classées."""
    par_notion: Counter = Counter()
    par_theme: Counter = Counter()
    sans_notion = 0
    for f in sorted((RACINE / "data" / "questions").glob("*/*.yaml")):
        if "_inbox" in f.parts:
            continue
        q = yaml.safe_load(f.read_text(encoding="utf-8"))
        if not isinstance(q, dict) or q.get("statut") != "publie":
            continue
        par_theme[q.get("theme")] += 1
        notion = q.get("notion")
        if notion:
            par_notion[notion] += 1
        else:
            sans_notion += 1
    return par_notion, par_theme, sans_notion


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__)
    parseur.add_argument("--trous", action="store_true", help="seulement les notions sans question")
    parseur.add_argument("--json", action="store_true", help="sortie machine")
    args = parseur.parse_args(argv)

    notions = lire_notions()
    cibles_themes = lire_cibles_themes()
    par_notion, par_theme, sans_notion = compter_publiees()

    if args.json:
        print(json.dumps(
            {
                "notions": [
                    {**n, "publiees": par_notion.get(n["code"], 0)} for n in notions
                ],
                "sans_notion": sans_notion,
            },
            ensure_ascii=False,
            indent=2,
        ))
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
