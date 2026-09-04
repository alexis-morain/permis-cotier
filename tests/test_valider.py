"""Tests du validateur de banque. Mêmes règles que le schéma zod du site."""
import sys
from pathlib import Path

import pytest
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from valider import (  # noqa: E402
    CODES_THEMES,
    Probleme,
    valider_banque,
    valider_question,
)

VALIDE = {
    "id": "feux-marques-0012",
    "option": "cotier",
    "theme": "feux-marques",
    "statut": "publie",
    "difficulte": 2,
    "enonce": "De nuit, un feu vert au-dessus d'un feu blanc. De quoi s'agit-il ?",
    "propositions": [
        {"id": "a", "texte": "Un navire a propulsion mecanique"},
        {"id": "b", "texte": "Un navire en train de chaluter"},
        {"id": "c", "texte": "Un navire non maitre de sa manoeuvre"},
        {"id": "d", "texte": "Un navire a voile"},
    ],
    "reponses": ["b"],
    "explication": "Le chalutier montre deux feux superposes, vert au-dessus de blanc.",
    "sources": [{"texte": "RIPAM, regle 26 b)", "ref": "decret-77-733"}],
    "meta": {"cree_le": "2026-09-10", "genere_par": "claude", "relu_par": "alexis"},
}


def avec(**patch):
    q = {**VALIDE, **patch}
    return q


def codes(q, racine=Path("data")):
    return {p.code for p in valider_question(q, Path("data/questions/feux-marques/x.yaml"), racine)}


def test_question_conforme_ne_leve_aucun_probleme():
    assert codes(VALIDE) == set()


def test_les_quatorze_themes_sont_connus():
    assert len(CODES_THEMES) == 14
    assert "feux-marques" in CODES_THEMES


@pytest.mark.parametrize("mauvais_id", ["feux-0012", "balisage-0012", "feux-marques-12", "FEUX-MARQUES-0012"])
def test_identifiant_mal_forme(mauvais_id):
    assert "id" in codes(avec(id=mauvais_id))


def test_theme_hors_arrete():
    assert "theme" in codes(avec(theme="navigation", id="navigation-0001"))


def test_option_fluviale_refusee_en_v1():
    assert "option" in codes(avec(option="fluvial"))


@pytest.mark.parametrize("n", [2, 6])
def test_nombre_de_propositions(n):
    props = [{"id": c, "texte": "texte"} for c in "abcdef"[:n]]
    assert "propositions" in codes(avec(propositions=props, reponses=["a"]))


def test_identifiants_de_propositions_dupliques():
    props = VALIDE["propositions"][:3] + [{"id": "a", "texte": "doublon"}]
    assert "propositions" in codes(avec(propositions=props))


@pytest.mark.parametrize("reponses", [[], ["a", "b", "c"], ["z"], ["b", "b"]])
def test_reponses_invalides(reponses):
    assert "reponses" in codes(avec(reponses=reponses))


def test_deux_bonnes_reponses_acceptees():
    assert codes(avec(reponses=["b", "c"])) == set()


def test_source_obligatoire():
    assert "sources" in codes(avec(sources=[]))


@pytest.mark.parametrize("source", [{"texte": "RIPAM"}, {"ref": "decret-77-733"}])
def test_source_incomplete(source):
    assert "sources" in codes(avec(sources=[source]))


def test_statut_relu_exige_un_relecteur():
    meta = {"cree_le": "2026-09-10", "genere_par": "claude"}
    assert "meta.relu_par" in codes(avec(statut="relu", meta=meta))
    assert "meta.relu_par" in codes(avec(statut="publie", meta=meta))
    assert codes(avec(statut="brouillon", meta=meta)) == set()


def test_statut_inconnu():
    assert "statut" in codes(avec(statut="valide"))


@pytest.mark.parametrize("d", [0, 4, "deux"])
def test_difficulte_hors_bornes(d):
    assert "difficulte" in codes(avec(difficulte=d))


