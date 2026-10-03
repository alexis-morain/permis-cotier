"""Tests du générateur de navires vus sous un relèvement.

Les feux attendus pour chaque témoin sont écrits ici à la main, depuis le texte
des règles 21 à 30 du RIPAM, et non recopiés de la sortie du script : c'est la
table du script qui doit tomber dessus, pas l'inverse.
"""
import re
import sys
from collections import Counter
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import navires  # noqa: E402
from navires import (  # noqa: E402
    VUES,
    Situation,
    charger,
    compter_feux,
    compter_marques,
    feux_visibles,
    marques,
    main,
    projeter,
    svg_de_situation,
    visible,
)

SITUATIONS = charger()


def couleurs(feux):
    return Counter(f.couleur for f in feux)


def situation(**champs):
    base = dict(navire="moteur", longueur=30, situation="route", vue="babord",
                moment="nuit", regle="RIPAM, règle 23", alt="Une silhouette.")
    base.update(champs)
    return Situation(**base)


# --- Règle 21 : les secteurs -------------------------------------------------

def test_de_l_arriere_on_ne_voit_ni_feu_de_cote_ni_feu_de_tete_de_mat():
    arriere = VUES["arriere"]
    assert not visible("cote-babord", arriere)
    assert not visible("cote-tribord", arriere)
    assert not visible("tete", arriere)
    assert visible("poupe", arriere)
    assert visible("remorquage", arriere)


def test_de_babord_on_ne_voit_pas_le_vert():
    babord = VUES["babord"]
    assert visible("cote-babord", babord)
    assert not visible("cote-tribord", babord)
    assert visible("tete", babord)
    assert not visible("poupe", babord)


def test_de_tribord_on_ne_voit_pas_le_rouge():
    assert visible("cote-tribord", VUES["tribord"])
    assert not visible("cote-babord", VUES["tribord"])


def test_de_l_avant_on_voit_les_deux_feux_de_cote_et_pas_la_poupe():
    avant = VUES["avant"]
    assert visible("cote-babord", avant) and visible("cote-tribord", avant)
    assert visible("tete", avant)
    assert not visible("poupe", avant)


def test_un_relevement_intermediaire_suit_les_memes_secteurs():
    # 45 degrés sur tribord avant : tête de mât et vert ; 135 degrés : poupe seule.
    assert visible("tete", VUES["avant-tribord"]) and visible("cote-tribord", VUES["avant-tribord"])
    assert not visible("poupe", VUES["avant-tribord"])
    assert visible("poupe", VUES["arriere-tribord"])
    assert not visible("tete", VUES["arriere-tribord"])
    assert not visible("cote-tribord", VUES["arriere-tribord"])


def test_le_feu_visible_sur_tout_l_horizon_se_voit_de_partout():
    assert all(visible("horizon", angle) for angle in VUES.values())


def test_un_relevement_sur_la_limite_d_un_secteur_est_refuse():
    # À 22,5 degrés sur l'arrière du travers, la règle ne dit pas lequel des
    # deux feux on voit : le dessin ne tranche pas à sa place.
    with pytest.raises(ValueError):
        visible("poupe", 112.5)


# --- La table des feux, témoin par témoin -----------------------------------

