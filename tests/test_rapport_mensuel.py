"""Tests du rapport mensuel : dates, agrégation Umami et Apple, rendu du mail.

Aucun appel réseau : les collecteurs reçoivent des fonctions factices, les
données sont des fixtures (JSON Umami, TSV Apple).
"""
import gzip
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import rapport_mensuel as r  # noqa: E402

NBSP = " "


# --- Dates --------------------------------------------------------------------


def test_mois_precedent_par_defaut():
    assert r.mois_precedent(datetime(2026, 11, 1, 7, 0, tzinfo=timezone.utc)) == "2026-10"
    assert r.mois_precedent(datetime(2026, 1, 1, 7, 0, tzinfo=timezone.utc)) == "2025-12"


def test_mois_precedent_suit_l_heure_de_paris():
    # 31 octobre 23 h 30 UTC, c'est déjà le 1er novembre à Paris.
    assert r.mois_precedent(datetime(2026, 10, 31, 23, 30, tzinfo=timezone.utc)) == "2026-10"


def test_decaler():
    assert r.decaler("2026-01", -1) == "2025-12"
    assert r.decaler("2026-10", -5) == "2026-05"
    assert r.decaler("2026-11", 1) == "2026-12"
    assert r.decaler("2026-12", 1) == "2027-01"


def test_bornes_en_heure_de_paris():
    debut, fin = r.bornes_ms("2026-10")
    assert datetime.fromtimestamp(debut / 1000, timezone.utc) == datetime(2026, 9, 30, 22, 0, tzinfo=timezone.utc)
    # Fin d'octobre : l'heure d'été s'arrête, minuit Paris = 23 h UTC.
    assert datetime.fromtimestamp((fin + 1) / 1000, timezone.utc) == datetime(2026, 10, 31, 23, 0, tzinfo=timezone.utc)


def test_noms_de_mois():
    assert r.nom_mois("2026-10") == "octobre 2026"
    assert r.de_mois("2026-10") == "d'octobre 2026"
    assert r.de_mois("2026-08") == "d'août 2026"
    assert r.de_mois("2026-09") == "de septembre 2026"


def test_mois_invalide_refuse():
    with pytest.raises(SystemExit):
        r.verifier_mois("2026-13")
    with pytest.raises(SystemExit):
        r.verifier_mois("octobre")
    assert r.verifier_mois("2026-10") == "2026-10"


# --- Formats ------------------------------------------------------------------


def test_nombre_et_ecart():
    assert r.nombre(1234567) == f"1{NBSP}234{NBSP}567"
    assert r.nombre(None) == "n.d."
    assert r.nombre(12.5, 1) == "12,5"
    assert r.ecart(150, 100, "n") == f"+50{NBSP}%"
    assert r.ecart(50, 100, "n") == f"-50{NBSP}%"
    assert r.ecart(100, 100, "n") == f"0{NBSP}%"
    assert r.ecart(10, 0, "n") == "n.d."
    assert r.ecart(10, None, "n") == "n.d."
    # Un taux s'écarte en points, pas en pour cent.
    assert r.ecart(70, 60, "pct") == f"+10{NBSP}pts"


def test_duree():
    assert r.duree(552) == f"9{NBSP}min{NBSP}12{NBSP}s"
    assert r.duree(45) == f"45{NBSP}s"
    assert r.duree(None) == "n.d."


def test_moyenne_des_trois_mois_precedents_exige_les_trois():
    serie = {"2026-09": 10, "2026-08": 20, "2026-07": 30}
    assert r.moyenne3(serie, "2026-10") == 20
    assert r.moyenne3({"2026-09": 10, "2026-08": 20}, "2026-10") is None


# --- Umami --------------------------------------------------------------------


