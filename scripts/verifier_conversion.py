#!/usr/bin/env python3
"""Garde-fou des conversions du nombre de propositions.

Retirer un distracteur renumérote les propositions qui suivent, et la réponse
doit suivre. L'oubli produit une question qui reste valide au sens du schéma
mais qui désigne la mauvaise proposition : le validateur ne peut pas le voir,
seul un rapprochement avec la version d'avant le voit.

Ce script compare la banque de travail à une référence git et refuse toute
conversion qui ferait autre chose que retirer des propositions.

    python3 scripts/verifier_conversion.py            # contre HEAD
    python3 scripts/verifier_conversion.py --ref main

Code de sortie 0 si tout passe, 1 sinon.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

import yaml

RACINE = Path(__file__).resolve().parents[1]
LETTRES = "abcd"

# Ce qu'une conversion ne touche jamais.
INTOUCHABLES = ("id", "option", "theme", "notion", "statut", "difficulte", "enonce",
                "explication", "sources", "visuel")


def _textes(question: dict) -> dict[str, str]:
    return {p["id"]: p["texte"] for p in question.get("propositions", [])}


def verifier(avant: dict, apres: dict) -> list[str]:
    """Les reproches à faire à `apres` au vu de `avant`. Liste vide si tout va bien."""
    problemes: list[str] = []

    for champ in INTOUCHABLES:
        if avant.get(champ) != apres.get(champ):
            problemes.append(f"le champ {champ} a changé, une conversion ne retire que des propositions")

    textes_avant, textes_apres = _textes(avant), _textes(apres)
    if len(textes_apres) > len(textes_avant):
        problemes.append("des propositions ont été ajoutées")

    inconnus = set(textes_apres.values()) - set(textes_avant.values())
    if inconnus:
        problemes.append(f"texte de proposition absent de la version d'avant : {sorted(inconnus)[0]!r}")

    attendus = list(LETTRES[: len(textes_apres)])
    if list(textes_apres) != attendus:
        problemes.append(f"identifiants attendus {attendus}, reçus {list(textes_apres)}")

    reponses_avant = sorted(textes_avant.get(r, r) for r in avant.get("reponses", []))
    reponses_apres = sorted(textes_apres.get(r, r) for r in apres.get("reponses", []))
    if reponses_avant != reponses_apres:
        problemes.append(
            f"la bonne réponse ne désigne plus le même texte : {reponses_avant} devient {reponses_apres}"
        )

    converti = len(textes_apres) != len(textes_avant)
    relu_par = (apres.get("meta") or {}).get("relu_par")
    if converti and relu_par != "claude":
        problemes.append(
            f"question convertie mais meta.relu_par vaut {relu_par!r} : la relecture porte sur une forme qui n'existe plus"
        )
    if not converti and relu_par != (avant.get("meta") or {}).get("relu_par"):
        problemes.append("meta.relu_par a changé sans conversion")

    return problemes


def _version_git(ref: str, chemin: Path) -> dict | None:
    relatif = chemin.relative_to(RACINE).as_posix()
    sortie = subprocess.run(
        ["git", "show", f"{ref}:{relatif}"], cwd=RACINE, capture_output=True, text=True
    )
    if sortie.returncode != 0:
        return None
    return yaml.safe_load(sortie.stdout)


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__)
    parseur.add_argument("--ref", default="HEAD", help="référence git de comparaison")
    args = parseur.parse_args(argv)

    total = fautives = 0
    for chemin in sorted((RACINE / "data" / "questions").glob("*/*.yaml")):
        avant = _version_git(args.ref, chemin)
        if avant is None:
            continue
        apres = yaml.safe_load(chemin.read_text(encoding="utf-8"))
        if avant == apres:
            continue
        total += 1
        problemes = verifier(avant, apres)
        if problemes:
            fautives += 1
            print(f"\033[31m{chemin.relative_to(RACINE)}\033[0m")
            for p in problemes:
                print(f"    {p}")

    if fautives:
        print(f"\n\033[31m{fautives} question(s) fautive(s)\033[0m sur {total} modifiée(s)")
        return 1
    print(f"{total} question(s) modifiée(s), toutes conformes : rien d'ajouté, rien de reformulé, "
          f"la bonne réponse désigne le même texte")
    return 0


if __name__ == "__main__":
    sys.exit(main())
