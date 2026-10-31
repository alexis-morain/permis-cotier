"""Les schémas de la fiche Le bateau et son équipement."""
from __future__ import annotations

from schemas_revision import (
    DOUX, EAU, EAU_FORTE, ENCRE, FILET, TERRE, TERRE_TRAIT,
    _entete, _fleche, _texte,
)


def zones() -> str:
    """Les quatre tranches d'éloignement d'un abri, leur armement et le niveau du gilet."""
    L, H = 560, 292
    x0, largeur = 70, 122
    bandes = [
        ("Basique", ["moins de", "2 milles"], "Gilet 50", ["extincteur", "mouillage"]),
        ("Côtier", ["2 à moins de", "6 milles"], "Gilet 100", ["+ 3 feux rouges", "+ compas", "+ cartes"]),
        ("Semi-hauturier", ["6 à moins de", "60 milles"], "Gilet 150", ["+ VHF fixe", "+ radeau", "+ journal de bord"]),
        ("Hauturier", ["à partir de", "60 milles"], "", []),
    ]
    morceaux = [_entete(L, H), f'<rect width="{L}" height="{H}" fill="{EAU}" />']
    morceaux += [
        _texte(L / 2, 22, "La distance se compte depuis un abri, pas depuis la côte", taille=15, graisse=700),
        f'<rect x="0" y="36" width="{x0}" height="196" fill="{TERRE}" stroke="{TERRE_TRAIT}" stroke-width="1.5" />',
        _texte(x0 / 2, 138, "Abri", taille=16, graisse=700),
    ]
    for i, (nom, distance, gilet, ajouts) in enumerate(bandes):
        x = x0 + i * largeur
        cx = x + largeur / 2
        fond = "#cfe0ec" if i % 2 == 0 else EAU
        morceaux.append(f'<rect x="{x}" y="36" width="{largeur}" height="196" fill="{fond}" stroke="{FILET}" stroke-width="1.5" />')
        morceaux.append(_texte(cx, 62, nom, taille=15 if len(nom) > 9 else 16, graisse=700))
        for j, ligne in enumerate(distance):
            morceaux.append(_texte(cx, 84 + j * 17, ligne, taille=14, couleur=DOUX))
        if gilet:
            morceaux.append(_texte(cx, 134, gilet, taille=15, graisse=700))
        for j, ligne in enumerate(ajouts):
            morceaux.append(_texte(cx, 160 + j * 19, ligne, taille=14))
    # La règle graduée : les trois bornes sous les bandes.
    y = 252
    morceaux.append(f'<line x1="{x0}" y1="{y}" x2="{L - 6}" y2="{y}" stroke="{ENCRE}" stroke-width="2" />')
    morceaux.append(_fleche(L - 40, y, L - 4, y, epaisseur=2))
    for i, texte in enumerate(["abri", "2 milles", "6 milles", "60 milles"]):
        x = x0 + i * largeur
        morceaux.append(f'<line x1="{x}" y1="{y - 7}" x2="{x}" y2="{y + 7}" stroke="{ENCRE}" stroke-width="2" />')
        morceaux.append(_texte(x, y + 27, texte, taille=14, graisse=700))
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


def categories() -> str:
    """Les quatre catégories de conception en escalier : plus de vent, plus de vague."""
    L, H = 560, 270
    base = 196
    colonnes = [
        ("D", 25, "jusqu’à force 4", "jusqu’à 0,3 m"),
        ("C", 55, "jusqu’à force 6", "jusqu’à 2 m"),
        ("B", 85, "jusqu’à force 8", "jusqu’à 4 m"),
        ("A", 115, "peut dépasser 8", "peut dépasser 4 m"),
    ]
    morceaux = [_entete(L, H), '<rect width="560" height="270" fill="#ffffff" />']
    morceaux.append(_texte(L / 2, 20, "Plus de vent, plus de vague", taille=15, graisse=700))
    morceaux.append(_fleche(60, 36, 500, 36, couleur=DOUX, epaisseur=2))
    for i, (lettre, haut, vent, vague) in enumerate(colonnes):
        x = 24 + i * 134
        cx = x + 55
        morceaux.append(
            f'<rect x="{x}" y="{base - haut}" width="110" height="{haut}" fill="#e9e9e7" stroke="{ENCRE}" stroke-width="2" />'
        )
        morceaux.append(_texte(cx, base - haut - 10, lettre, taille=22, graisse=700))
        morceaux.append(_texte(cx, base + 24, vent, taille=14, graisse=700))
        morceaux.append(_texte(cx, base + 42, vague, taille=14))
    morceaux.append(f'<line x1="14" y1="{base}" x2="546" y2="{base}" stroke="{ENCRE}" stroke-width="2" />')
    morceaux.append(_texte(L / 2, 258, "Force du vent sur l’échelle de Beaufort, puis hauteur significative des vagues", taille=14, couleur=DOUX))
    morceaux.append("</svg>")
    return "".join(morceaux) + "\n"


SCHEMAS = {
    "securite-zones": zones,
    "securite-categories": categories,
}
