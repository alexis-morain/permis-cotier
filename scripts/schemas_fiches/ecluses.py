"""Les schémas de la fiche Écluses."""
from __future__ import annotations

from schemas_revision import (
    DOUX, EAU, EAU_FORTE, ENCRE, TERRE, TERRE_TRAIT,
    _entete, _fleche, _texte, _vague,
)

ROUGE = "#c8382e"


def _bateau(x: float, y: float, num: str | None = None) -> str:
    """Un bateau vu de dessus, étrave à droite, avec son rang d'arrivée."""
    dessin = (
        f'<path d="M {x - 34} {y - 11} H {x + 14} Q {x + 36} {y - 6} {x + 38} {y} Q {x + 36} {y + 6} {x + 14} {y + 11} '
        f'H {x - 34} Z" fill="#ffffff" stroke="{ENCRE}" stroke-width="2.5" />'
    )
    if num:
        dessin += _texte(x - 4, y + 5, num, taille=15, graisse=700)
    return dessin


def file() -> str:
    """Le garage : on attend dans l'ordre d'arrivée, sans dépasser, en deçà du panneau B.5."""
    L, H = 560, 250
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    # Les rives, le garage qui s'élargit, le sas à droite.
    morceaux += [
        f'<rect x="0" y="0" width="{L}" height="52" fill="{TERRE}" stroke="{TERRE_TRAIT}" stroke-width="1.5" />',
        f'<rect x="0" y="196" width="{L}" height="54" fill="{TERRE}" stroke="{TERRE_TRAIT}" stroke-width="1.5" />',
        f'<rect x="440" y="52" width="120" height="144" fill="#ffffff" stroke="{ENCRE}" stroke-width="2.5" />',
        _texte(500, 128, "Écluse", taille=16, graisse=700),
        _texte(80, 28, "Garage", taille=15, graisse=700),
    ]
    # Le panneau B.5 sur la rive.
    morceaux += [
        f'<rect x="372" y="20" width="44" height="26" rx="3" fill="#ffffff" stroke="{ENCRE}" stroke-width="2" />',
        _texte(394, 39, "B.5", taille=15, graisse=700),
        f'<line x1="394" y1="52" x2="394" y2="196" stroke="{ROUGE}" stroke-width="2.5" stroke-dasharray="6 5" />',
    ]
    # La file, dans l'ordre d'arrivée : le 1 est le plus près de l'écluse.
    for i, x in enumerate([330, 220, 110]):
        morceaux.append(_bateau(x, 124, str(i + 1)))
    morceaux += [
        _fleche(82, 82, 250, 82, couleur=ROUGE, pointille=True),
        f'<line x1="150" y1="68" x2="182" y2="96" stroke="{ROUGE}" stroke-width="4" stroke-linecap="round" />',
        f'<line x1="182" y1="68" x2="150" y2="96" stroke="{ROUGE}" stroke-width="4" stroke-linecap="round" />',
        _texte(20, 226, "Ordre d’arrivée : le 1 passe d’abord, aucun dépassement", taille=15, graisse=700, ancre="start"),
        _texte(20, 244, "Si tu n’entres pas tout de suite : arrêt en deçà du panneau B.5", taille=15, ancre="start"),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def sas() -> str:
    """Le sas en coupe : bateau amarré aux deux bajoyers, défenses, amarres qui suivent le niveau."""
    L, H = 560, 346
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="#ffffff" />']
    mur = 70
    morceaux += [
        f'<rect x="0" y="40" width="{mur}" height="290" fill="{TERRE}" stroke="{TERRE_TRAIT}" stroke-width="1.5" />',
        f'<rect x="{L - mur}" y="40" width="{mur}" height="290" fill="{TERRE}" stroke="{TERRE_TRAIT}" stroke-width="1.5" />',
        f'<rect x="{mur}" y="170" width="{L - 2 * mur}" height="160" fill="{EAU}" />',
        f'<line x1="{mur}" y1="170" x2="{L - mur}" y2="170" stroke="{EAU_FORTE}" stroke-width="2" />',
        _texte(mur / 2, 30, "Bajoyer", taille=14, graisse=700),
        _texte(L - mur / 2, 30, "Bajoyer", taille=14, graisse=700),
    ]
    # Le bateau de profil, flottant, avec une défense de chaque côté.
    morceaux += [
        f'<path d="M 190 150 H 370 L 352 188 H 208 Z" fill="#ffffff" stroke="{ENCRE}" stroke-width="2.5" />',
        f'<path d="M 250 150 V 120 H 310 L 330 150 Z" fill="#ffffff" stroke="{ENCRE}" stroke-width="2.5" />',
        f'<circle cx="184" cy="168" r="8" fill="{EAU_FORTE}" stroke="{ENCRE}" stroke-width="2" />',
        f'<circle cx="376" cy="168" r="8" fill="{EAU_FORTE}" stroke="{ENCRE}" stroke-width="2" />',
    ]
    # Les amarres du bateau aux bajoyers.
    morceaux += [
        f'<line x1="200" y1="150" x2="{mur}" y2="104" stroke="{ENCRE}" stroke-width="2.5" />',
        f'<line x1="360" y1="150" x2="{L - mur}" y2="104" stroke="{ENCRE}" stroke-width="2.5" />',
        f'<circle cx="{mur}" cy="104" r="5" fill="{ENCRE}" />',
        f'<circle cx="{L - mur}" cy="104" r="5" fill="{ENCRE}" />',
        _fleche(280, 280, 280, 206, epaisseur=3),
        _fleche(280, 206, 280, 280, epaisseur=3),
    ]
    # Les légendes, sous l'eau et au-dessus.
    morceaux += [
        _vague(mur + 30, 250, 16), _vague(L - mur - 70, 250, 16),
        _texte(130, 78, "Amarres manœuvrées", taille=14, graisse=700, ancre="middle"),
        _texte(130, 94, "au fil du niveau", taille=14, ancre="middle"),
        _texte(430, 78, "Rien ne choque", taille=14, graisse=700, ancre="middle"),
        _texte(430, 94, "les bajoyers ni les portes", taille=14, ancre="middle"),
        _texte(280, 300, "Le niveau monte ou descend", taille=14, ancre="middle"),
        _texte(280, 318, "Bateau amarré : plus de propulsion mécanique", taille=14, graisse=700, ancre="middle"),
        _texte(280, 336, "jusqu’à l’autorisation de sortie, sauf règlement local", taille=14, graisse=700, ancre="middle"),
        _texte(176, 208, "défense", taille=14, ancre="middle", couleur=DOUX),
        _texte(384, 208, "défense", taille=14, ancre="middle", couleur=DOUX),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


SCHEMAS = {
    "ecluses-file": file,
    "ecluses-sas": sas,
}
