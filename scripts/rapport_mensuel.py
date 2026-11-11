#!/usr/bin/env python3
"""Rapport mensuel par courrier : site, app iOS, app Mac, avis.

    python scripts/rapport_mensuel.py                         # mois précédent, envoyé
    python scripts/rapport_mensuel.py --mois 2026-10          # un mois donné, envoyé
    python scripts/rapport_mensuel.py --mois 2026-10 --essai /tmp/rapport.html   # rien n'est envoyé

Sources :
  Umami (auto-hébergé)       visiteurs, pages, canaux, pays, événements du site.
  App Store Connect          rapports d'analyse (téléchargements, sessions,
                             suppressions, découverte), avis, versions en vente.
  Resend                     l'envoi.

Variables : UMAMI_USER, UMAMI_PASSWORD ; ASC_KEY_ID, ASC_ISSUER_ID et ASC_KEY_P8
ou ASC_KEY_PATH (comme `app_store.py`) ; RESEND_API_KEY et RAPPORT_DESTINATAIRE
pour l'envoi seulement. Aucun secret ni destinataire n'est jamais écrit.

Une source en panne ou un rapport Apple pas encore livré n'arrête pas le mail :
la section dit ce qui manque, le chiffre vaut « n.d. ».
"""
from __future__ import annotations

import argparse
import csv
import gzip
import html as htmllib
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent))
import app_store  # noqa: E402

PARIS = ZoneInfo("Europe/Paris")
UMAMI = "https://umami.morain.fr"
SITE_ID = "eaf95e93-6cb6-44e5-a60a-b3db00a05fcf"
# Cloudflare répond 403 à un client sans User-Agent de navigateur.
UA_NAVIGATEUR = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
UA_RAPPORT = "permis-cotier-rapport/1.0"
RESEND = "https://api.resend.com/emails"
EXPEDITEUR = "Le Permis Côtier <rapport@lepermiscotier.fr>"

MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
           "août", "septembre", "octobre", "novembre", "décembre"]
NBSP = " "
ND = "n.d."

# Le tableau des six derniers mois ; les événements remontent à trois mois
# (le mois, le précédent, la moyenne des trois d'avant).
MOIS_TABLEAU = 6
MOIS_EVENEMENTS = 4

# Événement Umami -> libellé. Absent de la réponse, il vaut 0.
EVENEMENTS = [
    ("examen-commence", "Examens commencés"),
    ("examen-termine", "Examens finis"),
    ("examen-abandonne", "Examens abandonnés"),
    ("entrainement-commence", "Entraînements commencés"),
    ("entrainement-termine", "Entraînements finis"),
    ("entrainement-abandonne", "Entraînements abandonnés (bruts)"),
    ("entrainement-revenu", "Entraînements repris"),
    ("lecon-terminee", "Leçons terminées"),
    ("fiche-pdf", "Fiches PDF ouvertes"),
    ("revoir-commence", "Revoir mes erreurs : commencé"),
    ("revoir-termine", "Revoir mes erreurs : fini"),
    ("accueil-fiches", "Fiches depuis l'accueil"),
    ("verdict-fiches", "Fiches depuis le verdict"),
]


# --- Dates --------------------------------------------------------------------


def verifier_mois(mois: str) -> str:
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", mois or ""):
        raise SystemExit(f"Mois invalide : « {mois} », attendu AAAA-MM.")
    return mois


def decaler(mois: str, n: int) -> str:
    annee, m = int(mois[:4]), int(mois[5:7])
    total = annee * 12 + (m - 1) + n
    return f"{total // 12:04d}-{total % 12 + 1:02d}"


def mois_precedent(maintenant: datetime | None = None) -> str:
    maintenant = (maintenant or datetime.now(timezone.utc)).astimezone(PARIS)
    return decaler(f"{maintenant.year:04d}-{maintenant.month:02d}", -1)


def bornes_ms(mois: str) -> tuple[int, int]:
    """Début et dernière milliseconde du mois, en heure de Paris."""
    debut = datetime(int(mois[:4]), int(mois[5:7]), 1, tzinfo=PARIS)
    suivant = decaler(mois, 1)
    fin = datetime(int(suivant[:4]), int(suivant[5:7]), 1, tzinfo=PARIS)
    return int(debut.timestamp() * 1000), int(fin.timestamp() * 1000) - 1


def nom_mois(mois: str) -> str:
    return f"{MOIS_FR[int(mois[5:7]) - 1]} {mois[:4]}"


def nom_court(mois: str) -> str:
    return MOIS_FR[int(mois[5:7]) - 1]


