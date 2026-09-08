"""Tests du garde-fou de conversion : ce qu'une conversion n'a pas le droit de changer."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from verifier_conversion import verifier  # noqa: E402

AVANT = {
    "id": "carburant-0006",
    "enonce": "L'autonomie figure-t-elle au programme ?",
    "difficulte": 1,
    "propositions": [
        {"id": "a", "texte": "Non, elle relève de l'extension hauturière"},
        {"id": "b", "texte": "Oui, le programme le demande"},
        {"id": "c", "texte": "Non, aucun texte ne s'en occupe"},
        {"id": "d", "texte": "Oui, au-dessus de 6 mètres"},
    ],
    "reponses": ["b"],
    "explication": "L'article 1er énumère le programme.",
    "meta": {"cree_le": "2026-09-04", "genere_par": "claude", "relu_par": "alexis", "relu_le": "2026-09-04"},
}


def apres(**patch):
    q = {**AVANT, **patch}
    q["meta"] = {**AVANT["meta"], **patch.get("meta", {})}
    return q


CONVERTIE = apres(
    propositions=AVANT["propositions"][:2],
    meta={"relu_par": "claude", "relu_le": None},
)
del CONVERTIE["meta"]["relu_le"]


def test_une_question_intacte_ne_pose_aucun_probleme():
    assert verifier(AVANT, AVANT) == []


def test_une_conversion_propre_ne_pose_aucun_probleme():
    assert verifier(AVANT, CONVERTIE) == []


def test_la_reponse_doit_designer_le_meme_texte():
    # Le piège : on retire « a », on renumérote, on oublie de suivre la réponse.
    casse = apres(
        propositions=[{"id": "a", "texte": "Oui, le programme le demande"},
                      {"id": "b", "texte": "Non, aucun texte ne s'en occupe"}],
        reponses=["b"],
        meta={"relu_par": "claude"},
    )
    del casse["meta"]["relu_le"]
    assert any("bonne réponse" in p for p in verifier(AVANT, casse))


def test_une_proposition_reformulee_est_refusee():
    casse = apres(
        propositions=[AVANT["propositions"][0], {"id": "b", "texte": "Oui, bien sûr"}],
        meta={"relu_par": "claude"},
    )
    del casse["meta"]["relu_le"]
    assert any("texte" in p for p in verifier(AVANT, casse))


def test_une_proposition_ajoutee_est_refusee():
    casse = apres(
        propositions=AVANT["propositions"] + [{"id": "e", "texte": "Peut-être"}],
        meta={"relu_par": "claude"},
    )
    assert verifier(AVANT, casse) != []


def test_des_identifiants_a_trou_sont_refuses():
    casse = apres(
        propositions=[AVANT["propositions"][0], AVANT["propositions"][2]],
        meta={"relu_par": "claude"},
    )
    del casse["meta"]["relu_le"]
    assert any("identifiant" in p for p in verifier(AVANT, casse))


def test_un_enonce_modifie_est_refuse():
    casse = apres(enonce="Autre énoncé", meta={"relu_par": "claude"})
    assert any("enonce" in p for p in verifier(AVANT, casse))


def test_une_conversion_qui_garde_la_relecture_humaine_est_signalee():
    casse = apres(propositions=AVANT["propositions"][:2])
    assert any("relu_par" in p for p in verifier(AVANT, casse))


def test_une_question_non_convertie_garde_sa_relecture():
    assert verifier(AVANT, apres(difficulte=1)) == []


def test_une_relecture_en_bloc_n_est_pas_une_conversion():
    # Alexis valide en bloc un lot converti : `relu_par` repasse à son nom et
    # rien d'autre ne bouge. Ce n'est pas une conversion, le garde-fou n'a rien
    # à en dire, sans quoi une validation rend 226 lignes rouges pour rien.
    validee = {**CONVERTIE, "meta": {**CONVERTIE["meta"], "relu_par": "alexis", "relu_le": "2026-09-08"}}
    assert verifier(CONVERTIE, validee) == []


def test_un_nom_de_relecteur_pose_sur_une_question_retouchee_est_refuse():
    # L'inverse de la relecture en bloc : le fond bouge et le nom du relecteur
    # apparaît dans le même geste, sur une question que personne n'a relue ainsi.
    casse = {**CONVERTIE, "difficulte": 3,
             "meta": {**CONVERTIE["meta"], "relu_par": "alexis"}}
    assert any("retouchée" in p for p in verifier(CONVERTIE, casse))