def faux_umami(appels):
    """Une réponse par chemin, selon le mois demandé : octobre double septembre."""
    debut_octobre, _ = r.bornes_ms("2026-10")

    def get(chemin):
        appels.append(chemin)
        debut = int(chemin.split("startAt=")[1].split("&")[0])
        facteur = 2 if debut >= debut_octobre else 1
        if "/stats" in chemin:
            return {"pageviews": 1000 * facteur, "visitors": 100 * facteur, "visits": 200 * facteur,
                    "bounces": 50 * facteur, "totaltime": 20000 * facteur}
        type_ = chemin.split("type=")[1].split("&")[0]
        if type_ == "event":
            return [{"x": "examen-commence", "y": 10 * facteur}, {"x": "examen-termine", "y": 6 * facteur},
                    {"x": "entrainement-abandonne", "y": 9 * facteur}, {"x": "entrainement-revenu", "y": 4 * facteur}]
        if type_ == "country":
            return [{"x": "FR", "y": 150}, {"x": "US", "y": 40}, {"x": "DE", "y": 10}]
        return [{"x": f"{type_}-a", "y": 5}]
    return get


def test_collecter_umami():
    appels = []
    series, tops = r.collecter_umami(faux_umami(appels), "2026-10")
    assert series["visiteurs"]["2026-10"] == 200
    assert series["visiteurs"]["2026-09"] == 100
    assert series["visiteurs"]["2026-05"] == 100  # six mois de visiteurs pour le tableau
    assert series["pages_vues"]["2026-10"] == 2000
    assert series["evt:examen-termine"]["2026-10"] == 12
    assert series["evt:examen-termine"]["2026-07"] == 6
    # Les événements ne remontent qu'aux trois mois précédents.
    assert "2026-06" not in series["evt:examen-termine"]
    # Dérivés
    assert series["taux_examen"]["2026-10"] == 60
    assert series["abandons_nets"]["2026-10"] == 10  # 18 - 8
    # Tops du mois seulement
    assert tops["pages"] == [("path-a", 5)]
    assert tops["pays"][0] == ("FR", 150)
    # Les requêtes passent par Paris et demandent assez d'événements
    assert all("startAt=" in c and "endAt=" in c for c in appels)
    assert any("type=event" in c and "limit=100" in c for c in appels)


def test_un_mois_sans_aucune_visite_est_sans_donnee_pas_zero():
    """Avant l'ouverture du site, Umami rend 0 : la moyenne ne doit pas s'en trouver écrasée."""
    debut_septembre, _ = r.bornes_ms("2026-09")
    plein = faux_umami([])

    def get(chemin):
        debut = int(chemin.split("startAt=")[1].split("&")[0])
        if debut < debut_septembre:
            return {"pageviews": 0, "visitors": 0, "visits": 0, "bounces": 0, "totaltime": 0} \
                if "/stats" in chemin else []
        return plein(chemin)

    series, _ = r.collecter_umami(get, "2026-10")
    assert series["visiteurs"]["2026-09"] == 100
    assert "2026-08" not in series["visiteurs"]
    assert "2026-08" not in series["evt:examen-termine"]
    assert r.moyenne3(series["visiteurs"], "2026-10") is None


def test_duree_et_rebond_sont_rapportes_aux_visites():
    series, _ = r.collecter_umami(faux_umami([]), "2026-10")
    assert series["duree_visite"]["2026-10"] == pytest.approx(100)
    assert series["rebond"]["2026-10"] == pytest.approx(25)


def test_part_des_pays():
    _, tops = r.collecter_umami(faux_umami([]), "2026-10")
    parts = r.parts_pays(tops["pays"], 200)
    assert parts["FR"] == 75
    assert parts["US"] == 20


# --- Apple : lecture ----------------------------------------------------------

TSV_TELECHARGEMENTS = (
    "Date\tApp Name\tDownload Type\tDevice\tPlatform Version\tSource Type\tTerritory\tCounts\n"
    "2026-10-03\tLe Permis Côtier\tFirst-time download\tiPhone\tiOS 18\tApp Store search\tFR\t10\n"
    "2026-10-03\tLe Permis Côtier\tRedownload\tiPhone\tiOS 18\tApp Store search\tFR\t2\n"
    "2026-10-04\tLe Permis Côtier\tFirst-time download\tiPad\tiPadOS 18\tWeb referrer\tFR\t3\n"
    "2026-10-04\tLe Permis Côtier\tFirst-time download\tMac\tmacOS 15\tWeb referrer\tFR\t4\n"
    "2026-10-04\tLe Permis Côtier\tAuto-update\tiPhone\tiOS 18\tApp Store search\tFR\t99\n"
    "2026-10-05\tLe Permis Côtier\tFirst-time download\tApple TV\ttvOS\tApp Store search\tFR\t50\n"
)