def test_enonce_ou_explication_vide():
    assert "enonce" in codes(avec(enonce="   "))
    assert "explication" in codes(avec(explication=""))


def test_champ_inconnu_refuse():
    assert "champs-inconnus" in codes(avec(bonus="oui"))


def test_visuel_absent_du_disque(tmp_path):
    q = avec(visuel={"fichier": "feux/absent.svg", "alt": "Un feu", "credit": "code"})
    assert "visuel.fichier" in {p.code for p in valider_question(q, Path("x.yaml"), tmp_path)}


def test_visuel_present_sur_le_disque(tmp_path):
    fichier = tmp_path / "public" / "visuels" / "feux" / "present.svg"
    fichier.parent.mkdir(parents=True)
    fichier.write_text("<svg/>")
    q = avec(visuel={"fichier": "feux/present.svg", "alt": "Un feu vert", "credit": "code"})
    assert {p.code for p in valider_question(q, Path("x.yaml"), tmp_path)} == set()


@pytest.mark.parametrize(
    "visuel",
    [
        {"fichier": "feux/x.svg", "alt": "", "credit": "code"},
        {"fichier": "feux/x.svg", "alt": "Un feu"},
        {"fichier": "feux/x.svg", "alt": "Un feu", "credit": "midjourney"},
    ],
)
def test_visuel_mal_credite(visuel):
    assert any(p.code.startswith("visuel") for p in valider_question(avec(visuel=visuel), Path("x.yaml"), Path("data")))


def _ecrire(racine: Path, question: dict) -> None:
    dossier = racine / "data" / "questions" / question["theme"]
    dossier.mkdir(parents=True, exist_ok=True)
    (dossier / f"{question['id']}.yaml").write_text(yaml.safe_dump(question, allow_unicode=True))


def test_banque_valide(tmp_path):
    _ecrire(tmp_path, VALIDE)
    assert valider_banque(tmp_path) == []


def test_banque_detecte_un_identifiant_duplique(tmp_path):
    _ecrire(tmp_path, VALIDE)
    autre = avec(theme="vhf", id="feux-marques-0012")
    dossier = tmp_path / "data" / "questions" / "vhf"
    dossier.mkdir(parents=True, exist_ok=True)
    (dossier / "doublon.yaml").write_text(yaml.safe_dump(autre, allow_unicode=True))
    assert any(p.code == "id-duplique" for p in valider_banque(tmp_path))


def test_banque_exige_le_bon_dossier(tmp_path):
    dossier = tmp_path / "data" / "questions" / "vhf"
    dossier.mkdir(parents=True)
    (dossier / "feux-marques-0012.yaml").write_text(yaml.safe_dump(VALIDE, allow_unicode=True))
    assert any(p.code == "dossier" for p in valider_banque(tmp_path))


def test_banque_exige_que_le_nom_de_fichier_soit_l_identifiant(tmp_path):
    dossier = tmp_path / "data" / "questions" / "feux-marques"
    dossier.mkdir(parents=True)
    (dossier / "autre-nom.yaml").write_text(yaml.safe_dump(VALIDE, allow_unicode=True))
    assert any(p.code == "nom-de-fichier" for p in valider_banque(tmp_path))


def test_banque_ignore_l_inbox(tmp_path):
    dossier = tmp_path / "data" / "questions" / "_inbox"
    dossier.mkdir(parents=True)
    (dossier / "brouillon.yaml").write_text("pas: du tout valide")
    assert valider_banque(tmp_path) == []


def test_banque_signale_un_yaml_illisible(tmp_path):
    dossier = tmp_path / "data" / "questions" / "vhf"
    dossier.mkdir(parents=True)
    (dossier / "casse.yaml").write_text("id: [non ferme")
    assert any(p.code == "yaml" for p in valider_banque(tmp_path))


def test_probleme_s_affiche_avec_son_fichier():
    p = Probleme(fichier=Path("data/questions/vhf/vhf-0001.yaml"), code="id", message="mal formé")
    assert "vhf-0001.yaml" in str(p)
    assert "mal formé" in str(p)
