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
    commit_effectif,
    decider,
    hors_app,
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
                {"type": "preReleaseVersions", "id": "p1", "attributes": {"version": "1.0.1", "platform": "IOS"}},
                {"type": "preReleaseVersions", "id": "p0", "attributes": {"version": "1.0", "platform": "IOS"}},
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


# --- La documentation seule ne fait pas de build -----------------------------
#
# Sous `workflow_run`, l'app part après chaque CI verte de `main`, et la CI
# tourne aussi pour un commit qui ne touche que la documentation. Le filtre de
# chemins de `push` ne s'applique plus : c'est la décision qui le reprend.


def test_documentation_et_plans_sont_hors_app():
    for chemin in ["docs/app-ios.md", "docs/captures-app-0/x.png", "plans/a.md", "README.md", "src/lib/LISEZMOI.md"]:
        assert hors_app(chemin), chemin


def test_le_reste_est_dans_l_app():
    for chemin in ["ios/a-tester.txt", "src/lib/natif.ts", "data/VERSION", "docs.ts", "scripts/check.sh"]:
        assert not hors_app(chemin), chemin


def test_commit_de_documentation_seule_reprend_le_commit_du_dernier_build():
    assert commit_effectif(SHA, AUTRE[:7], ["docs/journal.md", "README.md"]) == AUTRE[:7]


def test_un_fichier_de_l_app_garde_le_nouveau_commit():
    assert commit_effectif(SHA, AUTRE[:7], ["README.md", "src/lib/natif.ts"]) == SHA


def test_sans_comparaison_possible_on_garde_le_nouveau_commit():
    # Pas de build connu, ou `git diff` impossible : on construit, comme avant.
    assert commit_effectif(SHA, None, None) == SHA
    assert commit_effectif(SHA, AUTRE[:7], None) == SHA


def test_documentation_seule_pendant_une_revue_ne_fait_rien():
    versions = [Version("1.0", "WAITING_FOR_REVIEW", build=3)]
    builds = [Build(3, "1.0", AUTRE[:7])]
    effectif = commit_effectif(SHA, AUTRE[:7], ["docs/journal.md"])
    assert decider(versions, builds, effectif).action == "rien"


def test_documentation_seule_apres_une_sortie_soumet_le_build_en_attente():
    # La 1.0 est sortie ; le build 4 attend en 1.0.1 sur TestFlight. Un commit
    # de documentation ne doit ni reconstruire ni oublier de soumettre le 4.
    versions = [Version("1.0", "READY_FOR_SALE", build=3)]
    builds = [Build(3, "1.0", None), Build(4, "1.0.1", AUTRE[:7])]
    effectif = commit_effectif(SHA, AUTRE[:7], ["plans/x.md"])
    d = decider(versions, builds, effectif)
    assert (d.action, d.version, d.build, d.soumission) == ("soumettre", "1.0.1", 4, True)


# --- La fiche dit le vrai nombre de questions (2.3) ---------------------------


def test_la_banque_du_depot_se_compte_sans_yaml_comme_le_validateur():
    import yaml
    from app_store import compte_banque

    racine = Path(__file__).resolve().parents[1]
    attendu = 0
    for f in (racine / "data" / "questions").glob("*/*.yaml"):
        if f.parent.name.startswith("_"):
            continue
        q = yaml.safe_load(f.read_text(encoding="utf-8"))
        attendu += isinstance(q, dict) and q.get("statut") == "publie"
    assert compte_banque() == attendu > 0


def test_compte_banque_ignore_brouillons_et_inbox(tmp_path):
    from app_store import compte_banque

    (tmp_path / "data" / "questions" / "vhf").mkdir(parents=True)
    (tmp_path / "data" / "questions" / "_inbox").mkdir()
    (tmp_path / "data" / "questions" / "vhf" / "a.yaml").write_text("id: a\nstatut: publie\n", encoding="utf-8")
    (tmp_path / "data" / "questions" / "vhf" / "b.yaml").write_text("id: b\nstatut: brouillon\n", encoding="utf-8")
    (tmp_path / "data" / "questions" / "_inbox" / "c.yaml").write_text("statut: publie\n", encoding="utf-8")
    assert compte_banque(tmp_path) == 1


def test_un_nombre_exact_et_juste_passe():
    from app_store import ecarts_de_compte

    assert ecarts_de_compte("Les 658 questions de la banque.", 658) == []
    assert ecarts_de_compte("All 658 questions ship in the bundle.", 658) == []


