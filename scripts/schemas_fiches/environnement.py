"""Les schémas de la fiche Respecter la mer."""
from __future__ import annotations

from schemas_revision import (
    DOUX, EAU, ENCRE, _entete, _texte, _vague,
)

ROUGE = "#c4332b"


def _bidon(x: float, y: float) -> str:
    return (
        f'<rect x="{x - 12}" y="{y}" width="24" height="30" rx="3" fill="#ffffff" stroke="{ENCRE}" stroke-width="2" />'
        f'<rect x="{x - 5}" y="{y - 6}" width="10" height="6" fill="{ENCRE}" />'
    )


def _croix(x: float, y: float) -> str:
    return (
        f'<circle cx="{x}" cy="{y}" r="13" fill="{ROUGE}" />'
        f'<line x1="{x - 6}" y1="{y - 6}" x2="{x + 6}" y2="{y + 6}" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />'
        f'<line x1="{x - 6}" y1="{y + 6}" x2="{x + 6}" y2="{y - 6}" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />'
    )


def rejets() -> str:
    """Un rejet nuisible est interdit au ponton comme au large : aucun seuil de distance."""
    L, H = 560, 210
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    morceaux.append(_texte(L / 2, 26, "Une substance nuisible rejetée en mer", taille=16, graisse=700))
    for x, nom in [(90, "Au ponton"), (230, "À 3 milles"), (370, "À 6 milles"), (490, "À 12 milles")]:
        morceaux += [
            _bidon(x, 52),
            _vague(x, 100, 18),
            _croix(x, 132),
            _texte(x, 170, nom, taille=15, graisse=700),
        ]
    morceaux.append(_texte(L / 2, 198, "Interdit à toute distance : le texte ne pose aucun seuil", taille=14, couleur=DOUX))
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def amendes() -> str:
    """Les deux montants à ne pas confondre, à l'échelle."""
    L, H = 560, 150
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    pleine = 520
    morceaux += [
        _texte(20, 28, "Infractions de pêche", taille=16, graisse=700, ancre="start"),
        f'<rect x="20" y="36" width="{pleine * 0.225:.0f}" height="26" fill="#8e8c86" />',
        _texte(20 + pleine * 0.225 + 10, 55, "22 500 euros", taille=16, graisse=700, ancre="start"),
        _texte(20, 92, "Rejets nuisibles en mer", taille=16, graisse=700, ancre="start"),
        f'<rect x="20" y="100" width="{pleine}" height="26" fill="{ENCRE}" />',
        _texte(20 + pleine - 10, 119, "100 000 euros", taille=16, graisse=700, ancre="end", couleur="#ffffff"),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


SCHEMAS = {
    "environnement-rejets": rejets,
    "environnement-amendes": amendes,
}
