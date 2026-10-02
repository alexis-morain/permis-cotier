#!/usr/bin/env python3
"""Dessine en SVG un navire entier vu sous un relèvement, avec ses feux ou ses marques.

    python3 scripts/navires.py            # écrit public/visuels/navires/
    python3 scripts/navires.py --verifier # échoue si un fichier n'est plus à jour,
                                          # ou si un feu y manque ou y est en trop

`feux.py` dessine des piles de feux visibles sur tout l'horizon : il suffit
pour reconnaître une pile, pas pour reconnaître un navire. L'épreuve montre
plutôt un navire placé, de nuit avec ses feux, de jour avec ses marques, et le
candidat doit savoir que de l'arrière on ne voit pas les feux de côté. Ce
script dessine ce navire depuis une description déclarative,
`data/visuels/navires.yaml`, qui dit le type de navire, sa longueur, sa
situation et d'où on le regarde.

Les feux ne sont pas écrits dans la description : ils sortent de la table
`FEUX`, une ligne par article des règles 23 à 30 du RIPAM, puis des secteurs de
la règle 21. On ne dessine que ce que le secteur laisse voir sous le
relèvement. Les marques suivent la table `MARQUES`, de la même façon. Le
`--verifier` recompte les feux et les marques de chaque fichier livré contre
ces deux tables : un feu retiré ou ajouté à la main se voit.

Aucun libellé dans l'image, aucun nom de couleur dans le fichier : les
dégradés se nomment par rang, comme dans `feux.py`. Crédit `code`.
"""
from __future__ import annotations

import math
import re
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import yaml

from _commun import main_dessin
from balisage import ACIER, CIEL as CIEL_JOUR, COULEURS as TEINTES_JOUR, MER
from feux import CIEL as CIEL_NUIT, COULEURS, EAU, MAT

RACINE = Path(__file__).resolve().parents[1]
SORTIE = RACINE / "public" / "visuels" / "navires"
DONNEES = RACINE / "data" / "visuels" / "navires.yaml"

# --- Règle 21 : d'où l'on voit quel feu ---------------------------------------

# Le relèvement est l'angle, compté depuis l'avant du navire vers tribord, sous
# lequel l'observateur se trouve : 0 il est droit devant, 90 par le travers
# tribord, 180 droit derrière, 270 par le travers bâbord.
VUES = {
    "avant": 0.0,
    "avant-tribord": 45.0,
    "tribord": 90.0,
    "arriere-tribord": 135.0,
    "arriere": 180.0,
    "arriere-babord": 225.0,
    "babord": 270.0,
    "avant-babord": 315.0,
}

# 22,5 degrés sur l'arrière du travers : la limite commune des feux de côté, de
# tête de mât et de poupe (règle 21 a, b, c).
LIMITE = 112.5


def visible(secteur: str, angle: float) -> bool:
    """Le feu de ce secteur se voit-il sous ce relèvement ? Règle 21.

    - tête de mât, 225 degrés : de l'avant jusqu'à 22,5 degrés sur l'arrière
      du travers de chaque bord (21 a) ;
    - feu de côté, 112,5 degrés : de l'avant jusqu'à la même limite, de son
      bord (21 b). Droit devant, on voit les deux ;
    - poupe et remorquage, 135 degrés : 67,5 degrés de chaque bord à partir
      de l'arrière (21 c, d) ;
    - tout l'horizon, 360 degrés (21 e).

    Un relèvement posé sur la limite elle-même est refusé : la règle ne dit pas
    lequel des deux feux on y voit, le dessin ne tranche pas à sa place.
    """
    relatif = (angle + 180.0) % 360.0 - 180.0   # dans [-180, 180), tribord positif
    if math.isclose(abs(relatif), LIMITE):
        raise ValueError(f"relèvement {angle} sur la limite d'un secteur de la règle 21")
    if secteur == "horizon":
        return True
    if secteur == "tete":
        return abs(relatif) < LIMITE
    if secteur == "cote-tribord":
        return 0.0 <= relatif < LIMITE
    if secteur == "cote-babord":
        return -LIMITE < relatif <= 0.0
    if secteur in ("poupe", "remorquage"):
        return abs(relatif) > LIMITE
    raise ValueError(f"secteur inconnu : {secteur}")


# --- La description ----------------------------------------------------------

NAVIRES = {
    # type de navire -> situations où la table sait le décrire
    "moteur": ("route", "sans-erre", "mouillage", "echoue"),
    "voile": ("route", "sans-erre", "mouillage", "echoue"),
    "voile-au-moteur": ("route", "sans-erre"),
    "chalut": ("route", "sans-erre"),
    "peche": ("route", "sans-erre", "mouillage"),
    "non-maitre": ("route", "sans-erre"),
    "capacite-restreinte": ("route", "sans-erre", "mouillage"),
    "dragueur": ("route", "sans-erre", "mouillage"),
    "tirant-d-eau": ("route", "sans-erre"),
    "remorqueur": ("route", "sans-erre"),
    "pilote": ("route", "sans-erre", "mouillage"),
}
CHAMPS = {"navire", "longueur", "situation", "vue", "moment", "regle", "alt"}
OPTIONS = {"train", "cote_libre", "fanal"}