# Nom du témoin -> couleurs attendues des feux visibles, lues dans la règle.
FEUX_ATTENDUS = {
    # Règle 3 c) puis 23 a), 11 m vu de bâbord : tête de mât, feu rouge.
    "voilier-au-moteur-nuit": {"blanc": 1, "rouge": 1},
    # 26 b) i) et iii), 30 m vu de l'avant : vert sur blanc, deux feux de côté.
    "chalutier-nuit": {"vert": 2, "blanc": 1, "rouge": 1},
    # 27 b) i) et iii), 40 m vu de bâbord : rouge-blanc-rouge, tête de mât, rouge.
    "capacite-restreinte-nuit": {"rouge": 3, "blanc": 2},
    # 24 a) i) et ii), train de 250 m, vu de bâbord : trois têtes de mât, rouge.
    # Le feu de remorquage et la poupe sont sur l'arrière du travers.
    "remorqueur-nuit": {"blanc": 3, "rouge": 1},
    # 30 b), 30 m : un feu blanc sur tout l'horizon.
    "mouillage-nuit": {"blanc": 1},
    # 30 a) et d) i), 60 m : deux feux de mouillage, deux rouges.
    "echoue-nuit": {"blanc": 2, "rouge": 2},
    # 23 d) ii), 6 m vu de l'avant : un blanc sur tout l'horizon, deux feux de côté.
    "moteur-moins-de-7-m-nuit": {"blanc": 1, "rouge": 1, "vert": 1},
    # 29 a) i) et ii), vu de tribord : blanc sur rouge, feu vert.
    "pilote-nuit": {"blanc": 1, "rouge": 1, "vert": 1},
    # 27 d) et b), 40 m vu de l'avant, côté libre à tribord : rouge-blanc-rouge,
    # tête de mât, deux feux de côté, deux rouges côté obstrué, deux verts côté libre.
    "dragueur-nuit": {"rouge": 5, "blanc": 2, "vert": 3},
    # 25 b), 10 m vu de l'avant : le fanal montre son rouge et son vert.
    "voilier-moins-de-20-m-nuit": {"rouge": 1, "vert": 1},
    # --- Lot A, C3.2 : les situations qu'illustrent les questions publiées ---
    # 26 c) i) et iii), 20 m vu de l'avant : rouge sur blanc, deux feux de côté.
    "peche-nuit": {"rouge": 2, "blanc": 1, "vert": 1},
    # 27 a) i), 25 m sans erre vu de bâbord : deux rouges, rien d'autre.
    "non-maitre-nuit": {"rouge": 2},
    # 23 a), 11 m vu de bâbord : tête de mât, feu rouge.
    "moteur-babord-nuit": {"blanc": 1, "rouge": 1},
    # 23 a), 11 m vu de tribord : tête de mât, feu vert.
    "moteur-tribord-nuit": {"blanc": 1, "vert": 1},
    # --- Lot B, C3.2 ---
    # 25 b), 10 m vu de bâbord : du fanal, seul le secteur rouge.
    "voilier-fanal-babord-nuit": {"rouge": 1},
    # 25 a), 12 m vu de l'avant : deux feux de côté, rien sur le mât.
    "voilier-de-face-nuit": {"rouge": 1, "vert": 1},
    # 23 a), 30 m vu de l'avant : tête de mât, deux feux de côté.
    "moteur-de-face-nuit": {"blanc": 1, "rouge": 1, "vert": 1},
    # 21 c) et 23 a) iv), vu de l'arrière : le feu de poupe seul.
    "moteur-de-l-arriere-nuit": {"blanc": 1},
    # 23 a) i) à iii), 60 m vu de bâbord : deux têtes de mât, rouge.
    "moteur-50-m-nuit": {"blanc": 2, "rouge": 1},
    # 26 b) i), 30 m sans erre : vert sur blanc, rien d'autre.
    "chalutier-sans-erre-nuit": {"vert": 1, "blanc": 1},
    # 27 a) i) et iii), 25 m vu de bâbord : deux rouges, feu rouge de côté.
    "non-maitre-avec-erre-nuit": {"rouge": 3},
    # 27 b) i) et iv), puis 30 a), 60 m : rouge-blanc-rouge, deux feux de mouillage.
    "capacite-restreinte-mouillage-nuit": {"rouge": 2, "blanc": 3},
    # 24 a) i) et ii), train de 100 m, vu de bâbord : deux têtes de mât, rouge.
    "remorqueur-court-nuit": {"blanc": 2, "rouge": 1},
    # 24 a) iii) et iv), vu de l'arrière par bâbord : poupe, remorquage au-dessus.
    "remorqueur-de-l-arriere-nuit": {"blanc": 1, "jaune": 1},
    # 29 a) i) et iii), puis 30 b), 16 m : blanc sur rouge, un feu de mouillage.
    "pilote-mouillage-nuit": {"blanc": 2, "rouge": 1},
    # 30 a), 80 m : feu avant, feu arrière plus bas.
    "mouillage-50-m-nuit": {"blanc": 2},
    # 26 a) et c) i), au mouillage : rouge sur blanc, pas de feu de mouillage.
    "peche-mouillage-nuit": {"rouge": 1, "blanc": 1},
    # 23 a) et 28, 60 m vu de l'avant : deux têtes de mât, trois rouges, deux feux de côté.
    "tirant-d-eau-de-face-nuit": {"blanc": 2, "rouge": 4, "vert": 1},
}

