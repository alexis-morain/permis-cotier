#!/usr/bin/env python3
"""Dessine en SVG animé les situations de rencontre entre deux navires.

    python3 scripts/situations.py            # écrit public/visuels/situations/
    python3 scripts/situations.py --verifier # échoue si un fichier n'est plus à jour

Les règles de barre sont géométriques : qui vient d'où, qui voit quoi, qui
s'écarte. Vingt-huit questions du thème `barre-route` les posaient jusqu'ici en
mots seuls, ce qui ajoute au candidat un travail de figuration mentale que
l'examen ne demande pas. Une vue de dessus le lui rend.

Convention tenue partout, et rappelée dans chaque texte alternatif : **ton
bateau est en bas de l'image, il fait route vers le haut, et sa coque porte la
couleur d'accent du site.** L'autre navire est dessiné à l'encre. Le candidat
n'a donc jamais à deviner qui il est.

Ce que la scène montre, et ce qu'elle tait
------------------------------------------
Une scène de question montre **l'approche, pas la manœuvre**. Les deux navires
se rapprochent, s'arrêtent à distance, et le cycle reprend. Dessiner l'évitement
donnerait la réponse. Deux fichiers font exception et sont des schémas
d'explication, pas des énoncés : `relevement-constant`, qui montre pourquoi le
relèvement invariable signale l'abordage, et `secteur-rattrapant`, qui montre le
secteur de 22,5 degrés sur l'arrière du travers.

`prefers-reduced-motion` fige chaque navire à sa position d'arrêt, celle qui
porte le plus d'information : la géométrie de la rencontre reste entière.

Sources
-------
Chaque scène cite la règle du RIPAM qu'elle illustre, extraite dans
`data/sources/decret-77-733/`. Une scène ne se publie pas sans que sa géométrie
ait été relue contre la règle. Crédit `code`.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
SORTIE = RACINE / "public" / "visuels" / "situations"

# La palette du site, reprise telle quelle : le visuel appartient à la page.
EAU = "#cddfe2"
EAU_PROFONDE = "#a8c4c9"
ENCRE = "#16231f"
ENCRE_DOUCE = "#4a5a54"
ACCENT = "#b0005c"
FILET = "#b9ae95"
VOILE = "#f7f3e8"
ECUME = "#ffffff"

LARGEUR = 240
HAUTEUR = 200
CYCLE = 7.0            # durée d'un cycle d'approche, en secondes
ARRIVEE = 68           # pourcentage du cycle où les navires s'arrêtent

# Coque vue de dessus, étrave vers le haut, dessinée centrée sur l'origine.
# Coque vue de dessus : étrave effilée, joues qui s'ouvrent, tableau arrière
# arrondi. Les courbes valent mieux qu'un polygone, qui se lisait en pointe
# de flèche plutôt qu'en bateau.
COQUE = ("M0,-19 Q7,-11 8,-1 L8,12 Q8,17.5 3.5,19 L-3.5,19 Q-8,17.5 -8,12 L-8,-1 Q-7,-11 0,-19 Z")
# Le sillage s'ouvre derrière le tableau et s'efface : court et pâle, sinon
# il pèse plus que la coque et le navire ressemble à une fusée.
SILLAGE = "M-6,19 L-11,44 L0,47 L11,44 L6,19 Z"


def _navire(cap: float, couleur: str, voile: str | None = None) -> str:
    """Un navire orienté, sillage compris. Le groupe reste centré sur l'origine.

    `voile` vaut « babord » ou « tribord » et nomme le côté vers lequel la voile
    porte, donc le côté opposé au vent : une voile bordée à bâbord se lit
    « tribord amures ».
    """
    pieces = [
        f'<path d="{SILLAGE}" fill="{ECUME}" fill-opacity="0.3" />',
        f'<path d="{COQUE}" fill="{couleur}" />',
        # Un pont plus clair, pour que l'étrave se distingue de la poupe.
        # Un rouf clair au tiers avant : il donne le sens de la coque d'un coup d'œil.
        f'<rect x="-4.5" y="-6" width="9" height="11" rx="1.5" fill="{ECUME}" fill-opacity="0.42" />',
        f'<path d="{COQUE}" fill="none" stroke="{ENCRE}" stroke-width="0.7" stroke-opacity="0.25" />',
    ]
    if voile is not None:
        signe = -1 if voile == "babord" else 1
        pieces.append(
            f'<path d="M0,-10 L{signe * 19},13 L0,17 Z" fill="{VOILE}" '
            f'stroke="{ENCRE}" stroke-width="0.8" stroke-opacity="0.55" />'
        )
    return f'<g transform="rotate({cap})">{"".join(pieces)}</g>'


def _fleche_vent(x: float, y: float, cap: float) -> str:
    """Le vent, dessiné là où il ne recouvre aucun navire. `cap` est sa direction
    de propagation : un vent de nord souffle vers le sud, donc cap 180."""
    return (
        f'<g transform="translate({x},{y}) rotate({cap})" opacity="0.72">'
        f'<line x1="0" y1="-16" x2="0" y2="12" stroke="{ENCRE_DOUCE}" stroke-width="1.6" />'
        f'<path d="M0,16 L-4.5,7 L4.5,7 Z" fill="{ENCRE_DOUCE}" />'
        f'<line x1="-7" y1="-13" x2="-7" y2="-2" stroke="{ENCRE_DOUCE}" stroke-width="1.1" '
        f'stroke-opacity="0.6" />'
        f'<line x1="7" y1="-13" x2="7" y2="-2" stroke="{ENCRE_DOUCE}" stroke-width="1.1" '
        f'stroke-opacity="0.6" />'
        f"</g>"
    )


# Les scènes. Un navire se décrit par sa **position d'arrêt**, son cap et la
# longueur de route qu'il parcourt avant de s'y arrêter : la position de départ
# s'en déduit, ce qui garantit qu'un navire avance toujours dans l'axe de son
# étrave. Le cap est en degrés, zéro vers le haut de l'image, comme une route au
# compas sur une carte orientée au nord. Le rôle « toi » prend la couleur
# d'accent, « autre » l'encre.
SCENES: dict[str, dict] = {
    "routes-opposees": {
        "navires": [
            {"a": (120, 132), "cap": 0, "route": 46, "role": "toi"},
            {"a": (120, 66), "cap": 180, "route": 46, "role": "autre"},
        ],
        "alt": "Vue de dessus. Ton bateau, en bas, fait route vers le haut de l'image. "
               "Un navire à moteur vient droit sur lui, étrave contre étrave.",
        "regle": "RIPAM, règle 14, navires qui font des routes directement opposées",
    },
    "routes-croisees-tribord": {
        "navires": [
            {"a": (104, 128), "cap": 0, "route": 50, "role": "toi"},
            {"a": (170, 64), "cap": 270, "route": 48, "role": "autre"},
        ],
        "alt": "Vue de dessus. Ton bateau, en bas, fait route vers le haut de l'image. "
               "Un navire à moteur vient de la droite, cap vers la gauche, et coupera "
               "ta route devant toi.",
        "regle": "RIPAM, règle 15, navires dont les routes se croisent",
    },
    "routes-croisees-babord": {
        "navires": [
            {"a": (136, 128), "cap": 0, "route": 50, "role": "toi"},
            {"a": (70, 64), "cap": 90, "route": 48, "role": "autre"},
        ],
        "alt": "Vue de dessus. Ton bateau, en bas, fait route vers le haut de l'image. "
               "Un navire à moteur vient de la gauche, cap vers la droite, et coupera "
               "ta route devant toi.",
        "regle": "RIPAM, règle 15, navires dont les routes se croisent",
    },
    "tu-es-rattrape": {
        "navires": [
            {"a": (122, 74), "cap": 0, "route": 40, "role": "toi"},
            {"a": (96, 138), "cap": 0, "route": 42, "role": "autre"},
        ],
        "alt": "Vue de dessus. Ton bateau fait route vers le haut de l'image. Un navire "
               "à moteur plus rapide le rejoint par l'arrière, en le débordant "
               "légèrement sur sa gauche.",
        "regle": "RIPAM, règle 13, navire qui en rattrape un autre",
    },
    "tu-rattrapes": {
        "navires": [
            {"a": (118, 138), "cap": 0, "route": 42, "role": "toi"},
            {"a": (144, 74), "cap": 0, "route": 40, "role": "autre"},
        ],
        "alt": "Vue de dessus. Ton bateau, en bas, fait route vers le haut de l'image et "
               "gagne sur un navire à moteur plus lent qui le précède, légèrement sur "
               "sa droite.",
        "regle": "RIPAM, règle 13, navire qui en rattrape un autre",
    },
    "voiliers-amures-contraires": {
        # Vent venant de la droite de l'image, soufflant vers la gauche : ton
        # voilier le reçoit par tribord, l'autre par bâbord.
        "vent": (32, 36, 250),
        "navires": [
            {"a": (100, 128), "cap": 0, "route": 48, "role": "toi", "voile": "babord"},
            {"a": (176, 70), "cap": 235, "route": 52, "role": "autre", "voile": "tribord"},
        ],
        "alt": "Vue de dessus. Deux voiliers convergent, vent venant de la droite de "
               "l'image. Ton voilier, en bas, porte sa voile à bâbord ; l'autre, qui "
               "vient de la droite, porte la sienne à tribord.",
        "regle": "RIPAM, règle 12 a) i), voiliers qui ont des amures différentes",
    },
    "voiliers-memes-amures": {
        "vent": (32, 36, 250),
        "navires": [
            {"a": (156, 108), "cap": 340, "route": 56, "role": "toi", "voile": "babord"},
            {"a": (74, 108), "cap": 340, "route": 56, "role": "autre", "voile": "babord"},
        ],
        "alt": "Vue de dessus. Deux voiliers font route au même cap, vent venant de la "
               "droite de l'image, voiles portées du même côté. Ton voilier est le plus "
               "proche du vent, l'autre est plus loin sous le vent.",
        "regle": "RIPAM, règle 12 a) ii), voiliers qui ont les mêmes amures",
    },
}


def depart(navire: dict) -> tuple[float, float]:
    """D'où vient le navire : sa position d'arrêt, reculée le long de son cap."""
    import math
    a = math.radians(navire["cap"])
    x, y = navire["a"]
    return (round(x - navire["route"] * math.sin(a), 1),
            round(y + navire["route"] * math.cos(a), 1))


def _keyframes_navire(cle: str, i: int, depart, arrivee) -> str:
    x0, y0 = depart
    x1, y1 = arrivee
    return (
        f"@keyframes {cle}-n{i}{{"
        f"0%{{transform:translate({x0}px,{y0}px)}}"
        f"{ARRIVEE}%{{transform:translate({x1}px,{y1}px)}}"
        f"100%{{transform:translate({x1}px,{y1}px)}}}}"
    )


def _fond() -> list[str]:
    """L'eau, et une houle assez discrète pour ne pas concurrencer les coques.

    Chaque rang est décalé horizontalement : à phase égale, les crêtes
    s'alignent en colonnes et la mer se lit comme un papier peint.
    """
    houle = []
    for rang, y in enumerate(range(14, HAUTEUR, 21)):
        decalage = -6 - (rang % 3) * 9
        houle.append(
            f'<path d="M{decalage},{y} q14,-4.5 28,0 t28,0 t28,0 t28,0 t28,0 t28,0 t28,0 '
            f't28,0 t28,0 t28,0" fill="none" stroke="{EAU_PROFONDE}" stroke-width="1.3" '
            f'stroke-opacity="0.4" />'
        )
    return [f'<rect width="{LARGEUR}" height="{HAUTEUR}" fill="{EAU}" />', *houle]


def svg_de_scene(nom: str) -> str:
    scene = SCENES[nom]
    cle = nom.replace("-", "")
    navires = scene["navires"]

    styles = [
        # Sans cette ligne, un navigateur peut rapporter la translation à la boîte
        # de l'élément et non au repère du dessin : les coordonnées ci-dessous
        # sont celles du viewBox.
        ".nav{transform-box:view-box;transform-origin:0 0}",
        # La respiration ne décore pas : elle masque la couture du bouclage,
        # quand les navires reprennent leur position de départ.
        f".nav{{animation-duration:{CYCLE}s;animation-timing-function:linear;"
        f"animation-iteration-count:infinite}}",
        f"@keyframes {cle}-souffle{{0%{{opacity:0}}6%{{opacity:1}}{ARRIVEE + 22}%{{opacity:1}}"
        f"98%{{opacity:0}}100%{{opacity:0}}}}",
        # Opacité pleine par défaut, et cycle démarré après le fondu d'entrée :
        # une image figée au premier instant montre les navires, pas une mer vide.
        f".souffle{{opacity:1;animation:{cle}-souffle {CYCLE}s linear infinite;"
        f"animation-delay:-{CYCLE * 0.06:.2f}s}}",
    ]
    for i, n in enumerate(navires):
        x1, y1 = n["a"]
        styles.append(
            f".nav{i}{{transform:translate({x1}px,{y1}px);animation-name:{cle}-n{i}}}"
        )
        styles.append(_keyframes_navire(cle, i, depart(n), n["a"]))
    # Mouvement coupé : chaque navire tient sa position d'arrêt, celle qui montre
    # la rencontre. La règle de base porte déjà cette position.
    styles.append(
        "@media (prefers-reduced-motion:reduce){"
        ".nav,.souffle{animation:none}.souffle{opacity:1}}"
    )

    routes = []
    coques = []
    for i, n in enumerate(navires):
        x0, y0 = depart(n)
        x1, y1 = n["a"]
        routes.append(
            f'<line x1="{x0}" y1="{y0}" x2="{x1}" y2="{y1}" stroke="{FILET}" '
            f'stroke-width="1.2" stroke-dasharray="3 4" stroke-opacity="0.75" />'
        )
        couleur = ACCENT if n["role"] == "toi" else ENCRE
        coques.append(
            f'<g class="nav nav{i}">{_navire(n["cap"], couleur, n.get("voile"))}</g>'
        )

    vent = [_fleche_vent(*scene["vent"])] if "vent" in scene else []

    return "\n".join([
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LARGEUR} {HAUTEUR}" '
        f'width="{LARGEUR}" height="{HAUTEUR}" role="img">',
        f"<style>{''.join(styles)}</style>",
        *_fond(),
        *routes,
        *vent,
        f'<g class="souffle">{"".join(coques)}</g>',
        "</svg>",
    ]) + "\n"


# ── Les deux schémas d'explication ────────────────────────────────────────────

def svg_relevement_constant() -> str:
    """Trois relèvements successifs qui ne changent pas : c'est l'abordage.

    La règle 7 d) i) dit que le risque existe si le relèvement au compas d'un
    navire qui approche ne change pas de manière appréciable. Le schéma trace
    trois instants : la ligne qui joint les deux navires raccourcit, mais garde
    exactement la même direction. **Ce parallélisme est la leçon**, donc il est
    construit et non dessiné à vue : les positions de l'autre navire se déduisent
    des tiennes par un même vecteur de relèvement, réduit d'un tiers à chaque
    instant. Toute retouche à la main de ces coordonnées casserait la démonstration.

    Les trois instants apparaissent l'un après l'autre et restent affichés : le
    schéma se construit sous les yeux, puis se rejoue.
    """
    toi = [(96, 180), (96, 144), (96, 108)]
    releve = (132, -140)          # le relèvement, identique aux trois instants
    autre = [
        (round(x + releve[0] * k), round(y + releve[1] * k))
        for (x, y), k in zip(toi, (1.0, 2 / 3, 1 / 3))
    ]
    # Cap de l'autre navire, déduit de sa propre route entre le premier et le
    # dernier instant : il fait bien route droite, il ne manœuvre pas.
    import math
    dx, dy = autre[-1][0] - autre[0][0], autre[-1][1] - autre[0][1]
    cap_autre = round(math.degrees(math.atan2(dx, -dy)) % 360)

    # Le plus ancien instant est le plus pâle : on lit le sens du temps.
    opacites = [0.38, 0.62, 1.0]
    styles = [
        ".instant{animation-duration:6s;animation-timing-function:linear;"
        "animation-iteration-count:infinite}",
    ]
    pieces = []
    for i, ((t, a), opacite) in enumerate(zip(zip(toi, autre), opacites), start=1):
        # Chaque instant reste caché jusqu'à son tour, puis tient sa place
        # jusqu'à la fin du cycle.
        styles.append(f".i{i}{{opacity:{opacite}}}")
        if i > 1:
            # Le premier instant est là d'emblée : sinon l'image au repos, ou
            # figée au premier cycle, ne montre qu'une mer vide.
            entree = (i - 1) * 32
            styles.append(f".i{i}{{animation-name:releve{i}}}")
            styles.append(
                f"@keyframes releve{i}{{0%{{opacity:0}}{entree}%{{opacity:0}}"
                f"{entree + 2}%{{opacity:{opacite}}}100%{{opacity:{opacite}}}}}"
            )
        recent = i == len(toi)
        pieces.append(
            f'<g class="instant i{i}">'
            f'<line x1="{t[0]}" y1="{t[1]}" x2="{a[0]}" y2="{a[1]}" stroke="{ENCRE_DOUCE}" '
            f'stroke-width="{1.7 if recent else 1.1}" stroke-dasharray="4 3" />'
            f'<g transform="translate({t[0]},{t[1]})">{_navire(0, ACCENT)}</g>'
            f'<g transform="translate({a[0]},{a[1]})">{_navire(cap_autre, ENCRE)}</g>'
            f"</g>"
        )
    # Mouvement coupé : les trois instants sont là d'emblée, le schéma est complet.
    styles.append("@media (prefers-reduced-motion:reduce){.instant{animation:none}}")

    return "\n".join([
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LARGEUR} {HAUTEUR}" '
        f'width="{LARGEUR}" height="{HAUTEUR}" role="img">',
        f"<style>{''.join(styles)}</style>",
        *_fond(),
        *pieces,
        "</svg>",
    ]) + "\n"


def svg_secteur_rattrapant() -> str:
    """Le secteur de plus de 22,5 degrés sur l'arrière du travers.

    La règle 13 b) définit le navire rattrapant par ce qu'il voit : il vient
    d'une direction telle que, de nuit, il ne verrait du navire rattrapé que son
    feu de poupe, aucun feu de côté. Le secteur dessiné est cette zone.
    """
    cx, cy = 120, 82
    rayon = 96
    # 22,5 degrés sur l'arrière du travers, des deux bords : le secteur s'ouvre
    # de 112,5 à 247,5 degrés comptés depuis l'étrave, soit 135 degrés en tout.
    import math
    pts = []
    for angle in range(1125, 2476, 25):
        a = math.radians(angle / 10 - 90)
        pts.append(f"{cx + rayon * math.cos(a):.2f},{cy + rayon * math.sin(a):.2f}")
    secteur = f'M{cx},{cy} L' + " L".join(pts) + " Z"
    # Les deux limites du secteur, tracées plus franchement que son remplissage.
    limites = []
    for angle in (112.5, 247.5):
        a = math.radians(angle - 90)
        limites.append(
            f'<line x1="{cx}" y1="{cy}" x2="{cx + rayon * math.cos(a):.2f}" '
            f'y2="{cy + rayon * math.sin(a):.2f}" stroke="{ENCRE_DOUCE}" stroke-width="1.2" '
            f'stroke-dasharray="4 3" />'
        )
    # Le travers, pour que le « sur l'arrière du travers » se voie.
    travers = (
        f'<line x1="{cx - rayon}" y1="{cy}" x2="{cx + rayon}" y2="{cy}" '
        f'stroke="{ENCRE_DOUCE}" stroke-width="1" stroke-opacity="0.35" />'
    )
    return "\n".join([
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LARGEUR} {HAUTEUR}" '
        f'width="{LARGEUR}" height="{HAUTEUR}" role="img">',
        *_fond(),
        f'<path d="{secteur}" fill="{ENCRE_DOUCE}" fill-opacity="0.18" />',
        travers,
        *limites,
        f'<g transform="translate({cx},{cy})">{_navire(0, ACCENT)}</g>',
        "</svg>",
    ]) + "\n"


SCHEMAS = {
    "relevement-constant": {
        "rendu": svg_relevement_constant,
        "alt": "Vue de dessus. Trois instants successifs d'une même rencontre, où les "
               "deux navires se rapprochent et où la ligne qui les joint garde "
               "exactement la même direction d'un instant à l'autre.",
        "regle": "RIPAM, règle 7 d) i), risque d'abordage et relèvement au compas",
    },
    "secteur-rattrapant": {
        "rendu": svg_secteur_rattrapant,
        "alt": "Vue de dessus d'un navire et du secteur qui s'ouvre derrière lui, de "
               "part et d'autre, au-delà de 22,5 degrés sur l'arrière de son travers.",
        "regle": "RIPAM, règle 13 b), définition du navire qui en rattrape un autre",
    },
}


def tout() -> dict[str, str]:
    dessins = {nom: svg_de_scene(nom) for nom in SCENES}
    dessins.update({nom: fiche["rendu"]() for nom, fiche in SCHEMAS.items()})
    return dessins


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__)
    parseur.add_argument("--verifier", action="store_true", help="échoue au lieu d'écrire")
    args = parseur.parse_args(argv)

    SORTIE.mkdir(parents=True, exist_ok=True)
    dessins = tout()
    perimes = []
    for nom, dessin in dessins.items():
        chemin = SORTIE / f"{nom}.svg"
        if args.verifier:
            if not chemin.is_file() or chemin.read_text(encoding="utf-8") != dessin:
                perimes.append(chemin.relative_to(RACINE))
            continue
        chemin.write_text(dessin, encoding="utf-8")
        print(f"écrit {chemin.relative_to(RACINE)}")

    if args.verifier:
        for chemin in perimes:
            print(f"{chemin} n'est plus à jour, lance `npm run situations`", file=sys.stderr)
        if perimes:
            return 1
        print(f"{len(dessins)} situation(s) à jour.")
        return 0

    print(f"\n{len(dessins)} situation(s) dans public/visuels/situations/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
