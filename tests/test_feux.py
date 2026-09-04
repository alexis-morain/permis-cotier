"""Tests du dessin des feux.

Un visuel dont dépend la réponse ne s'invente pas : il découle des feux que
la règle prescrit. Ce qui est vérifié ici, c'est que le dessin dit bien ce
que la description dit, et rien de plus.
"""
import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from feux import COULEURS, SCENES, svg_de_feux  # noqa: E402


def cercles(svg):
    """Les feux dessinés, de haut en bas : (ordonnée, couleur)."""
    trouves = [
        (float(m.group("cy")), m.group("fill"))
        for m in re.finditer(
            r'<circle[^>]*class="feu"[^>]*cy="(?P<cy>[\d.]+)"[^>]*fill="(?P<fill>#[0-9a-f]+)"', svg
        )
    ]
    return sorted(trouves)


def test_les_feux_sont_empiles_dans_l_ordre_donne():
    svg = svg_de_feux(["vert", "blanc"])
    dessines = cercles(svg)
    assert len(dessines) == 2
    assert dessines[0][1] == COULEURS["vert"]
    assert dessines[1][1] == COULEURS["blanc"]


def test_l_ordre_inverse_donne_un_dessin_inverse():
    haut_vert = [couleur for _, couleur in cercles(svg_de_feux(["vert", "blanc"]))]
    haut_blanc = [couleur for _, couleur in cercles(svg_de_feux(["blanc", "vert"]))]
    assert haut_vert == list(reversed(haut_blanc))


def test_un_feu_seul_se_dessine():
    assert len(cercles(svg_de_feux(["blanc"]))) == 1


def test_trois_feux_tiennent_dans_une_image_plus_haute():
    deux = svg_de_feux(["rouge", "blanc"])
    trois = svg_de_feux(["rouge", "blanc", "rouge"])
    hauteur = lambda s: float(re.search(r'viewBox="0 0 [\d.]+ ([\d.]+)"', s).group(1))
    assert hauteur(trois) > hauteur(deux)


def test_aucun_texte_dans_l_image():
    # Un libellé donnerait la réponse au candidat.
    svg = svg_de_feux(["rouge", "blanc", "rouge"])
    assert "<text" not in svg
    for mot in ("chalut", "rouge", "blanc", "pêche", "remorqu"):
        assert mot not in svg.lower().replace("#", "")


def test_une_couleur_inconnue_est_refusee():
    with pytest.raises(ValueError):
        svg_de_feux(["mauve"])


def test_une_scene_vide_est_refusee():
    with pytest.raises(ValueError):
        svg_de_feux([])


def test_le_dessin_ne_bouge_pas_entre_deux_appels():
    # Sans ça, chaque régénération salirait le diff.
    assert svg_de_feux(["vert", "blanc"]) == svg_de_feux(["vert", "blanc"])


def test_le_svg_est_autonome():
    svg = svg_de_feux(["blanc"])
    assert svg.startswith("<svg")
    assert "http://www.w3.org/2000/svg" in svg
    assert "<image" not in svg and "href=" not in svg


@pytest.mark.parametrize("nom, scene", SCENES.items())
def test_chaque_scene_du_catalogue_se_dessine(nom, scene):
    assert set(scene) == {"regle", "feux", "alt"}
    assert scene["feux"], f"{nom} n'a aucun feu"
    assert all(c in COULEURS for c in scene["feux"]), f"{nom} porte une couleur inconnue"
    assert svg_de_feux(scene["feux"]).startswith("<svg")


def test_les_scenes_ne_se_repetent_pas():
    # Deux noms pour la même pile de feux voudraient dire qu'une des deux
    # règles est mal lue.
    piles = [tuple(s["feux"]) for s in SCENES.values()]
    assert len(piles) == len(set(piles))
