"""Les schémas de la fiche VHF : les zones du SMDSM et la trame d'un message de détresse."""
from __future__ import annotations

from schemas_revision import (
    DOUX, EAU, ENCRE, FILET, TERRE, TERRE_TRAIT,
    _entete, _fleche, _texte,
)


def zones_smdsm() -> str:
    """Les quatre zones du SMDSM, lues par le moyen radio qui porte l'alerte."""
    L, H = 560, 250
    x0, largeur = 70, 122
    zones = [
        ("A1", ["station côtière", "VHF avec ASN", "20 à 30 milles"]),
        ("A2", ["ondes", "hectométriques", "100 à 150 milles"]),
        ("A3", ["satellites", "géostationnaires", "environ entre", "70° N et 70° S"]),
        ("A4", ["régions polaires", "ondes", "décamétriques"]),
    ]
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    morceaux += [
        _texte(L / 2, 22, "La zone se lit par le moyen qui porte l’alerte", taille=15, graisse=700),
        f'<rect x="0" y="36" width="{x0}" height="150" fill="{TERRE}" stroke="{TERRE_TRAIT}" stroke-width="1.5" />',
        _texte(x0 / 2, 116, "Côte", taille=16, graisse=700),
    ]
    for i, (nom, lignes) in enumerate(zones):
        x = x0 + i * largeur
        cx = x + largeur / 2
        fond = "#cfe0ec" if i == 0 else EAU
        morceaux.append(f'<rect x="{x}" y="36" width="{largeur}" height="150" fill="{fond}" stroke="{FILET}" stroke-width="1.5" />')
        morceaux.append(_texte(cx, 68, nom, taille=22, graisse=700))
        for j, ligne in enumerate(lignes):
            morceaux.append(_texte(cx, 94 + j * 19, ligne, taille=14))
    # La plaisance côtière reste dans la première.
    y = 208
    morceaux += [
        f'<path d="M {x0 + 4} {y - 8} V {y} H {x0 + largeur - 4} V {y - 8}" fill="none" stroke="{ENCRE}" stroke-width="2" />',
        _texte(x0 + largeur / 2, y + 22, "La plaisance côtière", taille=14, graisse=700),
        _texte(x0 + largeur / 2, y + 38, "navigue en A1", taille=14, graisse=700),
    ]
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def trame_detresse() -> str:
    """Le message de détresse sur le canal 16, ligne après ligne, dans l'ordre exact."""
    L = 400
    lignes = [
        ["MAYDAY, MAYDAY, MAYDAY"],
        ["ICI + le nom du navire trois fois,", "son MMSI ou son indicatif"],
        ["MAYDAY + le nom du navire une fois"],
        ["La position : latitude et longitude,", "ou relèvement et distance d’un point connu"],
        ["La nature de la détresse"],
        ["L’assistance demandée"],
        ["Le nombre de personnes à bord,", "tout autre renseignement utile"],
        ["À VOUS"],
    ]
    hauts = [30 if len(l) == 1 else 46 for l in lignes]
    H = 36 + sum(hauts) + 8
    morceaux = [_entete(L, H), '<rect width="400" height="%d" fill="#ffffff" />' % H]
    morceaux.append(_texte(L / 2, 22, "Sur le canal 16, toujours dans cet ordre", taille=15, graisse=700))
    y = 36
    for i, (ls, h) in enumerate(zip(lignes, hauts)):
        fond = "#e9e9e7" if i % 2 == 0 else "#ffffff"
        morceaux.append(f'<rect x="0" y="{y}" width="{L}" height="{h}" fill="{fond}" />')
        morceaux.append(f'<line x1="0" y1="{y + h}" x2="{L}" y2="{y + h}" stroke="{FILET}" stroke-width="1" />')
        morceaux.append(f'<circle cx="24" cy="{y + h / 2:.1f}" r="12" fill="{ENCRE}" />')
        morceaux.append(_texte(24, y + h / 2 + 5, str(i + 1), taille=14, graisse=700, couleur="#ffffff"))
        gras = 700 if i in (0, 2, 7) else 400
        decalage = (h - 18 * len(ls)) / 2 + 14
        for j, t in enumerate(ls):
            morceaux.append(_texte(48, y + decalage + j * 18, t, taille=14, graisse=gras if j == 0 else 400, ancre="start"))
        y += h
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


SCHEMAS = {
    "vhf-zones-smdsm": zones_smdsm,
    "vhf-trame-detresse": trame_detresse,
}
