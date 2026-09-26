"""Tests du détecteur de redites.

Rien ici ne lit la banque du dépôt : les questions sont données à la main, pour
que le jour où une vraie question change, ce soit le rapport qui bouge et pas
un test.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from doublons import (  # noqa: E402
    Question,
    manquements,
    normaliser,
    paires_proches,
    rapport,
)


def q(ident, enonce, famille=None, notion="une-notion", propositions="a b c"):
    return Question(
        id=ident,
        theme=ident.rsplit("-", 1)[0],
        notion=notion,
        famille=famille,
        enonce=normaliser(enonce),
        propositions=normaliser(propositions),
    )


def test_normaliser_efface_accents_ponctuation_et_casse():
    assert normaliser("Où vas-tu, toi ?") == "ou vas tu toi"


def test_deux_enonces_sans_rapport_ne_sont_pas_proches():
    paires = paires_proches(
        [
            q("vhf-0001", "À quelle puissance émet une VHF fixe ?"),
            q("meteo-0001", "Que recouvre une mer forte au bulletin ?"),
        ]
    )
    assert paires == []


def test_le_meme_enonce_est_releve():
    paires = paires_proches(
        [
            q("balisage-0017", "Tu relèves cette marque. De quel côté la contournes-tu ?"),
            q("balisage-0018", "Tu relèves cette marque. De quel côté la contournes-tu ?"),
        ]
    )
    assert len(paires) == 1
    assert paires[0].enonce == 1.0
    assert paires[0].identiques


def test_la_ponctuation_seule_ne_fait_pas_deux_enonces():
    paires = paires_proches(
        [
            q("balisage-0017", "Tu relèves cette marque, de quel côté la contournes-tu ?"),
            q("balisage-0018", "Tu relèves cette marque : de quel côté la contournes-tu ?"),
        ]
    )
    assert paires[0].identiques


def test_une_famille_commune_couvre_une_paire_identique():
    banque = [
        q("balisage-0017", "Tu relèves cette marque. De quel côté ?", famille="cardinales"),
        q("balisage-0018", "Tu relèves cette marque. De quel côté ?", famille="cardinales"),
    ]
    paires = paires_proches(banque)
    assert paires[0].meme_famille
    assert manquements(paires) == []


def test_deux_enonces_identiques_sans_famille_sont_refuses():
    banque = [
        q("balisage-0017", "Tu relèves cette marque. De quel côté ?"),
        q("balisage-0018", "Tu relèves cette marque. De quel côté ?"),
    ]
    assert len(manquements(paires_proches(banque))) == 1


def test_deux_familles_differentes_ne_couvrent_pas_une_paire_identique():
    """Une famille par question n'empêche rien : ce qu'on vérifie, c'est
    qu'elles ne tomberont pas ensemble, donc qu'elles partagent la même."""
    banque = [
        q("balisage-0017", "Tu relèves cette marque. De quel côté ?", famille="cardinales"),
        q("balisage-0018", "Tu relèves cette marque. De quel côté ?", famille="laterales"),
    ]
    assert len(manquements(paires_proches(banque))) == 1


def test_une_paire_seulement_ressemblante_est_laissee_au_jugement():
    """La tournure maison d'un thème fait monter le score sans faire une
    redite : le rapport la montre, la vérification ne la refuse pas."""
    banque = [
        q("feux-marques-0037", "De nuit, un navire ne montre que ces feux. Que peux-tu en dire ?"),
        q("feux-marques-0038", "De nuit, un navire ne montre que ce feu. Que peux-tu en dire ?"),
    ]
    paires = paires_proches(banque)
    assert paires and not paires[0].identiques
    assert manquements(paires) == []


def test_le_rapport_nomme_la_famille_et_ce_qui_reste_a_juger():
    banque = [
        q("balisage-0017", "Tu relèves cette marque. De quel côté ?", famille="cardinales"),
        q("balisage-0018", "Tu relèves cette marque. De quel côté ?", famille="cardinales"),
        q("signaux-0020", "Tu entends ce signal au sifflet. Qui peut l'émettre ?"),
        q("signaux-0027", "Tu entends ce signal au sifflet. Qui peut donc l'émettre ?"),
    ]
    texte = rapport(paires_proches(banque))
    assert "famille cardinales" in texte
    assert "à juger" in texte


def test_le_rapport_le_dit_quand_il_n_y_a_rien():
    assert "Aucune" in rapport([])