def de_mois(mois: str) -> str:
    nom = nom_mois(mois)
    return ("d'" if nom[0] in "aàâeéèêiîoôuûh" else "de ") + nom


# --- Formats ------------------------------------------------------------------


def nombre(valeur: float | None, decimales: int = 0) -> str:
    if valeur is None:
        return ND
    texte = f"{valeur:,.{decimales}f}".replace(",", NBSP).replace(".", ",")
    return texte


def ecart(actuel: float | None, precedent: float | None, genre: str) -> str:
    """L'écart au mois précédent : % pour un nombre, points pour un taux."""
    if actuel is None or precedent is None:
        return ND
    if genre == "pct":
        d = round(actuel - precedent)
        return f"{d:+d}{NBSP}pts" if d else f"0{NBSP}pts"
    if genre == "note":
        d = round(actuel - precedent, 1)
        return f"{d:+.1f}".replace(".", ",") if d else "0,0"
    if precedent == 0:
        return ND
    d = round((actuel - precedent) / precedent * 100)
    return f"{d:+d}{NBSP}%" if d else f"0{NBSP}%"


def duree(secondes: float | None) -> str:
    if secondes is None:
        return ND
    s = round(secondes)
    if s < 60:
        return f"{s}{NBSP}s"
    return f"{s // 60}{NBSP}min{NBSP}{s % 60}{NBSP}s"


def moyenne3(serie: dict[str, float], mois: str) -> float | None:
    """Moyenne des trois mois qui précèdent, ou rien s'il en manque un."""
    valeurs = [serie.get(decaler(mois, -i)) for i in (1, 2, 3)]
    if any(v is None for v in valeurs):
        return None
    return sum(valeurs) / 3


def formater(valeur: float | None, genre: str) -> str:
    if valeur is None:
        return ND
    if genre == "s":
        return duree(valeur)
    if genre == "pct":
        return f"{nombre(valeur, 0)}{NBSP}%"
    if genre == "note":
        return nombre(valeur, 1)
    return nombre(valeur, 0)


# --- Umami --------------------------------------------------------------------


def valeur(brut) -> float:
    """Umami v3 rend un nombre, les versions d'avant `{"value": n}`."""
    return brut.get("value", 0) if isinstance(brut, dict) else (brut or 0)


def collecter_umami(get, mois: str) -> tuple[dict[str, dict[str, float]], dict[str, list]]:
    """Les séries du site et les tops du mois. `get(chemin)` rend le JSON."""
    series: dict[str, dict[str, float]] = {}

    def poser(cle: str, m: str, v: float) -> None:
        series.setdefault(cle, {})[m] = v

    base = f"/api/websites/{SITE_ID}"
    for i in range(MOIS_TABLEAU):
        m = decaler(mois, -i)
        a, b = bornes_ms(m)
        stats = get(f"{base}/stats?startAt={a}&endAt={b}")
        visiteurs, visites = valeur(stats.get("visitors")), valeur(stats.get("visits"))
        poser("visiteurs", m, visiteurs)
        poser("visites", m, visites)
        poser("pages_vues", m, valeur(stats.get("pageviews")))
        if visites:
            poser("duree_visite", m, valeur(stats.get("totaltime")) / visites)
            poser("rebond", m, valeur(stats.get("bounces")) / visites * 100)

    for i in range(MOIS_EVENEMENTS):
        m = decaler(mois, -i)
        a, b = bornes_ms(m)
        evenements = {e["x"]: e["y"] for e in get(f"{base}/metrics?startAt={a}&endAt={b}&type=event&limit=100")}
        for nom, _ in EVENEMENTS:
            poser(f"evt:{nom}", m, evenements.get(nom, 0))

    a, b = bornes_ms(mois)
    tops = {}
    for cle, type_, limite in (("pages", "path", 10), ("referents", "referrer", 10), ("canaux", "channel", 20),
                               ("pays", "country", 30), ("appareils", "device", 10)):
        reponse = get(f"{base}/metrics?startAt={a}&endAt={b}&type={type_}&limit={limite}")
        tops[cle] = [(e["x"], e["y"]) for e in reponse]
    deriver(series)
    return series, tops


def parts_pays(pays: list[tuple[str, float]], visiteurs: float | None) -> dict[str, float]:
    """Part des visiteurs venue de France et des États-Unis, en %."""
    if not visiteurs:
        return {}
    par_pays = dict(pays)
    return {code: par_pays.get(code, 0) / visiteurs * 100 for code in ("FR", "US")}


