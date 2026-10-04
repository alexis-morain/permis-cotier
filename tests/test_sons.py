"""Tests des signaux sonores du RIPAM : la table, ses dessins et son JSON.

`sons.py` dessine les seize frises de `public/visuels/sons/` et écrit
`src/lib/sons-motifs.json`, la table que le site joue au sifflet et à la
cloche. Les bornes sont écrites ici depuis le texte des règles 32, 34 et 35
et de l'annexe III du RIPAM, pas recopiées du script : c'est la table qui
doit tomber dedans.
"""
import json
import re
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import sons  # noqa: E402
from sons import (  # noqa: E402
    PAUSE,
    SIFFLET_HZ,
    SIGNAUX,
    duree,
    json_des_motifs,
    main,
    motifs,
    svg_de_signal,
)

RACINE = Path(__file__).resolve().parents[1]
DOSSIER = RACINE / "public" / "visuels" / "sons"
JSON = RACINE / "src" / "lib" / "sons-motifs.json"
QUESTIONS = RACINE / "data" / "questions"


# --- La table croise les dessins, dans les deux sens ---------------------------

def test_chaque_signal_a_son_dessin():
    for nom in SIGNAUX:
        assert (DOSSIER / f"{nom}.svg").is_file(), nom


def test_chaque_dessin_a_son_signal():
    for chemin in DOSSIER.glob("*.svg"):
        assert chemin.stem in SIGNAUX, f"{chemin.name} n'est dessiné par aucun signal"


def test_chaque_signal_a_son_motif_dans_le_json():
    table = motifs()
    assert set(table["signaux"]) == set(SIGNAUX)


def test_chaque_question_a_son_de_la_banque_a_son_motif():
    """Le bouton se déduit du chemin du visuel : aucune question ne reste muette."""
    fichiers = set()
    for yaml in QUESTIONS.rglob("*.yaml"):
        trouve = re.search(r"fichier: sons/([a-z-]+)\.svg", yaml.read_text(encoding="utf-8"))
        if trouve:
            fichiers.add(trouve.group(1))
    assert fichiers, "aucune question ne porte de signal sonore"
    assert fichiers <= set(motifs()["signaux"])


# --- Les durées tiennent dans la règle 32 -----------------------------------

def sons_de(nom):
    return [(d, s) for d, s, _ in SIGNAUX[nom]["motif"] if s is not None]


def test_un_bref_dure_environ_une_seconde():
    for nom in SIGNAUX:
        for d, s in sons_de(nom):
            if s == "b":
                assert 0.5 <= d <= 1.5, nom


def test_un_prolonge_dure_de_quatre_a_six_secondes():
    for nom in SIGNAUX:
        for d, s in sons_de(nom):
            if s == "p":
                assert 4.0 <= d <= 6.0, nom


def test_une_volee_dure_environ_cinq_secondes():
    for nom in SIGNAUX:
        for d, s in sons_de(nom):
            if s == "v":
                assert 4.0 <= d <= 6.0, nom


def test_un_coup_isole_est_plus_court_qu_un_bref():
    for nom in SIGNAUX:
        for d, s in sons_de(nom):
            if s == "c":
                assert 0 < d < 1.0, nom


def test_aucun_silence_ne_se_confond_avec_la_pause_de_repetition():
    for nom, signal in SIGNAUX.items():
        for d, s, _ in signal["motif"]:
            if s is None:
                assert 0 < d < PAUSE, nom


def test_le_motif_commence_et_finit_par_un_son():
    for nom, signal in SIGNAUX.items():
        assert signal["motif"][0][1] is not None, nom
        assert signal["motif"][-1][1] is not None, nom


def test_la_cloche_ne_joue_que_des_coups_et_le_sifflet_que_des_sons():
    for nom, signal in SIGNAUX.items():
        sortes = {s for _, s, _ in signal["motif"] if s is not None}
        if signal["instrument"] == "cloche":
            assert sortes <= {"v", "c"}, nom
        else:
            assert sortes <= {"b", "p"}, nom


