"""Tests du dessin des signaux d'écluse.

L'article A. 4241-53-31 du code des transports fait porter toute la
signification par deux choses : la couleur des feux et leur disposition. Ce qui
est vérifié ici, c'est que le dessin dit exactement ça, et que deux signaux de
sens différent ne se dessinent jamais pareil.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from ecluses import ROUGE, SIGNAUX, TEINTES, VERT, svg_de_signal  # noqa: E402


def test_le_catalogue_couvre_les_quatre_significations():
    # Hors service, fermée, en préparation, accès autorisé.
    for attendu in (
        "acces-deux-rouges-superposes",
        "acces-rouge-isole",
        "acces-deux-rouges-juxtaposes",
        "acces-un-rouge-eteint",
        "acces-rouge-vert-juxtaposes",
        "acces-rouge-sur-vert",
        "acces-vert-isole",
        "acces-deux-verts-juxtaposes",
    ):
        assert attendu in SIGNAUX


@pytest.mark.parametrize("nom, signal", SIGNAUX.items())
def test_chaque_signal_est_completement_decrit(nom, signal):
    assert set(signal) == {"feux", "alt", "regle"}
    assert signal["feux"], f"{nom} n'a aucun feu"
    for ligne in signal["feux"]:
        assert ligne, f"{nom} porte une ligne vide"
        assert all(c in TEINTES for c in ligne), f"{nom} porte une couleur inconnue"
    assert signal["regle"].startswith("Code des transports, article A. 4241-53-31")
    assert svg_de_signal(nom).startswith("<svg")


def test_superpose_et_juxtapose_ne_se_dessinent_pas_pareil():
    # Deux feux rouges superposés annoncent une écluse hors service, les mêmes
    # juxtaposés une écluse seulement fermée : c'est la disposition qui tranche.
    superposes = SIGNAUX["acces-deux-rouges-superposes"]["feux"]
    juxtaposes = SIGNAUX["acces-deux-rouges-juxtaposes"]["feux"]
    assert len(superposes) == 2 and all(len(l) == 1 for l in superposes)
    assert len(juxtaposes) == 1 and len(juxtaposes[0]) == 2
    assert svg_de_signal("acces-deux-rouges-superposes") != svg_de_signal("acces-deux-rouges-juxtaposes")


def test_seuls_les_signaux_tout_verts_autorisent_l_acces():
    autorisent = {"acces-vert-isole", "acces-deux-verts-juxtaposes"}
    for nom, signal in SIGNAUX.items():
        couleurs = {c for ligne in signal["feux"] for c in ligne}
        sans_rouge = "rouge" not in couleurs
        assert sans_rouge == (nom in autorisent), nom


def test_un_feu_eteint_reste_visible():
    # Le signal « extinction de l'un des deux feux rouges juxtaposés » ne se lit
    # que si la lentille éteinte se distingue encore du panneau.
    svg = svg_de_signal("acces-un-rouge-eteint")
    assert TEINTES["eteint"] in svg
    assert ROUGE in svg


def test_le_reflet_ne_se_pose_que_sur_un_feu_allume():
    allume = svg_de_signal("acces-vert-isole")
    eteint = svg_de_signal("acces-un-rouge-eteint")
    assert allume.count("fill-opacity=\"0.38\"") == 1
    assert eteint.count("fill-opacity=\"0.38\"") == 1  # le rouge seul, pas l'éteint


def test_le_vert_et_le_rouge_ne_sont_pas_la_meme_teinte():
    assert ROUGE != VERT


def test_aucun_texte_dans_l_image():
    svg = svg_de_signal("acces-rouge-sur-vert")
    assert "<text" not in svg
    for mot in ("interdit", "autoris", "ecluse", "écluse", "rouge", "vert"):
        assert mot not in svg.lower()


def test_deux_signaux_ne_donnent_jamais_le_meme_dessin():
    dessins = {nom: svg_de_signal(nom) for nom in SIGNAUX}
    assert len(set(dessins.values())) == len(dessins)


def test_le_dessin_ne_bouge_pas_entre_deux_appels():
    assert svg_de_signal("acces-rouge-isole") == svg_de_signal("acces-rouge-isole")


def test_le_svg_est_autonome():
    svg = svg_de_signal("acces-deux-verts-juxtaposes")
    assert svg.startswith("<svg")
    assert "http://www.w3.org/2000/svg" in svg
    assert "<image" not in svg and "href=" not in svg


def test_un_signal_inconnu_est_refuse():
    with pytest.raises(KeyError):
        svg_de_signal("acces-orange-clignotant")
