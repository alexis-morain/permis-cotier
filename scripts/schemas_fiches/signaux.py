"""Les schémas de la fiche Signaux."""
from __future__ import annotations

import feux
from schemas_revision import DOUX, EAU, ENCRE, FILET, TERRE_TRAIT, _entete, _texte


def code_sonore() -> str:
    """Les deux durées du code sonore, sur une même échelle en secondes."""
    L, H = 400, 214
    x0, s = 40, 50  # origine et pixels par seconde
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    morceaux += [
        _texte(x0, 28, "Son bref : 1 seconde environ", taille=15, graisse=700, ancre="start"),
        f'<rect x="{x0}" y="38" width="{s}" height="22" fill="{ENCRE}" />',
        _texte(x0, 94, "Son prolongé : 4 à 6 secondes", taille=15, graisse=700, ancre="start"),
        f'<rect x="{x0}" y="104" width="{4 * s}" height="22" fill="{ENCRE}" />',
        f'<rect x="{x0 + 4 * s}" y="104" width="{2 * s}" height="22" fill="{FILET}" />',
        f'<line x1="{x0}" y1="156" x2="{x0 + 6 * s}" y2="156" stroke="{ENCRE}" stroke-width="2" />',
    ]
    for i in range(7):
        x = x0 + i * s
        morceaux.append(f'<line x1="{x}" y1="150" x2="{x}" y2="162" stroke="{ENCRE}" stroke-width="2" />')
        morceaux.append(_texte(x, 182, str(i), taille=15))
    morceaux.append(_texte(x0 + 6 * s + 22, 182, "s", taille=15, couleur=DOUX))
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def portuaires() -> str:
    """Les deux messages principaux du trafic portuaire : trois feux rouges, trois feux verts."""
    L, H = 400, 218
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    for x, couleur, lignes in [
        (110, "rouge", ["Passage interdit"]),
        (290, "vert", ["Passage autorisé,", "sous certaines conditions"]),
    ]:
        morceaux.append(f'<rect x="{x - 42}" y="14" width="84" height="144" rx="8" fill="{feux.CIEL}" />')
        morceaux += [f'<circle cx="{x}" cy="{48 + 40 * i}" r="14" fill="{feux.COULEURS[couleur]}" />' for i in range(3)]
        for k, ligne in enumerate(lignes):
            morceaux.append(_texte(x, 182 + 18 * k, ligne, taille=15, graisse=700 if k == 0 else 400))
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def avis_meteo() -> str:
    """Les six avis, de force 7 à force 12 : le nom suit la force."""
    L, H = 560, 300
    noms = [
        (7, ["Grand", "frais"]),
        (8, ["Coup", "de vent"]),
        (9, ["Fort coup", "de vent"]),
        (10, ["Tempête"]),
        (11, ["Violente", "tempête"]),
        (12, ["Ouragan"]),
    ]
    largeur, ecart, x0, bas = 76, 12, 22, 232
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    morceaux.append(_texte(x0, 22, "Avis de…, du nom de la force annoncée", taille=15, graisse=700, ancre="start"))
    for i, (force, mots) in enumerate(noms):
        x = x0 + i * (largeur + ecart)
        haut = 50 + 28 * (5 - i)
        morceaux.append(
            f'<rect x="{x}" y="{haut}" width="{largeur}" height="{bas - haut}" fill="#ffffff" '
            f'stroke="{TERRE_TRAIT}" stroke-width="1.5" />'
        )
        morceaux.append(_texte(x + largeur / 2, haut + 24, f"Force {force}", taille=15, graisse=700))
        for k, mot in enumerate(mots):
            morceaux.append(_texte(x + largeur / 2, bas + 20 + 18 * k, mot, taille=15))
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


SCHEMAS = {
    "signaux-code-sonore": code_sonore,
    "signaux-portuaires": portuaires,
    "signaux-avis-meteo": avis_meteo,
}
