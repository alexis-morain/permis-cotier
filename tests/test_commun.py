"""Tests de la mécanique commune aux sept scripts de dessin SVG.

Ce que sept scripts partageaient au mot près mérite d'être testé une seule
fois : écrire, puis détecter un fichier périmé et rendre un code non nul.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from _commun import main_dessin  # noqa: E402


def test_ecrit_les_elements(tmp_path):
    sortie = tmp_path / "visuels"
    code = main_dessin(
        [],
        racine=tmp_path,
        sortie=sortie,
        elements={"a": "<svg>a</svg>\n", "b": "<svg>b</svg>\n"},
        commande_npm="exemple",
        label="visuel(s)",
    )
    assert code == 0
    assert (sortie / "a.svg").read_text(encoding="utf-8") == "<svg>a</svg>\n"
    assert (sortie / "b.svg").read_text(encoding="utf-8") == "<svg>b</svg>\n"


def test_verifier_reussit_quand_tout_est_a_jour(tmp_path):
    sortie = tmp_path / "visuels"
    elements = {"a": "<svg>a</svg>\n"}
    main_dessin([], racine=tmp_path, sortie=sortie, elements=elements, commande_npm="exemple", label="visuel(s)")

    code = main_dessin(
        ["--verifier"],
        racine=tmp_path,
        sortie=sortie,
        elements=elements,
        commande_npm="exemple",
        label="visuel(s)",
    )
    assert code == 0


def test_verifier_echoue_sur_un_fichier_perime(tmp_path, capsys):
    sortie = tmp_path / "visuels"
    main_dessin(
        [],
        racine=tmp_path,
        sortie=sortie,
        elements={"a": "<svg>a</svg>\n"},
        commande_npm="exemple",
        label="visuel(s)",
    )

    code = main_dessin(
        ["--verifier"],
        racine=tmp_path,
        sortie=sortie,
        elements={"a": "<svg>a-modifie</svg>\n"},
        commande_npm="exemple",
        label="visuel(s)",
    )
    assert code == 1
    erreur = capsys.readouterr().err
    assert "npm run exemple" in erreur
    assert "a.svg" in erreur


def test_verifier_echoue_si_le_fichier_n_existe_pas(tmp_path):
    sortie = tmp_path / "visuels"
    sortie.mkdir(parents=True)
    code = main_dessin(
        ["--verifier"],
        racine=tmp_path,
        sortie=sortie,
        elements={"a": "<svg>a</svg>\n"},
        commande_npm="exemple",
        label="visuel(s)",
    )
    assert code == 1


def test_suffixe_apparait_dans_le_message_d_ecriture(tmp_path, capsys):
    sortie = tmp_path / "visuels"
    main_dessin(
        [],
        racine=tmp_path,
        sortie=sortie,
        elements={"a": "<svg>a</svg>\n"},
        commande_npm="exemple",
        label="visuel(s)",
        suffixes={"a": " (règle X)"},
    )
    sortie_texte = capsys.readouterr().out
    assert "(règle X)" in sortie_texte