def deriver(series: dict[str, dict[str, float]]) -> None:
    """Les séries calculées : taux d'examen, abandons nets, total des téléchargements."""
    commence, termine = series.get("evt:examen-commence", {}), series.get("evt:examen-termine", {})
    abandon, revenu = series.get("evt:entrainement-abandonne", {}), series.get("evt:entrainement-revenu", {})
    ios, mac = series.get("ios:dl", {}), series.get("mac:dl", {})
    calculees = {
        "taux_examen": {m: termine.get(m, 0) / n * 100 for m, n in commence.items() if n},
        "abandons_nets": {m: n - revenu.get(m, 0) for m, n in abandon.items()},
        "dl_total": {m: ios.get(m, 0) + mac.get(m, 0) for m in set(ios) | set(mac)},
    }
    for cle, v in calculees.items():
        if v:
            series[cle] = v


# --- Apple : lecture des rapports --------------------------------------------

# Rapport -> (code, séries qu'il nourrit).
RAPPORTS_APPLE = {
    "App Downloads Standard": ("downloads", ("dl", "dl_premiere", "dl_reinstall")),
    "App Sessions Standard": ("sessions", ("sessions", "appareils")),
    "App Store Installation and Deletion Standard": ("install", ("suppr",)),
    "App Store Discovery and Engagement Standard": ("discovery", ("impr", "pv")),
}


def lire_tsv(octets: bytes) -> list[dict[str, str]]:
    """Un TSV Apple, gzip ou non, en lignes dont les clés sont en minuscules."""
    if octets[:2] == b"\x1f\x8b":
        octets = gzip.decompress(octets)
    texte = octets.decode("utf-8-sig", "replace")
    lecteur = csv.reader(io.StringIO(texte), delimiter="\t")
    entetes = next(lecteur, None)
    if not entetes:
        return []
    cles = [e.strip().lower() for e in entetes]
    return [dict(zip(cles, (c.strip() for c in ligne))) for ligne in lecteur if any(c.strip() for c in ligne)]


def champ(ligne: dict[str, str], *noms: str) -> str | None:
    """Une colonne par son nom exact, à défaut par un nom qu'elle contient."""
    for nom in noms:
        if nom in ligne:
            return ligne[nom]
    for nom in noms:
        for cle, v in ligne.items():
            if cle.startswith("_") or ("unique" in cle and "unique" not in nom):
                continue
            if nom in cle:
                return v
    return None


def nb(texte: str | None) -> float | None:
    try:
        return float((texte or "").replace(",", "").replace(NBSP, "").replace(" ", ""))
    except ValueError:
        return None


def plateforme_de(ligne: dict[str, str]) -> str | None:
    """`ios` (iPhone, iPad) ou `mac`, d'après la colonne d'appareil ou de plateforme."""
    v = (champ(ligne, "device", "platform") or "").lower()
    if "mac" in v:
        return "mac"
    if any(mot in v for mot in ("iphone", "ipad", "ipod", "ios")):
        return "ios"
    return None


