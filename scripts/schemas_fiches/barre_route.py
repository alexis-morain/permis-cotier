"""Les schémas de la fiche Barre et route."""
from __future__ import annotations

from schemas_revision import DOUX, EAU, ENCRE, FILET, _entete, _fleche, _texte

ROUGE = "#c8382e"
VERT = "#1f9a55"


def _navire(x: float, y: float, cap: float, echelle: float = 1.0, bord: str | None = None) -> str:
    """Un navire vu de dessus, étrave en haut avant rotation. `bord` : « babord » ou « tribord » pose un feu de côté."""
    feux = ""
    if bord == "babord":
        feux = f'<circle cx="-8" cy="4" r="4.5" fill="{ROUGE}" />'
    elif bord == "tribord":
        feux = f'<circle cx="8" cy="4" r="4.5" fill="{VERT}" />'
    return (
        f'<g transform="translate({x} {y}) rotate({cap}) scale({echelle})">'
        f'<path d="M0,-26 Q11,-12 10,8 L10,22 L-10,22 L-10,8 Q-11,-12 0,-26 Z" fill="#ffffff" '
        f'stroke="{ENCRE}" stroke-width="2.5" />{feux}</g>'
    )


def hierarchie() -> str:
    """L'échelle de la règle 18 : chacun s'écarte de ceux qui sont au-dessus de lui."""
    L, H = 400, 300
    rangs = [
        "Non maître de sa manœuvre",
        "Capacité de manœuvre restreinte",
        "Handicapé par son tirant d’eau",
        "En train de pêcher",
        "À voile",
        "À propulsion mécanique",
    ]
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="#ffffff" />']
    x0, larg, haut, pas = 20, 320, 30, 36
    y0 = 36
    morceaux.append(_texte(x0, 22, "Le plus gêné, le plus privilégié", taille=14, graisse=700, ancre="start"))
    for i, nom in enumerate(rangs):
        y = y0 + i * pas
        morceaux += [
            f'<rect x="{x0}" y="{y}" width="{larg}" height="{haut}" rx="4" fill="{EAU}" stroke="{FILET}" stroke-width="1.5" />',
            _texte(x0 + 14, y + 20, str(i + 1), taille=15, graisse=700, ancre="start"),
            _texte(x0 + 38, y + 20, nom, taille=15, ancre="start"),
        ]
    fin = y0 + 5 * pas + haut
    morceaux += [
        _fleche(372, fin - 6, 372, y0 + 6, epaisseur=3),
        _texte(x0, fin + 22, "Chacun s’écarte de ceux qui sont au-dessus.", taille=14, ancre="start"),
        _texte(x0, fin + 42, "Les règles 9, 10 et 13 passent avant.", taille=14, ancre="start", couleur=DOUX),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def croisement() -> str:
    """Deux navires à moteur dont les routes se croisent : le feu de côté que tu vois donne la réponse."""
    L, H = 560, 300
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    # Ton navire, étrave en haut ; l'autre venant de droite montre son bâbord, celui de gauche son tribord.
    morceaux += [
        _navire(280, 226, 0, 1.2),
        _fleche(280, 188, 280, 118, epaisseur=3),
        _texte(280, 284, "Toi", taille=15, graisse=700),
        _navire(450, 120, -90, 1.2, "babord"),
        _fleche(402, 120, 360, 120, epaisseur=3),
        _navire(110, 120, 90, 1.2, "tribord"),
        _fleche(158, 120, 200, 120, epaisseur=3),
        _texte(450, 62, "Tu vois son feu rouge", taille=15, graisse=700),
        _texte(450, 82, "Tu t’écartes", taille=15),
        _texte(110, 62, "Tu vois son feu vert", taille=15, graisse=700),
        _texte(110, 82, "Tu maintiens", taille=15),
        _texte(450, 180, "Le rouge arrête,", taille=14, couleur=DOUX),
        _texte(450, 198, "le vert laisse passer", taille=14, couleur=DOUX),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def visibilite_reduite() -> str:
    """Un écho radar seul : deux manœuvres à éviter, selon que l'écho est avant ou arrière du travers."""
    L, H = 400, 300
    cx, cy = 200, 150
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    morceaux += [
        f'<line x1="20" y1="{cy}" x2="{L - 20}" y2="{cy}" stroke="{DOUX}" stroke-width="1.5" stroke-dasharray="5 6" />',
        _texte(L - 22, cy - 6, "le travers", taille=14, ancre="end", couleur=DOUX),
        _navire(cx, cy, 0, 1.1),
        # Écho sur l'avant du travers : on ne vient pas sur bâbord.
        f'<circle cx="270" cy="70" r="8" fill="{ENCRE}" />',
        _texte(270, 50, "Écho sur l’avant du travers", taille=14, graisse=700),
        f'<path d="M {cx - 6} {cy - 40} Q {cx - 30} {cy - 70} {cx - 80} {cy - 76}" fill="none" stroke="{ROUGE}" stroke-width="3" stroke-linecap="round" />',
        f'<polygon points="{cx - 88},{cy - 77} {cx - 74},{cy - 85} {cx - 74},{cy - 68}" fill="{ROUGE}" />',
        _texte(cx - 84, cy - 96, "Pas sur bâbord", taille=14, graisse=700, ancre="middle", couleur=ROUGE),
        # Écho par le travers ou sur l'arrière : on ne vient pas vers lui.
        f'<circle cx="300" cy="234" r="8" fill="{ENCRE}" />',
        _texte(200, 284, "Écho par le travers ou sur l’arrière", taille=14, graisse=700),
        f'<path d="M {cx + 10} {cy + 6} Q {cx + 50} {cy + 40} {cx + 84} {cy + 76}" fill="none" stroke="{ROUGE}" stroke-width="3" stroke-linecap="round" />',
        f'<polygon points="{cx + 92},{cy + 84} {cx + 74},{cy + 80} {cx + 86},{cy + 68}" fill="{ROUGE}" />',
        _texte(cx - 20, cy + 70, "Pas vers lui", taille=14, graisse=700, ancre="end", couleur=ROUGE),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


SCHEMAS = {
    "barre-route-hierarchie": hierarchie,
    "barre-route-croisement": croisement,
    "barre-route-visibilite-reduite": visibilite_reduite,
}
