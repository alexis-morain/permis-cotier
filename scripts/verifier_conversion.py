#!/usr/bin/env python3
"""Garde-fou des conversions du nombre de propositions.

Retirer un distracteur renumérote les propositions qui suivent, et la réponse
doit suivre. L'oubli produit une question qui reste valide au sens du schéma
mais qui désigne la mauvaise proposition : le validateur ne peut pas le voir,
seul un rapprochement avec la version d'avant le voit.

Ce script compare la banque de travail à une référence git et refuse toute
conversion qui ferait autre chose que retirer des propositions. Il connaît
trois autres gestes légitimes : la relecture en bloc, qui ne touche que `meta` ;
le resourcement, qui remplace la citation affichée sans toucher à la question
et rend la relecture à Claude ; le rééquilibrage, qui réécrit le texte des
propositions à lettres, nombre et réponse constants, pour que la bonne réponse
ne se reconnaisse plus à sa longueur (`longueur.py`), et rend lui aussi la
relecture à Claude. Un geste à la fois : convertir et resourcer dans le même
diff cache les deux vérifications l'une derrière l'autre.

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

# Ce qu'une conversion ne touche jamais. `sources` n'y figure pas : rendre à
# une question sa source officielle est un geste légitime, traité plus bas
# comme un resourcement, à la seule condition qu'il rende la relecture.
INTOUCHABLES = ("id", "option", "theme", "notion", "statut", "difficulte", "enonce",
                "explication", "visuel")


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

    converti = len(textes_apres) != len(textes_avant)
    relu_par = (apres.get("meta") or {}).get("relu_par")

    # Un rééquilibrage réécrit des textes, et seulement cela : mêmes lettres,
    # même nombre, même réponse. Il ne se mêle pas d'une conversion, où la
    # réponse ne peut être suivie que par son texte.
    inconnus = set(textes_apres.values()) - set(textes_avant.values())
    reequilibree = bool(inconnus) and not converti and list(textes_apres) == list(textes_avant)
    if inconnus and not reequilibree:
        problemes.append(f"texte de proposition absent de la version d'avant : {sorted(inconnus)[0]!r}")

    attendus = list(LETTRES[: len(textes_apres)])
    if list(textes_apres) != attendus:
        problemes.append(f"identifiants attendus {attendus}, reçus {list(textes_apres)}")

    if reequilibree:
        problemes.extend(_verifier_reequilibrage(avant, apres, textes_avant, textes_apres, relu_par))
    else:
        reponses_avant = sorted(textes_avant.get(r, r) for r in avant.get("reponses", []))
        reponses_apres = sorted(textes_apres.get(r, r) for r in apres.get("reponses", []))
        if reponses_avant != reponses_apres:
            problemes.append(
                f"la bonne réponse ne désigne plus le même texte : {reponses_avant} devient {reponses_apres}"
            )
    if converti and relu_par != "claude":
        problemes.append(
            f"question convertie mais meta.relu_par vaut {relu_par!r} : la relecture porte sur une forme qui n'existe plus"
        )

    # Un resourcement remplace la citation affichée sans toucher à la question.
    # Ce n'est pas une conversion, mais la relecture humaine portait sur une
    # citation que le candidat ne verra plus : elle retombe sur Claude.
    resource = avant.get("sources") != apres.get("sources")
    if converti and resource:
        problemes.append(
            "deux gestes dans le même diff : la question est convertie et resourcée à la fois, "
            "chacun demande sa vérification, ils se relisent séparément"
        )
    if reequilibree and resource:
        problemes.append(
            "deux gestes dans le même diff : la question est rééquilibrée et resourcée à la fois, "
            "chacun demande sa vérification, ils se relisent séparément"
        )
    if resource and relu_par != "claude":
        problemes.append(
            f"source changée mais meta.relu_par vaut {relu_par!r} : la relecture porte sur une citation qui n'est plus la même"
        )
    # Une relecture en bloc ne touche que `meta` : `relu_par` reprend le nom
    # d'une personne, rien d'autre ne bouge. Ce n'est pas une conversion et le
    # garde-fou n'a rien à en dire. Ce qu'il refuse, c'est un nom de relecteur
    # posé sur une question retouchée dans le même geste : la relecture
    # porterait alors sur une forme que personne n'a lue.
    substance = lambda q: {c: v for c, v in q.items() if c not in ("meta", "sources")}
    retouchee = substance(avant) != substance(apres)
    if (not converti and not resource and not reequilibree and retouchee
            and relu_par != (avant.get("meta") or {}).get("relu_par")):
        problemes.append("meta.relu_par a changé sur une question retouchée")

    return problemes


def _verifier_reequilibrage(avant: dict, apres: dict, textes_avant: dict[str, str],
                            textes_apres: dict[str, str], relu_par: str | None) -> list[str]:
    """Ce qu'un rééquilibrage n'a pas le droit de faire.

    La réponse garde sa lettre. Un texte peut changer, mais la bonne réponse ne
    peut pas prendre le texte d'un ancien distracteur ni un distracteur celui de
    l'ancienne bonne réponse : ce serait une permutation, pas une réécriture, et
    la réponse désignerait alors autre chose. Et la relecture humaine portait
    sur des mots que le candidat ne verra plus : elle retombe sur Claude.
    """
    problemes: list[str] = []
    reponses_avant = list(avant.get("reponses", []))
    reponses_apres = list(apres.get("reponses", []))
    if reponses_avant != reponses_apres:
        problemes.append(
            f"question rééquilibrée mais la bonne réponse change de lettre : {reponses_avant} devient {reponses_apres}"
        )
    bonnes_avant = {textes_avant[r] for r in reponses_avant if r in textes_avant}
    distracteurs_avant = set(textes_avant.values()) - bonnes_avant
    for lettre, texte in textes_apres.items():
        if lettre in reponses_apres and texte in distracteurs_avant:
            problemes.append(f"la bonne réponse {lettre} reprend le texte d'un ancien distracteur : {texte!r}")
        if lettre not in reponses_apres and texte in bonnes_avant:
            problemes.append(f"le distracteur {lettre} reprend le texte de l'ancienne bonne réponse : {texte!r}")
    if relu_par != "claude":
        problemes.append(
            f"question rééquilibrée mais meta.relu_par vaut {relu_par!r} : la relecture porte sur des propositions qui n'existent plus"
        )
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
    print(f"{total} question(s) modifiée(s), toutes conformes : rien d'ajouté, un seul geste par question, "
          f"la bonne réponse désigne le même texte ou garde sa lettre")
    return 0


if __name__ == "__main__":
    sys.exit(main())
