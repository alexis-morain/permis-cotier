"""Tests du dessin des rythmes de feux.

Le nombre d'éclats et leur groupement sont exacts, la pause entre groupes est
abrégée : c'est ce que ces tests tiennent, rien sur la période réelle.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from rythmes import RYTHMES, svg_de_rythme  # noqa: E402


def eclats(nom):
    """Les couleurs des éclats successifs d'une période, obscurités ôtées."""
    return [c for _, c in RYTHMES[nom]["motif"] if c is not None]


def groupes(nom):
    """Les tailles des groupes d'éclats : une obscurité longue clôt un groupe."""
    motif = RYTHMES[nom]["motif"]
    seuil = 1.0
    tailles, courant = [], 0
    for duree, couleur in motif:
        if couleur is not None:
            courant += 1
        elif duree > seuil:
            tailles.append(courant)
            courant = 0
    if courant:
        tailles.append(courant)
    return tailles


@pytest.mark.parametrize("nom, rythme", RYTHMES.items())
def test_chaque_rythme_est_completement_decrit(nom, rythme):
    assert set(rythme) == {"motif", "fenetre", "alt", "regle"}
    assert svg_de_rythme(nom).startswith("<svg")
    assert "<text" not in svg_de_rythme(nom)


def test_le_chenal_prefere_a_babord_est_un_feu_vert_deux_plus_un():
    # Annexe I, 2.3.3.2 : feu vert, éclats diversement groupés (2 + 1).
    assert set(eclats("chenal-prefere-babord")) == {"vert"}
    assert groupes("chenal-prefere-babord") == [2, 1]


def test_les_trois_eclats_de_manoeuvre_sont_blancs_et_egaux():
    # Règle 34 b) i) : trois éclats pour « je bats en arrière », feu blanc,
    # chaque éclat d'environ une seconde.
    assert eclats("manoeuvre-trois-eclats") == ["blanc"] * 3
    durees = {d for d, c in RYTHMES["manoeuvre-trois-eclats"]["motif"] if c}
    assert len(durees) == 1


def test_deux_rythmes_ne_donnent_jamais_le_meme_dessin():
    dessins = {nom: svg_de_rythme(nom) for nom in RYTHMES}
    assert len(set(dessins.values())) == len(dessins)


def test_un_rythme_inconnu_est_refuse():
    with pytest.raises(KeyError):
        svg_de_rythme("cardinale-nord-est")
