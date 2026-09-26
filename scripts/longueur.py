#!/usr/bin/env python3
"""Signale les questions dont la bonne réponse se repère à sa longueur.

Une bonne réponse nettement plus longue que les distracteurs se reconnaît
sans lire l'énoncé — un biais classique de QCM mal écrit. Ce script compare,
pour chaque question publiée, la longueur de la (ou des) bonne(s) réponse(s)
au distracteur le plus long, et signale un écart de 60 % ou plus.

    python3 scripts/longueur.py         # rapport lisible, groupé par thème
    python3 scripts/longueur.py --json  # sortie machine

Un signal n'est pas une faute : le code de sortie reste 0 dans tous les cas,
et il n'y a pas de mode `--verifier`. Une bonne réponse plus longue est parfois
justifiée par le RIPAM lui-même ; c'est au relecteur de trancher, pas au script.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from couverture import lire_questions_publiees  # noqa: E402

RACINE = Path(__file__).resolve().parents[1]

SEUIL = 1.6


def mesurer(question: dict) -> tuple[int, int, float] | None:
    """(longueur de la meilleure bonne réponse, du meilleur distracteur, ratio).

    `None` quand la question n'a pas de quoi comparer les deux côtés — pas de
    proposition reconnue comme bonne réponse, ou aucun distracteur.
    """
    propositions = {
        p["id"]: p.get("texte", "").strip()
        for p in question.get("propositions") or []
        if isinstance(p, dict) and isinstance(p.get("id"), str)
    }
    reponses = question.get("reponses") or []

    longueurs_bonnes = [len(propositions[r]) for r in reponses if r in propositions]
    longueurs_distracteurs = [len(t) for pid, t in propositions.items() if pid not in reponses]

    if not longueurs_bonnes or not longueurs_distracteurs:
        return None

    longueur_bonne = max(longueurs_bonnes)
    longueur_distracteur = max(longueurs_distracteurs)
    ratio = longueur_bonne / longueur_distracteur if longueur_distracteur else float("inf")
    return longueur_bonne, longueur_distracteur, ratio


def signalee(mesure: tuple[int, int, float] | None) -> bool:
    if mesure is None:
        return False
    longueur_bonne, longueur_distracteur, _ = mesure
    return longueur_bonne >= SEUIL * longueur_distracteur


def signalements(questions: list[dict]) -> dict[str, list[tuple[str, int, int, float]]]:
    """Les questions signalées, groupées par thème et triées par identifiant."""
    par_theme: dict[str, list[tuple[str, int, int, float]]] = {}
    for q in questions:
        mesure = mesurer(q)
        if not signalee(mesure):
            continue
        bonne, distracteur, ratio = mesure  # type: ignore[misc]
        par_theme.setdefault(q.get("theme", "?"), []).append((q.get("id", "?"), bonne, distracteur, ratio))
    for lignes in par_theme.values():
        lignes.sort(key=lambda l: l[0])
    return par_theme


def afficher(par_theme: dict[str, list[tuple[str, int, int, float]]]) -> None:
    total = 0
    for theme in sorted(par_theme):
        lignes = par_theme[theme]
        print(f"\n\033[1m{theme}\033[0m")
        for ident, bonne, distracteur, ratio in lignes:
            print(f"  {ident:<28} bonne={bonne:<4} distracteur={distracteur:<4} ratio={ratio:.2f}")
        print(f"  total {theme} : {len(lignes)}")
        total += len(lignes)
    print(f"\n\033[1mTotal\033[0m  {total} question(s) signalée(s)")


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__)
    parseur.add_argument("--json", action="store_true", help="sortie machine")
    args = parseur.parse_args(argv)

    questions = lire_questions_publiees(RACINE)
    par_theme = signalements(questions)

    if args.json:
        print(json.dumps(
            {
                theme: [
                    {"id": ident, "bonne": bonne, "distracteur": distracteur, "ratio": round(ratio, 2)}
                    for ident, bonne, distracteur, ratio in lignes
                ]
                for theme, lignes in sorted(par_theme.items())
            },
            ensure_ascii=False,
            indent=2,
        ))
        return 0

    afficher(par_theme)
    return 0


if __name__ == "__main__":
    sys.exit(main())
