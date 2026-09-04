"""Tests des planches de carte marine.

La fiche `data/sources/fiche-carte-marine/symboles.md` pose deux conventions
que le dessin doit rendre sans les écrire : le code de couleurs qui donne la
profondeur, et le soulignement qui fait d'une sonde une hauteur de haut-fond.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from carte import (  # noqa: E402
    DECLINAISON_DESSINEE,
    ESTRAN,
    GRAND_FOND,
    PETIT_FOND,
    PLANCHES,
    TERRE,
    _sonde,
    svg_estran_et_sondes,
    svg_rose_des_vents,
)


def test_les_deux_planches_sont_au_catalogue():
    assert set(PLANCHES) == {"estran-et-sondes", "rose-des-vents"}


def test_les_quatre_couleurs_de_la_carte_sont_toutes_presentes():
    # Terre, estran, petits fonds, grand fond : c'est le premier niveau de
    # lecture d'une carte, et il ne tient qu'à ces teintes.
    svg = svg_estran_et_sondes()
    for teinte in (TERRE, ESTRAN, PETIT_FOND, GRAND_FOND):
        assert teinte in svg


def test_une_sonde_soulignee_porte_un_trait_de_plus():
    nue = "".join(_sonde(50, 50, "1,2"))
    soulignee = "".join(_sonde(50, 50, "1,2", souligne=True))
    assert nue.count("<line") == 0
    assert soulignee.count("<line") == 1
    assert soulignee.startswith(nue.split("</text>")[0])


def test_le_soulignement_suit_la_largeur_du_nombre():
    court = "".join(_sonde(100, 50, "18", souligne=True))
    long = "".join(_sonde(100, 50, "1,25", souligne=True))
    assert court != long


def test_la_planche_porte_des_sondes_soulignees_et_des_sondes_nues():
    svg = svg_estran_et_sondes()
    assert svg.count("<text") > svg.count('stroke-width="1.2"')
    assert 'stroke-width="1.2"' in svg


def test_la_laisse_de_basse_mer_est_en_tirete():
    # Trait de côte plein, laisse de basse mer en tireté : c'est entre les deux
    # que la carte porte le vert de l'estran.
    svg = svg_estran_et_sondes()
    assert "stroke-dasharray" in svg


def test_les_deux_roses_ne_pointent_pas_au_meme_endroit():
    assert DECLINAISON_DESSINEE != 0
    svg = svg_rose_des_vents()
    # Deux cercles concentriques, deux flèches, donc deux triangles pleins.
    assert svg.count("<circle") >= 3
    assert svg.count("<path") == 2


def test_la_rose_est_graduee_tous_les_dix_degres():
    svg = svg_rose_des_vents()
    # Trente-six graduations par cercle, deux cercles, plus deux hampes.
    assert svg.count("<line") == 36 * 2 + 2


def test_aucun_texte_dans_la_rose():
    # La planche des sondes porte des nombres, c'est son sujet ; la rose non,
    # un chiffre de déclinaison donnerait la réponse.
    assert "<text" not in svg_rose_des_vents()


def test_les_dessins_ne_bougent_pas_entre_deux_appels():
    for dessiner in PLANCHES.values():
        assert dessiner() == dessiner()


def test_les_svg_sont_autonomes():
    for dessiner in PLANCHES.values():
        svg = dessiner()
        assert svg.startswith("<svg")
        assert "http://www.w3.org/2000/svg" in svg
        assert "<image" not in svg and "href=" not in svg
