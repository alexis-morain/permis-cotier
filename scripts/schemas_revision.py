#!/usr/bin/env python3
"""Dessine en SVG les schémas des fiches de révision.

    python3 scripts/schemas_revision.py            # écrit public/fiches-revision/schemas/
    python3 scripts/schemas_revision.py --verifier # échoue si un fichier n'est plus à jour

Une fiche de révision range une leçon en une image : le chenal vu du ciel, les
quatre cardinales autour d'un danger, la bande des 300 mètres. Ces schémas
portent du texte, à l'inverse des visuels des questions : ils ne servent pas à
interroger, ils servent à retenir. Les bouées sont celles de `balisage.py`,
dessinées par ses fonctions : une marque a la même allure dans la question et
dans la fiche.
"""
from __future__ import annotations

from pathlib import Path

from _commun import main_dessin
import balisage

RACINE = Path(__file__).resolve().parents[1]
SORTIE = RACINE / "public" / "fiches-revision" / "schemas"

ENCRE = "#37352f"
DOUX = "#6b6a65"
FILET = "#c9c8c3"
EAU = "#e4eef5"
EAU_FORTE = "#8fb0c4"
TERRE = "#e9e9e7"
TERRE_TRAIT = "#a8a7a2"
POLICE = "Helvetica, Arial, sans-serif"


def _entete(largeur: int, hauteur: int) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {largeur} {hauteur}" '
        f'width="{largeur}" height="{hauteur}" role="img" font-family="{POLICE}">'
    )


def _texte(x: float, y: float, contenu: str, *, taille: float = 13, graisse: int = 400,
           ancre: str = "middle", couleur: str = ENCRE) -> str:
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-size="{taille}" font-weight="{graisse}" '
        f'text-anchor="{ancre}" fill="{couleur}">{contenu}</text>'
    )


def _fleche(x1: float, y1: float, x2: float, y2: float, *, couleur: str = ENCRE, epaisseur: float = 2.5,
            pointille: bool = False) -> str:
    """Un trait terminé par une pointe pleine, sans marqueur : un `marker` se perd en impression."""
    import math

    angle = math.atan2(y2 - y1, x2 - x1)
    longueur, ouverture = 11, 0.45
    p1 = (x2 - longueur * math.cos(angle - ouverture), y2 - longueur * math.sin(angle - ouverture))
    p2 = (x2 - longueur * math.cos(angle + ouverture), y2 - longueur * math.sin(angle + ouverture))
    fin = (x2 - 8 * math.cos(angle), y2 - 8 * math.sin(angle))
    tirets = ' stroke-dasharray="6 5"' if pointille else ""
    return (
        f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{fin[0]:.1f}" y2="{fin[1]:.1f}" stroke="{couleur}" '
        f'stroke-width="{epaisseur}" stroke-linecap="round"{tirets} />'
        f'<polygon points="{x2:.1f},{y2:.1f} {p1[0]:.1f},{p1[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}" fill="{couleur}" />'
    )


def _bouee(nom: str, cx: float, bas: float, echelle: float, ident: str) -> str:
    """Une marque de `balisage.py`, sans ciel ni mer, posée par le bas de son corps sur `bas`."""
    marque = balisage.MARQUES[nom]
    hauteur_voyant = balisage.HAUTEURS_VOYANT[marque["voyant"]]
    y_voyant_bas = balisage.MARGE_HAUTE + hauteur_voyant
    y_corps_haut = y_voyant_bas + balisage.MAT
    trace, x, largeur, hauteur_corps = balisage._corps(marque["forme"], y_corps_haut)
    y_corps_bas = y_corps_haut + hauteur_corps
    dx = cx - balisage.CENTRE * echelle
    dy = bas - y_corps_bas * echelle
    return "".join([
        f'<g transform="translate({dx:.2f} {dy:.2f}) scale({echelle})">',
        f'<defs><clipPath id="{ident}">{trace} /></clipPath></defs>',
        f'<line x1="{balisage.CENTRE}" y1="{y_voyant_bas}" x2="{balisage.CENTRE}" y2="{y_corps_haut + 10}" '
        f'stroke="{balisage.ACIER}" stroke-width="7" stroke-linecap="round" />',
        f'<g clip-path="url(#{ident})">',
        *balisage._bandes(marque["corps"], marque["sens"], x, y_corps_haut, largeur, hauteur_corps),
        "</g>",
        f'{trace} fill="none" stroke="#2a2a2a" stroke-width="2.5" stroke-opacity="0.5" />',
        *balisage._voyant(marque["voyant"], y_voyant_bas, balisage.COULEURS[marque["voyant_couleur"]]),
        "</g>",
    ])


def _vague(cx: float, y: float, demi: float = 18) -> str:
    return (
        f'<path d="M {cx - demi} {y} q {demi / 2} -5 {demi} 0 t {demi} 0" fill="none" '
        f'stroke="{EAU_FORTE}" stroke-width="2" stroke-linecap="round" />'
    )


def _schemas() -> dict[str, str]:
    """Les schémas de chaque cours, lus dans `scripts/schemas_fiches/<cours>.py`.

    Un module par cours : chacun expose `SCHEMAS`, nom de fichier sans
    extension vers la fonction qui le dessine. Le nom commence par le code du
    cours, pour qu'aucun module n'écrase le dessin d'un autre."""
    import importlib

    dessins: dict[str, str] = {}
    for module in sorted((Path(__file__).parent / "schemas_fiches").glob("*.py")):
        if module.name.startswith("_"):
            continue
        cours = module.stem.replace("_", "-")
        for nom, dessiner in importlib.import_module(f"schemas_fiches.{module.stem}").SCHEMAS.items():
            if not nom.startswith(cours):
                raise ValueError(f"{module.name} : le schéma « {nom} » doit commencer par « {cours} »")
            if nom in dessins:
                raise ValueError(f"schéma en double : {nom}")
            dessins[nom] = dessiner()
    return dessins


def main(argv: list[str] | None = None) -> int:
    return main_dessin(
        argv,
        racine=RACINE,
        sortie=SORTIE,
        elements=_schemas(),
        commande_npm="schemas",
        label="schéma(s)",
    )


if __name__ == "__main__":
    raise SystemExit(main())
