#!/usr/bin/env python3
"""Dessine en SVG animé les rythmes de feux : cardinales, danger, caractères.

    python3 scripts/rythmes.py            # écrit public/visuels/rythmes/
    python3 scripts/rythmes.py --verifier # échoue si un fichier n'est plus à jour

Un rythme de feu ne se montre pas sur une image fixe. « À éclats » et « à
occultations » donnent le même dessin arrêté et sont deux feux différents : dans
le premier la lumière dure moins que l'obscurité, dans le second l'inverse. La
cardinale Est et la cardinale Ouest ne se distinguent la nuit que par le nombre
de scintillements. C'est la seule matière de l'épreuve où le mouvement est la
réponse, donc le seul endroit où on anime.

Chaque dessin porte deux choses : la lampe, qui bat, et sous elle une frise du
temps où le motif est tracé en entier. La frise sert deux fois. Elle rend le
rythme lisible d'un coup d'œil sans attendre un cycle, et elle reste juste quand
l'animation est coupée : `prefers-reduced-motion` fige la lampe allumée et retire
le curseur, l'image continue de dire le rythme.

Ce qui est exact, et ce qui est abrégé
--------------------------------------
Les motifs viennent de `data/sources/aism-mbs/region-a.md`. Ce qui est dessiné
exactement, c'est **le groupe** : trois scintillements pour l'Est, six plus un
éclat long pour le Sud, neuf pour l'Ouest, deux éclats pour le danger isolé.
C'est lui que l'examen demande, et lui seul distingue une cardinale d'une autre.

Ce qui est abrégé, c'est **la pause entre deux groupes**. La période réelle d'une
cardinale Est est de dix secondes, dont sept d'obscurité complète ; dessinée
telle quelle, l'image passe les deux tiers de son temps à ne rien montrer, et on
n'apprend rien d'un écran noir. La pause est donc ramenée à `PAUSE`, assez pour
qu'on voie qu'un groupe se termine, assez peu pour que le suivant arrive.

Conséquence tenue jusqu'au bout : **la frise ne porte aucune graduation**. Un
trait par seconde affirmerait une période que le dessin ne respecte plus, et la
cadence du scintillement lui-même (60 par minute pour Q, 120 pour VQ) n'est de
toute façon pas dans la fiche. La frise dit la forme du motif, pas sa durée. Les
textes alternatifs sont écrits en conséquence : ils comptent les éclats, ils
n'annoncent pas de période. Une question sur la période d'un feu se pose donc
depuis la fiche, jamais depuis ces images.

Aucun libellé dans l'image, et surtout pas la marque elle-même : une bouée
dessinée à côté de son feu donnerait la réponse. Crédit `code`.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
SORTIE = RACINE / "public" / "visuels" / "rythmes"

# Couleurs de feu. Plus lumineuses que les couleurs de coque de balisage.py :
# une lanterne allumée n'a pas la teinte d'une bouée éclairée par le jour.
FEUX = {
    "blanc": "#fbf3de",
    "rouge": "#f0574a",
    "vert": "#3ec27d",
    "jaune": "#f2c631",
    "bleu": "#5093e6",
}

NUIT = "#0e1720"
ACIER = "#55646f"
ACIER_SOMBRE = "#2b3945"
FRISE = "#3c4c58"

LARGEUR = 240
HAUTEUR = 132
CX = 54                 # axe de la lanterne
CY = 49                 # centre du verre
FRISE_X0, FRISE_X1 = 20, 222
FRISE_Y = 112           # ligne de base de la frise
BARRE_H = 8             # hauteur des blocs allumés au-dessus de la ligne

# Cadences dessinées, en secondes. Voir la note d'exactitude en tête de fichier.
Q_ON, Q_OFF = 0.3, 0.7          # scintillant, 60 par minute
VQ_ON, VQ_OFF = 0.15, 0.35      # scintillant rapide, 120 par minute
ECLAT_LONG = 2.0                # un éclat long dure au moins deux secondes
PAUSE = 1.6                     # respiration entre deux groupes, voir la note en tête


def scintillements(n: int, rapide: bool = False) -> list[tuple[float, str | None]]:
    """n scintillements consécutifs, chacun un éclat suivi de son obscurité."""
    on, off = (VQ_ON, VQ_OFF) if rapide else (Q_ON, Q_OFF)
    motif: list[tuple[float, str | None]] = []
    for _ in range(n):
        motif.append((on, "blanc"))
        motif.append((off, None))
    return motif


def groupe(n: int, rapide: bool = False) -> list[tuple[float, str | None]]:
    """Un groupe de n scintillements, puis la pause qui le sépare du suivant."""
    return scintillements(n, rapide) + [(PAUSE, None)]


# Le catalogue. `motif` est une période dessinée, lue de gauche à droite :
# (durée, couleur ou None pour l'obscurité). `fenetre` dit combien de fois la
# frise répète ce motif, pour qu'un rythme court reste lisible sur toute sa
# largeur. Les pauses entre groupes sont abrégées, voir la note en tête.
RYTHMES: dict[str, dict] = {
    "cardinale-nord": {
        "motif": scintillements(1),
        "fenetre": 6,
        "alt": "Feu blanc scintillant sans interruption, un éclat régulier après l'autre, "
               "sans groupe ni pause.",
        "regle": "AISM, région A, marque cardinale Nord, feu blanc scintillant continu Q",
    },
    "cardinale-est": {
        "motif": groupe(3),
        "fenetre": 2,
        "alt": "Feu blanc à trois scintillements groupés, séparés du groupe suivant par "
               "une pause.",
        "regle": "AISM, région A, marque cardinale Est, feu blanc Q (3) toutes les 10 s, "
                 "pause abrégée au dessin",
    },
    "cardinale-sud": {
        "motif": scintillements(6) + [(ECLAT_LONG, "blanc"), (PAUSE, None)],
        "fenetre": 1,
        "alt": "Feu blanc à six scintillements groupés, suivis d'un éclat long nettement "
               "plus soutenu que les six premiers.",
        "regle": "AISM, région A, marque cardinale Sud, feu blanc Q (6) + éclat long "
                 "toutes les 15 s, pause abrégée au dessin",
    },
    "cardinale-ouest": {
        "motif": groupe(9),
        "fenetre": 1,
        "alt": "Feu blanc à neuf scintillements groupés, séparés du groupe suivant par "
               "une pause.",
        "regle": "AISM, région A, marque cardinale Ouest, feu blanc Q (9) toutes les 15 s, "
                 "pause abrégée au dessin",
    },
    "danger-isole": {
        "motif": [(0.5, "blanc"), (1.0, None), (0.5, "blanc"), (2.2, None)],
        "fenetre": 2,
        "alt": "Feu blanc à deux éclats groupés, suivis d'une pause plus longue que "
               "l'intervalle qui sépare les deux éclats.",
        "regle": "AISM, région A, marque de danger isolé, feu blanc à deux éclats "
                 "groupés Fl (2)",
    },
    "eaux-saines-eclat-long": {
        "motif": [(ECLAT_LONG, "blanc"), (2.4, None)],
        "fenetre": 2,
        "alt": "Feu blanc montrant un éclat long isolé, plus long que l'obscurité qui "
               "le sépare du suivant.",
        "regle": "AISM, région A, marque d'eaux saines, un éclat long toutes les 10 s, "
                 "pause abrégée au dessin",
    },
    "eaux-saines-morse-a": {
        # Lettre A du code Morse : un point, un trait.
        "motif": [(0.4, "blanc"), (0.6, None), (1.4, "blanc"), (2.2, None)],
        "fenetre": 2,
        "alt": "Feu blanc battant la lettre A du code Morse, un éclat bref suivi "
               "d'un éclat long.",
        "regle": "AISM, région A, marque d'eaux saines, lettre A du code Morse",
    },
    "danger-nouveau": {
        "motif": [(1.0, "bleu"), (0.2, None), (1.0, "jaune"), (0.2, None)],
        "fenetre": 3,
        "alt": "Feu alternant le bleu et le jaune, sans obscurité longue entre les "
               "deux couleurs.",
        "regle": "AISM, région A, marque de danger nouveau, feu bleu et jaune alternés",
    },
    "caractere-fixe": {
        "motif": [(1.0, "blanc")],
        "fenetre": 6,
        "alt": "Feu fixe, dont la lumière reste allumée sans interruption.",
        "regle": "Caractère de feu : feu fixe, F",
    },
    "caractere-a-eclats": {
        "motif": [(0.6, "blanc"), (1.4, None)],
        "fenetre": 3,
        "alt": "Feu à éclats, dont la lumière dure nettement moins que l'obscurité "
               "qui la sépare de l'éclat suivant.",
        "regle": "Caractère de feu : à éclats, Fl, lumière plus courte que l'obscurité",
    },
    "caractere-a-occultations": {
        "motif": [(1.4, "blanc"), (0.6, None)],
        "fenetre": 3,
        "alt": "Feu à occultations, dont la lumière dure nettement plus que "
               "l'obscurité qui la coupe.",
        "regle": "Caractère de feu : à occultations, Oc, lumière plus longue que l'obscurité",
    },
    "caractere-isophase": {
        "motif": [(1.0, "blanc"), (1.0, None)],
        "fenetre": 3,
        "alt": "Feu isophase, dont la lumière et l'obscurité durent exactement le "
               "même temps.",
        "regle": "Caractère de feu : isophase, Iso, lumière et obscurité de durées égales",
    },
    "caractere-scintillant": {
        "motif": scintillements(1),
        "fenetre": 6,
        "alt": "Feu scintillant, fait d'éclats brefs qui se suivent à cadence "
               "régulière, sans interruption.",
        "regle": "Caractère de feu : scintillant, Q",
    },
    "caractere-scintillant-rapide": {
        "motif": scintillements(1, rapide=True),
        "fenetre": 12,
        "alt": "Feu scintillant rapide, fait d'éclats brefs qui se suivent deux fois "
               "plus vite que ceux d'un scintillant ordinaire.",
        "regle": "Caractère de feu : scintillant rapide, VQ",
    },
    "laterale-babord": {
        "motif": [(0.6, "rouge"), (1.4, None)],
        "fenetre": 3,
        "alt": "Feu rouge à éclats. Le rythme d'une marque latérale est quelconque, "
               "c'est la couleur qui l'identifie.",
        "regle": "AISM, région A, marque latérale bâbord, feu rouge, rythme quelconque",
    },
    "laterale-tribord": {
        "motif": [(0.6, "vert"), (1.4, None)],
        "fenetre": 3,
        "alt": "Feu vert à éclats. Le rythme d'une marque latérale est quelconque, "
               "c'est la couleur qui l'identifie.",
        "regle": "AISM, région A, marque latérale tribord, feu vert, rythme quelconque",
    },
    "speciale": {
        "motif": [(0.6, "jaune"), (1.4, None)],
        "fenetre": 3,
        "alt": "Feu jaune à éclats. Le rythme d'une marque spéciale est quelconque, mais "
               "sa couleur jaune ne se confond avec aucune marque blanche.",
        "regle": "AISM, région A, marque spéciale, feu jaune, rythme quelconque",
    },
}


def periode(motif: list[tuple[float, str | None]]) -> float:
    return sum(d for d, _ in motif)


def _keyframes(nom: str, motif: list[tuple[float, str | None]], couleur: str) -> str:
    """Les arrêts d'une couleur sur une période, en pourcentage.

    `step-end` fait tenir chaque valeur jusqu'à l'arrêt suivant : la lampe
    s'allume et s'éteint franchement, sans le fondu qu'une interpolation
    donnerait et qu'aucun feu ne montre.
    """
    total = periode(motif)
    arrets: list[str] = []
    t = 0.0
    for duree, teinte in motif:
        arrets.append(f"{t / total * 100:.4g}%{{opacity:{1 if teinte == couleur else 0}}}")
        t += duree
    arrets.append(f"100%{{opacity:{1 if motif[0][1] == couleur else 0}}}")
    return f"@keyframes {nom}-{couleur}{{{''.join(arrets)}}}"


def _blocs_frise(motif: list[tuple[float, str | None]], fenetre: int) -> list[str]:
    """Le motif tracé en blocs sur la frise, répété autant que la fenêtre l'exige."""
    total = periode(motif) * fenetre
    echelle = (FRISE_X1 - FRISE_X0) / total
    blocs: list[str] = []
    t = 0.0
    for _ in range(fenetre):
        for duree, teinte in motif:
            if teinte is not None:
                x = FRISE_X0 + t * echelle
                largeur = max(duree * echelle, 1.2)
                blocs.append(
                    f'<rect x="{x:.2f}" y="{FRISE_Y - BARRE_H}" width="{largeur:.2f}" '
                    f'height="{BARRE_H}" fill="{FEUX[teinte]}" />'
                )
            t += duree
    return blocs