def agreger_apple(rapports: dict[str, list[dict[str, str]]]) -> dict[str, dict[str, float]]:
    """Séries `ios:…` et `mac:…` par mois, depuis les lignes de chaque rapport.

    Les lignes portent leur mois dans `_mois`. Un rapport qui a des lignes
    reconnues pour un mois met à 0 la plateforme qui n'en a pas ; un rapport
    dont aucune colonne n'est reconnue ne laisse aucune série.
    """
    series: dict[str, dict[str, float]] = {}
    reconnus: dict[str, set[str]] = {code: set() for code, _ in RAPPORTS_APPLE.values()}
    duree_totale: dict[tuple[str, str], float] = {}

    def ajouter(p: str, cle: str, m: str, v: float) -> None:
        d = series.setdefault(f"{p}:{cle}", {})
        d[m] = d.get(m, 0) + v

    for code, lignes in rapports.items():
        for l in lignes:
            p, m = plateforme_de(l), l.get("_mois")
            n = nb(champ(l, "counts", "count"))
            if not p or not m:
                continue
            if code == "downloads" and n is not None:
                genre = (champ(l, "download type") or "").lower()
                if genre and "first" in genre:
                    ajouter(p, "dl_premiere", m, n)
                    ajouter(p, "dl", m, n)
                elif genre and ("redownload" in genre or "re-download" in genre):
                    ajouter(p, "dl_reinstall", m, n)
                    ajouter(p, "dl", m, n)
                elif not genre:
                    ajouter(p, "dl", m, n)
                else:
                    continue
                reconnus[code].add(m)
            elif code == "install" and n is not None:
                evenement = (champ(l, "event") or "").lower()
                if "delet" in evenement:
                    ajouter(p, "suppr", m, n)
                    reconnus[code].add(m)
                elif "install" in evenement:
                    reconnus[code].add(m)
            elif code == "sessions":
                sessions = nb(champ(l, "sessions"))
                if sessions is None:
                    continue
                ajouter(p, "sessions", m, sessions)
                appareils = nb(champ(l, "unique devices"))
                if appareils is not None:
                    ajouter(p, "appareils", m, appareils)
                total = nb(champ(l, "total session duration"))
                if total is not None:
                    duree_totale[(p, m)] = duree_totale.get((p, m), 0) + total
                reconnus[code].add(m)
            elif code == "discovery" and n is not None:
                evenement = (champ(l, "event") or "").lower()
                if "impression" in evenement:
                    ajouter(p, "impr", m, n)
                    reconnus[code].add(m)
                elif "page view" in evenement or "pageview" in evenement:
                    ajouter(p, "pv", m, n)
                    reconnus[code].add(m)

    for _, (code, cles) in RAPPORTS_APPLE.items():
        for m in reconnus[code]:
            for p in ("ios", "mac"):
                for cle in cles:
                    series.setdefault(f"{p}:{cle}", {}).setdefault(m, 0)
    for (p, m), total in duree_totale.items():
        sessions = series.get(f"{p}:sessions", {}).get(m)
        if sessions:
            series.setdefault(f"{p}:duree_session", {})[m] = total / sessions
    return {cle: v for cle, v in series.items() if v}


def choisir_lignes(instances: list[tuple[str, str, list[dict[str, str]]]]) -> list[dict[str, str]]:
    """Les lignes à compter, chacune avec son mois (`_mois`).

    `instances` : (granularité, date de traitement, lignes). Le mensuel passe
    avant le quotidien ; au quotidien, un jour republié ne compte qu'une fois
    (l'instance la plus récente). Sans colonne de date, le mois est celui de
    la veille du traitement.
    """
    vues = []
    for granularite, traitement, lignes in instances:
        for l in lignes:
            jour = (champ(l, "date") or "")[:10]
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", jour):
                veille = date.fromisoformat(traitement[:10]) - timedelta(days=1)
                jour = veille.isoformat()
                cle_jour = "traitement:" + traitement[:10]
            else:
                cle_jour = jour
            vues.append((granularite, jour[:7], cle_jour, traitement[:10], l))
    plus_recent: dict[tuple[str, str, str], str] = {}
    for g, m, j, t, _ in vues:
        plus_recent[(g, m, j)] = max(plus_recent.get((g, m, j), ""), t)
    mensuels = {m for g, m, _, _, _ in vues if g == "MONTHLY"}
    sortie = []
    for g, m, j, t, l in vues:
        if t != plus_recent[(g, m, j)]:
            continue
        if (g == "MONTHLY") != (m in mensuels):
            continue
        sortie.append({**l, "_mois": m})
    return sortie


def telecharger(url: str) -> bytes:
    """Un segment de rapport : l'URL est signée, sans en-tête d'autorisation."""
    requete = urllib.request.Request(url, headers={"User-Agent": UA_RAPPORT})
    with urllib.request.urlopen(requete, timeout=120) as reponse:
        return reponse.read()


