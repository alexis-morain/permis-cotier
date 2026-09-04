#!/usr/bin/env python3
"""Dessine en SVG les marques du balisage maritime, région A et région B.

    python3 scripts/balisage.py            # écrit public/visuels/balisage/
    python3 scripts/balisage.py --verifier # échoue si un fichier n'est plus à jour

Le balisage est le thème le plus visuel de l'épreuve, et le seul dont la source
soit une fiche écrite à la main faute de texte réglementaire exploitable :
`data/sources/aism-mbs/region-a.md`. Chaque marque y est décrite par sa forme,
ses couleurs et son voyant, et le dessin en découle. Une marque se compte, se
dispose et s'oriente : c'est du code, pas une génération d'image. Crédit `code`.

Aucun libellé dans l'image, il donnerait la réponse.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
SORTIE = RACINE / "public" / "visuels" / "balisage"

COULEURS = {
    "rouge": "#c8382e",
    "vert": "#1c8f4e",
    "jaune": "#e8b81f",
    "noir": "#1b1b1b",
    "blanc": "#f4f1ea",
    "bleu": "#1f5fa8",
}

CIEL = "#dfe9f0"
MER = "#8fb0c4"
ACIER = "#4a4a4a"

LARGEUR = 200
CENTRE = LARGEUR / 2

# La hauteur suit le voyant : un empilement de deux cônes tient plus de place
# qu'une simple sphère, et une image cadrée large n'aide personne.
MARGE_HAUTE = 18
MAT = 30             # du bas du voyant au haut du corps
IMMERSION = 12       # ce que la ligne d'eau recouvre du corps
EAU = 32             # hauteur d'eau sous la ligne de flottaison

# Le système, tel que la fiche le décrit. `corps` se lit de haut en bas pour
# des bandes horizontales, de bâbord à tribord pour des bandes verticales.
MARQUES: dict[str, dict] = {
    "laterale-babord": {
        "forme": "cylindre", "corps": ["rouge"], "sens": "horizontal",
        "voyant": "cylindre",
        "voyant_couleur": "rouge",
        "alt": "Bouée cylindrique rouge surmontée d'un voyant cylindrique rouge.",
        "regle": "AISM, système de balisage maritime, région A, marque latérale bâbord",
    },
    "laterale-tribord": {
        "forme": "cone", "corps": ["vert"], "sens": "horizontal",
        "voyant": "cone-haut",
        "voyant_couleur": "vert",
        "alt": "Bouée conique verte surmontée d'un voyant conique vert, pointe en haut.",
        "regle": "AISM, système de balisage maritime, région A, marque latérale tribord",
    },
    "laterale-babord-region-b": {
        "forme": "cylindre", "corps": ["vert"], "sens": "horizontal",
        "voyant": "cylindre",
        "voyant_couleur": "vert",
        "alt": "Bouée cylindrique verte surmontée d'un voyant cylindrique vert.",
        "regle": "AISM, système de balisage maritime, région B, marque latérale bâbord",
    },
    "laterale-tribord-region-b": {
        "forme": "cone", "corps": ["rouge"], "sens": "horizontal",
        "voyant": "cone-haut",
        "voyant_couleur": "rouge",
        "alt": "Bouée conique rouge surmontée d'un voyant conique rouge, pointe en haut.",
        "regle": "AISM, système de balisage maritime, région B, marque latérale tribord",
    },
    "cardinale-nord": {
        "forme": "pilier", "corps": ["noir", "jaune"], "sens": "horizontal",
        "voyant": "deux-cones-haut",
        "voyant_couleur": "noir",
        "alt": "Bouée noire au-dessus, jaune en dessous, surmontée de deux cônes noirs pointes en haut.",
        "regle": "AISM, système de balisage maritime, marque cardinale Nord",
    },
    "cardinale-est": {
        "forme": "pilier", "corps": ["noir", "jaune", "noir"], "sens": "horizontal",
        "voyant": "deux-cones-base",
        "voyant_couleur": "noir",
        "alt": "Bouée noire à bande jaune, surmontée de deux cônes noirs base contre base.",
        "regle": "AISM, système de balisage maritime, marque cardinale Est",
    },
    "cardinale-sud": {
        "forme": "pilier", "corps": ["jaune", "noir"], "sens": "horizontal",
        "voyant": "deux-cones-bas",
        "voyant_couleur": "noir",
        "alt": "Bouée jaune au-dessus, noire en dessous, surmontée de deux cônes noirs pointes en bas.",
        "regle": "AISM, système de balisage maritime, marque cardinale Sud",
    },
    "cardinale-ouest": {
        "forme": "pilier", "corps": ["jaune", "noir", "jaune"], "sens": "horizontal",
        "voyant": "deux-cones-pointe",
        "voyant_couleur": "noir",
        "alt": "Bouée jaune à bande noire, surmontée de deux cônes noirs pointes l'une contre l'autre.",
        "regle": "AISM, système de balisage maritime, marque cardinale Ouest",
    },
    "danger-isole": {
        "forme": "pilier", "corps": ["noir", "rouge", "noir"], "sens": "horizontal",
        "voyant": "deux-spheres",
        "voyant_couleur": "noir",
        "alt": "Bouée noire à large bande rouge, surmontée de deux sphères noires superposées.",
        "regle": "AISM, système de balisage maritime, marque de danger isolé",
    },
    "eaux-saines": {
        "forme": "pilier", "corps": ["rouge", "blanc", "rouge", "blanc"], "sens": "vertical",
        "voyant": "sphere",
        "voyant_couleur": "rouge",
        "alt": "Bouée à bandes verticales rouges et blanches, surmontée d'une sphère rouge.",
        "regle": "AISM, système de balisage maritime, marque d'eaux saines",
    },
    "speciale": {
        "forme": "pilier", "corps": ["jaune"], "sens": "horizontal",
        "voyant": "croix",
        "voyant_couleur": "jaune",
        "alt": "Bouée jaune surmontée d'une croix jaune en forme de X.",
        "regle": "AISM, système de balisage maritime, marque spéciale",
    },
    "danger-nouveau": {
        "forme": "pilier", "corps": ["bleu", "jaune", "bleu", "jaune"], "sens": "vertical",
        "voyant": "croix",
        "voyant_couleur": "jaune",
        "alt": "Bouée à bandes verticales bleues et jaunes, surmontée d'une croix jaune en forme de X.",
        "regle": "AISM, système de balisage maritime, marque de danger nouveau",
    },
}

# Emprise du corps selon la forme : (largeur, hauteur).
EMPRISES = {"cylindre": (68, 78), "cone": (80, 88), "pilier": (48, 108)}

# Hauteur occupée par chaque voyant, pour cadrer l'image dessus.
HAUTEURS_VOYANT = {
    "cylindre": 30, "cone-haut": 32, "sphere": 32, "croix": 34,
    "deux-cones-haut": 58, "deux-cones-bas": 58, "deux-cones-base": 58,
    "deux-cones-pointe": 58, "deux-spheres": 60,
}


def _corps(forme: str, y_haut: float) -> tuple[str, float, float, float]:
    """Le tracé du corps, sans attribut de style, et sa boîte."""
    largeur, hauteur = EMPRISES[forme]
    x = CENTRE - largeur / 2
    if forme == "cone":
        trace = f'<path d="M {CENTRE} {y_haut} L {x + largeur} {y_haut + hauteur} L {x} {y_haut + hauteur} Z"'
    else:
        trace = f'<rect x="{x}" y="{y_haut}" width="{largeur}" height="{hauteur}" rx="5"'
    return trace, x, largeur, hauteur


def _bandes(corps: list[str], sens: str, x: float, y: float, largeur: float, hauteur: float) -> list[str]:
    """Les bandes de couleur, découpées ensuite à la forme du corps."""
    dessin = []
    if sens == "vertical":
        pas = largeur / len(corps)
        for rang, couleur in enumerate(corps):
            dessin.append(
                f'<rect x="{x + rang * pas:.2f}" y="{y}" width="{pas:.2f}" '
                f'height="{hauteur}" fill="{COULEURS[couleur]}" />'
            )
    else:
        pas = hauteur / len(corps)
        for rang, couleur in enumerate(corps):
            dessin.append(
                f'<rect x="{x}" y="{y + rang * pas:.2f}" width="{largeur}" '
                f'height="{pas:.2f}" fill="{COULEURS[couleur]}" />'
            )
    return dessin


def _cone(sommet_en_haut: bool, cy: float, largeur: float, hauteur: float, teinte: str) -> str:
    demi, moitie = largeur / 2, hauteur / 2
    if sommet_en_haut:
        points = f"{CENTRE},{cy - moitie} {CENTRE + demi},{cy + moitie} {CENTRE - demi},{cy + moitie}"
    else:
        points = f"{CENTRE},{cy + moitie} {CENTRE + demi},{cy - moitie} {CENTRE - demi},{cy - moitie}"
    return f'<polygon points="{points}" fill="{teinte}" />'


def _voyant(genre: str, base: float, teinte: str) -> list[str]:
    """Le voyant, posé au sommet du mât. `base` est son ordonnée basse.

    Les cônes d'une cardinale se lisent à leur orientation, et à elle seule :
    pointes en haut pour le Nord, en bas pour le Sud, bases jointes pour l'Est,
    pointes jointes pour l'Ouest."""
    if genre == "cylindre":
        return [f'<rect x="{CENTRE - 14}" y="{base - 30}" width="28" height="30" fill="{teinte}" />']
    if genre == "cone-haut":
        return [_cone(True, base - 16, 34, 32, teinte)]
    if genre == "sphere":
        return [f'<circle cx="{CENTRE}" cy="{base - 16}" r="16" fill="{teinte}" />']
    if genre == "croix":
        bras = 16
        return [
            f'<g stroke="{teinte}" stroke-width="9" stroke-linecap="round">'
            f'<line x1="{CENTRE - bras}" y1="{base - 17 - bras}" x2="{CENTRE + bras}" y2="{base - 17 + bras}" />'
            f'<line x1="{CENTRE - bras}" y1="{base - 17 + bras}" x2="{CENTRE + bras}" y2="{base - 17 - bras}" />'
            f"</g>"
        ]
    if genre == "deux-spheres":
        return [
            f'<circle cx="{CENTRE}" cy="{base - 15}" r="15" fill="{teinte}" />',
            f'<circle cx="{CENTRE}" cy="{base - 45}" r="15" fill="{teinte}" />',
        ]

    orientations = {
        "deux-cones-haut": (True, True),
        "deux-cones-bas": (False, False),
        "deux-cones-base": (True, False),      # bases jointes au milieu
        "deux-cones-pointe": (False, True),    # pointes jointes au milieu
    }
    if genre not in orientations:
        raise ValueError(f"voyant inconnu : {genre}")
    haut, bas = orientations[genre]
    return [
        _cone(bas, base - 14.5, 30, 29, teinte),
        _cone(haut, base - 43.5, 30, 29, teinte),
    ]