# --- Deux navires, deux hauteurs -------------------------------------------

def test_chaque_son_dit_quel_navire_l_emet_et_un_silence_aucun():
    for nom, signal in SIGNAUX.items():
        for _, s, navire in signal["motif"]:
            if s is None:
                assert navire is None, nom
            else:
                assert navire in (1, 2), nom


def test_un_motif_commence_par_le_navire_1():
    for nom, signal in SIGNAUX.items():
        assert signal["motif"][0][2] == 1, nom


def test_les_deux_sifflets_tiennent_dans_l_annexe_iii():
    """Annexe III, § 1 b) : fondamentale de 250 à 700 Hz sous 75 mètres."""
    assert set(SIFFLET_HZ) == {1, 2}
    for hz in SIFFLET_HZ.values():
        assert 250 <= hz <= 700


def test_les_deux_sifflets_s_entendent_distincts():
    """De l'ordre d'une quinte : assez loin pour que l'oreille fasse deux navires."""
    rapport = max(SIFFLET_HZ.values()) / min(SIFFLET_HZ.values())
    assert 1.4 <= rapport <= 1.6


# --- Le JSON ----------------------------------------------------------------

def test_le_json_porte_instrument_suite_et_duree():
    table = motifs()
    for nom, entree in table["signaux"].items():
        assert entree["instrument"] == SIGNAUX[nom]["instrument"]
        assert entree["motif"] == [list(t) for t in SIGNAUX[nom]["motif"]]
        assert entree["duree"] == pytest.approx(duree(SIGNAUX[nom]["motif"]))


def test_la_duree_du_json_est_le_cycle_du_dessin_moins_sa_pause():
    """Le son dure exactement ce que la frise met à passer : ils ne se désaccordent pas."""
    table = motifs()["signaux"]
    for nom in SIGNAUX:
        cycle = re.search(r"-son ([\d.]+)s step-end", svg_de_signal(nom))
        assert cycle, nom
        assert float(cycle.group(1)) - PAUSE == pytest.approx(table[nom]["duree"], abs=1e-3), nom


def test_le_json_porte_les_hauteurs_et_la_cloche():
    table = motifs()
    assert table["sifflet"]["hz"] == {"1": SIFFLET_HZ[1], "2": SIFFLET_HZ[2]}
    assert 250 <= table["cloche"]["hz"] <= 700
    # La recette de sons_app.py, et pas une deuxième : rapport, amplitude, décroissance.
    rapports = [p[0] for p in table["cloche"]["partiels"]]
    assert rapports == [1.0, 2.0, 2.76, 5.4]
    assert 0 < table["cloche"]["pas_volee"] < 0.5


def test_le_pas_de_la_volee_est_celui_des_hachures():
    """Le son et le dessin d'une volée comptent les mêmes coups."""
    svg = svg_de_signal("brume-mouillage")
    hachures = [float(x) for x in re.findall(r'<rect x="([\d.]+)" y="\d+" width="1.7"', svg)]
    pas_dessine = (hachures[1] - hachures[0]) / sons.ECHELLE
    assert motifs()["cloche"]["pas_volee"] == pytest.approx(pas_dessine, abs=1e-3)


def test_le_json_est_deterministe():
    assert json_des_motifs() == json_des_motifs()
    assert json.loads(json_des_motifs()) == motifs()


def test_le_json_livre_est_a_jour():
    assert JSON.read_text(encoding="utf-8") == json_des_motifs()


# --- --verifier couvre le JSON ------------------------------------------------

def test_verifier_echoue_si_le_json_est_perime(tmp_path, monkeypatch, capsys):
    perime = tmp_path / "sons-motifs.json"
    perime.write_text("{}\n", encoding="utf-8")
    monkeypatch.setattr(sons, "SORTIE_MOTIFS", perime)
    monkeypatch.setattr(sons, "RACINE", tmp_path)
    assert main(["--verifier"]) == 1
    assert "sons-motifs.json" in capsys.readouterr().err


def test_verifier_passe_sur_le_depot():
    assert main(["--verifier"]) == 0