def collecter_apple(lister, telecharger, mois: str) -> tuple[dict[str, dict[str, float]], list[str]]:
    """Séries Apple et notes sur ce qui manque. `lister(chemin, params)` comme `app_store.lister`."""
    notes: list[str] = []
    demandes, _ = lister(f"/v1/apps/{app_store.APP_ID}/analyticsReportRequests", {"limit": "50"})
    continues = [d for d in demandes if d["attributes"].get("accessType") == "ONGOING"]
    if not continues:
        return {}, ["Aucune demande de rapports d'analyse ONGOING sur l'app : rien à lire côté Apple."]
    demande = continues[0]["id"]
    depuis = f"{decaler(mois, -MOIS_TABLEAU)}-01"
    rapports: dict[str, list[dict[str, str]]] = {}
    for nom, (code, _) in RAPPORTS_APPLE.items():
        try:
            trouves, _ = lister(f"/v1/analyticsReportRequests/{demande}/reports", {"filter[name]": nom})
            instances = []
            for rapport in trouves:
                for granularite in ("MONTHLY", "DAILY"):
                    liste, _ = lister(f"/v1/analyticsReports/{rapport['id']}/instances",
                                      {"filter[granularity]": granularite, "limit": "200"})
                    for instance in liste:
                        traitement = (instance["attributes"].get("processingDate") or "")[:10]
                        if not traitement or traitement < depuis:
                            continue
                        lignes = []
                        segments, _ = lister(f"/v1/analyticsReportInstances/{instance['id']}/segments", {"limit": "200"})
                        for segment in segments:
                            lignes += lire_tsv(telecharger(segment["attributes"]["url"]))
                        instances.append((granularite, traitement, lignes))
        except Exception as erreur:  # une source en panne ne coupe pas le mail
            notes.append(f"Rapport « {nom} » : illisible ({resume_erreur(erreur)}).")
            continue
        if not instances:
            notes.append(f"Rapport « {nom} » : pas encore livré par Apple.")
            continue
        rapports[code] = choisir_lignes(instances)
    series = agreger_apple(rapports)
    for nom, (code, cles) in RAPPORTS_APPLE.items():
        if code in rapports and not any(series.get(f"{p}:{c}", {}).get(mois) is not None
                                        for p in ("ios", "mac") for c in cles):
            notes.append(f"Rapport « {nom} » : aucune donnée exploitable pour {nom_mois(mois)}"
                         " (colonnes ou appareils non reconnus, ou mois vide).")
    return series, notes


def resume_erreur(erreur: Exception) -> str:
    return " ".join(str(erreur).split())[:200]


# --- Apple : avis et versions -------------------------------------------------


def agreger_avis(avis: list[dict], mois: str) -> tuple[dict[str, dict[str, float]], int, float | None]:
    """Nouveaux avis et note moyenne par mois (quatre mois), total et moyenne générale."""
    par_mois: dict[str, list[int]] = {}
    for a in avis:
        par_mois.setdefault((a.get("createdDate") or "")[:7], []).append(a.get("rating") or 0)
    series: dict[str, dict[str, float]] = {"avis_nouveaux": {}, "avis_note": {}}
    for i in range(MOIS_EVENEMENTS):
        m = decaler(mois, -i)
        notes = par_mois.get(m, [])
        series["avis_nouveaux"][m] = len(notes)
        if notes:
            series["avis_note"][m] = sum(notes) / len(notes)
    toutes = [n for liste in par_mois.values() for n in liste]
    return series, len(toutes), (sum(toutes) / len(toutes) if toutes else None)


EN_VENTE = {"READY_FOR_SALE", "READY_FOR_DISTRIBUTION"}


def resumer_versions(versions: list[app_store.Version]) -> str | None:
    # Apple a renommé READY_FOR_SALE en READY_FOR_DISTRIBUTION ; l'API rend l'un ou l'autre.
    vendues = [v for v in versions if v.etat in EN_VENTE]
    if not versions:
        return None
    en_vente = max(vendues, key=lambda v: app_store.cle_version(v.chaine), default=None)
    seuil = app_store.cle_version(en_vente.chaine) if en_vente else ()
    suite = sorted((v for v in versions if v.etat not in app_store.VENDUES and app_store.cle_version(v.chaine) > seuil),
                   key=lambda v: app_store.cle_version(v.chaine))
    morceaux = [f"{en_vente.chaine} en vente" if en_vente else "aucune version en vente"]
    if suite:
        morceaux.append("en cours : " + ", ".join(f"{v.chaine} ({v.etat})" for v in suite))
    return " ; ".join(morceaux)


# --- Rendu --------------------------------------------------------------------


@dataclass
class Donnees:
    mois: str
    series: dict[str, dict[str, float]]
    tops: dict[str, list]
    notes_umami: list[str] = field(default_factory=list)
    notes_apple: list[str] = field(default_factory=list)
    notes_avis: list[str] = field(default_factory=list)
    versions: dict[str, str | None] = field(default_factory=dict)
    avis_total: int | None = None
    avis_moyenne: float | None = None


@dataclass
class Tableau:
    entetes: list[str]
    lignes: list[list[str]]
    titre: str | None = None


@dataclass
class Section:
    titre: str
    blocs: list  # Tableau | str (une note)


ENTETES_SERIE = ["Indicateur", "Mois", "Mois précédent", "Écart", "Moyenne des 3 mois d'avant"]


def lignes_serie(d: Donnees, specs: list[tuple[str, str, str]]) -> list[list[str]]:
    sortie = []
    for libelle, cle, genre in specs:
        s = d.series.get(cle, {})
        actuel, precedent = s.get(d.mois), s.get(decaler(d.mois, -1))
        sortie.append([libelle, formater(actuel, genre), formater(precedent, genre),
                       ecart(actuel, precedent, genre), formater(moyenne3(s, d.mois), genre)])
    return sortie


