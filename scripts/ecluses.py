#!/usr/bin/env python3
"""Dessine en SVG les signaux d'accès et de sortie des écluses.

    python3 scripts/ecluses.py            # écrit public/visuels/ecluses/
    python3 scripts/ecluses.py --verifier # échoue si un fichier n'est plus à jour

L'article A. 4241-53-31 du code des transports règle l'accès et la sortie d'une
écluse par des feux, et toute la signification tient dans deux paramètres : la
couleur des feux, et leur disposition. Deux feux rouges superposés annoncent une
écluse hors service ; les deux mêmes feux juxtaposés annoncent une écluse
seulement fermée. La distinction ne se voit qu'en image, et elle se compte et se
dispose : c'est du code, pas une génération d'image. Crédit `code`.

Aucun libellé dans l'image, il donnerait la réponse.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
SORTIE = RACINE / "public" / "visuels" / "ecluses"

ROUGE = "#d23b30"
VERT = "#1f9a55"
ETEINT = "#3a3f45"
PANNEAU = "#22262b"
MONTANT = "#4a4a4a"
CIEL = "#dfe9f0"

RAYON = 17           # rayon d'un feu
PAS = 46             # entraxe entre deux feux, dans les deux sens
MARGE = 20           # du bord du panneau au bord du premier feu
MONTANT_HAUT = 34    # ce qui dépasse du panneau vers le bas
LARGEUR = 150

# Chaque signal est une grille de feux, lue de haut en bas puis de gauche à
# droite : `[["rouge"], ["rouge"]]` superpose deux feux rouges, `[["rouge",
# "rouge"]]` les juxtapose. Le paragraphe cité est celui de l'article
# A. 4241-53-31 dont le signal porte la signification.
SIGNAUX: dict[str, dict] = {
    "acces-deux-rouges-superposes": {
        "feux": [["rouge"], ["rouge"]],
        "alt": "Deux feux rouges allumés, l'un au-dessus de l'autre.",
        "regle": "Code des transports, article A. 4241-53-31, 1 a) : accès interdit, écluse hors service",
    },
    "acces-rouge-isole": {
        "feux": [["rouge"]],
        "alt": "Un feu rouge isolé allumé.",
        "regle": "Code des transports, article A. 4241-53-31, 1 b) : accès interdit, écluse fermée",
    },
    "acces-deux-rouges-juxtaposes": {
        "feux": [["rouge", "rouge"]],
        "alt": "Deux feux rouges allumés, côte à côte.",
        "regle": "Code des transports, article A. 4241-53-31, 1 b) : accès interdit, écluse fermée",
    },
    "acces-un-rouge-eteint": {
        "feux": [["rouge", "eteint"]],
        "alt": "Deux feux côte à côte, celui de gauche rouge et allumé, celui de droite éteint.",
        "regle": "Code des transports, article A. 4241-53-31, 1 c) : accès interdit, écluse en préparation",
    },
    "acces-rouge-vert-juxtaposes": {
        "feux": [["rouge", "vert"]],
        "alt": "Deux feux allumés côte à côte, un rouge et un vert.",
        "regle": "Code des transports, article A. 4241-53-31, 1 c) : accès interdit, écluse en préparation",
    },
    "acces-rouge-sur-vert": {
        "feux": [["rouge"], ["vert"]],
        "alt": "Un feu rouge allumé au-dessus d'un feu vert allumé.",
        "regle": "Code des transports, article A. 4241-53-31, 1 c) : accès interdit, écluse en préparation",
    },
    "acces-vert-isole": {
        "feux": [["vert"]],
        "alt": "Un feu vert isolé allumé.",
        "regle": "Code des transports, article A. 4241-53-31, 1 d) : accès autorisé",
    },
    "acces-deux-verts-juxtaposes": {
        "feux": [["vert", "vert"]],
        "alt": "Deux feux verts allumés, côte à côte.",
        "regle": "Code des transports, article A. 4241-53-31, 1 d) : accès autorisé",
    },
}

TEINTES = {"rouge": ROUGE, "vert": VERT, "eteint": ETEINT}


def _feu(cx: float, cy: float, couleur: str) -> list[str]:
    """Un feu : la lentille, son cerclage, et un reflet quand il est allumé.

    Un feu éteint garde sa lentille visible : le signal « extinction de l'un des
    deux feux rouges juxtaposés » se lit sur deux feux, pas sur un seul."""
    teinte = TEINTES[couleur]
    dessin = [
        f'<circle cx="{cx}" cy="{cy}" r="{RAYON + 3}" fill="#15181b" />',
        f'<circle cx="{cx}" cy="{cy}" r="{RAYON}" fill="{teinte}" />',
    ]
    if couleur != "eteint":
        dessin.append(
            f'<circle cx="{cx - RAYON / 3:.1f}" cy="{cy - RAYON / 3:.1f}" '
            f'r="{RAYON / 3.4:.1f}" fill="#ffffff" fill-opacity="0.38" />'
        )
    return dessin


def svg_de_signal(nom: str) -> str:
    feux = SIGNAUX[nom]["feux"]
    lignes, colonnes = len(feux), max(len(l) for l in feux)

    largeur_panneau = 2 * MARGE + 2 * RAYON + (colonnes - 1) * PAS
    hauteur_panneau = 2 * MARGE + 2 * RAYON + (lignes - 1) * PAS
    x_panneau = (LARGEUR - largeur_panneau) / 2
    y_panneau = 14
    hauteur = y_panneau + hauteur_panneau + MONTANT_HAUT

    dessin = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LARGEUR} {hauteur:.0f}" '
        f'width="{LARGEUR}" height="{hauteur:.0f}" role="img">',
        f'<rect width="{LARGEUR}" height="{hauteur:.0f}" fill="{CIEL}" />',
        # Le montant part de sous le panneau et descend hors cadre : le signal
        # est porté par un mât à quai, il ne flotte pas.
        f'<rect x="{LARGEUR / 2 - 6:.1f}" y="{y_panneau + hauteur_panneau - 6:.1f}" '
        f'width="12" height="{MONTANT_HAUT + 6}" fill="{MONTANT}" />',
        f'<rect x="{x_panneau:.1f}" y="{y_panneau}" width="{largeur_panneau}" '
        f'height="{hauteur_panneau}" rx="10" fill="{PANNEAU}" />',
    ]
    for rang, ligne in enumerate(feux):
        # Une ligne plus courte que la grille reste centrée sur le panneau.
        depart = x_panneau + (largeur_panneau - (2 * RAYON + (len(ligne) - 1) * PAS)) / 2 + RAYON
        cy = y_panneau + MARGE + RAYON + rang * PAS
        for colonne, couleur in enumerate(ligne):
            dessin += _feu(depart + colonne * PAS, cy, couleur)
    dessin.append("</svg>")
    return "\n".join(dessin) + "\n"


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__)
    parseur.add_argument("--verifier", action="store_true", help="échoue au lieu d'écrire")
    args = parseur.parse_args(argv)

    SORTIE.mkdir(parents=True, exist_ok=True)
    perimes = []
    for nom in SIGNAUX:
        chemin = SORTIE / f"{nom}.svg"
        dessin = svg_de_signal(nom)
        if args.verifier:
            if not chemin.is_file() or chemin.read_text(encoding="utf-8") != dessin:
                perimes.append(chemin.relative_to(RACINE))
            continue
        chemin.write_text(dessin, encoding="utf-8")
        print(f"écrit {chemin.relative_to(RACINE)}")

    if args.verifier:
        for chemin in perimes:
            print(f"{chemin} n'est plus à jour, lance `npm run ecluses`", file=sys.stderr)
        if perimes:
            return 1
        print(f"{len(SIGNAUX)} signal(aux) à jour.")
        return 0

    print(f"\n{len(SIGNAUX)} signal(aux) dans public/visuels/ecluses/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
