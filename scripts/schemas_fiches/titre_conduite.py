"""Les schémas de la fiche Ce que le permis autorise."""
from __future__ import annotations

from schemas_revision import (
    DOUX, EAU, ENCRE, FILET, TERRE, TERRE_TRAIT,
    _entete, _texte,
)


def _carte(x: float, y: float, l: float, h: float, *, fort: bool = False) -> str:
    trait = ENCRE if fort else FILET
    epaisseur = 2.5 if fort else 1.5
    return (
        f'<rect x="{x}" y="{y}" width="{l}" height="{h}" rx="6" fill="#ffffff" '
        f'stroke="{trait}" stroke-width="{epaisseur}" />'
    )


def seuil() -> str:
    """Le permis se décide à la puissance du moteur ; le voilier fait exception en mer."""
    L, H = 560, 276
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    morceaux += [
        _texte(L / 2, 26, "Le moteur décide, pas la longueur ni la distance", taille=16, graisse=700),
        _carte(20, 44, 250, 70),
        _texte(145, 74, "4,5 kW ou moins", taille=17, graisse=700),
        _texte(145, 98, "aucun titre demandé", taille=15),
        _carte(290, 44, 250, 70, fort=True),
        _texte(415, 74, "Plus de 4,5 kW", taille=17, graisse=700),
        _texte(415, 98, "permis exigé", taille=15),
        _texte(L / 2, 138, "4,5 kW, soit 6,1 chevaux", taille=15, couleur=DOUX),
        _texte(L / 2, 168, "Le voilier échappe au seuil en mer seulement", taille=16, graisse=700),
        _carte(20, 182, 250, 76),
        _texte(145, 204, "En mer", taille=15, graisse=700),
        _texte(145, 224, "voilier sans permis, même avec", taille=14),
        _texte(145, 244, "un moteur auxiliaire", taille=14),
        _carte(290, 182, 250, 76),
        _texte(415, 204, "Rivières et canaux", taille=15, graisse=700),
        _texte(415, 224, "voilier, moteur de plus de 4,5 kW :", taille=14),
        _texte(415, 244, "titre eaux intérieures", taille=14),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def distances() -> str:
    """Les options : la distance d'un abri en mer, la longueur du bateau sur le domaine fluvial."""
    L, H = 560, 250
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    morceaux += [
        _texte(L / 2, 24, "En mer, la distance d’un abri", taille=16, graisse=700),
        f'<rect x="20" y="38" width="64" height="62" fill="{TERRE}" stroke="{TERRE_TRAIT}" stroke-width="1.5" />',
        _texte(52, 74, "Abri", taille=15, graisse=700),
        _carte(84, 38, 216, 62),
        _texte(192, 64, "Option côtière", taille=16, graisse=700),
        _texte(192, 86, "jusqu’à 6 milles", taille=15),
        _carte(300, 38, 240, 62, fort=True),
        _texte(420, 64, "Extension hauturière", taille=16, graisse=700),
        _texte(420, 86, "au-delà de 6 milles", taille=15),
        _texte(300, 120, "6 milles", taille=15, graisse=700),
        _texte(L / 2, 160, "Sur le domaine fluvial, la longueur du bateau", taille=16, graisse=700),
        _carte(20, 174, 280, 62),
        _texte(160, 200, "Option eaux intérieures", taille=16, graisse=700),
        _texte(160, 222, "moins de 20 mètres", taille=15),
        _carte(300, 174, 240, 62, fort=True),
        _texte(420, 200, "Grande plaisance", taille=16, graisse=700),
        _texte(420, 222, "20 mètres et plus", taille=15),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def delais() -> str:
    """Les trois durées du retrait, côte à côte pour ne pas les confondre."""
    L, H = 560, 150
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    cartes = [
        ("8 jours", ["retrait avant audition,", "en urgence motivée"]),
        ("1 an", ["au plus : le retrait", "temporaire"]),
        ("3 ans", ["avant de solliciter un", "nouveau permis, après", "un retrait définitif"]),
    ]
    for i, (chiffre, lignes) in enumerate(cartes):
        x = 20 + i * 180
        morceaux.append(_carte(x, 20, 160, 110))
        morceaux.append(_texte(x + 80, 50, chiffre, taille=18, graisse=700))
        for j, ligne in enumerate(lignes):
            morceaux.append(_texte(x + 80, 76 + j * 20, ligne, taille=14))
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


SCHEMAS = {
    "titre-conduite-seuil": seuil,
    "titre-conduite-distances": distances,
    "titre-conduite-delais": delais,
}
