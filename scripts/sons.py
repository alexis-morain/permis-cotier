#!/usr/bin/env python3
"""Dessine en SVG animé les signaux sonores du RIPAM, au sifflet et à la cloche.

    python3 scripts/sons.py            # écrit public/visuels/sons/
    python3 scripts/sons.py --verifier # échoue si un fichier n'est plus à jour

Un signal sonore est un motif dans le temps, comme un rythme de feu, et il
souffre du même problème : « deux sons prolongés suivis d'un son bref » ne se
dessine pas sur une image fixe, et se lit mal en toutes lettres. Le thème
`signaux` n'avait aucun visuel.

Ce qui est exact, et ce qui ne l'est pas
----------------------------------------
La règle 32 donne les deux durées qui fondent tout le système : le son bref dure
**environ une seconde**, le son prolongé **de quatre à six secondes**. Elles sont
dessinées à l'échelle, un prolongé faisant cinq fois la largeur d'un bref, et
**la même échelle sert à tous les dessins** : une barre de même largeur dit la
même durée d'une planche à l'autre. C'est là tout l'intérêt, puisque distinguer
le bref du prolongé est la difficulté du sujet.

Ce que le RIPAM ne donne pas, c'est l'intervalle entre deux sons d'un même
signal. Il est dessiné à une seconde, la valeur que la règle 34 b) ii) prescrit
pour les éclats des signaux lumineux de même sens. Deux exceptions sourcées : la
série d'avertissement de la règle 34 d) est « rapide », ses intervalles sont
resserrés ; les deux prolongés de la règle 35 b) sont « séparés par un intervalle
de deux secondes environ ».

Comme pour les rythmes de feux, **la frise ne porte aucune graduation** et les
dessins ne disent rien de l'intervalle de répétition, celui que la règle 35 fixe
à deux minutes au plus. Une question sur cet intervalle se pose depuis le texte,
jamais depuis ces images.

Le temps réel est tenu, sans accélération : un son prolongé dure vraiment quatre
à six secondes en mer, et sentir cette longueur fait partie de ce qu'on apprend.
Rien n'est immobile pendant ce temps, les ondes battent.

Deux instruments
----------------
Le sifflet et la cloche ne disent pas la même chose et ne se dessinent pas
pareil. La cloche sonnée rapidement pendant cinq secondes, règle 35 g), n'est pas
un son continu de cinq secondes : sa barre est hachurée, pas pleine. Les trois
coups distincts de l'échouement, règle 35 h), sont des traits isolés.

Aucun libellé dans l'image : le dessin montre le motif, la question demande ce
qu'il veut dire. Crédit `code`.
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
SORTIE = RACINE / "public" / "visuels" / "sons"

# La brume, puisque la moitié de ces signaux ne s'entendent que par visibilité
# réduite. Plus pâle que la mer des scènes de rencontre, pour qu'on ne confonde
# pas les deux familles.
BRUME = "#dbe4e8"
BRUME_BANDE = "#c9d6dc"
ENCRE = "#16231f"
ENCRE_DOUCE = "#4a5a54"
FRISE = "#8fa3ac"
LAITON = "#a8823c"        # le sifflet et la cloche, en cuivre

LARGEUR = 256
HAUTEUR = 120
EX, EY = 60, 50           # bouche de l'instrument, d'où partent les ondes
FRISE_X0 = 20
FRISE_Y = 100
BARRE_H = 13
ECHELLE = 14.5            # pixels par seconde, la même pour tous les dessins
PAUSE = 1.2               # respiration avant que le motif se répète

BREF = 1.0                # règle 32 b)
PROLONGE = 5.0            # règle 32 c), quatre à six secondes
INTERVALLE = 1.0          # non sourcé pour le son, voir la note en tête
VOLEE = 5.0               # règle 35 g), cloche sonnée rapidement cinq secondes
COUP = 0.35               # un coup de cloche isolé, règle 35 h)


def suite(*sons: str, intervalle: float = INTERVALLE) -> list[tuple[float, str | None]]:
    """Des sons séparés par leur intervalle. « b » pour bref, « p » pour prolongé."""
    durees = {"b": BREF, "p": PROLONGE, "v": VOLEE, "c": COUP}
    motif: list[tuple[float, str | None]] = []
    for i, son in enumerate(sons):
        if i:
            motif.append((intervalle, None))
        motif.append((durees[son], son))
    return motif


SIGNAUX: dict[str, dict] = {
    # ── Règle 34, signaux de manœuvre et d'avertissement ──────────────────────
    "manoeuvre-tribord": {
        "instrument": "sifflet",
        "motif": suite("b"),
        "alt": "Un son bref au sifflet, une impulsion courte et isolée.",
        "regle": "RIPAM, règle 34 a), « Je viens sur tribord »",
    },
    "manoeuvre-babord": {
        "instrument": "sifflet",
        "motif": suite("b", "b"),
        "alt": "Deux sons brefs au sifflet, deux impulsions courtes séparées par un "
               "silence de même ordre.",
        "regle": "RIPAM, règle 34 a), « Je viens sur bâbord »",
    },
    "manoeuvre-arriere": {
        "instrument": "sifflet",
        "motif": suite("b", "b", "b"),
        "alt": "Trois sons brefs au sifflet, trois impulsions courtes de suite.",
        "regle": "RIPAM, règle 34 a), « Je bats en arrière »",
    },
    "avertissement-doute": {
        "instrument": "sifflet",
        # « une série rapide d'au moins cinq sons brefs », règle 34 d) : c'est le
        # seul signal dont la source qualifie l'intervalle, il est donc resserré.
        "motif": suite("b", "b", "b", "b", "b", intervalle=0.5),
        "alt": "Cinq sons brefs au sifflet, émis en série rapide, les silences plus "
               "courts que les sons.",
        "regle": "RIPAM, règle 34 d), signal du doute, au moins cinq sons brefs",
    },
    "depassement-tribord": {
        "instrument": "sifflet",
        "motif": suite("p", "p", "b"),
        "alt": "Deux sons prolongés au sifflet, suivis d'un son bref.",
        "regle": "RIPAM, règle 34 c) i), « Je compte vous rattraper sur tribord »",
    },
    "depassement-babord": {
        "instrument": "sifflet",
        "motif": suite("p", "p", "b", "b"),
        "alt": "Deux sons prolongés au sifflet, suivis de deux sons brefs.",
        "regle": "RIPAM, règle 34 c) i), « Je compte vous rattraper sur bâbord »",
    },
    "accord-depassement": {
        "instrument": "sifflet",
        "motif": suite("p", "b", "p", "b"),
        "alt": "Au sifflet, un son prolongé, un son bref, un son prolongé et un son "
               "bref, dans cet ordre.",
        "regle": "RIPAM, règle 34 c) ii), accord du navire sur le point d'être rattrapé",
    },
    "coude": {
        "instrument": "sifflet",
        "motif": suite("p"),
        "alt": "Un son prolongé au sifflet, tenu bien plus longtemps qu'un son bref.",
        "regle": "RIPAM, règle 34 e), signal du coude, et sa réponse",
    },
    # ── Règle 35, signaux sonores par visibilité réduite ──────────────────────
    "brume-avec-erre": {
        "instrument": "sifflet",
        "motif": suite("p"),
        "alt": "Un son prolongé au sifflet, isolé, tenu bien plus longtemps qu'un "
               "son bref.",
        "regle": "RIPAM, règle 35 a), navire à propulsion mécanique ayant de l'erre",
    },
    "brume-stoppe": {
        "instrument": "sifflet",
        # « séparés par un intervalle de deux secondes environ », règle 35 b).
        "motif": suite("p", "p", intervalle=2.0),
        "alt": "Deux sons prolongés au sifflet, séparés par un silence court au regard "
               "de leur propre durée.",
        "regle": "RIPAM, règle 35 b), navire à propulsion mécanique stoppé, sans erre",
    },
    "brume-manoeuvre-restreinte": {
        "instrument": "sifflet",
        "motif": suite("p", "b", "b"),
        "alt": "Un son prolongé au sifflet, suivi de deux sons brefs.",
        "regle": "RIPAM, règle 35 c), navire non maître de sa manœuvre, à capacité "
                 "restreinte, handicapé par son tirant d'eau, à voile, en pêche ou "
                 "en remorquage",
    },
    "brume-remorque": {
        "instrument": "sifflet",
        "motif": suite("p", "b", "b", "b"),
        "alt": "Un son prolongé au sifflet, suivi de trois sons brefs.",
        "regle": "RIPAM, règle 35 e), navire remorqué, ou dernier navire du convoi",
    },
    "brume-pilote": {
        "instrument": "sifflet",
        "motif": suite("b", "b", "b", "b"),
        "alt": "Quatre sons brefs au sifflet, de durées égales.",
        "regle": "RIPAM, règle 35 k), signal d'identification du bateau-pilote en service",
    },
    "mouillage-abordage": {
        "instrument": "sifflet",
        "motif": suite("b", "p", "b"),
        "alt": "Au sifflet, un son bref, un son prolongé et un son bref, dans cet ordre.",
        "regle": "RIPAM, règle 35 g), signal facultatif du navire au mouillage qui "
                 "voit un navire s'approcher",
    },
    "brume-mouillage": {
        "instrument": "cloche",
        "motif": [(VOLEE, "v")],
        "alt": "La cloche sonnée rapidement pendant cinq secondes environ, une suite "
               "serrée de coups et non un son tenu.",
        "regle": "RIPAM, règle 35 g), navire au mouillage",
    },
    "brume-echouement": {
        "instrument": "cloche",
        "motif": (
            suite("c", "c", "c", intervalle=0.65)
            + [(1.0, None), (VOLEE, "v"), (1.0, None)]
            + suite("c", "c", "c", intervalle=0.65)
        ),
        "alt": "Trois coups de cloche séparés et distincts, puis la cloche sonnée "
               "rapidement pendant cinq secondes environ, puis de nouveau trois coups "
               "séparés et distincts.",
        "regle": "RIPAM, règle 35 h), navire échoué",
    },
}


def duree(motif: list[tuple[float, str | None]]) -> float:
    return sum(d for d, _ in motif)


def _instrument(sorte: str) -> list[str]:
    """Le sifflet ou la cloche, dessiné bouche à droite, ondes vers la droite."""
    if sorte == "sifflet":
        return [
            f'<path d="M24,42 L44,42 L{EX},28 L{EX},72 L44,58 L24,58 Z" fill="{LAITON}" '
            f'stroke="{ENCRE}" stroke-width="1.2" stroke-linejoin="round" />',
            f'<rect x="18" y="44" width="8" height="12" rx="1.5" fill="{ENCRE_DOUCE}" />',
        ]
    # La cloche : calotte, jupe évasée, battant, et le joug qui la porte.
    return [
        f'<rect x="40" y="18" width="6" height="7" fill="{ENCRE_DOUCE}" />',
        f'<path d="M28,60 Q28,26 43,25 Q58,26 58,60 Z" fill="{LAITON}" '
        f'stroke="{ENCRE}" stroke-width="1.2" stroke-linejoin="round" />',
        f'<rect x="25" y="59" width="36" height="5" rx="1.5" fill="{LAITON}" '
        f'stroke="{ENCRE}" stroke-width="1.2" />',
        f'<circle cx="43" cy="69" r="3.6" fill="{ENCRE_DOUCE}" />',
    ]


def _ondes() -> list[str]:
    """Trois arcs concentriques à la bouche de l'instrument."""
    arcs = []
    for i, rayon in enumerate((15, 26, 37)):
        a = math.radians(52)
        x1, y1 = EX + rayon * math.cos(-a), EY + rayon * math.sin(-a)
        x2, y2 = EX + rayon * math.cos(a), EY + rayon * math.sin(a)
        arcs.append(
            f'<path d="M{x1:.2f},{y1:.2f} A{rayon},{rayon} 0 0 1 {x2:.2f},{y2:.2f}" '
            f'fill="none" stroke="{ENCRE}" stroke-width="{2.6 - i * 0.5:.1f}" '
            f'stroke-linecap="round" stroke-opacity="{0.75 - i * 0.18:.2f}" />'
        )
    return arcs


