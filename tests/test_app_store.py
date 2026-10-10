"""Tests de la décision de `app_store.py` : construire, soumettre, ou rien.

Aucun appel réseau : `decider` ne voit que des versions et des builds déjà lus.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from app_store import (  # noqa: E402
    Build,
    Version,
    cle_version,
    LIMITE_A_TESTER,
    commit_du_texte,
    decider,
    lire_a_tester,
    patch_suivant,
    texte_a_tester,
)

SHA = "0123456789abcdef0123456789abcdef01234567"
AUTRE = "fedcba9876543210fedcba9876543210fedcba98"


def test_patch_suivant_complete_a_trois_chiffres():
    assert patch_suivant("1.0") == "1.0.1"
    assert patch_suivant("1.0.1") == "1.0.2"
    assert patch_suivant("1.0.9") == "1.0.10"


def test_tri_numerique_des_versions():
    assert cle_version("1.0.10") > cle_version("1.0.9")
    assert cle_version("1.0") < cle_version("1.0.1")
    assert cle_version("1.0") == cle_version("1.0.0")


def test_commit_lu_dans_a_tester():
    assert commit_du_texte("main 0123456") == "0123456"
    assert commit_du_texte("Rien à voir") is None
    assert commit_du_texte(None) is None


def test_commit_lu_dans_la_reference_du_texte_redige():
    texte = "Essaie un examen blanc complet.\n\nRéférence\u00a0: 0123456"
    assert commit_du_texte(texte) == "0123456"


def test_a_tester_porte_le_texte_redige_puis_la_reference():
    texte = texte_a_tester(SHA, "Essaie un examen blanc complet.")
    assert texte.startswith("Essaie un examen blanc complet.")
    assert "main " not in texte
    assert texte.endswith("0123456")
    assert commit_du_texte(texte) == "0123456"


def test_a_tester_vide_ou_absent_arrete_le_pipeline(tmp_path):
    vide = tmp_path / "a-tester.txt"
    vide.write_text("  \n", encoding="utf-8")
    for chemin in (vide, tmp_path / "absent.txt"):
        try:
            lire_a_tester(chemin)
        except SystemExit as arret:
            assert "À tester" in str(arret)
        else:
            raise AssertionError(f"{chemin.name} aurait dû arrêter le pipeline")


def test_a_tester_trop_long_arrete_le_pipeline(tmp_path):
    long = tmp_path / "a-tester.txt"
    long.write_text("x" * LIMITE_A_TESTER, encoding="utf-8")
    try:
        lire_a_tester(long)
    except SystemExit as arret:
        assert "caractères" in str(arret)
    else:
        raise AssertionError("un texte au-delà de la limite aurait dû arrêter le pipeline")


def test_le_fichier_du_depot_est_lisible():
    assert lire_a_tester()


def test_la_version_la_plus_haute_est_celle_du_tri_numerique():
    versions = [
        Version("1.0.9", "READY_FOR_SALE"),
        Version("1.0.10", "PREPARE_FOR_SUBMISSION"),
    ]
    d = decider(versions, [Build(4, "1.0.9", None)], SHA)
    assert (d.action, d.version, d.soumission) == ("construire", "1.0.10", True)


def test_v1_en_revue_et_nouveau_commit_construit_1_0_1_sans_soumission():
    versions = [Version("1.0", "WAITING_FOR_REVIEW", build=1)]
    d = decider(versions, [Build(1, "1.0", None)], SHA)
    assert (d.action, d.version, d.build) == ("construire", "1.0.1", 2)
    assert d.soumission is False


def test_v1_en_vente_et_dernier_build_1_0_1_au_meme_commit_soumet():
    versions = [Version("1.0", "READY_FOR_SALE", build=1)]
    builds = [Build(1, "1.0", None), Build(2, "1.0.1", SHA[:7])]
    d = decider(versions, builds, SHA)
    assert (d.action, d.version, d.build) == ("soumettre", "1.0.1", 2)
    assert d.soumission is True


def test_v1_0_1_rejetee_par_apple_construit_1_0_1_sans_soumission():
    # Un refus d'Apple attend une réponse humaine dans Vérification de l'app ;
    # un build renvoyé seul passerait par-dessus.
    for etat in ("REJECTED", "METADATA_REJECTED"):
        versions = [
            Version("1.0", "READY_FOR_SALE", build=1),
            Version("1.0.1", etat, build=2),
        ]
        builds = [Build(1, "1.0", None), Build(2, "1.0.1", AUTRE[:7])]
        d = decider(versions, builds, SHA)
        assert (d.action, d.version, d.build) == ("construire", "1.0.1", 3)
        assert d.soumission is False


def test_v1_0_1_retiree_par_le_developpeur_et_nouveau_commit_soumet():
    versions = [
        Version("1.0", "READY_FOR_SALE", build=1),
        Version("1.0.1", "DEVELOPER_REJECTED", build=2),
    ]
    builds = [Build(1, "1.0", None), Build(2, "1.0.1", AUTRE[:7])]
    d = decider(versions, builds, SHA)
    assert (d.action, d.version, d.build) == ("construire", "1.0.1", 3)
    assert d.soumission is True


def test_premiere_version_rejetee_ne_soumet_pas():
    # Le cas du 4 octobre : la 1.0 en « Information Needed ».
    d = decider([Version("1.0", "REJECTED", build=1)], [Build(1, "1.0", None)], SHA)
    assert (d.action, d.version, d.build) == ("construire", "1.0", 2)
    assert d.soumission is False


def test_meme_commit_deja_soumis_ne_fait_rien():
    versions = [
        Version("1.0", "READY_FOR_SALE", build=1),
        Version("1.0.1", "IN_REVIEW", build=2),
    ]
    builds = [Build(1, "1.0", None), Build(2, "1.0.1", SHA[:7])]
    d = decider(versions, builds, SHA)
    assert d.action == "rien"


def test_meme_commit_deja_en_vente_ne_reconstruit_pas():
    versions = [
        Version("1.0", "REPLACED_WITH_NEW_VERSION", build=1),
        Version("1.0.1", "READY_FOR_DISTRIBUTION", build=2),
    ]
    builds = [Build(1, "1.0", None), Build(2, "1.0.1", SHA[:7])]
    assert decider(versions, builds, SHA).action == "rien"


def test_meme_commit_rejete_ne_se_resoumet_pas_seul():
    # Le passage quotidien renverrait chaque matin le binaire refusé.
    versions = [
        Version("1.0", "READY_FOR_SALE", build=1),
        Version("1.0.1", "REJECTED", build=2),
    ]
    builds = [Build(1, "1.0", None), Build(2, "1.0.1", SHA[:7])]
    assert decider(versions, builds, SHA).action == "rien"


def test_meme_commit_rattache_a_une_version_en_preparation_se_soumet():
    # Soumission interrompue après le rattachement : on la reprend.
    versions = [
        Version("1.0", "READY_FOR_SALE", build=1),
        Version("1.0.1", "PREPARE_FOR_SUBMISSION", build=2),
    ]
    builds = [Build(1, "1.0", None), Build(2, "1.0.1", SHA[:7])]
    d = decider(versions, builds, SHA)
    assert (d.action, d.version, d.build) == ("soumettre", "1.0.1", 2)


def test_meme_commit_pendant_une_revue_ne_fait_rien():
    versions = [Version("1.0", "IN_REVIEW", build=1)]
    builds = [Build(1, "1.0", None), Build(2, "1.0.1", SHA[:7])]
    d = decider(versions, builds, SHA)
    assert (d.action, d.soumission) == ("rien", False)


def test_numero_de_build_est_le_plus_haut_connu_plus_un():
    versions = [Version("1.0", "READY_FOR_SALE", build=1)]
    builds = [Build(7, "1.0", None), Build(12, "1.0.1", AUTRE[:7]), Build(9, "1.0.1", None)]
    d = decider(versions, builds, SHA)
    assert (d.action, d.version, d.build) == ("construire", "1.0.1", 13)


def test_sans_aucun_build_on_commence_a_un():
    d = decider([Version("1.0", "PREPARE_FOR_SUBMISSION")], [], SHA)
    assert (d.action, d.version, d.build) == ("construire", "1.0", 1)


def test_un_etat_inconnu_ne_soumet_pas():
    d = decider([Version("1.0", "ETAT_INVENTE", build=1)], [Build(1, "1.0", None)], SHA)
    assert (d.action, d.version, d.soumission) == ("construire", "1.0.1", False)


def test_une_ancienne_version_en_revue_interdit_la_soumission():
    versions = [
        Version("1.0", "WAITING_FOR_REVIEW", build=1),
        Version("1.0.1", "PREPARE_FOR_SUBMISSION"),
    ]
    d = decider(versions, [Build(1, "1.0", None)], SHA)
    assert (d.action, d.version, d.soumission) == ("construire", "1.0.1", False)


def test_dernier_build_au_meme_commit_mais_autre_version_reconstruit():
    # La 1.0 est sortie, la 1.0.1 en revue porte un autre commit : le build
    # de ce commit, s'il est en 1.0.1, ne peut plus servir à la 1.0.2.
    versions = [
        Version("1.0", "READY_FOR_SALE", build=1),
        Version("1.0.1", "WAITING_FOR_REVIEW", build=2),
    ]
    builds = [Build(1, "1.0", None), Build(2, "1.0.1", AUTRE[:7]), Build(3, "1.0.1", SHA[:7])]
    d = decider(versions, builds, SHA)
    assert (d.action, d.version, d.build, d.soumission) == ("construire", "1.0.2", 4, False)


def test_lecture_des_builds_et_versions_depuis_le_json_api(monkeypatch):
    import app_store

    pages = {
        "/v1/builds": {
            "data": [
                {"type": "builds", "id": "b2", "attributes": {"version": "2"},
                 "relationships": {
                     "preReleaseVersion": {"data": {"type": "preReleaseVersions", "id": "p1"}},
                     "betaBuildLocalizations": {"data": [{"type": "betaBuildLocalizations", "id": "l1"}]}}},
                {"type": "builds", "id": "b1", "attributes": {"version": "1"},
                 "relationships": {"preReleaseVersion": {"data": {"type": "preReleaseVersions", "id": "p0"}}}},
            ],
            "included": [
                {"type": "preReleaseVersions", "id": "p1", "attributes": {"version": "1.0.1"}},
                {"type": "preReleaseVersions", "id": "p0", "attributes": {"version": "1.0"}},
                {"type": "betaBuildLocalizations", "id": "l1",
                 "attributes": {"locale": "fr-FR", "whatsNew": "main 0123456"}},
            ],
            "links": {},
        },
        f"/v1/apps/{app_store.APP_ID}/appStoreVersions": {
            "data": [{"type": "appStoreVersions", "id": "v1",
                      "attributes": {"versionString": "1.0", "appVersionState": "WAITING_FOR_REVIEW",
                                     "appStoreState": "WAITING_FOR_REVIEW"},
                      "relationships": {"build": {"data": {"type": "builds", "id": "b1"}}}}],
            "included": [{"type": "builds", "id": "b1", "attributes": {"version": "1"}}],
        },
    }
    monkeypatch.setattr(app_store, "appeler", lambda methode, url: pages[url.split("?")[0]])

    assert app_store.lire_builds() == [Build(2, "1.0.1", "0123456"), Build(1, "1.0", None)]
    versions, brutes = app_store.lire_versions()
    assert versions == [Version("1.0", "WAITING_FOR_REVIEW", build=1)]
    assert brutes["1.0"]["id"] == "v1"