MARQUES_ATTENDUES = {
    "voilier-au-moteur-jour": {"cone-bas": 1},                 # 25 e)
    "chalutier-jour": {"cone-bas": 1, "cone-haut": 1},         # 26 b) i)
    "capacite-restreinte-jour": {"boule": 2, "bicone": 1},     # 27 b) ii)
    "remorqueur-jour": {"bicone": 1},                          # 24 a) v)
    "mouillage-jour": {"boule": 1},                            # 30 a) i)
    "echoue-jour": {"boule": 3},                               # 30 d) ii)
    "dragueur-jour": {"boule": 4, "bicone": 3},                # 27 d) i) et ii), b) ii)
    "non-maitre-jour": {"boule": 2},                           # 27 a) ii)
    "tirant-d-eau-jour": {"cylindre": 1},                      # 28
}


def test_les_dix_temoins_et_leurs_versions_de_jour_sont_decrits():
    assert set(FEUX_ATTENDUS) | set(MARQUES_ATTENDUES) == set(SITUATIONS)


@pytest.mark.parametrize("nom, attendu", FEUX_ATTENDUS.items())
def test_la_table_donne_les_feux_de_la_regle(nom, attendu):
    assert couleurs(feux_visibles(SITUATIONS[nom])) == Counter(attendu)


@pytest.mark.parametrize("nom, attendu", FEUX_ATTENDUS.items())
def test_le_dessin_porte_exactement_les_feux_de_la_table(nom, attendu):
    assert compter_feux(svg_de_situation(SITUATIONS[nom])) == Counter(attendu)
    assert compter_marques(svg_de_situation(SITUATIONS[nom])) == Counter()


@pytest.mark.parametrize("nom, attendu", MARQUES_ATTENDUES.items())
def test_la_table_donne_les_marques_de_la_regle(nom, attendu):
    assert Counter(marques(SITUATIONS[nom])) == Counter(attendu)


@pytest.mark.parametrize("nom, attendu", MARQUES_ATTENDUES.items())
def test_le_dessin_de_jour_porte_exactement_les_marques(nom, attendu):
    svg = svg_de_situation(SITUATIONS[nom])
    assert compter_marques(svg) == Counter(attendu)
    assert compter_feux(svg) == Counter()


def test_les_cones_du_chalutier_sont_reunis_par_la_pointe():
    # Le cône du haut pointe vers le bas, celui du bas vers le haut.
    svg = svg_de_situation(SITUATIONS["chalutier-jour"])
    cones = navires.cones(svg)
    assert [sens for _, sens in sorted(cones)] == ["cone-bas", "cone-haut"]


def test_sous_cinquante_metres_le_navire_a_moteur_n_a_qu_une_tete_de_mat():
    assert couleurs(feux_visibles(situation(longueur=40, vue="avant"))) == Counter(
        {"blanc": 1, "rouge": 1, "vert": 1}
    )
    assert couleurs(feux_visibles(situation(longueur=60, vue="avant"))) == Counter(
        {"blanc": 2, "rouge": 1, "vert": 1}
    )