@dataclass(frozen=True)
class Situation:
    navire: str
    longueur: float
    situation: str
    vue: str
    moment: str
    regle: str
    alt: str
    train: float | None = None
    cote_libre: str | None = None
    fanal: bool = False

    def __post_init__(self):
        if self.navire not in NAVIRES:
            raise ValueError(f"navire inconnu : {self.navire}")
        if self.situation not in NAVIRES[self.navire]:
            raise ValueError(f"{self.navire} {self.situation} : la table ne le décrit pas")
        if self.vue not in VUES:
            raise ValueError(f"vue inconnue : {self.vue}")
        if self.moment not in ("nuit", "jour"):
            raise ValueError(f"moment inconnu : {self.moment}")
        if not self.longueur > 0:
            raise ValueError("longueur nulle")
        if (self.train is not None) != (self.navire == "remorqueur"):
            raise ValueError("`train` est la longueur du train d'un remorqueur, et lui seul")
        if (self.cote_libre is not None) != (self.navire == "dragueur"):
            raise ValueError("`cote_libre` dit le bord libre d'un dragueur, et de lui seul")
        if self.cote_libre not in (None, "babord", "tribord"):
            raise ValueError(f"côté libre inconnu : {self.cote_libre}")
        if self.fanal and not (self.navire == "voile" and self.longueur < 20):
            raise ValueError("le fanal combiné est réservé au navire à voile de moins de 20 m (25 b)")
        if self.navire in ("voile", "voile-au-moteur") and self.longueur >= 50:
            raise ValueError("pas de gabarit pour un voilier de 50 m et plus : un mât, pas de mâtereau")
        if self.navire in ("non-maitre", "capacite-restreinte", "dragueur") and self.longueur < 12:
            raise ValueError("règle 27 g) : sous 12 m, ces feux et marques ne sont pas exigés")

    @property
    def angle(self) -> float:
        return VUES[self.vue]


def charger(chemin: Path = DONNEES) -> dict[str, Situation]:
    donnees = yaml.safe_load(chemin.read_text(encoding="utf-8"))
    situations = {}
    for nom, champs in donnees.items():
        inconnus = set(champs) - CHAMPS - OPTIONS
        manquants = CHAMPS - set(champs)
        if inconnus or manquants:
            raise ValueError(f"{nom} : champs inconnus {sorted(inconnus)}, manquants {sorted(manquants)}")
        situations[nom] = Situation(**champs)
    return situations


# --- Les tables ----------------------------------------------------------------

@dataclass(frozen=True)
class Feu:
    secteur: str
    couleur: str
    place: str
    regle: str


def _si(*conditions):
    return lambda s: all(c(s) for c in conditions)


def _longueur(minimum: float = 0.0, maximum: float = math.inf):
    return lambda s: minimum <= s.longueur < maximum


EN_ROUTE = lambda s: s.situation in ("route", "sans-erre")   # règle 3 i)
AVEC_ERRE = lambda s: s.situation == "route"
AU_MOUILLAGE = lambda s: s.situation == "mouillage"
A_L_ARRET = lambda s: s.situation in ("mouillage", "echoue")
ECHOUE = lambda s: s.situation == "echoue"
TOUJOURS = lambda s: True
FANAL = lambda s: s.fanal
SANS_FANAL = lambda s: not s.fanal
LONG_TRAIN = lambda s: s.train is not None and s.train > 200

# Un feu s'écrit (secteur, couleur, place). La place dit où il est porté ; la
# mise en page en fait une position.
TETE = ("tete", "blanc", "tete")
TETE_ARRIERE = ("tete", "blanc", "tete-arriere")
COTES = [("cote-babord", "rouge", "cotes"), ("cote-tribord", "vert", "cotes")]
POUPE = ("poupe", "blanc", "poupe")


def _horizon(couleur: str, place: str = "pile"):
    return ("horizon", couleur, place)


# Chaque ligne : (condition, article, feux). Les lignes d'une règle se lisent
# comme ses alinéas ; un « peut » de la règle est tranché ici, une fois, et dit.
FEUX_23 = [
    (_si(EN_ROUTE, _longueur(7)), "RIPAM, règle 23 a) i)", [TETE]),
    # Sous 50 m, le second feu de tête de mât est permis, pas exigé : il n'est
    # pas dessiné.
    (_si(EN_ROUTE, _longueur(50)), "RIPAM, règle 23 a) ii)", [TETE_ARRIERE]),
    (_si(EN_ROUTE, _longueur(7)), "RIPAM, règle 23 a) iii)", COTES),
    (_si(EN_ROUTE, _longueur(7)), "RIPAM, règle 23 a) iv)", [POUPE]),
    # Entre 7 et 12 m, 23 d) i) permet un feu sur tout l'horizon au lieu de la
    # tête de mât et de la poupe : on garde 23 a). Sous 7 m, on dessine 23 d) ii)
    # avec ses feux de côté, qu'il « doit, si possible » montrer.
    (_si(EN_ROUTE, _longueur(0, 7)), "RIPAM, règle 23 d) ii)", [_horizon("blanc", "sommet"), *COTES]),
]

FEUX_30 = [
    (_si(A_L_ARRET, _longueur(50)), "RIPAM, règle 30 a) i)", [_horizon("blanc", "mouillage-avant")]),
    (_si(A_L_ARRET, _longueur(50)), "RIPAM, règle 30 a) ii)", [_horizon("blanc", "mouillage-arriere")]),
    # Sous 50 m, 30 b) permet un seul feu au lieu des deux : c'est lui qu'on dessine.
    # Sous 7 m, 30 e) dispense de tout feu de mouillage.
    (_si(A_L_ARRET, _longueur(7, 50)), "RIPAM, règle 30 b)", [_horizon("blanc", "sommet")]),
    # Sous 12 m, 30 f) dispense le navire échoué des deux rouges.
    (_si(ECHOUE, _longueur(12)), "RIPAM, règle 30 d) i)", [_horizon("rouge"), _horizon("rouge")]),
]

