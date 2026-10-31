"""Les schémas de la fiche Carburant."""
from __future__ import annotations

from schemas_revision import DOUX, EAU, EAU_FORTE, ENCRE, _entete, _fleche, _texte


def _case(x: float, y: float, l: float, h: float, gros: str, petit: str, *, fond: str = "#ffffff") -> str:
    return (
        f'<rect x="{x}" y="{y}" width="{l}" height="{h}" rx="6" fill="{fond}" stroke="{ENCRE}" stroke-width="2" />'
        + _texte(x + l / 2, y + 30, gros, taille=18, graisse=700)
        + _texte(x + l / 2, y + 52, petit, taille=14, couleur=DOUX)
    )


def chaine() -> str:
    """De l'heure au mille : deux opérations, une division puis une multiplication."""
    L, H = 560, 190
    m = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    m += [
        _case(24, 18, 150, 66, "120 L", "carburant utilisable"),
        _texte(197, 60, "÷", taille=18, graisse=700),
        _case(220, 18, 150, 66, "15 L/h", "consommation"),
        _fleche(378, 51, 414, 51),
        _case(422, 18, 120, 66, "8 h", "autonomie", fond="#ffffff"),
        _case(24, 106, 150, 66, "8 h", "autonomie"),
        _texte(197, 148, "×", taille=18, graisse=700),
        _case(220, 106, 150, 66, "12 nœuds", "vitesse"),
        _fleche(378, 139, 414, 139),
        _case(422, 106, 120, 66, "96 milles", "distance"),
    ]
    m.append("</svg>")
    return "".join(m) + "\n"


def tiers() -> str:
    """Le réservoir en trois parts : aller, retour, réserve, avec le calcul de l'aller."""
    L, H = 560, 240
    m = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    m.append(_texte(L / 2, 26, "150 L utilisables, 25 L/h, 20 nœuds", taille=15, graisse=700))
    parts = [("Aller", "#ffffff"), ("Retour", "#ffffff"), ("Réserve", EAU_FORTE)]
    for i, (nom, fond) in enumerate(parts):
        x = 40 + i * 160
        m.append(f'<rect x="{x}" y="46" width="160" height="50" fill="{fond}" stroke="{ENCRE}" stroke-width="2" />')
        m.append(_texte(x + 80, 68, nom, taille=16, graisse=700))
        m.append(_texte(x + 80, 87, "50 L", taille=14, couleur=ENCRE))
    m += [
        _texte(40, 128, "50 L ÷ 25 L/h = 2 h", taille=14, ancre="start"),
        _texte(40, 148, "2 h × 20 nœuds = 40 milles", taille=14, ancre="start"),
        _texte(40, 176, "Éloignement maximal", taille=14, graisse=700, ancre="start"),
        _texte(40, 194, "40 milles", taille=14, graisse=700, ancre="start"),
        _texte(370, 128, "L’imprévu :", taille=14, graisse=700, ancre="start"),
        _texte(370, 148, "vent, courant,", taille=14, ancre="start"),
        _texte(370, 166, "mer formée,", taille=14, ancre="start"),
        _texte(370, 184, "détour, assistance", taille=14, ancre="start"),
        _texte(L / 2, 226, "Plein : 150 ÷ 25 = 6 h, soit 120 milles de route", taille=14, couleur=DOUX),
    ]
    m.append("</svg>")
    return "".join(m) + "\n"


SCHEMAS = {
    "carburant-chaine": chaine,
    "carburant-tiers": tiers,
}