def tableau_serie(d: Donnees, specs, titre: str | None = None) -> Tableau:
    return Tableau(ENTETES_SERIE, lignes_serie(d, specs), titre)


def tableau_top(titre: str, colonne: str, elements: list, max_lignes: int | None = None) -> Tableau:
    lignes = [[str(x), nombre(y)] for x, y in (elements[:max_lignes] if max_lignes else elements)]
    return Tableau([titre, colonne], lignes or [["Aucune donnée", ND]])


def ligne_synthese(d: Donnees, libelle: str, cle: str, genre: str = "n") -> str:
    s = d.series.get(cle, {})
    actuel = s.get(d.mois)
    texte = f"{libelle} : {formater(actuel, genre)}"
    e = ecart(actuel, s.get(decaler(d.mois, -1)), genre)
    if actuel is not None and e != ND:
        texte += f" ({e} sur {nom_court(decaler(d.mois, -1))})"
    return texte


SPECS_SITE = [
    ("Visiteurs", "visiteurs", "n"), ("Visites", "visites", "n"), ("Pages vues", "pages_vues", "n"),
    ("Durée moyenne d'une visite", "duree_visite", "s"), ("Taux de rebond", "rebond", "pct"),
]
SPECS_USAGE = (
    [(libelle, f"evt:{nom}", "n") for nom, libelle in EVENEMENTS[:6]]
    + [("Entraînements abandonnés (nets : abandons moins reprises)", "abandons_nets", "n")]
    + [(libelle, f"evt:{nom}", "n") for nom, libelle in EVENEMENTS[6:]]
    + [("Examens finis sur commencés", "taux_examen", "pct")]
)


def specs_app(p: str) -> list[tuple[str, str, str]]:
    return [
        ("Téléchargements", f"{p}:dl", "n"),
        ("Premières installations", f"{p}:dl_premiere", "n"),
        ("Réinstallations", f"{p}:dl_reinstall", "n"),
        ("Suppressions", f"{p}:suppr", "n"),
        ("Sessions", f"{p}:sessions", "n"),
        ("Durée moyenne d'une session", f"{p}:duree_session", "s"),
        ("Appareils actifs (cumul des lignes du rapport)", f"{p}:appareils", "n"),
        ("Impressions App Store", f"{p}:impr", "n"),
        ("Pages vues App Store", f"{p}:pv", "n"),
    ]


def sections(d: Donnees) -> list[Section]:
    s = d.series
    visiteurs = s.get("visiteurs", {}).get(d.mois)
    parts = parts_pays(d.tops.get("pays", []), visiteurs)
    site = Section("Site", [*d.notes_umami, tableau_serie(d, SPECS_SITE)])
    if parts:
        site.blocs.append(
            f"Pays : {nombre(parts['FR'])}{NBSP}% des visiteurs viennent de France, "
            f"{nombre(parts['US'])}{NBSP}% des États-Unis (le trafic américain compte des robots que "
            "Umami ne filtre pas)."
        )
    site.blocs += [
        tableau_top("Canal", "Visiteurs", d.tops.get("canaux", [])),
        tableau_top("Page (top 10)", "Visiteurs", d.tops.get("pages", []), 10),
        tableau_top("Référent", "Visiteurs", d.tops.get("referents", []), 10),
        tableau_top("Pays", "Visiteurs", d.tops.get("pays", []), 10),
        tableau_top("Appareil", "Visiteurs", d.tops.get("appareils", [])),
    ]
    sortie = [
        Section("Synthèse", [
            ligne_synthese(d, "Visiteurs", "visiteurs"),
            ligne_synthese(d, "Téléchargements iOS + Mac", "dl_total"),
            ligne_synthese(d, "Examens finis", "evt:examen-termine"),
        ]),
        site,
        Section("Usage", [tableau_serie(d, SPECS_USAGE)]),
    ]
    for titre, plateforme, p in (("App iOS", "IOS", "ios"), ("App Mac", "MAC_OS", "mac")):
        blocs: list = []
        version = d.versions.get(plateforme)
        blocs.append(f"Version : {version}." if version else "Version : n.d.")
        if titre == "App iOS":
            blocs += d.notes_apple
        elif d.notes_apple:
            blocs.append("Mêmes remarques sur les rapports Apple que pour l'app iOS.")
        blocs.append(tableau_serie(d, specs_app(p)))
        sortie.append(Section(titre, blocs))
    avis = [*d.notes_avis]
    avis.append(f"Total : {nombre(d.avis_total)} avis, note moyenne {nombre(d.avis_moyenne, 1)}."
                if d.avis_total is not None else "Total des avis : n.d.")
    avis.append(tableau_serie(d, [("Nouveaux avis", "avis_nouveaux", "n"),
                                  ("Note moyenne des nouveaux avis", "avis_note", "note")]))
    sortie.append(Section("Avis", avis))
    mois = [decaler(d.mois, -i) for i in range(MOIS_TABLEAU)]
    historique = Tableau(
        ["Mois", "Visiteurs", "Téléchargements iOS", "Téléchargements Mac"],
        [[nom_mois(m), *(formater(s.get(cle, {}).get(m), "n") for cle in ("visiteurs", "ios:dl", "mac:dl"))]
         for m in reversed(mois)],
    )
    sortie.append(Section("Six derniers mois", [historique]))
    return sortie