FEUX_27_B = [
    (TOUJOURS, "RIPAM, règle 27 b) i)", [_horizon("rouge"), _horizon("blanc"), _horizon("rouge")]),
    (AVEC_ERRE, "RIPAM, règle 27 b) iii)", [TETE, *COTES, POUPE]),
    (_si(AVEC_ERRE, _longueur(50)), "RIPAM, règle 27 b) iii)", [TETE_ARRIERE]),
]

FEUX: dict[str, list] = {
    "moteur": FEUX_23 + FEUX_30,
    "voile": [
        (_si(EN_ROUTE, SANS_FANAL), "RIPAM, règle 25 a) i)", COTES),
        (_si(EN_ROUTE, SANS_FANAL), "RIPAM, règle 25 a) ii)", [POUPE]),
        (_si(EN_ROUTE, FANAL), "RIPAM, règle 25 b)",
         [("cote-babord", "rouge", "fanal"), ("cote-tribord", "vert", "fanal"), ("poupe", "blanc", "fanal")]),
    ] + FEUX_30,
    # Règle 3 c) : dès que sa machine sert, il n'est plus navire à voile. De
    # nuit, il porte les feux d'un navire à propulsion mécanique.
    "voile-au-moteur": FEUX_23,
    "chalut": [
        (TOUJOURS, "RIPAM, règle 26 b) i)", [_horizon("vert"), _horizon("blanc")]),
        (_si(TOUJOURS, _longueur(50)), "RIPAM, règle 26 b) ii)", [TETE_ARRIERE]),
        (AVEC_ERRE, "RIPAM, règle 26 b) iii)", [*COTES, POUPE]),
    ],
    # 26 c) ii), l'engin déployé à plus de 150 m, n'est pas décrit.
    "peche": [
        (TOUJOURS, "RIPAM, règle 26 c) i)", [_horizon("rouge"), _horizon("blanc")]),
        (AVEC_ERRE, "RIPAM, règle 26 c) iii)", [*COTES, POUPE]),
    ],
    "non-maitre": [
        (TOUJOURS, "RIPAM, règle 27 a) i)", [_horizon("rouge"), _horizon("rouge")]),
        (AVEC_ERRE, "RIPAM, règle 27 a) iii)", [*COTES, POUPE]),
    ],
    # 27 b) iv) : au mouillage, en plus, les feux de la règle 30.
    "capacite-restreinte": FEUX_27_B + FEUX_30,
    # 27 d) iii) : au mouillage, les feux de 27 d) remplacent ceux de la règle 30.
    "dragueur": FEUX_27_B + [
        (TOUJOURS, "RIPAM, règle 27 d) i)", [_horizon("rouge", "obstrue"), _horizon("rouge", "obstrue")]),
        (TOUJOURS, "RIPAM, règle 27 d) ii)", [_horizon("vert", "libre"), _horizon("vert", "libre")]),
    ],
    "tirant-d-eau": FEUX_23 + [
        (EN_ROUTE, "RIPAM, règle 28", [_horizon("rouge"), _horizon("rouge"), _horizon("rouge")]),
    ],
    "remorqueur": [
        (EN_ROUTE, "RIPAM, règle 24 a) i)", [TETE, TETE]),
        (_si(EN_ROUTE, LONG_TRAIN), "RIPAM, règle 24 a) i)", [TETE]),
        # 24 d) renvoie à 23 a) ii) : le second feu de tête de mât, à 50 m et plus.
        (_si(EN_ROUTE, _longueur(50)), "RIPAM, règle 24 d)", [TETE_ARRIERE]),
        (EN_ROUTE, "RIPAM, règle 24 a) ii)", COTES),
        (EN_ROUTE, "RIPAM, règle 24 a) iii)", [POUPE]),
        (EN_ROUTE, "RIPAM, règle 24 a) iv)", [("remorquage", "jaune", "remorquage")]),
    ],
    "pilote": [
        (TOUJOURS, "RIPAM, règle 29 a) i)", [_horizon("blanc", "sommet"), _horizon("rouge", "sommet")]),
        (EN_ROUTE, "RIPAM, règle 29 a) ii)", [*COTES, POUPE]),
    ] + [(_si(AU_MOUILLAGE, c), regle, feux) for c, regle, feux in FEUX_30],   # 29 a) iii)
}

# Les marques, de jour. Une marque s'écrit (forme, place). « cone-bas » a la
# pointe en bas ; deux cônes « réunis par la pointe » sont un cone-bas posé
# sur un cone-haut, sans jour entre eux.
MARQUES_30 = [
    (AU_MOUILLAGE, "RIPAM, règle 30 a) i)", [("boule", "avant")]),
    (_si(ECHOUE, _longueur(12)), "RIPAM, règle 30 d) ii)", [("boule", "pile")] * 3),
]
DEUX_CONES_POINTES = [("cone-bas", "pile"), ("cone-haut", "pile")]
MARQUES_27_B = [
    (TOUJOURS, "RIPAM, règle 27 b) ii)", [("boule", "pile"), ("bicone", "pile"), ("boule", "pile")]),
]

