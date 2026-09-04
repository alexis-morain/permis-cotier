#!/usr/bin/env python3
"""Dessine en SVG les feux superposés visibles sur tout l'horizon.

    python3 scripts/feux.py            # écrit public/visuels/feux/
    python3 scripts/feux.py --verifier # échoue si un fichier n'est plus à jour

Le candidat doit reconnaître un navire à ses seuls feux : c'est le format même
de l'épreuve. Ces piles se comptent et se disposent, alors elles sont dessinées
par du code plutôt que générées : la couleur et l'ordre viennent de la règle,
et le dessin ne peut pas s'en écarter. Le crédit est `code`.

Aucun libellé dans l'image, elle donnerait la réponse.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
SORTIE = RACINE / "public" / "visuels" / "feux"

# Teintes de feu, pas de nuancier : un feu de nuit est saturé et un peu délavé
# en son centre. Les noms de couleur ne paraissent jamais dans le SVG.
COULEURS = {
    "blanc": "#fdf3dc",
    "rouge": "#f04438",
    "vert": "#2ec26b",
    "jaune": "#f2c23e",
}

LARGEUR = 200
RAYON = 13
ECART = 52
MARGE = 40
CIEL = "#080f18"
MAT = "#1d2a38"
EAU = "#0d1926"

# Les piles prescrites, une par règle. Deux entrées ne peuvent pas porter la
# même pile : ce serait la marque d'une règle mal lue.
SCENES: dict[str, dict] = {
    "chalut": {
        "regle": "RIPAM, règle 26 b) i)",
        "feux": ["vert", "blanc"],
        "alt": "Deux feux superposés visibles sur tout l'horizon, le supérieur vert, l'inférieur blanc.",
    },
    "peche-hors-chalut": {
        "regle": "RIPAM, règle 26 c) i)",
        "feux": ["rouge", "blanc"],
        "alt": "Deux feux superposés visibles sur tout l'horizon, le supérieur rouge, l'inférieur blanc.",
    },
    "non-maitre-de-sa-manoeuvre": {
        "regle": "RIPAM, règle 27 a) i)",
        "feux": ["rouge", "rouge"],
        "alt": "Deux feux rouges superposés visibles sur tout l'horizon.",
    },
    "capacite-de-manoeuvre-restreinte": {
        "regle": "RIPAM, règle 27 b) i)",
        "feux": ["rouge", "blanc", "rouge"],
        "alt": "Trois feux superposés visibles sur tout l'horizon, rouge, blanc puis rouge.",
    },
    "handicape-par-son-tirant-d-eau": {
        "regle": "RIPAM, règle 28",
        "feux": ["rouge", "rouge", "rouge"],
        "alt": "Trois feux rouges superposés visibles sur tout l'horizon.",
    },
    "bateau-pilote": {
        "regle": "RIPAM, règle 29 a) i)",
        "feux": ["blanc", "rouge"],
        "alt": "Deux feux superposés visibles sur tout l'horizon, le supérieur blanc, l'inférieur rouge.",
    },
    "au-mouillage-moins-de-50-m": {
        "regle": "RIPAM, règle 30 b)",
        "feux": ["blanc"],
        "alt": "Un feu blanc seul, visible sur tout l'horizon.",
    },
}


def svg_de_feux(feux: list[str]) -> str:
    """Une pile de feux, du haut vers le bas, sur fond de nuit."""
    if not feux:
        raise ValueError("une scène sans feu ne veut rien dire")
    inconnues = [c for c in feux if c not in COULEURS]
    if inconnues:
        raise ValueError(f"couleur de feu inconnue : {', '.join(inconnues)}")

    hauteur = 2 * MARGE + (len(feux) - 1) * ECART + 56
    ligne_eau = hauteur - 34
    centre = LARGEUR / 2

    # Un dégradé par teinte présente, nommé par son rang : les noms de couleur
    # n'entrent pas dans le fichier, ils diraient la réponse.
    teintes: list[str] = []
    for couleur in feux:
        if COULEURS[couleur] not in teintes:
            teintes.append(COULEURS[couleur])

    halos = []
    for rang, teinte in enumerate(teintes):
        halos.append(
            f'<radialGradient id="h{rang}">'
            f'<stop offset="0" stop-color="{teinte}" stop-opacity="0.60" />'
            f'<stop offset="0.30" stop-color="{teinte}" stop-opacity="0.24" />'
            f'<stop offset="0.62" stop-color="{teinte}" stop-opacity="0.07" />'
            f'<stop offset="1" stop-color="{teinte}" stop-opacity="0" />'
            f"</radialGradient>"
        )

    parties = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LARGEUR} {hauteur}" '
        f'width="{LARGEUR}" height="{hauteur}" role="img">',
        "<defs>" + "".join(halos) + "</defs>",
        f'<rect width="{LARGEUR}" height="{hauteur}" fill="{CIEL}" />',
        f'<rect y="{ligne_eau}" width="{LARGEUR}" height="{hauteur - ligne_eau}" fill="{EAU}" />',
        # Le mât porte la pile : sans lui, les feux flottent séparément et on ne
        # lit plus qu'ils appartiennent au même navire.
        f'<line x1="{centre}" y1="{MARGE}" x2="{centre}" y2="{ligne_eau}" '
        f'stroke="{MAT}" stroke-width="4" stroke-linecap="round" />',
    ]

    for rang, couleur in enumerate(feux):
        y = MARGE + rang * ECART
        teinte = COULEURS[couleur]
        parties.append(
            f'<circle cx="{centre}" cy="{y}" r="{RAYON * 3.4:.1f}" '
            f'fill="url(#h{teintes.index(teinte)})" />'
        )
        parties.append(
            f'<circle class="feu" cx="{centre}" cy="{y}" r="{RAYON}" fill="{teinte}" />'
        )

    parties.append("</svg>")
    return "\n".join(parties) + "\n"


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__)
    parseur.add_argument("--verifier", action="store_true", help="échoue au lieu d'écrire")
    args = parseur.parse_args(argv)

    SORTIE.mkdir(parents=True, exist_ok=True)
    perimes = []
    for nom, scene in SCENES.items():
        chemin = SORTIE / f"{nom}.svg"
        dessin = svg_de_feux(scene["feux"])
        if args.verifier:
            if not chemin.is_file() or chemin.read_text(encoding="utf-8") != dessin:
                perimes.append(chemin.relative_to(RACINE))
            continue
        chemin.write_text(dessin, encoding="utf-8")
        print(f"écrit {chemin.relative_to(RACINE)} ({scene['regle']})")

    if args.verifier:
        for chemin in perimes:
            print(f"{chemin} n'est plus à jour, lance `npm run feux`", file=sys.stderr)
        if perimes:
            return 1
        print(f"{len(SCENES)} visuel(s) de feux à jour.")
        return 0

    print(f"\n{len(SCENES)} visuel(s) dans public/visuels/feux/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
