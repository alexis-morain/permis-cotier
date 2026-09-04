#!/usr/bin/env python3
"""Dessine en SVG les repères élémentaires d'une carte marine.

    python3 scripts/carte.py            # écrit public/visuels/carte/
    python3 scripts/carte.py --verifier # échoue si un fichier n'est plus à jour

Deux repères que le programme demande de savoir lire et qu'aucune phrase ne
remplace : le code de couleurs qui donne la profondeur d'un coup d'œil, avec le
soulignement qui retourne le sens d'une sonde, et la double rose des vents dont
le cercle intérieur porte le nord magnétique. Ils se composent de formes
placées à la règle : c'est du code, pas une génération d'image. Crédit `code`.

Les sondes portées sur la planche des couleurs sont des valeurs d'illustration,
pas un extrait de carte réelle : elles servent à montrer la convention, dont le
soulignement, et non à situer un lieu.

Source : data/sources/fiche-carte-marine/symboles.md, elle-même à vérifier
contre l'ouvrage 1D du SHOM.
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
SORTIE = RACINE / "public" / "visuels" / "carte"

TERRE = "#e6d9a8"
ESTRAN = "#a8cf9a"
PETIT_FOND = "#a9cde4"
FOND_MOYEN = "#d3e7f3"
GRAND_FOND = "#ffffff"
TRAIT = "#3b4a52"
ENCRE = "#1d2b33"

# L'écart entre nord vrai et nord magnétique est de l'ordre du degré en France
# métropolitaine : à l'échelle du dessin il serait invisible. On l'ouvre à
# quinze degrés pour qu'il se voie, et l'énoncé comme le texte alternatif le
# disent, parce que c'est la structure de la rose qui est en jeu, pas la valeur
# de la déclinaison.
DECLINAISON_DESSINEE = 15


def _sonde(x: float, y: float, valeur: str, souligne: bool = False) -> list[str]:
    """Une sonde, en italique comme sur les cartes. Soulignée, elle cesse d'être
    une profondeur : elle devient la hauteur d'un haut-fond qui découvre."""
    dessin = [
        f'<text x="{x}" y="{y}" font-family="Georgia, serif" font-style="italic" '
        f'font-size="13" fill="{ENCRE}" text-anchor="middle">{valeur}</text>'
    ]
    if souligne:
        demi = 3.4 * len(valeur)
        dessin.append(
            f'<line x1="{x - demi:.1f}" y1="{y + 3}" x2="{x + demi:.1f}" y2="{y + 3}" '
            f'stroke="{ENCRE}" stroke-width="1.2" />'
        )
    return dessin


def svg_estran_et_sondes() -> str:
    """La carte se lit d'abord à la couleur : terre, estran, petits fonds, large."""
    largeur, hauteur = 340, 210
    return "\n".join([
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {largeur} {hauteur}" '
        f'width="{largeur}" height="{hauteur}" role="img">',
        f'<rect width="{largeur}" height="{hauteur}" fill="{GRAND_FOND}" />',
        # Les bandes se succèdent de la côte vers le large, chacune recouvrant
        # la précédente : la plus profonde est dessous, la terre par-dessus tout.
        f'<path d="M 0 0 L {largeur} 0 L {largeur} {hauteur} L 0 {hauteur} Z" fill="{GRAND_FOND}" />',
        f'<path d="M 0 0 L 250 0 C 232 60, 246 140, 214 {hauteur} L 0 {hauteur} Z" fill="{FOND_MOYEN}" />',
        f'<path d="M 0 0 L 176 0 C 160 62, 170 140, 140 {hauteur} L 0 {hauteur} Z" fill="{PETIT_FOND}" />',
        f'<path d="M 0 0 L 112 0 C 98 60, 106 140, 78 {hauteur} L 0 {hauteur} Z" fill="{ESTRAN}" />',
        f'<path d="M 0 0 L 74 0 C 62 58, 68 138, 42 {hauteur} L 0 {hauteur} Z" fill="{TERRE}" />',
        # Le trait de côte est plein, la laisse de basse mer en tireté : c'est
        # entre les deux que la carte porte le vert.
        f'<path d="M 74 0 C 62 58, 68 138, 42 {hauteur}" fill="none" stroke="{TRAIT}" stroke-width="1.6" />',
        f'<path d="M 112 0 C 98 60, 106 140, 78 {hauteur}" fill="none" stroke="{TRAIT}" '
        f'stroke-width="1.1" stroke-dasharray="5 3" />',
        *_sonde(86, 62, "1,2", souligne=True),
        *_sonde(74, 158, "0,8", souligne=True),
        *_sonde(148, 40, "2,4"),
        *_sonde(152, 118, "3,1"),
        *_sonde(146, 185, "2,7"),
        *_sonde(212, 72, "7,5"),
        *_sonde(220, 160, "9,2"),
        *_sonde(292, 48, "18"),
        *_sonde(300, 130, "24"),
        "</svg>",
    ]) + "\n"