def test_le_remorqueur_vu_de_l_arriere_montre_le_jaune_sur_le_blanc():
    remorqueur = situation(navire="remorqueur", train=250, vue="arriere")
    assert couleurs(feux_visibles(remorqueur)) == Counter({"jaune": 1, "blanc": 1})


def test_un_train_court_ne_porte_que_deux_tetes_de_mat_et_pas_de_bicone():
    court = situation(navire="remorqueur", train=150, vue="babord")
    assert couleurs(feux_visibles(court)) == Counter({"blanc": 2, "rouge": 1})
    assert marques(situation(navire="remorqueur", train=150, moment="jour")) == []


def test_sans_erre_le_chalutier_eteint_ses_feux_de_cote():
    sans_erre = situation(navire="chalut", situation="sans-erre", vue="avant")
    assert couleurs(feux_visibles(sans_erre)) == Counter({"vert": 1, "blanc": 1})


def test_le_fanal_combine_est_refuse_a_vingt_metres():
    with pytest.raises(ValueError):
        feux_visibles(situation(navire="voile", longueur=20, fanal=True))


def test_la_regle_27_ne_s_applique_pas_sous_douze_metres():
    with pytest.raises(ValueError):
        feux_visibles(situation(navire="capacite-restreinte", longueur=10))


def test_le_dragueur_sans_cote_libre_est_refuse():
    with pytest.raises(ValueError):
        feux_visibles(situation(navire="dragueur", vue="avant"))


def test_la_regle_citee_figure_parmi_les_references_de_la_table():
    for nom, s in SITUATIONS.items():
        numero = re.search(r"règle \d+", s.regle).group(0)
        assert any(numero in ref for ref in navires.references(s)), nom


# --- Le dessin ---------------------------------------------------------------

def test_vu_de_l_avant_le_vert_est_a_gauche_du_rouge():
    # Face à l'étrave, le tribord du navire est à la gauche de l'observateur.
    svg = svg_de_situation(SITUATIONS["moteur-moins-de-7-m-nuit"])
    feux = navires.feux_dessines(svg)
    vert = [x for x, _, c in feux if c == "vert"]
    rouge = [x for x, _, c in feux if c == "rouge"]
    assert vert[0] < rouge[0]


def test_vu_de_babord_l_etrave_est_a_gauche():
    etrave = projeter((100, 0, 0), VUES["babord"])[0]
    tableau = projeter((0, 0, 0), VUES["babord"])[0]
    assert etrave < tableau
    assert projeter((100, 0, 0), VUES["tribord"])[0] > projeter((0, 0, 0), VUES["tribord"])[0]


@pytest.mark.parametrize("nom", list(SITUATIONS))
def test_aucun_texte_ni_nom_de_couleur_dans_le_svg(nom):
    svg = svg_de_situation(SITUATIONS[nom]).lower()
    assert "<text" not in svg and "<title" not in svg
    for mot in ("rouge", "vert", "blanc", "jaune", "noir", "boule", "cone", "cône",
                "cylindre", "chalut", "pilote", "remorqu", "mouillage", "voile", "mat"):
        assert mot not in svg.replace("#", ""), f"{nom} contient « {mot} »"


@pytest.mark.parametrize("nom", list(SITUATIONS))
def test_le_svg_est_autonome_et_stable(nom):
    svg = svg_de_situation(SITUATIONS[nom])
    assert svg.startswith("<svg") and "http://www.w3.org/2000/svg" in svg
    assert "<image" not in svg and "href=" not in svg
    assert svg == svg_de_situation(SITUATIONS[nom])
    largeur = float(re.search(r'viewBox="0 0 ([\d.]+) ', svg).group(1))
    assert 200 <= largeur <= 320


MOTS_DE_REGLE = ("chalut", "pilote", "remorqu", "mouillage", "échoué", "echoue", "pêche",
                 "manœuvre", "manoeuvre", "tirant", "dragu", "voile")