def test_lire_tsv_plain_et_gzip():
    brut = TSV_TELECHARGEMENTS.encode()
    lignes = r.lire_tsv(brut)
    assert lignes == r.lire_tsv(gzip.compress(brut))
    assert lignes[0]["download type"] == "First-time download"
    assert lignes[0]["counts"] == "10"


def test_agreger_telechargements_par_plateforme():
    lignes = r.lire_tsv(TSV_TELECHARGEMENTS.encode())
    for l in lignes:
        l["_mois"] = "2026-10"
    s = r.agreger_apple({"downloads": lignes})
    assert s["ios:dl_premiere"]["2026-10"] == 13
    assert s["ios:dl_reinstall"]["2026-10"] == 2
    assert s["ios:dl"]["2026-10"] == 15  # les mises à jour ne comptent pas
    assert s["mac:dl"]["2026-10"] == 4
    assert s["mac:dl_premiere"]["2026-10"] == 4


def test_agreger_sessions_suppressions_et_decouverte():
    sessions = [
        {"device": "iPhone", "sessions": "40", "total session duration": "2000", "unique devices": "8", "_mois": "2026-10"},
        {"device": "Mac", "sessions": "10", "total session duration": "1000", "unique devices": "2", "_mois": "2026-10"},
    ]
    install = [
        {"device": "iPhone", "event": "Install", "counts": "12", "_mois": "2026-10"},
        {"device": "iPhone", "event": "Delete", "counts": "3", "_mois": "2026-10"},
        {"device": "Mac", "event": "Delete", "counts": "1", "_mois": "2026-10"},
    ]
    decouverte = [
        {"device": "iPad", "event": "Impression", "counts": "500", "_mois": "2026-10"},
        {"device": "iPhone", "event": "Impression", "counts": "1000", "_mois": "2026-10"},
        {"device": "iPhone", "event": "Page view", "counts": "70", "_mois": "2026-10"},
        {"device": "Mac", "event": "Page view", "counts": "5", "_mois": "2026-10"},
    ]
    s = r.agreger_apple({"sessions": sessions, "install": install, "discovery": decouverte})
    assert s["ios:sessions"]["2026-10"] == 40
    assert s["ios:appareils"]["2026-10"] == 8
    assert s["ios:duree_session"]["2026-10"] == 50
    assert s["mac:sessions"]["2026-10"] == 10
    assert s["ios:suppr"]["2026-10"] == 3
    assert s["mac:suppr"]["2026-10"] == 1
    assert s["ios:impr"]["2026-10"] == 1500
    assert s["ios:pv"]["2026-10"] == 70
    assert s["mac:pv"]["2026-10"] == 5


def test_colonnes_inconnues_ne_cassent_rien():
    s = r.agreger_apple({"downloads": [{"truc": "x", "_mois": "2026-10"}], "sessions": []})
    assert s.get("ios:dl", {}) == {}


def test_nom_de_colonne_insensible_a_la_casse_et_aux_variantes():
    lignes = r.lire_tsv(b"DATE\tDEVICE\tDOWNLOAD TYPE\tCOUNT\n2026-10-03\tiPhone\tFirst-time Download\t7\n")
    lignes[0]["_mois"] = "2026-10"
    assert r.agreger_apple({"downloads": lignes})["ios:dl"]["2026-10"] == 7


# --- Apple : choix des instances ---------------------------------------------


def ligne(date, n):
    return {"date": date, "device": "iPhone", "download type": "First-time download", "counts": str(n)}


def test_le_mensuel_passe_avant_le_quotidien():
    instances = [
        ("MONTHLY", "2026-11-02", [ligne("2026-10-01", 100)]),
        ("DAILY", "2026-10-02", [ligne("2026-10-01", 1)]),
    ]
    lignes = r.choisir_lignes(instances)
    assert [l["counts"] for l in lignes] == ["100"]
    assert lignes[0]["_mois"] == "2026-10"