MARQUES: dict[str, list] = {
    "moteur": MARQUES_30,
    "voile": MARQUES_30,
    "voile-au-moteur": [(EN_ROUTE, "RIPAM, règle 25 e)", [("cone-bas", "avant")])],
    "chalut": [(TOUJOURS, "RIPAM, règle 26 b) i)", DEUX_CONES_POINTES)],
    "peche": [(TOUJOURS, "RIPAM, règle 26 c) i)", DEUX_CONES_POINTES)],
    "non-maitre": [(TOUJOURS, "RIPAM, règle 27 a) ii)", [("boule", "pile")] * 2)],
    # Au mouillage, la règle 30 en plus (27 b) iv).
    "capacite-restreinte": MARQUES_27_B + MARQUES_30,
    # Au mouillage, 27 d) remplace la règle 30 (27 d) iii).
    "dragueur": MARQUES_27_B + [
        (TOUJOURS, "RIPAM, règle 27 d) i)", [("boule", "obstrue")] * 2),
        (TOUJOURS, "RIPAM, règle 27 d) ii)", [("bicone", "libre")] * 2),
    ],
    "tirant-d-eau": [(EN_ROUTE, "RIPAM, règle 28", [("cylindre", "pile")])],
    "remorqueur": [(_si(EN_ROUTE, LONG_TRAIN), "RIPAM, règle 24 a) v)", [("bicone", "pile")])],
    "pilote": [(AU_MOUILLAGE, "RIPAM, règle 29 a) iii)", [("boule", "avant")])],
}


def feux_prescrits(s: Situation) -> list[Feu]:
    """Tous les feux que la table prescrit, sans regarder d'où l'on voit."""
    return [
        Feu(secteur, couleur, place, regle)
        for condition, regle, feux in FEUX[s.navire] if condition(s)
        for secteur, couleur, place in feux
    ]


def feux_visibles(s: Situation) -> list[Feu]:
    """Les feux prescrits dont le secteur couvre le relèvement de l'observateur."""
    return [f for f in feux_prescrits(s) if visible(f.secteur, s.angle)]


def _marques(s: Situation) -> list[tuple[str, str, str]]:
    return [
        (forme, place, regle)
        for condition, regle, formes in MARQUES[s.navire] if condition(s)
        for forme, place in formes
    ]


def marques(s: Situation) -> list[str]:
    """Les formes des marques prescrites ; une marque se voit de partout."""
    return [forme for forme, _, _ in _marques(s)]


def references(s: Situation) -> list[str]:
    """Les articles d'où vient ce qui est dessiné."""
    if s.moment == "nuit":
        return sorted({f.regle for f in feux_visibles(s)})
    return sorted({regle for _, _, regle in _marques(s)})


# --- La géométrie du navire ----------------------------------------------------

# Le navire est modelé en unités arbitraires : x de 0 (tableau) à 100 (étrave),
# y vers tribord, z vers le haut depuis la flottaison. Un gabarit par famille.
# `cotes` donne l'abscisse des feux de côté et leur hauteur au-dessus du pont :
# à 20 m et plus, pas sur l'avant du feu de tête de mât (annexe I, 3 b).
GABARITS = {
    "grand": dict(largeur=16, franc=(6, 9), etrave=90, rouf=(56, 72, 9), mats=(84, 34),
                  cotes=(58, 4.5)),
    "navire": dict(largeur=24, franc=(8, 12), etrave=87, rouf=(48, 74, 10), mats=(68,),
                   cotes=(52, 5)),
    "vedette": dict(largeur=38, franc=(12, 16), etrave=84, rouf=(48, 62, 9), mats=(56,),
                    cotes=(86, 1.5)),
    "voilier": dict(largeur=32, franc=(6, 8), etrave=86, rouf=(40, 64, 5), mats=(60,),
                    cotes=(93, 2), hauteur_mat=118),
}
ESPACE = 8.0     # entre deux feux superposés


def _gabarit(s: Situation) -> dict:
    if s.navire in ("voile", "voile-au-moteur"):
        return GABARITS["voilier"]
    if s.longueur < 12:
        return GABARITS["vedette"]
    if s.longueur >= 50:
        return GABARITS["grand"]
    return GABARITS["navire"]


def _pont(g: dict, x: float) -> float:
    arriere, avant = g["franc"]
    return arriere + (avant - arriere) * x / 100.0


def projeter(point: tuple[float, float, float], angle: float) -> tuple[float, float]:
    """Projection orthographique vue de l'observateur placé sous `angle`.

    Rend (u, z) : u croît vers la droite de l'observateur. Vu de bâbord,
    l'étrave est à gauche ; vu de l'avant, le tribord est à gauche.
    """
    x, y, z = point
    a = math.radians(angle)
    return (x * math.sin(a) - y * math.cos(a), z)


@dataclass
class Plan:
    """Le navire posé en trois dimensions : coque, superstructures, gréement, feux."""
    coque: list
    rouf: list
    traits: list        # segments (mâts, vergues, mâtereaux, étai)
    voiles: list
    etrave: tuple       # le haut et le pied de l'étrave
    pied: tuple         # le pied du mât avant
    feux: list          # (Feu, position, décalage latéral du fanal)
    accroches: dict     # place d'une marque -> point d'où elle pend


