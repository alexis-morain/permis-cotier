"""Les schémas de la fiche Carte marine."""
from __future__ import annotations

import math

from schemas_revision import (
    DOUX, EAU, EAU_FORTE, ENCRE, FILET, TERRE, TERRE_TRAIT, _entete, _fleche, _texte,
)


def feu() -> str:
    """La description d'un feu, lue dans l'ordre : caractère, couleur, période, hauteur, portée."""
    L, H = 560, 190
    m = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    colonnes = [
        (75, "Fl(2)", "caractère", "2 éclats groupés", None),
        (190, "R", "couleur", "rouge", None),
        (300, "10s", "période", "10 secondes", None),
        (405, "12m", "hauteur", "12 mètres", "m minuscule"),
        (505, "9M", "portée", "9 milles", "M majuscule"),
    ]
    m.append(_texte(L / 2, 26, "Toujours dans le même ordre", taille=15, graisse=700))
    for x, signe, nom, sens, casse in colonnes:
        m.append(_texte(x, 74, signe, taille=22, graisse=700))
        m.append(f'<line x1="{x}" y1="88" x2="{x}" y2="106" stroke="{ENCRE}" stroke-width="1.5" />')
        m.append(_texte(x, 126, nom, taille=15, graisse=700))
        m.append(_texte(x, 146, sens, taille=14))
        if casse:
            m.append(_texte(x, 166, casse, taille=14, couleur=DOUX))
    m.append("</svg>")
    return "".join(m) + "\n"


def maree() -> str:
    """Une marée de profil : pleine mer, basse mer, marnage, zéro des cartes, sonde, hauteur de marée."""
    L, H = 560, 300
    m = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="#ffffff" />']
    pts = [(x, 110 - 40 * math.cos(2 * math.pi * (x - 80) / 320)) for x in range(40, 441, 10)]
    courbe = " ".join(f"{x:.0f},{y:.1f}" for x, y in pts)
    m += [
        f'<polygon points="{courbe} 440,260 40,260" fill="{EAU}" />',
        f'<polyline points="{courbe}" fill="none" stroke="{EAU_FORTE}" stroke-width="3" />',
        f'<rect x="40" y="260" width="430" height="40" fill="{TERRE}" stroke="{TERRE_TRAIT}" stroke-width="1.5" />',
        _texte(52, 285, "fond", taille=14, ancre="start", couleur=DOUX),
        f'<line x1="40" y1="190" x2="470" y2="190" stroke="{ENCRE}" stroke-width="2" stroke-dasharray="7 5" />',
        _texte(46, 183, "zéro des cartes", taille=14, graisse=700, ancre="start"),
        _texte(L / 2, 24, "profondeur réelle = sonde + hauteur de marée", taille=15, graisse=700),
        _texte(80, 56, "pleine mer", taille=14, graisse=700),
        _texte(400, 56, "pleine mer", taille=14, graisse=700),
        _texte(240, 124, "basse mer", taille=14, graisse=700),
        f'<line x1="440" y1="70" x2="476" y2="70" stroke="{FILET}" stroke-width="1.5" stroke-dasharray="4 4" />',
        f'<line x1="440" y1="150" x2="476" y2="150" stroke="{FILET}" stroke-width="1.5" stroke-dasharray="4 4" />',
        _fleche(470, 74, 470, 146, epaisseur=2),
        _fleche(470, 146, 470, 74, epaisseur=2),
        _texte(484, 114, "marnage", taille=14, graisse=700, ancre="start"),
        _fleche(360, 188, 360, 84, epaisseur=2),
        _texte(352, 172, "hauteur de marée", taille=14, graisse=700, ancre="end"),
        _fleche(470, 194, 470, 256, epaisseur=2),
        _fleche(470, 256, 470, 194, epaisseur=2),
        _texte(484, 230, "sonde", taille=14, graisse=700, ancre="start"),
    ]
    m.append("</svg>")
    return "".join(m) + "\n"


def astres() -> str:
    """Vive-eau et morte-eau : le Soleil et la Lune tirent dans le même sens, ou en croix."""
    L, H = 560, 210
    m = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    m.append(f'<line x1="280" y1="14" x2="280" y2="196" stroke="{FILET}" stroke-width="1.5" stroke-dasharray="5 5" />')
    # À gauche : deux flèches parallèles, de même sens.
    m += [
        _texte(140, 26, "Vive-eau :", taille=15, graisse=700),
        _texte(140, 46, "pleine et nouvelle lune", taille=14, couleur=DOUX),
        _texte(140, 84, "Soleil", taille=14),
        _fleche(60, 94, 220, 94, epaisseur=2),
        _texte(140, 128, "Lune", taille=14),
        _fleche(60, 138, 220, 138, epaisseur=2),
        _texte(140, 184, "ils tirent dans le même sens", taille=14, graisse=700),
    ]
    # À droite : deux flèches en croix.
    m += [
        _texte(420, 26, "Morte-eau :", taille=15, graisse=700),
        _texte(420, 46, "premier et dernier quartier", taille=14, couleur=DOUX),
        _fleche(350, 130, 470, 130, epaisseur=2),
        _texte(445, 150, "Soleil", taille=14),
        _fleche(400, 160, 400, 68, epaisseur=2),
        _texte(412, 80, "Lune", taille=14, ancre="start"),
        _texte(420, 184, "ils tirent en croix", taille=14, graisse=700),
    ]
    m.append("</svg>")
    return "".join(m) + "\n"


SCHEMAS = {
    "carte-marine-feu": feu,
    "carte-marine-maree": maree,
    "carte-marine-astres": astres,
}