def _blocs(motif: list[tuple[float, str | None]]) -> list[str]:
    """Le motif tracé sur la frise, à l'échelle commune à tous les dessins."""
    blocs: list[str] = []
    t = 0.0
    for d, sorte in motif:
        x = FRISE_X0 + t * ECHELLE
        largeur = d * ECHELLE
        if sorte in ("b", "p"):
            blocs.append(
                f'<rect x="{x:.2f}" y="{FRISE_Y - BARRE_H}" width="{largeur:.2f}" '
                f'height="{BARRE_H}" fill="{ENCRE}" />'
            )
        elif sorte == "v":
            # Une volée n'est pas un son tenu : on la hachure, coup par coup.
            blocs.append(
                f'<rect x="{x:.2f}" y="{FRISE_Y - BARRE_H}" width="{largeur:.2f}" '
                f'height="{BARRE_H}" fill="{ENCRE}" fill-opacity="0.16" />'
            )
            pas = 4.2
            xi = x + 1.2
            while xi < x + largeur - 1:
                blocs.append(
                    f'<rect x="{xi:.2f}" y="{FRISE_Y - BARRE_H}" width="1.7" '
                    f'height="{BARRE_H}" fill="{ENCRE}" />'
                )
                xi += pas
        elif sorte == "c":
            blocs.append(
                f'<rect x="{x:.2f}" y="{FRISE_Y - BARRE_H - 3}" width="{largeur:.2f}" '
                f'height="{BARRE_H + 3}" fill="{ENCRE}" />'
            )
        t += d
    return blocs