def svg_de_marque(nom: str) -> str:
    marque = MARQUES[nom]
    hauteur_voyant = HAUTEURS_VOYANT[marque["voyant"]]

    y_voyant_bas = MARGE_HAUTE + hauteur_voyant
    y_corps_haut = y_voyant_bas + MAT
    trace, x, largeur, hauteur_corps = _corps(marque["forme"], y_corps_haut)
    y_corps_bas = y_corps_haut + hauteur_corps
    ligne_eau = y_corps_bas - IMMERSION
    hauteur = y_corps_bas + EAU

    return "\n".join([
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LARGEUR} {hauteur}" '
        f'width="{LARGEUR}" height="{hauteur}" role="img">',
        f'<defs><clipPath id="c">{trace} /></clipPath></defs>',
        f'<rect width="{LARGEUR}" height="{hauteur}" fill="{CIEL}" />',
        f'<line x1="{CENTRE}" y1="{y_voyant_bas}" x2="{CENTRE}" y2="{y_corps_haut + 10}" '
        f'stroke="{ACIER}" stroke-width="7" stroke-linecap="round" />',
        '<g clip-path="url(#c)">',
        *_bandes(marque["corps"], marque["sens"], x, y_corps_haut, largeur, hauteur_corps),
        "</g>",
        # Un filet sombre détache le corps du ciel : une bouée jaune s'y perdrait.
        f'{trace} fill="none" stroke="#2a2a2a" stroke-width="2" stroke-opacity="0.4" />',
        *_voyant(marque["voyant"], y_voyant_bas, COULEURS[marque["voyant_couleur"]]),
        # L'eau passe par-dessus la coque : la bouée flotte, elle ne pose pas.
        f'<rect y="{ligne_eau}" width="{LARGEUR}" height="{hauteur - ligne_eau}" '
        f'fill="{MER}" fill-opacity="0.92" />',
        "</svg>",
    ]) + "\n"


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__)
    parseur.add_argument("--verifier", action="store_true", help="échoue au lieu d'écrire")
    args = parseur.parse_args(argv)

    SORTIE.mkdir(parents=True, exist_ok=True)
    perimes = []
    for nom in MARQUES:
        chemin = SORTIE / f"{nom}.svg"
        dessin = svg_de_marque(nom)
        if args.verifier:
            if not chemin.is_file() or chemin.read_text(encoding="utf-8") != dessin:
                perimes.append(chemin.relative_to(RACINE))
            continue
        chemin.write_text(dessin, encoding="utf-8")
        print(f"écrit {chemin.relative_to(RACINE)}")

    if args.verifier:
        for chemin in perimes:
            print(f"{chemin} n'est plus à jour, lance `npm run balisage`", file=sys.stderr)
        if perimes:
            return 1
        print(f"{len(MARQUES)} marque(s) à jour.")
        return 0

    print(f"\n{len(MARQUES)} marque(s) dans public/visuels/balisage/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
