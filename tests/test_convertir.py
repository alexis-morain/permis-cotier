"""Tests de l'outil de conversion du nombre de propositions."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from convertir import convertir, lire_lot, marquer_a_relire  # noqa: E402

QUESTION = """id: balisage-0001
option: cotier
theme: balisage
statut: publie
difficulte: 1
enonce: >-
  Tu rentres au port. Quelle marque laisses-tu sur bâbord ?
propositions:
  - id: a
    texte: Rouge, de forme cylindrique
  - id: b
    texte: Verte, de forme conique
  - id: c
    texte: >-
      Rouge, de forme conique, avec un voyant cylindrique rouge visible
      de loin.
  - id: d
    texte: Verte, de forme cylindrique
reponses:
  - a
explication: >-
  En région A, la marque latérale bâbord est rouge et cylindrique.
sources:
  - texte: Balisage AISM, région A
    ref: aism-mbs
meta:
  cree_le: '2026-09-04'
  genere_par: claude
  relu_par: alexis
  relu_le: '2026-09-04'
"""


def propositions(texte):
    """Les couples (id, première ligne de texte) du bloc propositions."""
    lu = []
    dans = False
    for ligne in texte.splitlines():
        if ligne.startswith("propositions:"):
            dans = True
            continue
        if dans and ligne and not ligne.startswith(" "):
            break
        if dans and ligne.startswith("  - id: "):
            lu.append(ligne.removeprefix("  - id: "))
    return lu


def reponses(texte):
    lu = []
    dans = False
    for ligne in texte.splitlines():
        if ligne.startswith("reponses:"):
            dans = True
            continue
        if dans and not ligne.startswith("  - "):
            break
        if dans:
            lu.append(ligne.removeprefix("  - "))
    return lu


def test_retirer_la_derniere_proposition_ne_renumerote_rien():
    sortie = convertir(QUESTION, ["d"])
    assert propositions(sortie) == ["a", "b", "c"]
    assert reponses(sortie) == ["a"]


def test_retirer_une_proposition_du_milieu_renumerote_les_suivantes():
    sortie = convertir(QUESTION, ["b"])
    assert propositions(sortie) == ["a", "b", "c"]
    assert "Rouge, de forme conique" in sortie
    assert "Verte, de forme conique" not in sortie


def test_la_reponse_suit_la_renumerotation():
    # La bonne réponse est « a » ; on retire « a »… non, on déplace la réponse.
    question = QUESTION.replace("reponses:\n  - a", "reponses:\n  - d")
    sortie = convertir(question, ["b"])
    assert reponses(sortie) == ["c"]


def test_retirer_deux_propositions():
    sortie = convertir(QUESTION, ["b", "c"])
    assert propositions(sortie) == ["a", "b"]
    assert reponses(sortie) == ["a"]


def test_une_proposition_sur_plusieurs_lignes_part_en_entier():
    sortie = convertir(QUESTION, ["c"])
    assert "voyant cylindrique rouge visible" not in sortie
    assert propositions(sortie) == ["a", "b", "c"]
    assert "Verte, de forme cylindrique" in sortie


def test_refus_de_retirer_une_bonne_reponse():
    with pytest.raises(ValueError, match="bonne réponse"):
        convertir(QUESTION, ["a"])


def test_refus_de_descendre_sous_deux_propositions():
    with pytest.raises(ValueError, match="au moins deux propositions"):
        convertir(QUESTION, ["b", "c", "d"])


def test_refus_de_descendre_sous_trois_avec_deux_bonnes_reponses():
    question = QUESTION.replace("reponses:\n  - a", "reponses:\n  - a\n  - b")
    with pytest.raises(ValueError, match="au moins trois propositions"):
        convertir(question, ["c", "d"])


def test_refus_d_un_identifiant_inconnu():
    with pytest.raises(ValueError, match="e"):
        convertir(QUESTION, ["e"])


def test_le_reste_du_fichier_est_intact():
    sortie = convertir(QUESTION, ["d"])
    for morceau in (
        "enonce: >-\n  Tu rentres au port. Quelle marque laisses-tu sur bâbord ?",
        "explication: >-\n  En région A, la marque latérale bâbord est rouge et cylindrique.",
        "sources:\n  - texte: Balisage AISM, région A\n    ref: aism-mbs",
        "  cree_le: '2026-09-04'",
    ):
        assert morceau in sortie


def test_marquer_a_relire_rend_la_question_au_modele():
    sortie = marquer_a_relire(QUESTION)
    assert "  relu_par: claude\n" in sortie
    assert "relu_le" not in sortie
    assert "  genere_par: claude\n" in sortie


def test_marquer_a_relire_est_idempotent():
    une = marquer_a_relire(QUESTION)
    assert marquer_a_relire(une) == une


def test_un_lot_se_lit_ligne_par_ligne(tmp_path):
    lot = tmp_path / "lot.txt"
    lot.write_text(
        "# balisage\n"
        "data/questions/balisage/balisage-0003.yaml a\n"
        "\n"
        "data/questions/balisage/balisage-0006.yaml c,d   # deux propositions\n",
        encoding="utf-8",
    )
    assert lire_lot(lot) == [
        (Path("data/questions/balisage/balisage-0003.yaml"), ["a"]),
        (Path("data/questions/balisage/balisage-0006.yaml"), ["c", "d"]),
    ]


def test_une_ligne_de_lot_mal_formee_est_refusee(tmp_path):
    lot = tmp_path / "lot.txt"
    lot.write_text("data/questions/vhf/vhf-0001.yaml\n", encoding="utf-8")
    with pytest.raises(ValueError, match="ligne 1"):
        lire_lot(lot)