def rendre_texte(sujet: str, parties: list[Section]) -> str:
    morceaux = [sujet, ""]
    for section in parties:
        morceaux.append(section.titre)
        for bloc in section.blocs:
            if isinstance(bloc, Tableau):
                morceaux.append(" | ".join(bloc.entetes))
                morceaux += [" | ".join(ligne) for ligne in bloc.lignes]
                morceaux.append("")
            else:
                morceaux.append(bloc)
        if section.titre == "Synthèse":
            morceaux.append("")
        elif not isinstance(section.blocs[-1], Tableau):
            morceaux.append("")
    return "\n".join(morceaux).rstrip() + "\n"


def rendre_html(sujet: str, parties: list[Section]) -> str:
    e = htmllib.escape
    corps = [f"<h1>{e(sujet)}</h1>"]
    for section in parties:
        corps.append(f"<h2>{e(section.titre)}</h2>")
        for bloc in section.blocs:
            if isinstance(bloc, Tableau):
                tete = "".join(f"<th>{e(h)}</th>" for h in bloc.entetes)
                lignes = "".join(
                    "<tr>" + "".join(f"<td>{e(c)}</td>" for c in ligne) + "</tr>" for ligne in bloc.lignes
                )
                corps.append(f"<table><thead><tr>{tete}</tr></thead><tbody>{lignes}</tbody></table>")
            else:
                corps.append(f"<p>{e(bloc)}</p>")
    style = (
        "body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;max-width:680px;margin:0 auto;padding:16px;line-height:1.45}"
        "h1{font-size:20px}h2{font-size:16px;margin:28px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}"
        "table{border-collapse:collapse;width:100%;margin:8px 0 16px;font-size:14px}"
        "th,td{padding:5px 8px;border-bottom:1px solid #eee;text-align:right}"
        "th:first-child,td:first-child{text-align:left}th{font-weight:600;background:#f6f6f6}"
        "p{margin:6px 0;font-size:14px}"
    )
    return (f'<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>{e(sujet)}</title>'
            f"<style>{style}</style></head><body>{''.join(corps)}</body></html>")


def rendre(d: Donnees) -> tuple[str, str, str]:
    sujet = f"Le Permis Côtier : rapport {de_mois(d.mois)}"
    parties = sections(d)
    return sujet, rendre_html(sujet, parties), rendre_texte(sujet, parties)


# --- Réseau -------------------------------------------------------------------


def umami_get_depuis_env():
    utilisateur, mot_de_passe = os.environ.get("UMAMI_USER"), os.environ.get("UMAMI_PASSWORD")
    if not utilisateur or not mot_de_passe:
        raise SystemExit("Poser UMAMI_USER et UMAMI_PASSWORD.")

    def requete(chemin: str, corps: dict | None = None, jeton: str | None = None):
        r = urllib.request.Request(UMAMI + chemin, data=json.dumps(corps).encode() if corps else None)
        r.add_header("user-agent", UA_NAVIGATEUR)
        r.add_header("content-type", "application/json")
        if jeton:
            r.add_header("authorization", f"Bearer {jeton}")
        with urllib.request.urlopen(r, timeout=60) as reponse:
            return json.load(reponse)

    jeton = requete("/api/auth/login", {"username": utilisateur, "password": mot_de_passe})["token"]
    return lambda chemin: requete(chemin, jeton=jeton)


def lire_avis() -> list[dict]:
    donnees, _ = app_store.lister(f"/v1/apps/{app_store.APP_ID}/customerReviews",
                                  {"sort": "-createdDate", "limit": "200"})
    return [d["attributes"] for d in donnees]


