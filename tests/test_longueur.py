"""Tests du signal de bonne réponse trop longue face aux distracteurs."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from longueur import mesurer, signalee  # noqa: E402


def question(bonne_texte: str, distracteurs: list[str], reponse: str = "a") -> dict:
    propositions = [{"id": reponse, "texte": bonne_texte}]
    for i, texte in enumerate(distracteurs):
        propositions.append({"id": chr(ord("b") + i), "texte": texte})
    return {"reponses": [reponse], "propositions": propositions}


def test_bonne_reponse_bien_plus_longue_est_signalee():
    q = question("Un navire non maître de sa manœuvre, empêché de manœuvrer normalement", ["Un chalutier"])
    assert signalee(mesurer(q))


def test_bonne_reponse_de_longueur_comparable_n_est_pas_signalee():
    q = question("Bâbord", ["Tribord"])
    assert not signalee(mesurer(q))
