"""Tests du rapport de couverture, volet répartition des propositions."""
import sys
from collections import Counter
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from couverture import (  # noqa: E402
    CIBLE_PROPOSITIONS,
    a_convertir,
    cibles_propositions,
    ecarts_propositions,
    lire_questions_publiees,
    repartition_propositions,
)


def question(theme="feux-marques", n=4, statut="publie"):
    return {
        "theme": theme,
        "statut": statut,
        "propositions": [{"id": c, "texte": "x"} for c in "abcde"[:n]],
    }


def test_la_cible_ne_prevoit_ni_une_ni_cinq_propositions():
    assert set(CIBLE_PROPOSITIONS) == {2, 3, 4}
    assert sum(CIBLE_PROPOSITIONS.values()) == pytest.approx(1.0)


@pytest.mark.parametrize("total", [0, 1, 3, 7, 28, 191, 275])
def test_les_cibles_somment_exactement_au_total(total):
    assert sum(cibles_propositions(total).values()) == total


def test_les_cibles_sur_la_banque_actuelle_suivent_l_enquete():
    # 191 questions, cible 20 / 55 / 25 : l'enquête annonce 38 / 105 / 48.
    assert cibles_propositions(191) == {2: 38, 3: 105, 4: 48}


def test_les_cibles_ne_reservent_aucune_place_a_cinq_propositions():
    assert 5 not in cibles_propositions(40)


def test_la_repartition_compte_par_theme():
    questions = [question("feux-marques", 4), question("feux-marques", 3), question("vhf", 2)]
    assert repartition_propositions(questions) == {
        "feux-marques": Counter({4: 1, 3: 1}),
        "vhf": Counter({2: 1}),
    }


def test_les_ecarts_donnent_observe_cible_et_difference():
    # Quatre questions toutes à 4 propositions : cible 1 / 2 / 1.
    ecarts = ecarts_propositions(Counter({4: 4}))
    assert ecarts == {2: (0, 1, -1), 3: (0, 2, -2), 4: (4, 1, 3)}


@pytest.mark.parametrize("compte", [Counter({4: 28}), Counter({2: 5, 3: 10, 4: 3}), Counter()])
def test_les_ecarts_se_compensent(compte):
    assert sum(e for _, _, e in ecarts_propositions(compte).values()) == 0


def test_un_format_hors_cible_est_signale_en_surplus():
    ecarts = ecarts_propositions(Counter({3: 3, 5: 1}))
    assert ecarts[5] == (1, 0, 1)


def test_le_compte_a_convertir_est_la_somme_des_surplus():
    # Tout à 4 sur 28 questions : cible 6 / 15 / 7, il en reste 21 à convertir.
    assert a_convertir(Counter({4: 28})) == 21
    # Dix questions pile sur la cible : 2 / 6 / 2, rien à convertir.
    assert a_convertir(Counter({2: 2, 3: 6, 4: 2})) == 0


def test_seules_les_questions_publiees_hors_inbox_sont_lues(tmp_path):
    import yaml

    dossier = tmp_path / "data" / "questions"
    (dossier / "vhf").mkdir(parents=True)
    (dossier / "_inbox").mkdir(parents=True)
    (dossier / "vhf" / "a.yaml").write_text(yaml.safe_dump(question("vhf", 3)), encoding="utf-8")
    (dossier / "vhf" / "b.yaml").write_text(
        yaml.safe_dump(question("vhf", 3, statut="brouillon")), encoding="utf-8"
    )
    (dossier / "_inbox" / "c.yaml").write_text(yaml.safe_dump(question("vhf", 3)), encoding="utf-8")

    assert len(lire_questions_publiees(tmp_path)) == 1