def _plan(s: Situation, rehausse: float = 0.0) -> Plan:
    """`rehausse` allonge le mât avant, quand les marques du jour n'y tiennent pas."""
    g = _gabarit(s)
    b = g["largeur"] / 2
    pont_ar, pont_av = _pont(g, 0), _pont(g, 100)

    coque = []
    for x in (0, 30, 60, 85):
        coque += [(x, -b, _pont(g, x)), (x, b, _pont(g, x))]
    coque.append((100, 0, pont_av + 2.5))   # l'étrave se relève : l'avant se lit
    for x in (0.5, 50):
        coque += [(x, -0.7 * b, 0), (x, 0.7 * b, 0)]
    coque.append((g["etrave"], 0, 0))

    x0, x1, h = g["rouf"]
    haut_rouf = _pont(g, x1) + h
    rouf = []
    for y in (-0.5 * b, 0.5 * b):
        rouf += [(x0, y, _pont(g, x0)), (x1, y, _pont(g, x1)),
                 (x0, y, haut_rouf), (x1 - 3, y, haut_rouf)]

    feux = feux_prescrits(s)
    par_place: dict[str, list[Feu]] = {}
    for f in feux:
        par_place.setdefault(f.place, []).append(f)

    positions: list = []
    traits: list = []
    voiles: list = []
    accroches: dict = {}

    x_mat = g["mats"][0]
    sur_rouf = x0 <= x_mat <= x1
    pied = haut_rouf if sur_rouf else _pont(g, x_mat)
    laterales = "obstrue" in par_place or "libre" in par_place

    if "hauteur_mat" in g:
        # Le voilier : un mât fixe, le fanal et le feu de mouillage en tête,
        # le feu de tête de mât (moteur) à mi-hauteur, comme à bord.
        sommet = g["hauteur_mat"]
        for f in par_place.get("sommet", []) + par_place.get("fanal", []):
            positions.append((f, (x_mat, 0.0, sommet), f.place == "fanal"))
        z = sommet - ESPACE
        for f in par_place.get("pile", []):
            positions.append((f, (x_mat, 0.0, z), False))
            z -= ESPACE
        for f in par_place.get("tete", []):
            positions.append((f, (x_mat + 0.5, 0.0, 0.55 * sommet), False))
        haut_colonne = sommet
        traits.append(((x_mat, 0, pied), (x_mat, 0, sommet + 2)))
        # L'étai, puis le foc et la grand-voile : un aplat dans l'axe du navire.
        traits.append(((99, 0, pont_av + 1), (x_mat, 0, sommet - 6)))
        voiles.append([(x_mat - 1, 0, pied + 3), (x_mat - 1, 0, sommet - 4), (8, 0, pied + 3)])
        voiles.append([(x_mat + 1, 0, sommet - 10), (97, 0, pont_av + 2), (x_mat + 3, 0, pied + 2)])
        accroches["avant"] = (80, 0.0, pont_av + 1 + (sommet - 6 - pont_av - 1) * 0.42)
    else:
        # Le mât avant porte, de haut en bas : le sommet (pilote, mouillage
        # unique), les feux de tête de mât, puis la pile des feux visibles sur
        # tout l'horizon. On empile depuis le bas pour qu'aucun feu ne tombe
        # dans la superstructure.
        colonne = [(grp, f) for grp in ("sommet", "tete", "pile") for f in par_place.get(grp, [])]
        z = pied + ESPACE * (2.75 if laterales else 1) + rehausse
        precedent = None
        hauteurs = []
        for grp, f in reversed(colonne):
            if precedent is not None:
                z += ESPACE if grp == precedent else 1.5 * ESPACE
            hauteurs.append((f, z))
            precedent = grp
        for f, zf in reversed(hauteurs):
            positions.append((f, (x_mat, 0.0, zf), False))
        haut_colonne = max((zf for _, zf in hauteurs), default=pied + 2 * ESPACE + rehausse)
        traits.append(((x_mat, 0, pied), (x_mat, 0, haut_colonne + 2.5)))

        if len(g["mats"]) > 1:
            # Le grand mât, sur l'arrière : son feu de tête de mât est plus haut
            # que celui de l'avant (23 a) ii), annexe I, 2 a) ii), et plus haut
            # que le vert du chalutier (26 b) ii).
            x_grand = g["mats"][1]
            z_grand = haut_colonne + 1.5 * ESPACE
            arriere = par_place.get("tete-arriere", [])
            for f in arriere:
                positions.append((f, (x_grand, 0.0, z_grand), False))
            haut_grand = z_grand if arriere else haut_colonne - ESPACE
            traits.append(((x_grand, 0, _pont(g, x_grand)), (x_grand, 0, haut_grand + 3)))
        elif par_place.get("tete-arriere"):
            raise ValueError("un second feu de tête de mât sur un navire à un seul mât")

        if laterales:
            # Les feux du côté obstrué et du côté libre (27 d) pendent d'une
            # vergue, le plus haut au niveau du plus bas des trois feux de 27 b)
            # (annexe I, 4 b).
            # Trois quarts d'intervalle plus bas, pour qu'on ne lise pas une
            # rangée horizontale avec le plus bas des trois.
            z_vergue = min(zf for f, zf in hauteurs if f.place == "pile") - 0.75 * ESPACE
            bout = b + 4
            libre = 1.0 if s.cote_libre == "tribord" else -1.0
            traits.append(((x_mat, -bout, z_vergue), (x_mat, bout, z_vergue)))
            for place, cote in (("obstrue", -libre), ("libre", libre)):
                for rang, f in enumerate(par_place.get(place, [])):
                    positions.append((f, (x_mat, cote * bout, z_vergue - rang * ESPACE), False))
                accroches[place] = (x_mat, cote * bout, z_vergue)

        # Un mâtereau d'étrave porte le feu de mouillage avant ou la boule.
        mouillage_ar = _pont(g, 1.5) + 4
        if "mouillage-avant" in par_place or "avant" in {p for _, p, _ in _marques(s)}:
            z_av = max(pont_av + 12, mouillage_ar + 1.5 * ESPACE)
            traits.append(((97, 0, pont_av), (97, 0, z_av + 2)))
            accroches["avant"] = (97, 0.0, z_av)
            for f in par_place.get("mouillage-avant", []):
                positions.append((f, (97, 0.0, z_av), False))
        for f in par_place.get("mouillage-arriere", []):
            traits.append(((1.5, 0, pont_ar), (1.5, 0, mouillage_ar)))
            positions.append((f, (1.5, 0.0, mouillage_ar), False))

    accroches["pile"] = (x_mat, 0.0, haut_colonne)

    # Les feux de côté, de poupe et de remorquage.
    xc, dz = g["cotes"]
    if "hauteur_mat" not in g and g["cotes"][0] < x1:
        # Les ailes de passerelle portent les feux de côté ; de face, sans
        # elles, les deux feux flotteraient à côté de la coque.
        traits.append(((xc, -b, _pont(g, xc) + dz - 1.2), (xc, b, _pont(g, xc) + dz - 1.2)))
    for f in par_place.get("cotes", []):
        y = -b if f.secteur == "cote-babord" else b
        positions.append((f, (xc, y, _pont(g, xc) + dz), False))
    z_poupe = pont_ar + 2
    for f in par_place.get("poupe", []):
        positions.append((f, (0.5, 0.0, z_poupe), False))
    for f in par_place.get("remorquage", []):
        # 24 a) iv) : à la verticale au-dessus du feu de poupe.
        traits.append(((0.5, 0, pont_ar), (0.5, 0, z_poupe + ESPACE)))
        positions.append((f, (0.5, 0.0, z_poupe + ESPACE), False))

    placees = {id(f) for f, _, _ in positions}
    oublies = [f for f in feux if id(f) not in placees]
    if oublies:
        raise ValueError(f"place sans position : {sorted({f.place for f in oublies})}")
    etrave = ((100, 0, pont_av + 2.5), (g["etrave"], 0, 0))
    return Plan(coque, rouf, traits, voiles, etrave, (x_mat, 0, pied), positions, accroches)


