"""Les schémas de la fiche Météo."""
from __future__ import annotations

from schemas_revision import DOUX, EAU, EAU_FORTE, ENCRE, TERRE, TERRE_TRAIT, _entete, _fleche, _texte


def brise() -> str:
    """La brise de mer en coupe : la terre chauffe, l'air monte, l'air marin vient le remplacer."""
    L, H = 560, 250
    m = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="#ffffff" />']
    m += [
        f'<rect x="0" y="150" width="280" height="100" fill="{EAU}" />',
        f'<rect x="280" y="150" width="280" height="100" fill="{TERRE}" stroke="{TERRE_TRAIT}" stroke-width="1.5" />',
        f'<line x1="0" y1="150" x2="280" y2="150" stroke="{EAU_FORTE}" stroke-width="2.5" />',
        _texte(L / 2, 26, "Le jour, la terre chauffe plus vite que la mer", taille=15, graisse=700),
        _texte(140, 232, "mer", taille=16, graisse=700),
        _texte(420, 232, "terre", taille=16, graisse=700),
        _fleche(60, 130, 350, 130, epaisseur=3),
        _texte(150, 112, "brise de mer", taille=16, graisse=700),
        _texte(150, 178, "début d’après-midi", taille=14, couleur=DOUX),
        _fleche(440, 122, 440, 56, epaisseur=3),
        _texte(428, 82, "l’air monte", taille=14, ancre="end"),
        _texte(428, 100, "au-dessus du rivage", taille=14, ancre="end"),
        _texte(420, 188, "la nuit : brise de terre,", taille=14, couleur=DOUX),
        _texte(420, 206, "plus faible", taille=14, couleur=DOUX),
    ]
    m.append("</svg>")
    return "".join(m) + "\n"


def portees() -> str:
    """Les trois portées des bulletins marine, de la côte vers le large (hors échelle)."""
    L, H = 560, 190
    m = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="#ffffff" />']
    m.append(f'<rect x="0" y="30" width="60" height="100" fill="{TERRE}" stroke="{TERRE_TRAIT}" stroke-width="1.5" />')
    m.append(_texte(30, 86, "côte", taille=15, graisse=700))
    zones = [
        (60, 160, EAU, "Bulletin côte", ["jusqu’à 20 milles", "des côtes"]),
        (220, 160, "#cfe0ea", "Bulletin large", ["jusqu’à 200 milles"]),
        (380, 180, EAU_FORTE, "Bulletin grand large", ["au-delà"]),
    ]
    for x, l, fond, titre, lignes in zones:
        m.append(f'<rect x="{x}" y="30" width="{l}" height="100" fill="{fond}" stroke="{ENCRE}" stroke-width="1.5" />')
        m.append(_texte(x + l / 2, 66, titre, taille=15, graisse=700))
        for i, ligne in enumerate(lignes):
            m.append(_texte(x + l / 2, 88 + i * 18, ligne, taille=14))
    m += [
        _fleche(140, 168, 140, 136, epaisseur=2.5),
        _texte(154, 160, "ta navigation côtière est ici", taille=14, graisse=700, ancre="start"),
    ]
    m.append("</svg>")
    return "".join(m) + "\n"


SCHEMAS = {
    "meteo-brise": brise,
    "meteo-portees": portees,
}
