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


def test_convertir_et_reformuler_dans_le_meme_geste_est_refuse():
    # On retire deux propositions et on réécrit celle qui reste : la réponse
    # ne peut plus être suivie par son texte, le garde-fou ne voit plus rien.
    casse = apres(
        propositions=[AVANT["propositions"][0], {"id": "b", "texte": "Oui, bien sûr"}],
        meta={"relu_par": "claude"},
    )
    del casse["meta"]["relu_le"]
    assert any("texte" in p for p in verifier(AVANT, casse))


# Le quatrième geste : rééquilibrer les longueurs. `longueur.py` signale les
# bonnes réponses qui se reconnaissent à leur taille ; on raccourcit la bonne
# ou on allonge les distracteurs, à lettres, nombre et réponse constants.
REEQUILIBREE = apres(
    propositions=[
        {"id": "a", "texte": "Non, elle relève de l'extension hauturière"},
        {"id": "b", "texte": "Oui"},
        {"id": "c", "texte": "Non, aucun texte ne s'en occupe"},
        {"id": "d", "texte": "Oui, au-dessus de 6 mètres"},
    ],
    meta={"relu_par": "claude", "relu_le": "2026-10-02"},
)


def test_un_reequilibrage_propre_ne_pose_aucun_probleme():
    assert verifier(AVANT, REEQUILIBREE) == []


def test_un_reequilibrage_qui_garde_la_relecture_humaine_est_signale():
    casse = {**REEQUILIBREE, "meta": {**REEQUILIBREE["meta"], "relu_par": "alexis"}}
    assert any("relu_par" in p for p in verifier(AVANT, casse))


def test_un_reequilibrage_ne_change_pas_la_lettre_de_la_reponse():
    casse = {**REEQUILIBREE, "reponses": ["a"]}
    assert any("lettre" in p for p in verifier(AVANT, casse))


def test_un_reequilibrage_qui_echange_la_bonne_et_un_distracteur_est_refuse():
    # Les textes de a et b permutent sous couvert d'une réécriture de c, la
    # réponse reste « b » : elle désigne maintenant l'ancien distracteur. Un
    # rééquilibrage n'a pas ce droit.
    casse = apres(
        propositions=[
            {"id": "a", "texte": "Oui, le programme le demande"},
            {"id": "b", "texte": "Non, elle relève de l'extension hauturière"},
            {"id": "c", "texte": "Non, aucun texte n'en parle"},
            AVANT["propositions"][3],
        ],
        meta={"relu_par": "claude"},
    )
    assert any("distracteur" in p for p in verifier(AVANT, casse))
    # Sans réécriture, la permutation seule tombe sous le contrôle général.
    permutee = apres(
        propositions=[
            {"id": "a", "texte": "Oui, le programme le demande"},
            {"id": "b", "texte": "Non, elle relève de l'extension hauturière"},
            AVANT["propositions"][2],
            AVANT["propositions"][3],
        ],
        meta={"relu_par": "claude"},
    )
    assert any("bonne réponse" in p for p in verifier(AVANT, permutee))


def test_reequilibrer_et_resourcer_dans_le_meme_geste_est_refuse():
    casse = {**REEQUILIBREE, "sources": [{"texte": "Arrêté du 30 novembre 2017, annexe I, 3.3.2",
                                           "ref": "arrete-2017-11-30"}]}
    assert any("deux gestes" in p for p in verifier(AVANT, casse))


def test_un_reequilibrage_ne_touche_pas_l_explication():
    casse = {**REEQUILIBREE, "explication": "Autre explication."}
    assert any("explication" in p for p in verifier(AVANT, casse))


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


RESOURCEE = apres(
    sources=[{"texte": "Arrêté du 30 novembre 2017, annexe I, 2.3.1", "ref": "arrete-2017-11-30"}],
    meta={"relu_par": "claude", "relu_le": None},
)
del RESOURCEE["meta"]["relu_le"]


def test_un_resourcement_propre_ne_pose_aucun_probleme():
    # Rendre à une question sa source officielle ne retire aucune proposition :
    # ce n'est pas une conversion, mais la citation affichée change, donc la
    # relecture humaine qui portait sur l'ancienne ne vaut plus.
    avant = {**AVANT, "sources": [{"texte": "Balisage AISM", "ref": "aism-mbs"}]}
    assert verifier(avant, {**RESOURCEE, "propositions": AVANT["propositions"]}) == []