def test_quotidiens_additionnes_sans_doublon():
    instances = [
        ("DAILY", "2026-10-02", [ligne("2026-10-01", 1)]),
        ("DAILY", "2026-10-03", [ligne("2026-10-02", 2)]),
        # Instance republiée pour le même jour : la plus récente remplace l'ancienne.
        ("DAILY", "2026-10-05", [ligne("2026-10-02", 5)]),
        ("DAILY", "2026-11-02", [ligne("2026-11-01", 7)]),
    ]
    lignes = r.choisir_lignes(instances)
    par_mois = {}
    for l in lignes:
        par_mois[l["_mois"]] = par_mois.get(l["_mois"], 0) + int(l["counts"])
    assert par_mois == {"2026-10": 6, "2026-11": 7}


def test_ligne_sans_date_prend_le_mois_de_la_veille_du_traitement():
    lignes = r.choisir_lignes([("MONTHLY", "2026-11-01", [{"counts": "3"}])])
    assert lignes[0]["_mois"] == "2026-10"


# --- Apple : API --------------------------------------------------------------


def test_collecter_apple_avec_api_factice():
    rapports = {
        "App Downloads Standard": "downloads",
        "App Sessions Standard": "sessions",
        "App Store Installation and Deletion Standard": "install",
        "App Store Discovery and Engagement Standard": "discovery",
    }
    appels = []

    def lister(chemin, params):
        appels.append((chemin, params))
        if chemin.endswith("/analyticsReportRequests"):
            return ([{"id": "R-SNAP", "attributes": {"accessType": "ONE_TIME_SNAPSHOT"}},
                     {"id": "R-ONG", "attributes": {"accessType": "ONGOING"}}], [])
        if chemin.endswith("/reports"):
            nom = params["filter[name]"]
            return ([{"id": f"rep-{chemin.split('/')[3]}-{rapports[nom]}", "attributes": {"name": nom}}], [])
        if chemin.endswith("/instances"):
            if params["filter[granularity]"] == "DAILY":
                return ([], [])
            return ([{"id": chemin.split("/")[3] + "-inst", "attributes": {"processingDate": "2026-11-02"}}], [])
        if chemin.endswith("/segments"):
            return ([{"id": "seg", "attributes": {"url": "https://exemple.invalid/seg.tsv.gz"}}], [])
        raise AssertionError(chemin)

    def telecharger(url):
        assert url == "https://exemple.invalid/seg.tsv.gz"
        return gzip.compress(TSV_TELECHARGEMENTS.encode())

    series, notes = r.collecter_apple(lister, telecharger, "2026-10")
    assert series["ios:dl"]["2026-10"] == 15
    assert series["mac:dl"]["2026-10"] == 4
    # Seule la demande ONGOING est interrogée quand elle existe.
    assert not any("R-SNAP" in c for c, _ in appels)
    # Les autres rapports ont répondu avec le même fichier, sans colonne utile : le mail le dit.
    assert any("Sessions" in n for n in notes)


def test_rapport_sans_instance_donne_une_note_et_pas_une_erreur():
    def lister(chemin, params):
        if chemin.endswith("/analyticsReportRequests"):
            return ([{"id": "R-ONG", "attributes": {"accessType": "ONGOING"}}], [])
        if chemin.endswith("/reports"):
            return ([{"id": "rep", "attributes": {"name": params["filter[name]"]}}], [])
        return ([], [])

    series, notes = r.collecter_apple(lister, lambda url: b"", "2026-10")
    assert series == {}
    assert len(notes) == 4
    assert all("pas encore" in n for n in notes)


def test_demande_absente_donne_une_note():
    series, notes = r.collecter_apple(lambda c, p: ([], []), lambda u: b"", "2026-10")
    assert series == {}
    assert notes and "demande" in notes[0].lower()


def test_reessayer_rejoue_une_connexion_coupee(monkeypatch):
    monkeypatch.setattr(r.time, "sleep", lambda s: None)
    appels = []

    def f():
        appels.append(1)
        if len(appels) < 3:
            raise ConnectionResetError("coupée")
        return "ok"

    assert r.reessayer(f) == "ok"
    assert len(appels) == 3
    with pytest.raises(ConnectionResetError):
        r.reessayer(lambda: (_ for _ in ()).throw(ConnectionResetError("toujours")))


