"""Les schémas de la fiche Répondre de son équipage."""
from __future__ import annotations

import balisage
from schemas_revision import (
    DOUX, EAU, ENCRE, FILET, TERRE, TERRE_TRAIT,
    _entete, _fleche, _texte, _vague,
)

ORANGE = "#ff6a00"
BANDE = "#d3e3ee"


def _sphere(x: float, y: float, r: float = 7) -> str:
    return (
        f'<circle cx="{x}" cy="{y}" r="{r}" fill="{balisage.COULEURS["jaune"]}" '
        f'stroke="#2a2a2a" stroke-opacity="0.5" stroke-width="1.2" />'
    )


def ski() -> str:
    """Le ski nautique vu du ciel : la bande des 300 mètres, son chenal, le bateau et le skieur."""
    L, H = 560, 300
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    morceaux += [
        f'<rect x="0" y="0" width="{L}" height="40" fill="{TERRE}" stroke="{TERRE_TRAIT}" stroke-width="1.5" />',
        _texte(24, 26, "Rivage", taille=15, graisse=700, ancre="start"),
        f'<rect x="0" y="41" width="{L}" height="79" fill="{BANDE}" />',
        _texte(24, 84, "Bande des", taille=15, graisse=700, ancre="start"),
        _texte(24, 102, "300 mètres", taille=15, graisse=700, ancre="start"),
    ]
    for x in range(20, L, 46):
        if 250 < x < 350:
            continue
        morceaux.append(_sphere(x, 120))
    morceaux += [
        _fleche(288, 176, 288, 56, epaisseur=3),
        _fleche(312, 56, 312, 176, epaisseur=3),
        _texte(360, 84, "Chenal de vitesse :", taille=15, graisse=700, ancre="start"),
        _texte(360, 102, "départ et retour, dégagé", taille=14, ancre="start", couleur=DOUX),
    ]
    # Le skieur et sa remorque, puis le bateau tracteur et sa flamme.
    morceaux += [
        f'<line x1="150" y1="212" x2="380" y2="212" stroke="{ENCRE}" stroke-width="2" stroke-dasharray="6 4" />',
        f'<circle cx="150" cy="212" r="8" fill="{ENCRE}" />',
        _vague(150, 232, 16),
        _texte(150, 258, "Skieur : gilet", taille=14, graisse=700),
        f'<path d="M 380 200 L 470 200 Q 500 212 470 224 L 380 224 Z" fill="#ffffff" stroke="{ENCRE}" stroke-width="2" />',
        f'<line x1="392" y1="200" x2="392" y2="176" stroke="{ENCRE}" stroke-width="2" />',
        f'<polygon points="392,176 392,190 366,183" fill="{ORANGE}" />',
        _texte(372, 162, "flamme orange de 2 m", taille=14, ancre="start"),
        _texte(430, 250, "Deux à bord :", taille=14, graisse=700),
        _texte(430, 268, "l’un conduit, l’autre surveille", taille=14),
        _texte(L / 2, 292, "De jour, au-delà des 300 mètres", taille=15, graisse=700),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def _boite(x: float, y: float, l: float, h: float) -> str:
    return f'<rect x="{x}" y="{y}" width="{l}" height="{h}" rx="6" fill="#ffffff" stroke="{FILET}" stroke-width="1.5" />'


def _rangee(y: float, titre: str, etapes: list[tuple[list[str], list[str]]]) -> list[str]:
    morceaux = [_texte(12, y + 16, titre, taille=16, graisse=700, ancre="start")]
    for i, (haut, bas) in enumerate(etapes):
        x = 11 + i * 136
        morceaux.append(_boite(x, y + 28, 130, 112))
        for j, ligne in enumerate(haut):
            morceaux.append(_texte(x + 65, y + 50 + j * 18, ligne, taille=15, graisse=700))
        for j, ligne in enumerate(bas):
            morceaux.append(_texte(x + 65, y + 50 + len(haut) * 18 + 6 + j * 17, ligne, taille=14, couleur=DOUX))
        if i < len(etapes) - 1:
            morceaux.append(_fleche(x + 130, y + 84, x + 136, y + 84, epaisseur=2))
    return morceaux


def ordres() -> str:
    """L'ordre des gestes face à un incendie et face à une voie d'eau."""
    L, H = 560, 340
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    morceaux += _rangee(4, "Incendie", [
        (["1. Couper", "l’alimentation"], ["vanne, batterie,", "robinet de gaz"]),
        (["2. Feu sous", "le vent"], ["manœuvrer pour", "venir au vent"]),
        (["3. Base des", "flammes"], ["capot pas grand", "ouvert : par", "l’orifice prévu"]),
        (["4. Alerter"], ["feu non maîtrisé", "en quelques", "instants"]),
    ])
    morceaux += _rangee(170, "Voie d’eau, après les brassières", [
        (["1. Localiser"], ["l’entrée d’eau :", "presse-étoupe,", "passe-coque,", "vanne"]),
        (["2. Aveugler"], ["de l’intérieur", "comme de", "l’extérieur"]),
        (["3. Assécher"], ["pompe et écope,", "le niveau", "doit baisser"]),
        (["4. Alerter"], ["rallier l’abri", "le plus proche"]),
    ])
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def homme_a_la_mer() -> str:
    """La manœuvre : le vent, la personne, la bouée, le bateau qui revient face au vent."""
    L, H = 560, 370
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    morceaux += [
        # le vent
        _fleche(30, 46, 124, 116, epaisseur=3, couleur=DOUX),
        _texte(30, 34, "Vent", taille=15, graisse=700, ancre="start"),
        # le bateau, proue en haut, face au vent
        f'<path d="M 200 160 Q 226 200 222 240 L 222 310 L 178 310 L 178 240 Q 174 200 200 160 Z" '
        f'fill="#ffffff" stroke="{ENCRE}" stroke-width="2.5" />',
        f'<circle cx="200" cy="318" r="6" fill="none" stroke="{ENCRE}" stroke-width="2" />',
        _texte(166, 190, "Approche face au vent,", taille=14, graisse=700, ancre="end"),
        _texte(166, 208, "doucement", taille=14, ancre="end"),
        _texte(166, 290, "Hélice débrayée", taille=14, graisse=700, ancre="end"),
        _texte(166, 308, "avant le contact", taille=14, ancre="end"),
        # la personne et la bouée
        _vague(300, 232, 18),
        f'<circle cx="300" cy="216" r="9" fill="{ENCRE}" />',
        f'<circle cx="340" cy="256" r="10" fill="none" stroke="{ENCRE}" stroke-width="5" />',
        # l'équipier qui montre
        f'<line x1="332" y1="152" x2="304" y2="204" stroke="{DOUX}" stroke-width="2" stroke-dasharray="5 4" />',
        _texte(300, 108, "Un équipier désigné ne la", taille=14, graisse=700, ancre="start"),
        _texte(300, 126, "quitte plus des yeux, bras tendu", taille=14, ancre="start"),
        _texte(366, 262, "Bouée jetée tout de suite,", taille=14, graisse=700, ancre="start"),
        _texte(366, 280, "position marquée au GPS", taille=14, ancre="start"),
        # la récupération, côté sous le vent
        f'<line x1="236" y1="244" x2="236" y2="304" stroke="{ENCRE}" stroke-width="4" stroke-linecap="round" />',
        _texte(246, 322, "Récupération par le côté sous le vent,", taille=14, graisse=700, ancre="start"),
        _texte(246, 340, "si possible à l’horizontale", taille=14, ancre="start"),
        _texte(L / 2, 362, "Pas retrouvée tout de suite : MAYDAY, avec la position du point de chute", taille=14, couleur=DOUX),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


SCHEMAS = {
    "ski-responsabilites-ski": ski,
    "ski-responsabilites-ordres": ordres,
    "ski-responsabilites-homme-a-la-mer": homme_a_la_mer,
}