def _rose(cx: float, cy: float, rayon: float, rotation: float, epaisseur: float, teinte: str) -> list[str]:
    """Un cercle gradué, tourné de `rotation` degrés, avec sa flèche de nord.

    Graduation tous les dix degrés, trait long tous les trente : de quoi lire
    une rose sans y écrire un seul chiffre."""
    dessin = [
        f'<circle cx="{cx}" cy="{cy}" r="{rayon}" fill="none" stroke="{teinte}" '
        f'stroke-width="{epaisseur}" />'
    ]
    for degre in range(0, 360, 10):
        angle = math.radians(degre + rotation - 90)
        longueur = 11 if degre % 30 == 0 else 6
        x1, y1 = cx + rayon * math.cos(angle), cy + rayon * math.sin(angle)
        x2 = cx + (rayon - longueur) * math.cos(angle)
        y2 = cy + (rayon - longueur) * math.sin(angle)
        dessin.append(
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
            f'stroke="{teinte}" stroke-width="{1.6 if degre % 30 == 0 else 0.9}" />'
        )
    # La flèche du nord part du centre et sort du cercle : c'est elle qui porte
    # l'écart entre les deux roses.
    angle = math.radians(rotation - 90)
    pointe_x, pointe_y = cx + (rayon + 13) * math.cos(angle), cy + (rayon + 13) * math.sin(angle)
    base_x, base_y = cx + (rayon - 22) * math.cos(angle), cy + (rayon - 22) * math.sin(angle)
    aile = math.radians(rotation - 90 + 90)
    dx, dy = 6 * math.cos(aile), 6 * math.sin(aile)
    dessin += [
        f'<line x1="{cx}" y1="{cy}" x2="{base_x:.1f}" y2="{base_y:.1f}" '
        f'stroke="{teinte}" stroke-width="{epaisseur}" />',
        f'<path d="M {pointe_x:.1f} {pointe_y:.1f} L {base_x + dx:.1f} {base_y + dy:.1f} '
        f'L {base_x - dx:.1f} {base_y - dy:.1f} Z" fill="{teinte}" />',
    ]
    return dessin


def svg_rose_des_vents() -> str:
    cote = 260
    centre = cote / 2
    return "\n".join([
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {cote} {cote}" '
        f'width="{cote}" height="{cote}" role="img">',
        f'<rect width="{cote}" height="{cote}" fill="{GRAND_FOND}" />',
        *_rose(centre, centre, 96, 0, 1.8, ENCRE),
        *_rose(centre, centre, 66, DECLINAISON_DESSINEE, 1.4, "#9a3f8c"),
        f'<circle cx="{centre}" cy="{centre}" r="2.4" fill="{ENCRE}" />',
        "</svg>",
    ]) + "\n"


PLANCHES = {
    "estran-et-sondes": svg_estran_et_sondes,
    "rose-des-vents": svg_rose_des_vents,
}


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__)
    parseur.add_argument("--verifier", action="store_true", help="échoue au lieu d'écrire")
    args = parseur.parse_args(argv)

    SORTIE.mkdir(parents=True, exist_ok=True)
    perimes = []
    for nom, dessiner in PLANCHES.items():
        chemin = SORTIE / f"{nom}.svg"
        dessin = dessiner()
        if args.verifier:
            if not chemin.is_file() or chemin.read_text(encoding="utf-8") != dessin:
                perimes.append(chemin.relative_to(RACINE))
            continue
        chemin.write_text(dessin, encoding="utf-8")
        print(f"écrit {chemin.relative_to(RACINE)}")

    if args.verifier:
        for chemin in perimes:
            print(f"{chemin} n'est plus à jour, lance `npm run carte`", file=sys.stderr)
        if perimes:
            return 1
        print(f"{len(PLANCHES)} planche(s) à jour.")
        return 0

    print(f"\n{len(PLANCHES)} planche(s) dans public/visuels/carte/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