# --- Avis ---------------------------------------------------------------------


def test_agreger_avis():
    avis = [
        {"createdDate": "2026-10-03T10:00:00-07:00", "rating": 5},
        {"createdDate": "2026-10-20T10:00:00-07:00", "rating": 4},
        {"createdDate": "2026-09-02T10:00:00-07:00", "rating": 3},
    ]
    s, total, moyenne = r.agreger_avis(avis, "2026-10")
    assert s["avis_nouveaux"]["2026-10"] == 2
    assert s["avis_nouveaux"]["2026-09"] == 1
    assert s["avis_nouveaux"]["2026-08"] == 0
    assert s["avis_note"]["2026-10"] == 4.5
    assert "2026-08" not in s["avis_note"]
    assert total == 3
    assert moyenne == 4.0


def test_resumer_versions():
    V = r.app_store.Version
    assert r.resumer_versions([V("1.0.8", "READY_FOR_SALE"), V("1.0.9", "WAITING_FOR_REVIEW")]) == (
        "1.0.8 en vente ; en cours : 1.0.9 (WAITING_FOR_REVIEW)")
    assert r.resumer_versions([V("1.0.8", "READY_FOR_SALE"), V("1.0.7", "REPLACED_WITH_NEW_VERSION")]) == "1.0.8 en vente"
    # L'API rend aujourd'hui READY_FOR_DISTRIBUTION pour ce qu'elle appelait READY_FOR_SALE.
    assert r.resumer_versions([V("1.0.9", "READY_FOR_DISTRIBUTION"), V("1.0.10", "READY_FOR_DISTRIBUTION")]) == "1.0.10 en vente"
    assert r.resumer_versions([V("1.0", "WAITING_FOR_REVIEW")]) == "aucune version en vente ; en cours : 1.0 (WAITING_FOR_REVIEW)"
    assert r.resumer_versions([]) is None


# --- Rendu --------------------------------------------------------------------


def donnees_completes():
    umami, tops = r.collecter_umami(faux_umami([]), "2026-10")
    apple = {
        "ios:dl": {"2026-10": 15, "2026-09": 10, "2026-08": 5, "2026-07": 5},
        "ios:dl_premiere": {"2026-10": 13},
        "mac:dl": {"2026-10": 4, "2026-09": 0},
        "mac:sessions": {"2026-10": 10},
    }
    avis, total, moyenne = r.agreger_avis([{"createdDate": "2026-10-03T10:00:00Z", "rating": 5}], "2026-10")
    series = {**umami, **apple, **avis}
    r.deriver(series)
    return r.Donnees(
        mois="2026-10",
        series=series,
        tops=tops,
        notes_apple=["Rapport « App Sessions Standard » : pas encore livré par Apple."],
        notes_umami=[],
        versions={"IOS": "1.0.8 en vente ; 1.0.9 en WAITING_FOR_REVIEW", "MAC_OS": None},
        avis_total=total,
        avis_moyenne=moyenne,
    )


def test_rapport_dans_l_ordre_demande():
    sujet, html, texte = r.rendre(donnees_completes())
    assert sujet == "Le Permis Côtier : rapport d'octobre 2026"
    titres = ["Synthèse", "Site", "Usage", "App iOS", "App Mac", "Avis"]
    positions = [texte.index(t) for t in titres]
    assert positions == sorted(positions)
    assert "Six derniers mois" in texte


def test_synthese_en_trois_lignes_chiffrees():
    _, _, texte = r.rendre(donnees_completes())
    bloc = texte.split("Synthèse")[1].split("\n\n")[0].strip().splitlines()
    lignes = [l for l in bloc if l.strip()]
    assert len(lignes) == 3
    assert "Visiteurs" in lignes[0] and "200" in lignes[0]
    assert "Téléchargements" in lignes[1] and "19" in lignes[1]  # 15 iOS + 4 Mac
    assert "Examens finis" in lignes[2] and "12" in lignes[2]