def reessayer(f, essais: int = 3):
    """Rejoue un appel coupé en route (connexion réinitialisée, délai dépassé)."""
    for i in range(essais):
        try:
            return f()
        except OSError:
            if i == essais - 1:
                raise
            time.sleep(2 * (i + 1))


def lister_avec_reprise(chemin: str, parametres: dict[str, str]):
    return reessayer(lambda: app_store.lister(chemin, parametres))


def telecharger_avec_reprise(url: str) -> bytes:
    return reessayer(lambda: telecharger(url))


def rassembler(mois: str) -> Donnees:
    """Interroge les trois sources ; l'une en panne laisse une note, pas une erreur."""
    d = Donnees(mois=mois, series={}, tops={})
    pannes = 0
    try:
        series, d.tops = collecter_umami(umami_get_depuis_env(), mois)
        d.series.update(series)
    except (Exception, SystemExit) as erreur:
        pannes += 1
        d.notes_umami.append(f"Umami indisponible ({resume_erreur(erreur)}) : les chiffres du site manquent.")
    try:
        series, d.notes_apple = collecter_apple(lister_avec_reprise, telecharger_avec_reprise, mois)
        d.series.update(series)
    except (Exception, SystemExit) as erreur:
        pannes += 1
        d.notes_apple.append(f"Rapports d'analyse Apple indisponibles ({resume_erreur(erreur)}).")
    try:
        series, d.avis_total, d.avis_moyenne = agreger_avis(reessayer(lire_avis), mois)
        d.series.update(series)
        for plateforme in app_store.PLATEFORMES:
            versions, _ = reessayer(lambda: app_store.lire_versions(plateforme))
            d.versions[plateforme] = resumer_versions(versions)
    except (Exception, SystemExit) as erreur:
        pannes += 1
        d.notes_avis.append(f"Avis et versions indisponibles ({resume_erreur(erreur)}).")
    if pannes == 3:
        raise SystemExit("Aucune source n'a répondu : pas de rapport.\n" + "\n".join(
            [*d.notes_umami, *d.notes_apple, *d.notes_avis]))
    deriver(d.series)
    return d


def poster(url: str, corps: dict, entetes: dict[str, str]) -> tuple[int, bytes]:
    requete = urllib.request.Request(url, data=json.dumps(corps).encode(), headers=entetes, method="POST")
    try:
        with urllib.request.urlopen(requete, timeout=60) as reponse:
            return reponse.status, reponse.read()
    except urllib.error.HTTPError as erreur:
        return erreur.code, erreur.read()


def envoyer(sujet: str, html: str, texte: str, destinataire: str, cle: str, mois: str, poster=poster) -> None:
    """Envoi par Resend. Un refus dit le code et le message, jamais la clé ni l'adresse."""
    statut, brut = poster(RESEND, {
        "from": EXPEDITEUR, "to": [destinataire], "subject": sujet, "html": html, "text": texte,
    }, {
        "Authorization": f"Bearer {cle}",
        "Content-Type": "application/json",
        "User-Agent": UA_RAPPORT,
        "Idempotency-Key": f"rapport-mensuel-{mois}",
    })
    if statut >= 300:
        try:
            message = json.loads(brut).get("message", "")
        except (ValueError, AttributeError):
            message = ""
        raise SystemExit(f"Resend a refusé l'envoi : HTTP {statut} {message}".rstrip())


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parseur.add_argument("--mois", help="AAAA-MM ; par défaut le mois calendaire précédent (Paris)")
    parseur.add_argument("--essai", metavar="CHEMIN.html", help="écrit le mail dans ce fichier, n'envoie rien")
    args = parseur.parse_args(argv)

    mois = verifier_mois(args.mois) if args.mois else mois_precedent()
    cle, destinataire = os.environ.get("RESEND_API_KEY", ""), os.environ.get("RAPPORT_DESTINATAIRE", "")
    if not args.essai and not (cle and destinataire):
        raise SystemExit("Poser RESEND_API_KEY et RAPPORT_DESTINATAIRE, ou lancer avec --essai.")

    donnees = rassembler(mois)
    sujet, html, texte = rendre(donnees)
    if args.essai:
        Path(args.essai).write_text(html, encoding="utf-8")
        print(f"Essai écrit : {args.essai} (rien n'est envoyé).")
        return 0
    envoyer(sujet, html, texte, destinataire, cle, mois)
    print(f"Rapport {mois} envoyé.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