def _keyframes(cle: str, motif: list[tuple[float, str | None]], cycle: float) -> str:
    """L'instrument sonne pendant les sons, se tait pendant les silences."""
    arrets: list[str] = []
    t = 0.0
    for d, sorte in motif:
        arrets.append(f"{t / cycle * 100:.4g}%{{opacity:{0 if sorte is None else 1}}}")
        t += d
    arrets.append(f"{t / cycle * 100:.4g}%{{opacity:0}}")   # la pause finale
    arrets.append("100%{opacity:0}")
    return f"@keyframes {cle}-son{{{''.join(arrets)}}}"


def _fond() -> list[str]:
    """La brume, en bandes horizontales molles."""
    bandes = [f'<rect width="{LARGEUR}" height="{HAUTEUR}" fill="{BRUME}" />']
    for i, y in enumerate((14, 34, 58, 78)):
        bandes.append(
            f'<rect x="0" y="{y}" width="{LARGEUR}" height="{7 + (i % 2) * 4}" '
            f'fill="{BRUME_BANDE}" fill-opacity="0.55" />'
        )
    return bandes


def svg_de_signal(nom: str) -> str:
    signal = SIGNAUX[nom]
    motif = signal["motif"]
    cle = nom.replace("-", "")
    total = duree(motif)
    cycle = total + PAUSE

    styles = [
        # Les ondes ne se montrent que pendant un son, et respirent tant qu'il dure :
        # un prolongé de cinq secondes n'est jamais une image immobile.
        f".son{{opacity:1;animation:{cle}-son {cycle:.4g}s step-end infinite}}",
        _keyframes(cle, motif, cycle),
        "@keyframes propagation{from{transform:scale(0.62);opacity:0.95}"
        "to{transform:scale(1.12);opacity:0.1}}",
        f".onde{{transform-box:view-box;transform-origin:{EX}px {EY}px;"
        "animation:propagation 1.05s linear infinite}",
        f".curseur{{transform-box:view-box;animation:{cle}-balayage {cycle:.4g}s "
        "linear infinite}",
        f"@keyframes {cle}-balayage{{from{{transform:translateX(0)}}"
        f"to{{transform:translateX({total * ECHELLE:.2f}px)}}}}",
        # Mouvement coupé : l'instrument sonne, la frise porte déjà tout le motif.
        "@media (prefers-reduced-motion:reduce){.son,.onde{animation:none}"
        ".son{opacity:1}.curseur{display:none}}",
    ]

    return "\n".join([
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LARGEUR} {HAUTEUR}" '
        f'width="{LARGEUR}" height="{HAUTEUR}" role="img">',
        f"<style>{''.join(styles)}</style>",
        *_fond(),
        f'<g class="son"><g class="onde">{"".join(_ondes())}</g></g>',
        *_instrument(signal["instrument"]),
        f'<line x1="{FRISE_X0}" y1="{FRISE_Y}" x2="{FRISE_X0 + total * ECHELLE:.2f}" '
        f'y2="{FRISE_Y}" stroke="{FRISE}" stroke-width="1.5" />',
        *_blocs(motif),
        f'<g class="curseur"><line x1="{FRISE_X0}" y1="{FRISE_Y - BARRE_H - 7}" '
        f'x2="{FRISE_X0}" y2="{FRISE_Y + 5}" stroke="{ENCRE}" stroke-width="1.4" '
        f'stroke-opacity="0.5" /></g>',
        "</svg>",
    ]) + "\n"


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__)
    parseur.add_argument("--verifier", action="store_true", help="échoue au lieu d'écrire")
    args = parseur.parse_args(argv)

    SORTIE.mkdir(parents=True, exist_ok=True)
    perimes = []
    for nom in SIGNAUX:
        chemin = SORTIE / f"{nom}.svg"
        dessin = svg_de_signal(nom)
        if args.verifier:
            if not chemin.is_file() or chemin.read_text(encoding="utf-8") != dessin:
                perimes.append(chemin.relative_to(RACINE))
            continue
        chemin.write_text(dessin, encoding="utf-8")
        print(f"écrit {chemin.relative_to(RACINE)}")

    if args.verifier:
        for chemin in perimes:
            print(f"{chemin} n'est plus à jour, lance `npm run sons`", file=sys.stderr)
        if perimes:
            return 1
        print(f"{len(SIGNAUX)} signal(aux) sonore(s) à jour.")
        return 0

    print(f"\n{len(SIGNAUX)} signal(aux) sonore(s) dans public/visuels/sons/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
