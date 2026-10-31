"""Les schémas de la fiche Feux et marques."""
from __future__ import annotations

import math

import feux
from schemas_revision import DOUX, EAU, ENCRE, TERRE_TRAIT, _entete, _texte


def _point(cx: float, cy: float, r: float, degres: float) -> tuple[float, float]:
    """Un point du cercle, l'angle compté depuis l'avant, dans le sens des aiguilles."""
    a = math.radians(degres)
    return cx + r * math.sin(a), cy - r * math.cos(a)


def _secteur(cx: float, cy: float, r: float, debut: float, fin: float, remplissage: str, opacite: float = 1) -> str:
    x1, y1 = _point(cx, cy, r, debut)
    x2, y2 = _point(cx, cy, r, fin)
    grand = 1 if fin - debut > 180 else 0
    return (
        f'<path d="M {cx} {cy} L {x1:.1f} {y1:.1f} A {r} {r} 0 {grand} 1 {x2:.1f} {y2:.1f} Z" '
        f'fill="{remplissage}" fill-opacity="{opacite}" stroke="{TERRE_TRAIT}" stroke-width="1.5" stroke-linejoin="round" />'
    )


def secteurs() -> str:
    """Le navire vu du ciel, l'avant en haut : les quatre secteurs de ses feux."""
    L, H = 560, 400
    cx, cy, r = L / 2, 200, 128
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    blanc = "#ffffff"
    morceaux += [
        _secteur(cx, cy, r, -112.5, 112.5, blanc),
        _secteur(cx, cy, r, 112.5, 247.5, blanc),
        _secteur(cx, cy, 84, 0, 112.5, feux.COULEURS["vert"], 0.9),
        _secteur(cx, cy, 84, -112.5, 0, feux.COULEURS["rouge"], 0.9),
        # La coque, l'avant en haut.
        f'<path d="M {cx} {cy - 48} Q {cx + 22} {cy - 20} {cx + 16} {cy + 12} L {cx + 16} {cy + 40} H {cx - 16} '
        f'L {cx - 16} {cy + 12} Q {cx - 22} {cy - 20} {cx} {cy - 48} Z" fill="#ffffff" stroke="{ENCRE}" stroke-width="2" />',
        _texte(cx, 26, "Tête de mât : 225 degrés", taille=16, graisse=700),
        _texte(cx, 46, "blanc, vers l’avant", taille=15, couleur=DOUX),
        _texte(cx, H - 32, "Poupe : 135 degrés", taille=16, graisse=700),
        _texte(cx, H - 12, "blanc, vers l’arrière", taille=15, couleur=DOUX),
        _texte(cx + r + 14, cy - 4, "Tribord", taille=16, graisse=700, ancre="start"),
        _texte(cx + r + 14, cy + 16, "vert, 112,5 degrés", taille=15, ancre="start", couleur=DOUX),
        _texte(cx - r - 14, cy - 4, "Bâbord", taille=16, graisse=700, ancre="end"),
        _texte(cx - r - 14, cy + 16, "rouge, 112,5 degrés", taille=15, ancre="end", couleur=DOUX),
        _texte(14, H - 12, "225 + 135 = 360", taille=15, ancre="start", couleur=DOUX),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def _pile(cx: float, haut: float, couleurs: list[str]) -> str:
    return "".join(
        f'<circle cx="{cx}" cy="{haut + 44 * i}" r="15" fill="{feux.COULEURS[c]}" />' for i, c in enumerate(couleurs)
    )


def remorquage() -> str:
    """Trois façons de lire un remorqueur : deux blancs, trois blancs, jaune sur blanc."""
    L, H = 560, 252
    panneaux = [
        (100, "Remorquage", ["2 feux de tête", "de mât superposés"], ["blanc", "blanc"]),
        (280, "Plus de 200 mètres", ["3 feux de tête", "de mât superposés"], ["blanc", "blanc", "blanc"]),
        (460, "Vu de l’arrière", ["feu jaune au-dessus", "du feu de poupe"], ["jaune", "blanc"]),
    ]
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    for x, titre, lignes, couleurs in panneaux:
        morceaux.append(f'<rect x="{x - 78}" y="40" width="156" height="150" rx="8" fill="{feux.CIEL}" />')
        morceaux.append(_pile(x, 74, couleurs))
        morceaux.append(_texte(x, 26, titre, taille=16, graisse=700))
        morceaux.append(_texte(x, 214, lignes[0], taille=15, couleur=DOUX))
        morceaux.append(_texte(x, 232, lignes[1], taille=15, couleur=DOUX))
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


SCHEMAS = {
    "feux-marques-secteurs": secteurs,
    "feux-marques-remorquage": remorquage,
}