@pytest.mark.parametrize("nom", list(SITUATIONS))
def test_l_alt_decrit_sans_nommer_la_regle(nom):
    alt = SITUATIONS[nom].alt
    assert len(alt) > 30
    assert ": " not in alt
    for mot in MOTS_DE_REGLE:
        assert mot not in alt.lower(), f"{nom} : l'alt dit « {mot} »"
    assert "règle" not in alt.lower() and "ripam" not in alt.lower()


def test_charger_refuse_un_champ_inconnu(tmp_path):
    fichier = tmp_path / "n.yaml"
    fichier.write_text(
        "a:\n  navire: moteur\n  longueur: 30\n  situation: route\n  vue: babord\n"
        "  moment: nuit\n  regle: \"RIPAM, règle 23\"\n  alt: \"x\"\n  couleur: rouge\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError):
        charger(fichier)


# --- --verifier --------------------------------------------------------------

def test_verifier_passe_apres_ecriture_et_echoue_apres_alteration(tmp_path, capsys):
    sortie = tmp_path / "navires"
    assert main([], racine=tmp_path, sortie=sortie) == 0
    assert main(["--verifier"], racine=tmp_path, sortie=sortie) == 0

    fichier = sortie / "remorqueur-nuit.svg"
    svg = fichier.read_text(encoding="utf-8")
    # On retire un feu dessiné : le fichier n'est plus à jour, et le recompte
    # le dit en clair.
    altere = re.sub(r'<circle class="feu"[^>]*/>\n', "", svg, count=1)
    assert altere != svg
    fichier.write_text(altere, encoding="utf-8")
    assert main(["--verifier"], racine=tmp_path, sortie=sortie) == 1
    assert "remorqueur-nuit" in capsys.readouterr().err


def test_verifier_echoue_si_un_feu_est_ajoute_a_la_main(tmp_path, capsys):
    sortie = tmp_path / "navires"
    main([], racine=tmp_path, sortie=sortie)
    fichier = sortie / "mouillage-nuit.svg"
    svg = fichier.read_text(encoding="utf-8")
    feu = re.search(r'<circle class="feu"[^>]*/>\n', svg).group(0)
    fichier.write_text(svg.replace(feu, feu + feu.replace('cy="', 'cy="1')), encoding="utf-8")
    assert main(["--verifier"], racine=tmp_path, sortie=sortie) == 1
    assert "en trop" in capsys.readouterr().err


def test_un_voilier_de_cinquante_metres_est_refuse_faute_de_gabarit():
    with pytest.raises(ValueError):
        situation(navire="voile-au-moteur", longueur=50)


def test_le_dragueur_vu_par_le_travers_est_refuse_ses_feux_lateraux_se_confondraient():
    with pytest.raises(ValueError):
        svg_de_situation(situation(navire="dragueur", cote_libre="tribord", longueur=40, vue="babord"))


# --- Règle 30 : les bornes de longueur, mouillage et échouage séparés -------

def test_un_navire_echoue_de_moins_de_7_m_montre_son_feu_de_mouillage():
    # 30 e) ne dispense que « lorsqu'ils sont au mouillage » ; 30 d) exige les
    # feux de a) ou b) pour tout navire échoué, et 30 f) ne dispense les moins
    # de 12 m que des deux rouges.
    feux = feux_visibles(situation(longueur=6, situation="echoue"))
    assert couleurs(feux) == {"blanc": 1}


def test_un_navire_au_mouillage_de_moins_de_7_m_n_a_aucun_feu():
    assert feux_visibles(situation(longueur=6, situation="mouillage")) == []


def test_le_mouillage_de_100_m_et_plus_est_refuse():
    # 30 c) ajoute l'éclairage des ponts, que le générateur ne dessine pas.
    with pytest.raises(ValueError, match="30 c"):
        situation(longueur=120, situation="mouillage")