def test_un_resourcement_qui_garde_la_relecture_humaine_est_signale():
    avant = {**AVANT, "sources": [{"texte": "Balisage AISM", "ref": "aism-mbs"}]}
    casse = {**avant, "sources": RESOURCEE["sources"]}
    assert any("citation" in p for p in verifier(avant, casse))


def test_convertir_et_resourcer_dans_le_meme_geste_est_refuse():
    # Deux gestes en un : on retire un distracteur et on change la citation.
    # Chacun demande sa propre vérification — la réponse désigne-t-elle encore
    # le bon texte, l'article dit-il bien ce que la question affirme — et un
    # diff qui les mélange ne laisse voir ni l'une ni l'autre. Deux commits.
    casse = {**CONVERTIE, "sources": [{"texte": "Arrêté du 30 novembre 2017, annexe I, 3.3.2",
                                       "ref": "arrete-2017-11-30"}]}
    assert any("deux gestes" in p for p in verifier(AVANT, casse))


# Le cinquième geste : illustrer. Une question publiée qui décrivait une image
# en mots reçoit un visuel, et son énoncé est réécrit pour désigner l'image.
# Propositions, réponse, explication et sources ne bougent pas ; la relecture
# humaine portait sur un énoncé que le candidat ne verra plus, elle retombe
# sur Claude.
VISUEL = {"fichier": "navires/peche-nuit.svg",
          "alt": "Navire vu de face, deux feux superposés sur le mât, rouge au-dessus, blanc en dessous.",
          "credit": "code"}
ILLUSTREE = apres(
    enonce="De nuit, ce navire te montre ces feux. Que fait-il ?",
    visuel=VISUEL,
    meta={"relu_par": "claude", "relu_le": "2026-10-03"},
)


def test_une_illustration_propre_ne_pose_aucun_probleme():
    assert verifier(AVANT, ILLUSTREE) == []


def test_une_illustration_peut_remplacer_un_visuel():
    avant = {**AVANT, "visuel": {"fichier": "feux/peche-hors-chalut.svg", "alt": "Deux feux superposés.", "credit": "code"}}
    assert verifier(avant, ILLUSTREE) == []


def test_une_illustration_peut_poser_une_famille():
    # Deux questions qui reçoivent la même image se renseignent : la famille
    # se pose dans le même geste, elle ne dit rien du fond de la question.
    assert verifier(AVANT, {**ILLUSTREE, "famille": "feux-remorque-200"}) == []


def test_une_illustration_qui_garde_la_relecture_humaine_est_signalee():
    casse = {**ILLUSTREE, "meta": {**ILLUSTREE["meta"], "relu_par": "alexis"}}
    assert any("relu_par" in p for p in verifier(AVANT, casse))


def test_retirer_un_visuel_n_est_pas_une_illustration():
    avant = {**AVANT, "visuel": VISUEL}
    casse = apres(meta={"relu_par": "claude"})
    assert any("visuel" in p for p in verifier(avant, casse))


def test_une_illustration_ne_touche_ni_propositions_ni_reponse():
    casse = {**ILLUSTREE, "propositions": [
        {"id": "a", "texte": "Non, elle relève de l'extension hauturière"},
        {"id": "b", "texte": "Oui"},
        {"id": "c", "texte": "Non, aucun texte ne s'en occupe"},
        {"id": "d", "texte": "Oui, au-dessus de 6 mètres"},
    ]}
    assert any("deux gestes" in p for p in verifier(AVANT, casse))
    casse = {**ILLUSTREE, "reponses": ["a"]}
    assert any("bonne réponse" in p for p in verifier(AVANT, casse))


def test_une_illustration_ne_touche_pas_l_explication():
    casse = {**ILLUSTREE, "explication": "Autre explication."}
    assert any("explication" in p for p in verifier(AVANT, casse))


def test_illustrer_et_convertir_dans_le_meme_geste_est_refuse():
    casse = {**ILLUSTREE, "propositions": AVANT["propositions"][:2]}
    assert any("deux gestes" in p for p in verifier(AVANT, casse))


def test_illustrer_et_resourcer_dans_le_meme_geste_est_refuse():
    casse = {**ILLUSTREE, "sources": [{"texte": "RIPAM, règle 26 c) i)", "ref": "decret-77-733"}]}
    assert any("deux gestes" in p for p in verifier(AVANT, casse))


def test_un_enonce_reecrit_sans_visuel_reste_refuse():
    casse = apres(enonce="De nuit, ce navire te montre ces feux. Que fait-il ?", meta={"relu_par": "claude"})
    assert any("enonce" in p for p in verifier(AVANT, casse))