def test_chiffre_manquant_est_dit_pas_invente():
    _, html, texte = r.rendre(donnees_completes())
    assert "n.d." in texte
    assert "pas encore livré par Apple" in texte
    assert "pas encore livré par Apple" in html


def test_ecarts_et_moyenne_dans_le_tableau():
    _, _, texte = r.rendre(donnees_completes())
    ligne_visiteurs = next(l for l in texte.splitlines() if l.startswith("Visiteurs") and "|" in l)
    assert f"+100{NBSP}%" in ligne_visiteurs


def test_pas_de_tiret_cadratin_ni_emoji_ni_image_externe():
    _, html, texte = r.rendre(donnees_completes())
    for contenu in (html, texte):
        assert "—" not in contenu
        assert "–" not in contenu
        assert "@" not in contenu
    assert "<img" not in html
    assert "src=" not in html


def test_html_echappe_les_valeurs_venues_de_l_exterieur():
    d = donnees_completes()
    d.tops["pages"] = [("/<script>alert(1)</script>", 3)]
    _, html, _ = r.rendre(d)
    assert "<script>" not in html
    assert "&lt;script&gt;" in html


# --- Envoi et ligne de commande ----------------------------------------------


def test_envoi_resend(monkeypatch):
    vus = {}

    def poster(url, corps, entetes):
        vus.update(url=url, corps=corps, entetes=entetes)
        return 200, b'{"id":"abc"}'

    r.envoyer("Sujet", "<p>x</p>", "x", "dest@exemple.invalid", "re_cle", "2026-10", poster)
    assert vus["url"] == "https://api.resend.com/emails"
    assert vus["corps"]["from"] == "Le Permis Côtier <rapport@lepermiscotier.fr>"
    assert vus["corps"]["to"] == ["dest@exemple.invalid"]
    assert vus["corps"]["html"] == "<p>x</p>" and vus["corps"]["text"] == "x"
    assert vus["entetes"]["Authorization"] == "Bearer re_cle"
    assert vus["entetes"]["Idempotency-Key"] == "rapport-mensuel-2026-10"
    assert vus["entetes"]["User-Agent"]


def test_erreur_resend_ne_montre_ni_cle_ni_destinataire():
    def poster(url, corps, entetes):
        return 422, b'{"message":"invalid to address"}'

    with pytest.raises(SystemExit) as e:
        r.envoyer("S", "h", "t", "dest@exemple.invalid", "re_secret", "2026-10", poster)
    message = str(e.value)
    assert "422" in message and "invalid to address" in message
    assert "dest@exemple.invalid" not in message and "re_secret" not in message


def test_essai_ecrit_le_html_et_n_envoie_rien(tmp_path, monkeypatch):
    monkeypatch.setattr(r, "rassembler", lambda mois: donnees_completes())
    monkeypatch.setattr(r, "envoyer", lambda *a, **k: pytest.fail("envoi pendant un essai"))
    sortie = tmp_path / "essai.html"
    assert r.main(["--mois", "2026-10", "--essai", str(sortie)]) == 0
    assert "<table" in sortie.read_text(encoding="utf-8")


def test_envoi_reel_exige_cle_et_destinataire(monkeypatch):
    monkeypatch.setattr(r, "rassembler", lambda mois: donnees_completes())
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.delenv("RAPPORT_DESTINATAIRE", raising=False)
    with pytest.raises(SystemExit):
        r.main(["--mois", "2026-10"])


def test_envoi_reel_appelle_resend(monkeypatch):
    monkeypatch.setattr(r, "rassembler", lambda mois: donnees_completes())
    monkeypatch.setenv("RESEND_API_KEY", "re_cle")
    monkeypatch.setenv("RAPPORT_DESTINATAIRE", "dest@exemple.invalid")
    vus = []
    monkeypatch.setattr(r, "envoyer", lambda sujet, html, texte, dest, cle, mois, *a: vus.append((sujet, dest, cle, mois)))
    assert r.main(["--mois", "2026-10"]) == 0
    assert vus == [("Le Permis Côtier : rapport d'octobre 2026", "dest@exemple.invalid", "re_cle", "2026-10")]
