"""Les schémas de la fiche Balisage région B."""
from __future__ import annotations

from schemas_revision import (
    DOUX, EAU, ENCRE, FILET, TERRE, TERRE_TRAIT,
    _bouee, _entete, _fleche, _texte, _vague,
)


def chenal() -> str:
    """Le chenal de la région B vu du large : le vert à bâbord, le rouge à tribord, en rentrant."""
    L, H = 560, 330
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    morceaux += [
        f'<path d="M 0 0 H {L} V 46 H 330 V 70 H 300 V 46 H 260 V 70 H 230 V 46 H 0 Z" fill="{TERRE}" '
        f'stroke="{TERRE_TRAIT}" stroke-width="1.5" />',
        _texte(L / 2, 28, "Le port", taille=15, graisse=700),
        _texte(L / 2, H - 14, "Le large", taille=15, graisse=700),
    ]
    for i, y in enumerate([128, 200, 272]):
        morceaux.append(_bouee("laterale-babord-region-b", 200, y, 0.34, f"rb-b{i}"))
        morceaux.append(_vague(200, y + 4))
        morceaux.append(_bouee("laterale-tribord-region-b", 360, y, 0.34, f"rb-t{i}"))
        morceaux.append(_vague(360, y + 4))
    morceaux += [
        _fleche(L / 2, 292, L / 2, 96, epaisseur=3),
        _texte(150, 176, "Bâbord", taille=15, graisse=700, ancre="end"),
        _texte(150, 194, "vert", taille=16, ancre="end"),
        _texte(150, 210, "cylindre", taille=16, ancre="end"),
        _texte(410, 176, "Tribord", taille=15, graisse=700, ancre="start"),
        _texte(410, 194, "rouge", taille=16, ancre="start"),
        _texte(410, 210, "cône", taille=16, ancre="start"),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def invariants() -> str:
    """Les marques qui ne changent pas d'une région à l'autre, et les deux qui s'inversent."""
    L, H = 560, 250
    marques = [
        ("cardinale-nord", ["Cardinales"]),
        ("danger-isole", ["Danger", "isolé"]),
        ("eaux-saines", ["Eaux", "saines"]),
        ("speciale", ["Spéciale"]),
        ("danger-nouveau", ["Danger", "nouveau"]),
        ("laterale-babord-region-b", ["Bâbord"]),
        ("laterale-tribord-region-b", ["Tribord"]),
    ]
    pas = L / len(marques)
    bas = 170
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    sep = 5 * pas
    morceaux += [
        f'<line x1="{sep}" y1="12" x2="{sep}" y2="{H - 12}" stroke="{FILET}" stroke-width="2" stroke-dasharray="5 6" />',
        _texte(sep / 2, 26, "Identiques en région A et en région B", taille=15, graisse=700),
        _texte(sep + (L - sep) / 2, 26, "Couleur inversée", taille=15, graisse=700),
        f'<line x1="14" y1="36" x2="{sep - 14}" y2="36" stroke="{ENCRE}" stroke-width="2" />',
        f'<line x1="{sep + 14}" y1="36" x2="{L - 14}" y2="36" stroke="{ENCRE}" stroke-width="2" />',
    ]
    for i, (nom, mots) in enumerate(marques):
        x = pas * i + pas / 2
        morceaux.append(_bouee(nom, x, bas, 0.36, f"inv-{i}"))
        morceaux.append(_vague(x, bas + 4, 14))
        for k, mot in enumerate(mots):
            morceaux.append(_texte(x, bas + 28 + 18 * k, mot, taille=14))
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


SCHEMAS = {
    "balisage-region-b-chenal": chenal,
    "balisage-region-b-invariants": invariants,
}
