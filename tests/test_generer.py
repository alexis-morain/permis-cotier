"""Tests de la génération de brouillons.

Rien ici n'appelle `claude -p` : on vérifie ce qu'on lui donne et ce qu'on fait
de ce qu'il rend. Le reste est une étape humaine.
"""
import sys
from pathlib import Path

import pytest
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from generer import bloc_notions, notions_du_theme, rendre  # noqa: E402


def test_les_notions_d_un_theme_viennent_du_referentiel():
    codes = [n["code"] for n in notions_du_theme("feux-marques")]
    assert "marques-jour" in codes
    assert "barre-veille-vitesse" not in codes


def test_un_nom_avec_apostrophe_est_lu_entier():
    """`notions.ts` passe en guillemets doubles quand le nom porte une
    apostrophe : « Risque d'abordage » ne doit pas revenir tronqué."""
    noms = {n["code"]: n["nom"] for n in notions_du_theme("barre-route")}
    assert noms["barre-risque-abordage"] == "Risque d'abordage"


def test_un_theme_inconnu_ne_rend_aucune_notion():
    assert notions_du_theme("theme-qui-n-existe-pas") == []


def test_la_notion_visee_est_nommee_seule():
    bloc = bloc_notions("feux-marques", "marques-jour")
    assert "notion: marques-jour" in bloc
    assert "feux-portee" not in bloc


def test_sans_notion_visee_le_theme_donne_sa_liste():
    bloc = bloc_notions("feux-marques", None)
    assert "marques-jour" in bloc
    assert "feux-portee" in bloc


def test_une_notion_etrangere_au_theme_est_refusee():
    with pytest.raises(ValueError):
        bloc_notions("feux-marques", "barre-veille-vitesse")


def test_le_rendu_garde_la_notion_et_la_famille():
    """Les deux champs sont arrivés après ce script : recopiés à la main, ils
    tombaient en silence et le brouillon sortait non classé."""
    doc = {
        "id": "feux-marques-0062",
        "option": "cotier",
        "theme": "feux-marques",
        "notion": "marques-jour",
        "famille": "marques-jour-boules",
        "statut": "brouillon",
        "difficulte": 2,
        "enonce": "De jour, un navire montre trois boules noires. Que dit-il ?",
        "propositions": [{"id": "a", "texte": "Il est échoué"}, {"id": "b", "texte": "Il mouille"}],
        "reponses": ["a"],
        "explication": "Trois boules en ligne verticale disent le navire échoué.",
        "sources": [{"texte": "RIPAM, règle 30 d)", "ref": "decret-77-733"}],
        "meta": {"cree_le": "2026-09-21", "genere_par": "claude"},
    }
    relu = yaml.safe_load(rendre(doc))
    assert relu["notion"] == "marques-jour"
    assert relu["famille"] == "marques-jour-boules"
    assert list(relu)[:5] == ["id", "option", "theme", "notion", "famille"]


def test_le_rendu_ne_fabrique_pas_les_champs_absents():
    doc = {"id": "vhf-0060", "theme": "vhf", "enonce": "Sur quel canal appelle-t-on ?"}
    assert "notion" not in yaml.safe_load(rendre(doc))
