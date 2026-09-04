"""Tests de l'extraction des sources réglementaires.

Rien ici ne touche au réseau : on donne à la main l'arbre que rend
`/consult/lawDecree`, et on vérifie ce qu'on en tire.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from sources import (  # noqa: E402
    annexes_du_ripam,
    anomalies_de_lettrage,
    articles_utiles,
    etendre_numeros,
    invite_article,
    invite_recherche,
    nom_article,
    sans_balises,
    section_par_titre,
)


def article(num, etat="VIGUEUR", identifiant=None, contenu="texte"):
    return {
        "num": num,
        "etat": etat,
        "id": identifiant or f"LEGIARTI-{num}-{etat}",
        "content": contenu,
    }


ARBRE = {
    "title": "Arrêté du 23 novembre 1987",
    "sections": [
        {
            "title": "Livre II : Dispositions techniques",
            "sections": [
                {
                    "title": "Division 240 : Règles de sécurité applicables à la plaisance",
                    "articles": [article("Annexe 240-A.1")],
                    "sections": [
                        {
                            "title": "Chapitre 1er : Dispositions générales.",
                            "articles": [
                                article("240-1.01"),
                                article("240-1.04"),
                                article("240-1.04", etat="ABROGE"),
                                article("240-1.06", etat="ABROGE"),
                            ],
                        },
                        {
                            "title": "Quatrième section : Electricité.",
                            "articles": [article("240-2.16", identifiant="LEGIARTI-partage")],
                        },
                        {
                            "title": "Section 4 : Caractéristiques des matériels",
                            # Légifrance garde l'ancienne coquille de section :
                            # le même article y reparaît, avec le même identifiant.
                            "articles": [article("240-2.16", identifiant="LEGIARTI-partage")],
                        },
                    ],
                },
                {
                    "title": "Division 245 : Autre chose",
                    "articles": [article("245-1.01")],
                },
            ],
        }
    ],
}


# ── section_par_titre ────────────────────────────────────────────────────────

def test_section_par_titre_descend_dans_l_arbre():
    section = section_par_titre(ARBRE, "division 240")
    assert section is not None
    assert section["title"].startswith("Division 240")


def test_section_par_titre_ignore_la_casse_et_les_accents():
    assert section_par_titre(ARBRE, "DIVISION 240") is not None
    assert section_par_titre(ARBRE, "electricite") is not None


def test_section_par_titre_rend_none_si_rien_ne_correspond():
    assert section_par_titre(ARBRE, "division 999") is None


def test_section_par_titre_ne_confond_pas_deux_divisions_voisines():
    section = section_par_titre(ARBRE, "division 245")
    assert [a["num"] for a in articles_utiles(section)] == ["245-1.01"]


# ── articles_utiles ──────────────────────────────────────────────────────────

def test_articles_utiles_ecarte_les_articles_abroges():
    nums = [a["num"] for a in articles_utiles(section_par_titre(ARBRE, "division 240"))]
    assert "240-1.06" not in nums
    assert nums.count("240-1.04") == 1


def test_articles_utiles_dedoublonne_par_identifiant():
    # 240-2.16 vit sous deux coquilles de section, c'est le même article.
    nums = [a["num"] for a in articles_utiles(section_par_titre(ARBRE, "division 240"))]
    assert nums.count("240-2.16") == 1


def test_articles_utiles_garde_un_etat_absent():
    # Un texte non consolidé ne porte pas toujours d'état : on ne jette
    # que ce qui est explicitement sorti de vigueur.
    arbre = {"articles": [article("1", etat=None), {"num": "2", "content": "x", "id": "LEGIARTI-2"}]}
    assert [a["num"] for a in articles_utiles(arbre)] == ["1", "2"]


def test_articles_utiles_ecarte_les_articles_sans_contenu():
    arbre = {"articles": [article("1", contenu=""), article("2")]}
    assert [a["num"] for a in articles_utiles(arbre)] == ["2"]


@pytest.mark.parametrize("etat", ["ABROGE", "ABROGE_DIFF", "PERIME", "ANNULE"])
def test_articles_utiles_ecarte_tous_les_etats_hors_vigueur(etat):
    arbre = {"articles": [article("1", etat=etat)]}
    assert articles_utiles(arbre) == []


def test_articles_utiles_peut_tout_rendre_sur_demande():
    arbre = {"articles": [article("1", etat="ABROGE"), article("2")]}
    assert [a["num"] for a in articles_utiles(arbre, en_vigueur_seulement=False)] == ["1", "2"]


# ── nom_article ──────────────────────────────────────────────────────────────

@pytest.mark.parametrize(
    "numero, attendu",
    [
        ("240-1.01", "article-240-1-01"),
        ("Annexe 240-A.1", "article-annexe-240-a-1"),
        ("240-A.4 ", "article-240-a-4"),
        ("1er", "article-1er"),
    ],
)
def test_nom_article(numero, attendu):
    assert nom_article(numero) == attendu


def test_nom_article_sans_numero_retombe_sur_l_identifiant():
    assert nom_article("", "LEGIARTI000038474364") == "LEGIARTI000038474364"


# ── invite_recherche ─────────────────────────────────────────────────────────

def test_invite_recherche_cible_le_titre_du_fonds_loda():
    charge = invite_recherche("division 240", nombre=5)
    assert charge["fond"] == "LODA_DATE"
    assert charge["recherche"]["pageSize"] == 5
    champ = charge["recherche"]["champs"][0]
    assert champ["typeChamp"] == "TITLE"
    assert champ["criteres"][0]["valeur"] == "division 240"


# ── tableaux ─────────────────────────────────────────────────────────────────

TABLEAU = (
    '<table border="1"><tbody>'
    "<tr><th></th><th>Jusqu'à 300 m<br/><p> <br/>d'un abri</th>"
    "<th>De 300 m à moins<br/>de 2 MN</th><th>De 2 MN à moins de 6 MN</th></tr>"
    '<tr><td align="center">Navires</td>'
    '<td colspan="2" align="center">Basique Art. 240-2.03</td>'
    '<td align="center">Côtier<br/>Art. 240-2.04</td></tr>'
    "</tbody></table>"
)


def test_un_tableau_devient_un_tableau_markdown():
    lignes = [l for l in sans_balises(TABLEAU).splitlines() if l.strip()]
    assert lignes[0] == "|  | Jusqu'à 300 m d'un abri | De 300 m à moins de 2 MN | De 2 MN à moins de 6 MN |"
    assert lignes[1] == "| --- | --- | --- | --- |"


def test_un_colspan_est_reporte_sur_chaque_colonne():
    # « Basique » couvre les deux premières zones : sans ce report, la ligne
    # est décalée et « Côtier » se retrouve en face de la mauvaise distance.
    lignes = [l for l in sans_balises(TABLEAU).splitlines() if l.strip()]
    assert lignes[2] == (
        "| Navires | Basique Art. 240-2.03 | Basique Art. 240-2.03 | Côtier Art. 240-2.04 |"
    )


def test_le_texte_autour_du_tableau_est_conserve():
    texte = sans_balises(f"<p>Avant.</p>{TABLEAU}<p>Après.</p>")
    assert texte.startswith("Avant.")
    assert texte.rstrip().endswith("Après.")


def test_une_cellule_tient_sur_une_ligne():
    texte = sans_balises("<table><tr><td>deux<br/>morceaux</td></tr></table>")
    assert "| deux morceaux |" in texte


def test_un_texte_sans_tableau_traverse_inchange():
    assert sans_balises("<p>Le chef de bord s'assure.</p>") == "Le chef de bord s'assure."


# ── lettrage des paragraphes ─────────────────────────────────────────────────

def test_un_lettrage_qui_se_suit_ne_signale_rien():
    texte = "a) Le navire fait route.\n\nb) Tous les navires peuvent.\n\nc) Un navire s'approche."
    assert anomalies_de_lettrage(texte) == []


def test_un_retour_en_arriere_est_signale():
    # Le PDF du ministère imprime « c) » là où le RIPAM porte « e) », entre
    # d) et f). Une question qui citerait ce paragraphe renverrait le candidat
    # au mauvais alinéa.
    texte = "d) Lorsque deux navires.\n\nc) Un navire s'approchant d'un coude.\n\nf) Lorsque des sifflets."
    assert anomalies_de_lettrage(texte) == [("d", "c")]


def test_un_renvoi_en_milieu_de_phrase_n_est_pas_un_paragraphe():
    # « prescrits au paragraphe a) de la présente règle » retombe en début de
    # ligne quand le PDF coupe : ce n'est pas un début de paragraphe.
    texte = "b) Tous les navires peuvent compléter les signaux\na) de la présente règle par des signaux."
    assert anomalies_de_lettrage(texte) == []


# --- Extraction d'articles de code -----------------------------------------


@pytest.mark.parametrize(
    "demande, attendu",
    [
        ("A4241-53-26", ["A4241-53-26"]),
        ("L218-10, L218-73", ["L218-10", "L218-73"]),
        ("A4241-53-26..28", ["A4241-53-26", "A4241-53-27", "A4241-53-28"]),
        ("A4241-53-26..A4241-53-28", ["A4241-53-26", "A4241-53-27", "A4241-53-28"]),
        ("R921-88..88", ["R921-88"]),
        ("L218-10..11, R921-90", ["L218-10", "L218-11", "R921-90"]),
    ],
)
def test_etendre_numeros(demande, attendu):
    assert etendre_numeros(demande) == attendu


def test_etendre_numeros_garde_le_zero_de_tete():
    # « 240-2.04 » et « 240-2.4 » ne désignent pas le même article : perdre le
    # zéro fait chercher un numéro qui n'existe pas, et la source manque en
    # silence dans le dossier.
    assert etendre_numeros("240-2.04..06") == ["240-2.04", "240-2.05", "240-2.06"]
    assert etendre_numeros("R921-08..10") == ["R921-08", "R921-09", "R921-10"]


def test_etendre_numeros_passe_a_deux_chiffres_sans_tronquer():
    # Le zéro de tête donne la largeur, il ne la plafonne pas.
    assert etendre_numeros("A1-08..11") == ["A1-08", "A1-09", "A1-10", "A1-11"]


def test_etendre_numeros_refuse_deux_bornes_de_prefixes_differents():
    # Sans ce contrôle, la borne haute est ignorée et l'intervalle part du
    # préfixe de gauche : on récupère sept articles d'un texte qu'on n'a pas
    # demandé, sans le moindre avertissement.
    with pytest.raises(SystemExit):
        etendre_numeros("A4241-53-26..B1-32")


def test_etendre_numeros_refuse_un_intervalle_a_l_envers():
    with pytest.raises(SystemExit):
        etendre_numeros("L218-20..10")


def test_etendre_numeros_refuse_une_borne_sans_nombre():
    with pytest.raises(SystemExit):
        etendre_numeros("L218-10..annexe")


def test_etendre_numeros_ignore_les_morceaux_vides():
    assert etendre_numeros("L218-10, ,L218-11") == ["L218-10", "L218-11"]


def test_invite_article_filtre_sur_le_nom_du_code():
    # Le fond CODE_DATE cherche dans tous les codes : sans la facette, un
    # numéro d'article ramènerait ses homonymes des autres codes.
    charge = invite_article("A4241-53-26", "Code des transports")
    assert charge["fond"] == "CODE_DATE"
    champ = charge["recherche"]["champs"][0]
    assert champ["typeChamp"] == "NUM_ARTICLE"
    assert champ["criteres"][0]["valeur"] == "A4241-53-26"
    assert charge["recherche"]["filtres"] == [
        {"facette": "NOM_CODE", "valeurs": ["Code des transports"]}
    ]


# --- Découpe des annexes du RIPAM ------------------------------------------


PDF_FACTICE = """
Sommaire
  Règle 38 - Exemptions ...................................... 36
  ANNEXE I ................................................... 37
  ANNEXE IV .................................................. 40