def test_un_nombre_exact_et_faux_est_refuse():
    from app_store import ecarts_de_compte

    assert ecarts_de_compte("all 622 questions, 105 lessons", 658) == ["622 questions"]


def test_plus_de_n_passe_tant_que_n_est_dans_la_centaine_sous_le_compte():
    from app_store import ecarts_de_compte

    assert ecarts_de_compte("Plus de 600 questions.", 658) == []
    assert ecarts_de_compte("more than 650 questions", 658) == []
    assert ecarts_de_compte("Plus de 600 questions.", 699) == []
    assert ecarts_de_compte("Plus de 600 questions.", 700) == ["Plus de 600 questions"]
    assert ecarts_de_compte("plus de 700 questions", 658) == ["plus de 700 questions"]


def test_le_format_de_l_examen_n_est_pas_un_compte_de_banque():
    from app_store import ecarts_de_compte

    assert ecarts_de_compte("Quarante questions, 40 questions tirées au sort.", 658) == []


def test_espaces_insecables_et_milliers():
    from app_store import ecarts_de_compte

    assert ecarts_de_compte("plus de 600 questions", 658) == []
    assert ecarts_de_compte("1 200 questions", 658) == ["1 200 questions"]


def test_verifier_fiche_nomme_le_fichier_et_dit_la_regle(tmp_path):
    from app_store import verifier_fiche

    juste = tmp_path / "description.txt"
    juste.write_text("Plus de 600 questions.", encoding="utf-8")
    faux = tmp_path / "notes-revue.txt"
    faux.write_text("all 622 questions", encoding="utf-8")
    verifier_fiche([juste], 658)
    try:
        verifier_fiche([juste, faux], 658)
    except SystemExit as arret:
        message = str(arret)
        assert "notes-revue.txt" in message and "622 questions" in message
        assert "658" in message and "plus de 600" in message
        assert "description.txt" not in message
    else:
        raise AssertionError("une fiche au compte faux aurait dû arrêter le pipeline")


def test_la_fiche_du_depot_dit_le_vrai_compte():
    from app_store import FICHE, compte_banque, verifier_fiche

    assert FICHE, "aucun texte de fiche lu"
    verifier_fiche(FICHE, compte_banque())


def test_le_texte_de_fiche_ne_reconstruit_pas_l_app():
    from app_store import FICHE, RACINE

    for chemin in FICHE:
        relatif = chemin.relative_to(RACINE).as_posix()
        if relatif.startswith("docs/"):
            assert hors_app(relatif)


def test_preparer_refuse_une_fiche_fausse_avant_tout_appel(monkeypatch, tmp_path):
    import app_store

    faux = tmp_path / "description.txt"
    faux.write_text("all 622 questions", encoding="utf-8")
    monkeypatch.setattr(app_store, "FICHE", [faux])
    monkeypatch.setattr(app_store, "compte_banque", lambda: 658)

    def interdit():
        raise AssertionError("preparer a interrogé App Store Connect avec une fiche fausse")

    monkeypatch.setattr(app_store, "lire_versions", interdit)
    try:
        app_store.preparer(SHA)
    except SystemExit as arret:
        assert "622 questions" in str(arret)
    else:
        raise AssertionError("preparer aurait dû refuser la fiche")


# --- Deux plateformes, un compteur de builds ----------------------------------
#
# L'app Mac (Mac Catalyst) partage l'identifiant de l'iOS : ses builds tombent
# dans la même liste `/v1/builds`. Chaque plateforme décide sur ses builds à
# elle, mais les numéros se prennent au-dessus de tous, pour qu'un build Mac et
# un build iOS ne portent jamais le même.


def test_un_build_mac_ne_passe_pas_pour_le_dernier_build_ios():
    versions = [Version("1.0.9", "READY_FOR_SALE", build=22)]
    builds = [
        Build(22, "1.0.9", AUTRE[:7]),
        Build(23, "1.0.10", AUTRE[:7]),
        # Même commit, même numéro de version : seule la plateforme le distingue.
        Build(24, "1.0.10", SHA[:7], "MAC_OS"),
    ]
    d = decider(versions, builds, SHA)
    assert (d.action, d.version, d.build) == ("construire", "1.0.10", 25)


