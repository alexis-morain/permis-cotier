#!/usr/bin/env python3
"""Produit data/CREDITS.md depuis les visuels et les questions qui les citent.

Un visuel repris de l'extérieur porte un fichier voisin `<nom>.credit.json` :

    {"auteur": "Alkab", "licence": "CC BY-SA 3.0",
     "url": "https://commons.wikimedia.org/wiki/File:...",
     "titre": "Marque cardinale Nord"}

Le script vérifie que chaque visuel crédité `commons:` a bien sa fiche, et que
chaque fiche correspond à un fichier présent. En CI, `--verifier` échoue au
lieu d'écrire.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from valider import fichiers_questions  # noqa: E402

RACINE = Path(__file__).resolve().parents[1]
VISUELS = RACINE / "public" / "visuels"
CREDITS = RACINE / "data" / "CREDITS.md"
DEBUT, FIN = "<!-- debut-genere -->", "<!-- fin-genere -->"


def visuels_utilises() -> dict[str, str]:
    """Chemin du visuel -> crédit déclaré dans la question."""
    utilises: dict[str, str] = {}
    for fichier in fichiers_questions(RACINE):
        try:
            q = yaml.safe_load(fichier.read_text(encoding="utf-8"))
        except yaml.YAMLError:
            continue
        visuel = q.get("visuel") if isinstance(q, dict) else None
        if isinstance(visuel, dict) and isinstance(visuel.get("fichier"), str):
            utilises[visuel["fichier"]] = str(visuel.get("credit", ""))
    return utilises


def lignes_et_problemes() -> tuple[list[str], list[str]]:
    lignes: list[str] = []
    problemes: list[str] = []

    for chemin, credit in sorted(visuels_utilises().items()):
        sur_disque = VISUELS / chemin
        if not sur_disque.is_file():
            problemes.append(f"{chemin} : cité par une question mais absent de public/visuels/")
            continue
        if not credit.startswith("commons:"):
            continue
        fiche = sur_disque.with_suffix(sur_disque.suffix + ".credit.json")
        if not fiche.is_file():
            problemes.append(f"{chemin} : crédit « {credit} » sans fiche {fiche.name}")
            continue
        try:
            donnees = json.loads(fiche.read_text(encoding="utf-8"))
        except json.JSONDecodeError as erreur:
            problemes.append(f"{fiche.name} : JSON illisible ({erreur})")
            continue
        manquants = [c for c in ("auteur", "licence", "url") if not donnees.get(c)]
        if manquants:
            problemes.append(f"{fiche.name} : champs manquants {', '.join(manquants)}")
            continue
        titre = donnees.get("titre") or chemin
        lignes.append(
            f"- `{chemin}` — {titre}, par {donnees['auteur']}, "
            f"{donnees['licence']}, <{donnees['url']}>"
        )

    return lignes, problemes


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__)
    parseur.add_argument("--verifier", action="store_true", help="échoue si CREDITS.md n'est pas à jour")
    args = parseur.parse_args(argv)

    lignes, problemes = lignes_et_problemes()
    for p in problemes:
        print(p, file=sys.stderr)

    corps = "\n".join(lignes) if lignes else "Aucun visuel externe pour l'instant."
    actuel = CREDITS.read_text(encoding="utf-8")
    avant, _, reste = actuel.partition(DEBUT)
    _, _, apres = reste.partition(FIN)
    nouveau = f"{avant}{DEBUT}\n{corps}\n{FIN}{apres}"

    if args.verifier:
        if problemes:
            return 1
        if nouveau != actuel:
            print("data/CREDITS.md n'est pas à jour, lance `npm run credits`", file=sys.stderr)
            return 1
        print(f"crédits à jour, {len(lignes)} visuel(s) externe(s).")
        return 0

    CREDITS.write_text(nouveau, encoding="utf-8")
    print(f"data/CREDITS.md écrit, {len(lignes)} visuel(s) externe(s).")
    return 1 if problemes else 0


if __name__ == "__main__":
    raise SystemExit(main())