Règle 37 - Signaux de détresse
Un navire en détresse utilise les signaux de l'annexe IV.

Règle 38 - Exemptions
Corps de la règle 38.

ANNEXE I - EMPLACEMENT DES FEUX
Corps de l'annexe I.

ANNEXE I - EMPLACEMENT DES FEUX
Suite de l'annexe I, l'onglet latéral se répète à chaque page.

  Annexe IV

Signaux de détresse
Corps de l'annexe IV.
"""


def test_les_annexes_se_decoupent_par_numero():
    assert set(annexes_du_ripam(PDF_FACTICE)) == {"I", "IV"}


def test_le_sommaire_n_est_pas_pris_pour_le_corps():
    # Le sommaire cite les mêmes numéros en tête de document : découper dessus
    # ferait passer la table des matières pour le texte de l'annexe.
    assert "37" not in annexes_du_ripam(PDF_FACTICE)["I"]
    assert "Corps de l'annexe I." in annexes_du_ripam(PDF_FACTICE)["I"]


def test_une_annexe_en_bas_de_casse_est_reconnue():
    # Le PDF du ministère écrit « Annexe IV » quand les trois autres onglets
    # sont en capitales.
    assert "Corps de l'annexe IV." in annexes_du_ripam(PDF_FACTICE)["IV"]


def test_une_annexe_s_arrete_a_la_suivante():
    assert "annexe IV" not in annexes_du_ripam(PDF_FACTICE)["I"]


def test_un_texte_sans_annexe_ne_rend_rien():
    assert annexes_du_ripam("Règle 38 - Exemptions\nCorps.") == {}