def test_un_build_ios_ne_passe_pas_pour_le_dernier_build_mac():
    builds = [Build(22, "1.0.9", None), Build(23, "1.0", SHA[:7])]
    d = decider([], builds, SHA, "MAC_OS")
    assert (d.action, d.version, d.build, d.soumission) == ("construire", "1.0", 24, True)


def test_le_mac_retrouve_son_build_au_meme_commit():
    builds = [Build(23, "1.0", SHA[:7], "MAC_OS"), Build(24, "1.0.10", None)]
    d = decider([], builds, SHA, "MAC_OS")
    assert (d.action, d.version, d.build) == ("soumettre", "1.0", 23)


def test_la_plateforme_des_builds_se_lit_dans_leur_version_de_test(monkeypatch):
    import app_store

    page = {
        "data": [
            {"type": "builds", "id": "b2", "attributes": {"version": "24"},
             "relationships": {"preReleaseVersion": {"data": {"type": "preReleaseVersions", "id": "p2"}}}},
            {"type": "builds", "id": "b1", "attributes": {"version": "23"},
             "relationships": {"preReleaseVersion": {"data": {"type": "preReleaseVersions", "id": "p1"}}}},
        ],
        "included": [
            {"type": "preReleaseVersions", "id": "p2", "attributes": {"version": "1.0", "platform": "MAC_OS"}},
            {"type": "preReleaseVersions", "id": "p1", "attributes": {"version": "1.0.10", "platform": "IOS"}},
        ],
    }
    monkeypatch.setattr(app_store, "appeler", lambda methode, url: page)
    assert app_store.lire_builds() == [Build(24, "1.0", None, "MAC_OS"), Build(23, "1.0.10", None, "IOS")]


def test_les_versions_se_lisent_par_plateforme(monkeypatch):
    import app_store

    vues = []

    def appeler(methode, url):
        vues.append(url)
        return {"data": []}

    monkeypatch.setattr(app_store, "appeler", appeler)
    app_store.lire_versions("MAC_OS")
    app_store.lire_versions()
    assert "filter%5Bplatform%5D=MAC_OS" in vues[0]
    assert "filter%5Bplatform%5D=IOS" in vues[1]


def test_une_plateforme_inconnue_est_refusee():
    import pytest
    import app_store

    with pytest.raises(SystemExit):
        app_store.main(["preparer", "--commit", SHA, "--plateforme", "TV_OS"])


def test_le_mac_a_son_propre_a_tester():
    import app_store

    assert app_store.A_TESTER_PAR_PLATEFORME["MAC_OS"].name == "a-tester-mac.txt"
    assert lire_a_tester(app_store.A_TESTER_PAR_PLATEFORME["MAC_OS"])


def test_la_fiche_mac_est_relue_par_verifier_fiche():
    from app_store import FICHE, RACINE

    relus = {c.relative_to(RACINE).as_posix() for c in FICHE}
    for nom in ("description.txt", "mots-cles.txt", "notes-revue.txt"):
        assert f"docs/fiche-app-store/mac/{nom}" in relus
    assert "ios/a-tester-mac.txt" in relus


# --- Les workflows : jamais deux plateformes d'un coup ------------------------


def _workflow(nom):
    import yaml

    texte = (Path(__file__).resolve().parents[1] / ".github" / "workflows" / nom).read_text(encoding="utf-8")
    flux = yaml.safe_load(texte)
    # PyYAML lit la clé `on` comme le booléen True.
    return texte, flux, flux.get("on", flux.get(True))


def test_le_workflow_mac_ne_part_qu_a_la_main():
    _, _, declencheurs = _workflow("app-mac.yml")
    assert set(declencheurs) == {"workflow_dispatch"}


def test_le_workflow_mac_ne_soumet_qu_a_la_demande():
    texte, _, declencheurs = _workflow("app-mac.yml")
    revue = declencheurs["workflow_dispatch"]["inputs"]["revue"]
    assert revue["type"] == "boolean" and revue["default"] is False
    assert "--plateforme MAC_OS" in texte and "--sans-revue" in texte
    assert "Mac Catalyst" in texte


def test_le_workflow_ios_reste_a_l_ios():
    texte, _, _ = _workflow("app-ios.yml")
    assert "MAC_OS" not in texte and "Catalyst" not in texte
    assert "-destination generic/platform=iOS " in texte