# --- Le dessin -------------------------------------------------------------------

LARGEUR = 320
MARGE = 28
MARGE_HAUTE = 22
HAUTEUR_MAX = 250      # hauteur du navire dessiné, au plus
BANDE_EAU = 34
RAYON = 6
NUIT = {"ciel": CIEL_NUIT, "eau": EAU, "coque": "#18232f", "rouf": "#1f2b38", "voile": "#121c27",
        "gréement": MAT}
JOUR = {"ciel": CIEL_JOUR, "eau": MER, "coque": ACIER, "rouf": "#6b6b6b", "voile": "#f4f1ea",
        "gréement": ACIER}
TEINTE_MARQUE = TEINTES_JOUR["noir"]
MARQUE = 15            # diamètre d'une boule, base d'un cône, en pixels
JOUR_ENTRE_MARQUES = 6


def _enveloppe(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Enveloppe convexe (chaîne monotone d'Andrew)."""
    pts = sorted(set(points))
    if len(pts) <= 2:
        return pts

    def croix(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    bas, haut = [], []
    for p in pts:
        while len(bas) >= 2 and croix(bas[-2], bas[-1], p) <= 0:
            bas.pop()
        bas.append(p)
    for p in reversed(pts):
        while len(haut) >= 2 and croix(haut[-2], haut[-1], p) <= 0:
            haut.pop()
        haut.append(p)
    return bas[:-1] + haut[:-1]


def _n(v: float) -> str:
    return f"{v:.1f}".rstrip("0").rstrip(".")


def _points(pts) -> str:
    return " ".join(f"{_n(x)},{_n(y)}" for x, y in pts)


def _forme_marque(forme: str, cx: float, haut: float) -> tuple[str, float]:
    """Le tracé d'une marque dont le haut est à `haut`, et sa hauteur."""
    d = MARQUE
    r = d / 2
    t = TEINTE_MARQUE
    if forme == "boule":
        return f'<circle class="marque" cx="{_n(cx)}" cy="{_n(haut + r)}" r="{_n(r)}" fill="{t}" />', d
    if forme == "cone-haut":
        pts = [(cx, haut), (cx + r, haut + d), (cx - r, haut + d)]
        return f'<polygon class="marque" points="{_points(pts)}" fill="{t}" />', d
    if forme == "cone-bas":
        pts = [(cx - r, haut), (cx + r, haut), (cx, haut + d)]
        return f'<polygon class="marque" points="{_points(pts)}" fill="{t}" />', d
    if forme == "bicone":
        pts = [(cx, haut), (cx + r, haut + d), (cx, haut + 2 * d), (cx - r, haut + d)]
        return f'<polygon class="marque" points="{_points(pts)}" fill="{t}" />', 2 * d
    if forme == "cylindre":
        return (f'<rect class="marque" x="{_n(cx - r)}" y="{_n(haut)}" width="{_n(d)}" '
                f'height="{_n(2 * d)}" fill="{t}" />'), 2 * d
    raise ValueError(f"marque inconnue : {forme}")


def _cadrage(plan: Plan, angle: float):
    """L'échelle et la flottaison : tout ce qui est solide ou allumé tient dans l'image."""
    tout = plan.coque + plan.rouf + [p for t in plan.traits for p in t] + \
        [p for v in plan.voiles for p in v] + [p for _, p, _ in plan.feux]
    proj = [projeter(p, angle) for p in tout]
    u_min, u_max = min(u for u, _ in proj), max(u for u, _ in proj)
    z_max = max(z for _, z in proj)
    echelle = min((LARGEUR - 2 * MARGE) / max(u_max - u_min, 1e-6), HAUTEUR_MAX / z_max)
    centre_u = (u_min + u_max) / 2
    flottaison = MARGE_HAUTE + z_max * echelle

    def ecran(p):
        u, z = projeter(p, angle)
        return (LARGEUR / 2 + (u - centre_u) * echelle, flottaison - z * echelle)

    return echelle, flottaison, ecran


def _pendre(formes: list, plan: Plan, ecran) -> tuple[list[str], float]:
    """Les marques pendues à leur accroche, de haut en bas, et le bas le plus
    bas de celles qui pendent du mât avant ou de sa vergue."""
    par_place: dict[str, list[str]] = {}
    for forme, place, _ in formes:
        par_place.setdefault(place, []).append(forme)
    traces, plus_bas = [], -math.inf
    for place, liste in par_place.items():
        cx, y = ecran(plan.accroches[place])
        y += 3 if place != "avant" else -MARQUE / 2
        for rang, forme in enumerate(liste):
            # Deux cônes réunis par la pointe se touchent ; les autres marques
            # gardent un jour entre elles (annexe I, 6 b).
            if rang and not (liste[rang - 1] == "cone-bas" and forme == "cone-haut"):
                y += JOUR_ENTRE_MARQUES
            trace, h = _forme_marque(forme, cx, y)
            traces.append(trace)
            y += h
        if place != "avant":
            plus_bas = max(plus_bas, y)
    return traces, plus_bas


def svg_de_situation(s: Situation) -> str:
    angle = s.angle
    palette = NUIT if s.moment == "nuit" else JOUR
    formes = _marques(s) if s.moment == "jour" else []
    if s.moment == "jour" and not formes:
        raise ValueError("aucune marque à dessiner")

    # De jour, les marques pendent du mât avant : s'il est trop court pour
    # elles, on l'allonge jusqu'à ce qu'elles passent au-dessus de son pied.
    rehausse = 0.0
    for _ in range(8):
        plan = _plan(s, rehausse)
        echelle, flottaison, ecran = _cadrage(plan, angle)
        traces, plus_bas = _pendre(formes, plan, ecran)
        manque = plus_bas + 8 - ecran(plan.pied)[1]
        if manque <= 0.5:
            break
        rehausse += manque / echelle
    else:
        raise ValueError("les marques ne tiennent pas sur le mât")
    hauteur = round(flottaison + BANDE_EAU)
    a_dessiner = [
        (f, p, fanal) for f, p, fanal in plan.feux
        if s.moment == "nuit" and visible(f.secteur, angle)
    ]
    if s.moment == "nuit" and not a_dessiner:
        raise ValueError("aucun feu à dessiner")

    parties = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LARGEUR} {hauteur}" '
        f'width="{LARGEUR}" height="{hauteur}" role="img">',
    ]

    teintes: list[str] = []
    for f, _, _ in a_dessiner:
        if COULEURS[f.couleur] not in teintes:
            teintes.append(COULEURS[f.couleur])
    if teintes:
        halos = "".join(
            f'<radialGradient id="h{rang}">'
            f'<stop offset="0" stop-color="{t}" stop-opacity="0.60" />'
            f'<stop offset="0.30" stop-color="{t}" stop-opacity="0.24" />'
            f'<stop offset="0.62" stop-color="{t}" stop-opacity="0.07" />'
            f'<stop offset="1" stop-color="{t}" stop-opacity="0" />'
            f"</radialGradient>"
            for rang, t in enumerate(teintes)
        )
        parties.append(f"<defs>{halos}</defs>")

    parties.append(f'<rect width="{LARGEUR}" height="{hauteur}" fill="{palette["ciel"]}" />')
    parties.append(
        f'<rect y="{_n(flottaison)}" width="{LARGEUR}" height="{_n(hauteur - flottaison)}" '
        f'fill="{palette["eau"]}" />'
    )

    sinus = math.sin(math.radians(angle))
    if s.navire == "remorqueur" and abs(sinus) > 0.3:
        # Le câble part du tableau vers l'arrière et sort de l'image : la
        # remorque, à plus de 200 m, est hors du cadre.
        xa, ya = ecran((0, 0, _pont(_gabarit(s), 0) + 1))
        bord = LARGEUR if sinus < 0 else 0
        milieu = (xa + bord) / 2
        parties.append(
            f'<path d="M {_n(xa)} {_n(ya)} Q {_n(milieu)} {_n(flottaison + 4)} {_n(bord)} {_n(flottaison - 2)}" '
            f'fill="none" stroke="{palette["gréement"]}" stroke-width="1.6" />'
        )

    for voile in plan.voiles:
        pts = _enveloppe([ecran(p) for p in voile])
        if len(pts) >= 3:
            parties.append(
                f'<polygon points="{_points(pts)}" fill="{palette["voile"]}" '
                f'stroke="{palette["gréement"]}" stroke-width="1" stroke-linejoin="round" />'
            )
    # La superstructure d'abord : vue de face, l'étrave passe devant elle.
    parties.append(
        f'<polygon points="{_points(_enveloppe([ecran(p) for p in plan.rouf]))}" '
        f'fill="{palette["rouf"]}" />'
    )
    parties.append(
        f'<polygon points="{_points(_enveloppe([ecran(p) for p in plan.coque]))}" '
        f'fill="{palette["coque"]}" stroke-linejoin="round" />'
    )
    if math.cos(math.radians(angle)) > 0.5:
        # De face, l'arête de l'étrave dit qu'on regarde l'avant, pas le tableau.
        (x1, y1), (x2, y2) = ecran(plan.etrave[0]), ecran(plan.etrave[1])
        parties.append(
            f'<line x1="{_n(x1)}" y1="{_n(y1)}" x2="{_n(x2)}" y2="{_n(y2)}" '
            f'stroke="{palette["rouf"]}" stroke-width="2.4" stroke-linecap="round" />'
        )
    for debut, fin in plan.traits:
        (x1, y1), (x2, y2) = ecran(debut), ecran(fin)
        if math.hypot(x2 - x1, y2 - y1) < 1:
            continue   # un segment vu par le bout
        parties.append(
            f'<line x1="{_n(x1)}" y1="{_n(y1)}" x2="{_n(x2)}" y2="{_n(y2)}" '
            f'stroke="{palette["gréement"]}" stroke-width="2.6" stroke-linecap="round" />'
        )

    # Les feux. Le fanal combiné est une seule lanterne : ses secteurs sont
    # accolés, le rouge à bâbord, le vert à tribord.
    places = []
    for f, p, fanal in a_dessiner:
        x, y = ecran(p)
        if fanal:
            cote = {"rouge": -1, "vert": 1}.get(f.couleur, 0)
            x += -cote * math.cos(math.radians(angle)) * (RAYON + 1)
        places.append((x, y, f))
    for i, (xa, ya, fa) in enumerate(places):
        for xb, yb, fb in places[i + 1:]:
            if math.hypot(xa - xb, ya - yb) < 2 * RAYON + 1:
                raise ValueError(f"deux feux se confondent à l'écran : {fa.regle} et {fb.regle}")
    for x, y, f in places:
        rang = teintes.index(COULEURS[f.couleur])
        parties.append(f'<circle cx="{_n(x)}" cy="{_n(y)}" r="{_n(RAYON * 3.4)}" fill="url(#h{rang})" />')
    for x, y, f in places:
        parties.append(
            f'<circle class="feu" cx="{_n(x)}" cy="{_n(y)}" r="{RAYON}" fill="{COULEURS[f.couleur]}" />'
        )

    parties += traces

    parties.append("</svg>")
    svg = "\n".join(parties) + "\n"

    ecarts = ecarts_au_recompte(s, svg)
    if ecarts:
        raise RuntimeError("; ".join(ecarts))
    return svg


# --- Le recompte -------------------------------------------------------------------

NOMS_DE_TEINTE = {v: k for k, v in COULEURS.items()}
FEU_DESSINE = re.compile(
    r'<circle class="feu" cx="(?P<cx>[-\d.]+)" cy="(?P<cy>[-\d.]+)"[^>]*fill="(?P<fill>#[0-9a-f]+)"'
)


def feux_dessines(svg: str) -> list[tuple[float, float, str]]:
    return [
        (float(m["cx"]), float(m["cy"]), NOMS_DE_TEINTE.get(m["fill"], m["fill"]))
        for m in FEU_DESSINE.finditer(svg)
    ]


def compter_feux(svg: str) -> Counter:
    return Counter(c for _, _, c in feux_dessines(svg))


def cones(svg: str) -> list[tuple[float, str]]:
    """Les cônes dessinés : (ordonnée du centre, sens de la pointe)."""
    trouves = []
    for m in re.finditer(r'<polygon class="marque" points="([^"]+)"', svg):
        pts = [tuple(map(float, p.split(","))) for p in m.group(1).split()]
        if len(pts) != 3:
            continue
        ys = sorted(y for _, y in pts)
        # La pointe est le sommet seul à son ordonnée.
        pointe_en_bas = ys[1] == ys[0]
        trouves.append(((ys[0] + ys[2]) / 2, "cone-bas" if pointe_en_bas else "cone-haut"))
    return trouves


def compter_marques(svg: str) -> Counter:
    compte = Counter()
    compte["boule"] = len(re.findall(r'<circle class="marque"', svg))
    compte["cylindre"] = len(re.findall(r'<rect class="marque"', svg))
    for m in re.finditer(r'<polygon class="marque" points="([^"]+)"', svg):
        if len(m.group(1).split()) == 4:
            compte["bicone"] += 1
    for _, sens in cones(svg):
        compte[sens] += 1
    return +compte


def ecarts_au_recompte(s: Situation, svg: str) -> list[str]:
    """Ce qui manque ou est en trop dans le dessin, au regard des tables."""
    if s.moment == "nuit":
        attendu, nature = Counter(f.couleur for f in feux_visibles(s)), "feu"
        trouve = compter_feux(svg)
        autre = compter_marques(svg)
        if autre:
            return [f"marque de jour sur une scène de nuit : {dict(autre)}"]
    else:
        attendu, nature = Counter(marques(s)), "marque"
        trouve = compter_marques(svg)
        if compter_feux(svg):
            return ["feu allumé sur une scène de jour"]
    ecarts = []
    for cle in sorted(set(attendu) | set(trouve)):
        if trouve[cle] < attendu[cle]:
            ecarts.append(f"{nature} {cle} manquant ({trouve[cle]} au lieu de {attendu[cle]})")
        elif trouve[cle] > attendu[cle]:
            ecarts.append(f"{nature} {cle} en trop ({trouve[cle]} au lieu de {attendu[cle]})")
    return ecarts


def main(argv: list[str] | None = None, *, racine: Path = RACINE, sortie: Path = SORTIE) -> int:
    arguments = sys.argv[1:] if argv is None else argv
    situations = charger()
    elements = {nom: svg_de_situation(s) for nom, s in situations.items()}
    suffixes = {nom: f" ({', '.join(references(s))})" for nom, s in situations.items()}
    code = main_dessin(
        arguments,
        racine=racine,
        sortie=sortie,
        elements=elements,
        commande_npm="navires",
        label="navire(s)",
        suffixes=suffixes,
    )
    if "--verifier" not in arguments:
        return code

    # Au-delà de l'égalité des fichiers : chaque feu, chaque marque du fichier
    # livré est recompté contre la règle et le secteur du relèvement.
    for nom, s in situations.items():
        chemin = sortie / f"{nom}.svg"
        if not chemin.is_file():
            continue
        for ecart in ecarts_au_recompte(s, chemin.read_text(encoding="utf-8")):
            print(f"{chemin.relative_to(racine)} : {ecart}", file=sys.stderr)
            code = 1
    return code


if __name__ == "__main__":
    raise SystemExit(main())
