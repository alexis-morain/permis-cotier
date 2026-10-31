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


def chenal() -> str:
    """Le balisage latéral vu du large : la rouge à bâbord, la verte à tribord, en rentrant."""
    L, H = 560, 330
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    # Le port en haut, deux jetées qui ouvrent sur le chenal.
    morceaux += [
        f'<path d="M 0 0 H {L} V 46 H 330 V 70 H 300 V 46 H 260 V 70 H 230 V 46 H 0 Z" fill="{TERRE}" '
        f'stroke="{TERRE_TRAIT}" stroke-width="1.5" />',
        _texte(L / 2, 28, "Le port", taille=15, graisse=700),
        _texte(L / 2, H - 14, "Le large", taille=15, graisse=700),
    ]
    ys = [128, 200, 272]
    for i, y in enumerate(ys):
        morceaux.append(_bouee("laterale-babord", 200, y, 0.34, f"ch-b{i}"))
        morceaux.append(_vague(200, y + 4))
        morceaux.append(_bouee("laterale-tribord", 360, y, 0.34, f"ch-t{i}"))
        morceaux.append(_vague(360, y + 4))
    morceaux += [
        _fleche(L / 2, 292, L / 2, 96, epaisseur=3),
        _texte(150, 176, "Bâbord", taille=15, graisse=700, ancre="end"),
        _texte(150, 194, "rouge", taille=16, ancre="end"),
        _texte(150, 210, "cylindre", taille=16, ancre="end"),
        _texte(410, 176, "Tribord", taille=15, graisse=700, ancre="start"),
        _texte(410, 194, "vert", taille=16, ancre="start"),
        _texte(410, 210, "cône", taille=16, ancre="start"),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def cardinales() -> str:
    """Les quatre cardinales autour d'un danger, chacune du côté qu'elle nomme, avec son feu."""
    L, H = 560, 500
    cx, cy = L / 2, 262
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    # Les quadrants : deux diagonales en pointillé qui se croisent sur le danger.
    for (x1, y1, x2, y2) in [(cx - 120, cy - 120, cx + 120, cy + 120), (cx + 120, cy - 120, cx - 120, cy + 120)]:
        morceaux.append(
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{FILET}" stroke-width="1.5" stroke-dasharray="5 6" />'
        )
    # Le danger : une roche, dessinée comme sur la carte, au centre.
    morceaux += [
        f'<path d="M {cx - 34} {cy + 8} q 6 -26 30 -24 q 10 -14 26 -2 q 20 4 14 24 q -4 18 -30 16 '
        f'q -14 10 -28 0 q -16 2 -12 -14 Z" fill="#8e8c86" stroke="{ENCRE}" stroke-width="1.5" />',
        _texte(cx, cy + 46, "danger", taille=16, graisse=600),
    ]
    reperes = {
        # nom, x du centre, bas du corps, libellé du nom, feu, position du texte
        "nord": ("cardinale-nord", cx, 172, "Nord", "scintillement continu", (cx + 42, 124, "start")),
        "est": ("cardinale-est", cx + 150, cy + 50, "Est", "3 scintillements", (cx + 150, cy + 76, "middle")),
        "sud": ("cardinale-sud", cx, cy + 172, "Sud", "6 + un éclat long", (cx + 42, cy + 128, "start")),
        "ouest": ("cardinale-ouest", cx - 150, cy + 50, "Ouest", "9 scintillements", (cx - 150, cy + 76, "middle")),
    }
    for cle, (nom, bx, bas, libelle, feu, (tx, ty, ancre)) in reperes.items():
        morceaux.append(_bouee(nom, bx, bas, 0.48, f"ca-{cle}"))
        morceaux.append(_vague(bx, bas + 4, 20))
        morceaux.append(_texte(tx, ty, libelle, taille=16, graisse=700, ancre=ancre))
        morceaux.append(_texte(tx, ty + 17, feu, taille=15, ancre=ancre, couleur=DOUX))
    # Les flèches de passage : dehors, du côté nommé.
    morceaux += [
        _fleche(cx - 60, 40, cx + 60, 40, couleur="#1d63c9"),
        _fleche(L - 34, cy - 70, L - 34, cy + 70, couleur="#1d63c9"),
        _fleche(cx + 60, H - 22, cx - 60, H - 22, couleur="#1d63c9"),
        _fleche(34, cy + 70, 34, cy - 70, couleur="#1d63c9"),
        _texte(cx, 22, "on passe du côté que la marque nomme", taille=15, couleur="#1d63c9"),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def cadran() -> str:
    """Le moyen mnémotechnique des feux de cardinales : l'heure donne le nombre de scintillements."""
    import math

    L, H = 400, 300
    cx, cy, r = 200, 150, 92
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />', f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#ffffff" stroke="{ENCRE}" stroke-width="3" />']
    for h in range(12):
        a = math.radians(h * 30 - 90)
        dedans = r - (14 if h % 3 == 0 else 8)
        morceaux.append(
            f'<line x1="{cx + dedans * math.cos(a):.1f}" y1="{cy + dedans * math.sin(a):.1f}" '
            f'x2="{cx + (r - 3) * math.cos(a):.1f}" y2="{cy + (r - 3) * math.sin(a):.1f}" '
            f'stroke="{ENCRE}" stroke-width="{3 if h % 3 == 0 else 1.5}" />'
        )
    morceaux += [
        _texte(cx, cy - r + 34, "12", taille=18, graisse=700),
        _texte(cx + r - 28, cy + 6, "3", taille=18, graisse=700),
        _texte(cx, cy + r - 20, "6", taille=18, graisse=700),
        _texte(cx - r + 28, cy + 6, "9", taille=18, graisse=700),
        f'<circle cx="{cx}" cy="{cy}" r="5" fill="{ENCRE}" />',
        _texte(cx, 30, "Nord : continu", taille=14, graisse=700),
        _texte(cx, 290, "Sud : 6 + éclat long", taille=14, graisse=700),
        _texte(cx + r + 12, cy + 6, "Est : 3", taille=14, graisse=700, ancre="start"),
        _texte(cx - r - 12, cy + 6, "Ouest : 9", taille=14, graisse=700, ancre="end"),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def _sphere_jaune(x: float, y: float, r: float = 7) -> str:
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{balisage.COULEURS["jaune"]}" stroke="#2a2a2a" stroke-opacity="0.5" stroke-width="1.2" />'


def _cylindre_jaune(x: float, y: float) -> str:
    return (f'<rect x="{x - 6}" y="{y - 8}" width="12" height="16" rx="1.5" fill="{balisage.COULEURS["jaune"]}" '
            f'stroke="#2a2a2a" stroke-opacity="0.5" stroke-width="1.2" />')


def _cone_jaune(x: float, y: float) -> str:
    return (f'<polygon points="{x},{y - 9} {x + 8},{y + 7} {x - 8},{y + 7}" fill="{balisage.COULEURS["jaune"]}" '
            f'stroke="#2a2a2a" stroke-opacity="0.5" stroke-width="1.2" />')


def bande_300() -> str:
    """La bande littorale vue du ciel : la plage en haut, la limite des 300 mètres, un chenal traversier."""
    L, H = 560, 330
    limite = 222
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    morceaux += [
        f'<path d="M 0 0 H {L} V 44 q -70 10 -140 2 q -80 -8 -150 4 q -90 10 -150 -2 q -60 -10 -120 0 Z" '
        f'fill="{TERRE}" stroke="{TERRE_TRAIT}" stroke-width="1.5" />',
        _texte(40, 28, "Plage", taille=15, graisse=700, ancre="start"),
        # La bande des 300 mètres, d'un lavis plus sombre.
        f'<rect x="0" y="48" width="{L}" height="{limite - 48}" fill="#d3e3ee" />',
    ]
    for x in range(20, L, 46):
        if 330 < x < 440:
            continue
        morceaux.append(_sphere_jaune(x, limite))
    # Le chenal traversier, de la plage au large.
    for y in range(80, limite + 70, 34):
        morceaux.append(_cylindre_jaune(352, y))
        morceaux.append(_cone_jaune(416, y))
    morceaux += [
        _fleche(384, limite + 76, 384, 66, epaisseur=3),
        _texte(30, 104, "5 nœuds au plus,", taille=14, graisse=700, ancre="start"),
        _texte(30, 122, "même sans bouée", taille=14, graisse=700, ancre="start"),
        _texte(30, 146, "la bande suit la marée", taille=15, ancre="start", couleur=DOUX),
        _texte(30, limite + 30, "Limite des 300 m :", taille=16, graisse=700, ancre="start"),
        _texte(30, limite + 47, "bouées jaunes sphériques", taille=15, ancre="start", couleur=DOUX),
        _texte(342, 300, "Chenal traversier", taille=16, graisse=700, ancre="end"),
        _texte(342, 316, "vers la plage : cylindres à bâbord", taille=15, ancre="end", couleur=DOUX),
        _texte(430, 300, "cônes à tribord", taille=15, ancre="start", couleur=DOUX),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def _bateau(x: float, y: float, couleur: str) -> str:
    """Un bateau à moteur de profil et son sillage : la figure d'un pictogramme."""
    return (
        f'<path d="M {x - 34} {y} H {x + 30} L {x + 22} {y + 14} H {x - 30} Z" fill="{couleur}" />'
        f'<path d="M {x - 12} {y} V {y - 12} H {x + 8} L {x + 16} {y} Z" fill="{couleur}" />'
        f'<path d="M {x - 40} {y + 22} q 10 -6 20 0 t 20 0 t 20 0 t 20 0" fill="none" stroke="{couleur}" '
        f'stroke-width="3" stroke-linecap="round" />'
    )


def pictogrammes() -> str:
    """Les deux codes des pictogrammes du littoral : bleu autorise, rouge barré interdit."""
    L, H = 400, 190
    morceaux = [_entete(L, H)]
    morceaux += [
        f'<rect x="40" y="14" width="130" height="130" rx="8" fill="#1f5fa8" />',
        _bateau(105, 76, "#ffffff"),
        _texte(105, 172, "Autorisé", taille=15, graisse=700),
        f'<rect x="230" y="14" width="130" height="130" rx="8" fill="#ffffff" stroke="#c8382e" stroke-width="10" />',
        _bateau(295, 76, "#1b1b1b"),
        f'<line x1="240" y1="134" x2="350" y2="24" stroke="#c8382e" stroke-width="10" stroke-linecap="round" />',
        _texte(295, 172, "Interdit", taille=15, graisse=700),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


SCHEMAS = {
    "balisage-chenal": chenal,
    "balisage-cardinales": cardinales,
    "balisage-cadran": cadran,
    "balisage-300-metres": bande_300,
    "balisage-pictogrammes": pictogrammes,
}


def main(argv: list[str] | None = None) -> int:
    return main_dessin(
        argv,
        racine=RACINE,
        sortie=SORTIE,
        elements={nom: dessiner() for nom, dessiner in SCHEMAS.items()},
        commande_npm="schemas",
        label="schéma(s)",
    )


if __name__ == "__main__":
    raise SystemExit(main())