def svg_de_rythme(nom: str) -> str:
    rythme = RYTHMES[nom]
    motif: list[tuple[float, str | None]] = rythme["motif"]
    fenetre: int = rythme["fenetre"]
    duree = periode(motif)
    balayage = duree * fenetre
    couleurs = sorted({t for _, t in motif if t is not None})
    cle = nom.replace("-", "")

    styles = [
        # Le curseur balaie la frise en une fenêtre entière, la lampe bat sur une
        # période : les deux restent en phase parce que la fenêtre est un nombre
        # entier de périodes.
        f".curseur{{animation:{cle}-balayage {balayage:.4g}s linear infinite}}",
        f"@keyframes {cle}-balayage{{from{{transform:translateX(0)}}"
        f"to{{transform:translateX({FRISE_X1 - FRISE_X0}px)}}}}",
    ]
    for couleur in couleurs:
        styles.append(
            f".feu-{couleur}{{animation:{cle}-{couleur} {duree:.4g}s step-end infinite}}"
        )
        styles.append(_keyframes(cle, motif, couleur))
    # Mouvement coupé : la lampe reste allumée sur sa première couleur et le
    # curseur disparaît. La frise, elle, porte déjà le rythme en entier.
    premiere = couleurs[0]
    styles.append(
        "@media (prefers-reduced-motion:reduce){"
        ".curseur{display:none}"
        "[class^='feu-']{animation:none;opacity:0}"
        f".feu-{premiere}{{opacity:1}}}}"
    )

    lampes: list[str] = []
    for couleur in couleurs:
        teinte = FEUX[couleur]
        lampes.append(
            f'<g class="feu-{couleur}" opacity="0">'
            f'<circle cx="{CX}" cy="{CY}" r="34" fill="url(#halo-{couleur})" />'
            f'<rect x="{CX - 11}" y="{CY - 9}" width="22" height="18" rx="2" fill="{teinte}" />'
            f'<circle cx="{CX}" cy="{CY}" r="6" fill="#ffffff" fill-opacity="0.75" />'
            f"</g>"
        )

    degrades = "".join(
        f'<radialGradient id="halo-{c}">'
        f'<stop offset="0" stop-color="{FEUX[c]}" stop-opacity="0.5" />'
        f'<stop offset="0.55" stop-color="{FEUX[c]}" stop-opacity="0.13" />'
        f'<stop offset="1" stop-color="{FEUX[c]}" stop-opacity="0" />'
        f"</radialGradient>"
        for c in couleurs
    )

    return "\n".join([
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LARGEUR} {HAUTEUR}" '
        f'width="{LARGEUR}" height="{HAUTEUR}" role="img">',
        f"<defs>{degrades}</defs>",
        f"<style>{''.join(styles)}</style>",
        f'<rect width="{LARGEUR}" height="{HAUTEUR}" fill="{NUIT}" />',
        # La lanterne, éteinte : cage, verre sombre, embase et mât.
        f'<rect x="{CX - 12}" y="{CY - 10}" width="24" height="20" rx="2" '
        f'fill="#1b2b38" stroke="{ACIER_SOMBRE}" stroke-width="1" />',
        f'<path d="M{CX - 12} {CY - 10} Q{CX} {CY - 22} {CX + 12} {CY - 10} Z" '
        f'fill="{ACIER_SOMBRE}" />',
        *lampes,
        # La cage repasse par-dessus le verre allumé : deux montants et un cerclage.
        f'<rect x="{CX - 12}" y="{CY - 10}" width="24" height="20" rx="2" fill="none" '
        f'stroke="{ACIER}" stroke-width="1.5" />',
        f'<line x1="{CX - 12}" y1="{CY}" x2="{CX + 12}" y2="{CY}" stroke="{ACIER}" '
        f'stroke-width="1" stroke-opacity="0.55" />',
        f'<rect x="{CX - 14}" y="{CY + 10}" width="28" height="5" fill="{ACIER}" />',
        f'<rect x="{CX - 3}" y="{CY + 15}" width="6" height="{FRISE_Y - 34 - CY}" '
        f'fill="{ACIER_SOMBRE}" />',
        # La frise du temps.
        f'<line x1="{FRISE_X0}" y1="{FRISE_Y}" x2="{FRISE_X1}" y2="{FRISE_Y}" '
        f'stroke="{FRISE}" stroke-width="1.5" />',
        *_blocs_frise(motif, fenetre),
        # Le curseur, qui dit où on en est du motif.
        f'<g class="curseur"><line x1="{FRISE_X0}" y1="{FRISE_Y - BARRE_H - 6}" '
        f'x2="{FRISE_X0}" y2="{FRISE_Y + 6}" stroke="{FEUX["blanc"]}" stroke-width="1.5" '
        f'stroke-opacity="0.85" /></g>',
        "</svg>",
    ]) + "\n"


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__)
    parseur.add_argument("--verifier", action="store_true", help="échoue au lieu d'écrire")
    args = parseur.parse_args(argv)

    SORTIE.mkdir(parents=True, exist_ok=True)
    perimes = []
    for nom in RYTHMES:
        chemin = SORTIE / f"{nom}.svg"
        dessin = svg_de_rythme(nom)
        if args.verifier:
            if not chemin.is_file() or chemin.read_text(encoding="utf-8") != dessin:
                perimes.append(chemin.relative_to(RACINE))
            continue
        chemin.write_text(dessin, encoding="utf-8")
        print(f"écrit {chemin.relative_to(RACINE)}")

    if args.verifier:
        for chemin in perimes:
            print(f"{chemin} n'est plus à jour, lance `npm run rythmes`", file=sys.stderr)
        if perimes:
            return 1
        print(f"{len(RYTHMES)} rythme(s) à jour.")
        return 0

    print(f"\n{len(RYTHMES)} rythme(s) dans public/visuels/rythmes/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
