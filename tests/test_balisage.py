"""Tests du dessin des marques de balisage.

La fiche `data/sources/aism-mbs/region-a.md` décrit chaque marque par sa
couleur, sa forme et son voyant. Ce qui est vérifié ici, c'est que le dessin
dit la même chose qu'elle, et rien de plus.
"""
import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from balisage import COULEURS, MARQUES, svg_de_marque  # noqa: E402


def couleurs_du_corps(nom):
    return [COULEURS[c] for c in MARQUES[nom]["corps"]]


def test_le_catalogue_couvre_le_systeme():
    for attendu in (
        "laterale-babord", "laterale-tribord",
        "cardinale-nord", "cardinale-est", "cardinale-sud", "cardinale-ouest",
        "danger-isole", "eaux-saines", "speciale", "danger-nouveau",
    ):
        assert attendu in MARQUES


@pytest.mark.parametrize("nom, marque", MARQUES.items())
def test_chaque_marque_est_completement_decrite(nom, marque):
    assert set(marque) == {"forme", "corps", "sens", "voyant", "voyant_couleur", "alt", "regle"}
    assert marque["voyant_couleur"] in COULEURS
    assert marque["corps"], f"{nom} n'a aucune couleur de corps"
    assert all(c in COULEURS for c in marque["corps"]), f"{nom} porte une couleur inconnue"
    assert svg_de_marque(nom).startswith("<svg")


def test_le_nord_et_le_sud_ne_se_dessinent_pas_pareil():
    # Deux cônes pointes en haut contre deux cônes pointes en bas : c'est tout
    # ce qui sépare la marque qu'on contourne par le nord de celle du sud.
    assert svg_de_marque("cardinale-nord") != svg_de_marque("cardinale-sud")


def test_le_corps_du_nord_est_noir_en_haut_et_jaune_en_bas():
    assert MARQUES["cardinale-nord"]["corps"] == ["noir", "jaune"]
    assert MARQUES["cardinale-sud"]["corps"] == ["jaune", "noir"]


def test_l_est_et_l_ouest_portent_trois_bandes_inversees():
    assert MARQUES["cardinale-est"]["corps"] == ["noir", "jaune", "noir"]
    assert MARQUES["cardinale-ouest"]["corps"] == ["jaune", "noir", "jaune"]


def test_les_bandes_du_corps_se_retrouvent_toutes_dans_le_dessin():
    svg = svg_de_marque("cardinale-est")
    for teinte in couleurs_du_corps("cardinale-est"):
        assert teinte in svg


def test_la_region_b_inverse_les_couleurs_laterales():
    # Le thème « balisage région B » ne tient qu'à ce renversement.
    assert MARQUES["laterale-babord"]["corps"] == ["rouge"]
    assert MARQUES["laterale-babord-region-b"]["corps"] == ["vert"]
    assert MARQUES["laterale-tribord"]["corps"] == ["vert"]
    assert MARQUES["laterale-tribord-region-b"]["corps"] == ["rouge"]


def test_la_forme_ne_change_pas_entre_les_regions():
    # Seule la couleur s'inverse : le cylindre reste à bâbord.
    for cote in ("babord", "tribord"):
        assert MARQUES[f"laterale-{cote}"]["forme"] == MARQUES[f"laterale-{cote}-region-b"]["forme"]
        assert MARQUES[f"laterale-{cote}"]["voyant"] == MARQUES[f"laterale-{cote}-region-b"]["voyant"]


def test_les_bandes_verticales_ne_se_confondent_pas_avec_les_horizontales():
    assert MARQUES["eaux-saines"]["sens"] == "vertical"
    assert MARQUES["cardinale-est"]["sens"] == "horizontal"


def test_aucun_texte_dans_l_image():
    svg = svg_de_marque("cardinale-ouest")
    assert "<text" not in svg
    for mot in ("ouest", "cardinal", "jaune", "noir", "voyant"):
        assert mot not in svg.lower()


def test_deux_marques_ne_donnent_jamais_le_meme_dessin():
    dessins = {nom: svg_de_marque(nom) for nom in MARQUES}
    assert len(set(dessins.values())) == len(dessins)


def test_le_dessin_ne_bouge_pas_entre_deux_appels():
    assert svg_de_marque("danger-isole") == svg_de_marque("danger-isole")


def test_le_svg_est_autonome():
    svg = svg_de_marque("speciale")
    assert svg.startswith("<svg")
    assert "http://www.w3.org/2000/svg" in svg
    assert "<image" not in svg and "href=" not in svg.replace('="url(#', "")


def test_une_marque_inconnue_est_refusee():
    with pytest.raises(KeyError):
        svg_de_marque("cardinale-nord-est")
