#!/usr/bin/env python3
"""Fait suivre `main` à l'app iOS : décide, puis soumet par l'API App Store Connect.

    python scripts/app_store.py preparer --commit <sha>
    python scripts/app_store.py soumettre --version 1.0.1 --build 3 --commit <sha>

`preparer` lit les versions App Store et les builds, et dit s'il faut
construire, seulement soumettre un build déjà téléversé, ou ne rien faire.
`soumettre` attend la fin du traitement d'un build, pose dans « À tester » de
TestFlight le texte de `ios/a-tester.txt` suivi de la référence du commit, puis
l'envoie en revue si aucune revue n'est en cours.

Authentification par une clé d'API : `ASC_KEY_ID`, `ASC_ISSUER_ID`, et la clé
privée dans `ASC_KEY_P8` (contenu) ou `ASC_KEY_PATH` (chemin). Ni la clé ni le
jeton ne sont jamais écrits nulle part.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

RACINE = Path(__file__).resolve().parents[1]
NOUVEAUTES = RACINE / "ios" / "nouveautes.txt"
A_TESTER = RACINE / "ios" / "a-tester.txt"

APP_ID = "6818903859"
API = "https://api.appstoreconnect.apple.com"
LOCALE = "fr-FR"
SONDAGE_S = 30
ATTENTE_MAX_S = 45 * 60
# « À tester » (`whatsNew` d'une `betaBuildLocalization`) plafonne à 4 000
# caractères ; la ligne de référence prend sa part.
LIMITE_A_TESTER = 3900

# États d'une version App Store. `appVersionState` les nomme depuis 2024,
# `appStoreState`, déprécié, avec d'autres mots pour les mêmes choses.
EDITABLES = {
    "PREPARE_FOR_SUBMISSION",
    "READY_FOR_REVIEW",
    "DEVELOPER_REJECTED",
    "REJECTED",
    "METADATA_REJECTED",
    "INVALID_BINARY",
}
# Une version en préparation dont le build porte déjà le commit : une
# soumission interrompue, qu'on reprend. Rejetée, elle attend un humain ou
# un nouveau commit, sans quoi le passage quotidien la renverrait chaque matin.
A_REPRENDRE = {"PREPARE_FOR_SUBMISSION", "READY_FOR_REVIEW"}
# Refusée par Apple : le message attend une réponse humaine dans Vérification
# de l'app. Les builds partent sur TestFlight, la soumission se fait à la main.
REFUSEES = {"REJECTED", "METADATA_REJECTED"}
VENDUES = {
    "READY_FOR_SALE",
    "READY_FOR_DISTRIBUTION",
    "REPLACED_WITH_NEW_VERSION",
    "REMOVED_FROM_SALE",
    "DEVELOPER_REMOVED_FROM_SALE",
}
# Tout le reste (en revue, en attente de revue, de sortie, en traitement, et
# tout état que ce script ne connaît pas) interdit de soumettre.


@dataclass(frozen=True)
class Version:
    chaine: str
    etat: str
    build: int | None = None  # numéro du build rattaché


@dataclass(frozen=True)
class Build:
    numero: int
    version: str  # version marketing
    commit: str | None  # SHA court lu dans « À tester »


@dataclass(frozen=True)
class Decision:
    action: str  # rien, soumettre, construire
    version: str
    build: int
    soumission: bool
    raison: str


def cle_version(chaine: str) -> tuple[int, ...]:
    """« 1.0 » et « 1.0.0 » se valent, « 1.0.10 » passe après « 1.0.9 »."""
    morceaux = [int(m) for m in chaine.split(".")]
    while len(morceaux) < 3:
        morceaux.append(0)
    return tuple(morceaux)


def patch_suivant(chaine: str) -> str:
    majeur, mineur, patch = cle_version(chaine)[:3]
    return f"{majeur}.{mineur}.{patch + 1}"


def commit_du_texte(texte: str | None) -> str | None:
    """Le commit d'un build, lu dans son « À tester ».

    Le texte rédigé pour les testeurs finit par « Référence : <sha> » ; les
    builds d'avant ne portaient que « main <sha> », qu'on lit toujours.
    """
    trouve = re.search(r"(?:\bmain|Référence\s*:)\s*([0-9a-f]{7,40})\b", texte or "")
    return trouve.group(1) if trouve else None


def texte_a_tester(commit: str, notes: str) -> str:
    return f"{notes.strip()}\n\nRéférence\u00a0: {commit[:7]}"


def lire_a_tester(chemin: Path = A_TESTER) -> str:
    """Ce que les testeurs TestFlight doivent essayer, écrit à la main."""
    texte = chemin.read_text(encoding="utf-8").strip() if chemin.is_file() else ""
    if not texte:
        raise SystemExit(f"{chemin.name} est vide : rien à dire dans « À tester ».")
    if len(texte) >= LIMITE_A_TESTER:
        raise SystemExit(
            f"{chemin.name} fait {len(texte)} caractères, « À tester » en prend moins de {LIMITE_A_TESTER}."
        )
    return texte


def meme_commit(court: str | None, commit: str) -> bool:
    return bool(court) and len(court) >= 7 and commit.startswith(court)


def viser(versions: list[Version]) -> tuple[str, bool, str]:
    """Version marketing visée, soumission permise ou non, et pourquoi."""
    if not versions:
        return "1.0", True, "aucune version App Store"
    haute = max(versions, key=lambda v: cle_version(v.chaine))
    bloquantes = [
        v for v in versions if v.etat not in EDITABLES and v.etat not in VENDUES
    ]
    if haute.etat in EDITABLES:
        cible, raison = haute.chaine, f"la {haute.chaine} est modifiable ({haute.etat})"
    elif haute.etat in VENDUES:
        cible = patch_suivant(haute.chaine)
        raison = f"la {haute.chaine} est en vente ({haute.etat}), on vise la {cible}"
    else:
        cible = patch_suivant(haute.chaine)
        raison = f"la {haute.chaine} est en {haute.etat}, on vise la {cible}"
    if bloquantes:
        noms = ", ".join(f"{v.chaine} en {v.etat}" for v in bloquantes)
        return cible, False, f"{raison} ; TestFlight seul tant que {noms}"
    if haute.etat in REFUSEES:
        return cible, False, f"{raison} ; refus d'Apple à traiter à la main, TestFlight seul"
    return cible, True, raison


def decider(versions: list[Version], builds: list[Build], commit: str) -> Decision:
    """Construire, soumettre un build déjà là, ou rien. Fonction pure."""
    cible, permis, raison = viser(versions)
    par_numero = {b.numero: b for b in builds}
    suivant = max((b.numero for b in builds), default=0) + 1
    court = commit[:7]

    # Le commit est-il déjà dans la version la plus haute ?
    if versions:
        haute = max(versions, key=lambda v: cle_version(v.chaine))
        rattache = par_numero.get(haute.build) if haute.build is not None else None
        if rattache and meme_commit(rattache.commit, commit):
            if haute.etat in A_REPRENDRE and permis:
                return Decision(
                    "soumettre", haute.chaine, rattache.numero, True,
                    f"{court} est rattaché à la {haute.chaine} ({haute.etat}), à soumettre",
                )
            return Decision(
                "rien", cible, rattache.numero, permis,
                f"{court} est déjà dans la {haute.chaine} ({haute.etat})",
            )

    if builds:
        dernier = max(builds, key=lambda b: b.numero)
        if meme_commit(dernier.commit, commit) and cle_version(dernier.version) == cle_version(cible):
            if permis:
                return Decision(
                    "soumettre", cible, dernier.numero, True,
                    f"le build {dernier.numero} porte déjà {court} ; {raison}",
                )
            return Decision(
                "rien", cible, dernier.numero, False,
                f"le build {dernier.numero} porte déjà {court} ; {raison}",
            )

    return Decision("construire", cible, suivant, permis, raison)


# --- API App Store Connect --------------------------------------------------


class ErreurApi(Exception):
    pass


def cle_privee() -> str:
    contenu = os.environ.get("ASC_KEY_P8", "").strip()
    if contenu:
        return contenu
    chemin = os.environ.get("ASC_KEY_PATH", "").strip()
    if chemin:
        return Path(chemin).read_text(encoding="utf-8")
    raise SystemExit("Clé absente : poser ASC_KEY_P8 ou ASC_KEY_PATH.")


def jeton() -> str:
    """JWT ES256 de 20 minutes, refait à chaque appel : une attente en dure 45."""
    import jwt  # requirements-app.txt ; la CI du site ne l'installe pas

    id_cle = os.environ.get("ASC_KEY_ID", "").strip()
    emetteur = os.environ.get("ASC_ISSUER_ID", "").strip()
    if not id_cle or not emetteur:
        raise SystemExit("Poser ASC_KEY_ID et ASC_ISSUER_ID.")
    maintenant = int(time.time())
    return jwt.encode(
        {"iss": emetteur, "iat": maintenant, "exp": maintenant + 20 * 60, "aud": "appstoreconnect-v1"},
        cle_privee(),
        algorithm="ES256",
        headers={"kid": id_cle, "typ": "JWT"},
    )


def message_erreur(statut: int, corps: bytes) -> str:
    try:
        erreurs = json.loads(corps).get("errors", [])
    except (ValueError, AttributeError):
        erreurs = []
    if not erreurs:
        return f"HTTP {statut} : {corps[:500].decode('utf-8', 'replace')}"
    return "\n".join(
        f"HTTP {statut} {e.get('code', '?')} : {e.get('title', '')} — {e.get('detail', '')}"
        for e in erreurs
    )


def appeler(methode: str, chemin: str, corps: dict | None = None) -> dict:
    url = chemin if chemin.startswith("http") else API + chemin
    donnees = json.dumps(corps).encode() if corps is not None else None
    requete = urllib.request.Request(url, data=donnees, method=methode)
    requete.add_header("Authorization", f"Bearer {jeton()}")
    if donnees is not None:
        requete.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(requete, timeout=60) as reponse:
            brut = reponse.read()
    except urllib.error.HTTPError as erreur:
        raise ErreurApi(f"{methode} {chemin}\n{message_erreur(erreur.code, erreur.read())}") from None
    return json.loads(brut) if brut else {}


def lister(chemin: str, parametres: dict[str, str]) -> tuple[list[dict], list[dict]]:
    """Toutes les pages d'une liste : (data, included)."""
    url = f"{chemin}?{urllib.parse.urlencode(parametres)}"
    donnees: list[dict] = []
    inclus: list[dict] = []
    while url:
        page = appeler("GET", url)
        donnees += page.get("data", [])
        inclus += page.get("included", [])
        url = page.get("links", {}).get("next")
    return donnees, inclus


def numero(build: dict) -> int | None:
    try:
        return int(build["attributes"]["version"])
    except (KeyError, TypeError, ValueError):
        return None


def lire_versions() -> tuple[list[Version], dict[str, dict]]:
    """Les versions iOS, et leurs objets bruts par versionString."""
    donnees, inclus = lister(
        f"/v1/apps/{APP_ID}/appStoreVersions",
        {"filter[platform]": "IOS", "include": "build", "limit": "200"},
    )
    builds = {b["id"]: numero(b) for b in inclus if b.get("type") == "builds"}
    versions, brutes = [], {}
    for v in donnees:
        attributs = v["attributes"]
        lien = ((v.get("relationships") or {}).get("build") or {}).get("data")
        etat = attributs.get("appVersionState") or attributs.get("appStoreState") or "INCONNU"
        versions.append(Version(attributs["versionString"], etat, builds.get(lien["id"]) if lien else None))
        brutes[attributs["versionString"]] = v
    return versions, brutes


def lire_builds() -> list[Build]:
    donnees, inclus = lister(
        "/v1/builds",
        {
            "filter[app]": APP_ID,
            "include": "preReleaseVersion,betaBuildLocalizations",
            "limit": "200",
        },
    )
    par_cle = {(i["type"], i["id"]): i for i in inclus}
    builds = []
    for b in donnees:
        n = numero(b)
        if n is None:
            continue
        liens = b.get("relationships") or {}
        pre = (liens.get("preReleaseVersion") or {}).get("data")
        version = par_cle.get(("preReleaseVersions", pre["id"]), {}).get("attributes", {}).get("version") if pre else None
        commit = None
        for lien in (liens.get("betaBuildLocalizations") or {}).get("data") or []:
            loc = par_cle.get(("betaBuildLocalizations", lien["id"]), {}).get("attributes", {})
            commit = commit or commit_du_texte(loc.get("whatsNew"))
        builds.append(Build(n, version or "0", commit))
    return builds


def ecrire_sorties(sorties: dict[str, str]) -> None:
    for cle, valeur in sorties.items():
        print(f"{cle}={valeur}")
    fichier = os.environ.get("GITHUB_OUTPUT")
    if fichier:
        with open(fichier, "a", encoding="utf-8") as f:
            for cle, valeur in sorties.items():
                f.write(f"{cle}={valeur}\n")


def preparer(commit: str) -> int:
    # Avant les trois minutes d'archive : un « À tester » vide ou trop long
    # arrêterait `soumettre` après le téléversement.
    lire_a_tester()
    versions, _ = lire_versions()
    decision = decider(versions, lire_builds(), commit)
    ecrire_sorties({
        "action": decision.action,
        "version": decision.version,
        "build": str(decision.build),
        "soumission": "oui" if decision.soumission else "non",
        "raison": decision.raison,
    })
    return 0


# --- Soumettre ---------------------------------------------------------------


def attendre_build(version: str, build: int) -> dict:
    """Le build traité, ou un échec net : INVALID, FAILED, ou 45 min passées."""
    debut = time.monotonic()
    while True:
        donnees, _ = lister(
            "/v1/builds",
            {
                "filter[app]": APP_ID,
                "filter[version]": str(build),
                "filter[preReleaseVersion.version]": version,
                "include": "betaBuildLocalizations",
            },
        )
        etat = donnees[0]["attributes"].get("processingState") if donnees else "ABSENT"
        if etat == "VALID":
            return donnees[0]
        if etat in {"INVALID", "FAILED"}:
            raise SystemExit(f"Build {version} ({build}) refusé au traitement : {etat}.")
        if time.monotonic() - debut > ATTENTE_MAX_S:
            raise SystemExit(f"Build {version} ({build}) toujours {etat} après 45 min.")
        print(f"Build {version} ({build}) : {etat}, nouvel essai dans {SONDAGE_S} s.", flush=True)
        time.sleep(SONDAGE_S)


def poser_a_tester(build: dict, commit: str) -> None:
    texte = texte_a_tester(commit, lire_a_tester())
    donnees, _ = lister(f"/v1/builds/{build['id']}/betaBuildLocalizations", {"limit": "50"})
    existante = next((l for l in donnees if l["attributes"].get("locale") == LOCALE), None)
    if existante:
        appeler("PATCH", f"/v1/betaBuildLocalizations/{existante['id']}", {
            "data": {"type": "betaBuildLocalizations", "id": existante["id"],
                     "attributes": {"whatsNew": texte}},
        })
    else:
        appeler("POST", "/v1/betaBuildLocalizations", {
            "data": {"type": "betaBuildLocalizations",
                     "attributes": {"locale": LOCALE, "whatsNew": texte},
                     "relationships": {"build": {"data": {"type": "builds", "id": build["id"]}}}},
        })
    print(f"« À tester » posé, référence {commit[:7]}.")


def lire_nouveautes() -> str:
    texte = NOUVEAUTES.read_text(encoding="utf-8").strip() if NOUVEAUTES.is_file() else ""
    if not texte:
        raise SystemExit(f"{NOUVEAUTES.relative_to(RACINE)} est vide : rien à dire dans « Nouveautés ».")
    return texte


def poser_nouveautes(version_id: str, texte: str) -> None:
    donnees, _ = lister(f"/v1/appStoreVersions/{version_id}/appStoreVersionLocalizations", {"limit": "50"})
    existante = next((l for l in donnees if l["attributes"].get("locale") == LOCALE), None)
    if existante:
        appeler("PATCH", f"/v1/appStoreVersionLocalizations/{existante['id']}", {
            "data": {"type": "appStoreVersionLocalizations", "id": existante["id"],
                     "attributes": {"whatsNew": texte}},
        })
    else:
        appeler("POST", "/v1/appStoreVersionLocalizations", {
            "data": {"type": "appStoreVersionLocalizations",
                     "attributes": {"locale": LOCALE, "whatsNew": texte},
                     "relationships": {"appStoreVersion": {"data": {"type": "appStoreVersions", "id": version_id}}}},
        })


def envoyer_en_revue(version_id: str) -> None:
    ouvertes, _ = lister("/v1/reviewSubmissions", {
        "filter[app]": APP_ID, "filter[platform]": "IOS", "filter[state]": "READY_FOR_REVIEW",
    })
    if ouvertes:
        soumission_id = ouvertes[0]["id"]
    else:
        soumission_id = appeler("POST", "/v1/reviewSubmissions", {
            "data": {"type": "reviewSubmissions", "attributes": {"platform": "IOS"},
                     "relationships": {"app": {"data": {"type": "apps", "id": APP_ID}}}},
        })["data"]["id"]

    elements, _ = lister(f"/v1/reviewSubmissions/{soumission_id}/items", {"include": "appStoreVersion"})
    deja = any(
        (((e.get("relationships") or {}).get("appStoreVersion") or {}).get("data") or {}).get("id") == version_id
        for e in elements
    )
    if not deja:
        appeler("POST", "/v1/reviewSubmissionItems", {
            "data": {"type": "reviewSubmissionItems",
                     "relationships": {
                         "reviewSubmission": {"data": {"type": "reviewSubmissions", "id": soumission_id}},
                         "appStoreVersion": {"data": {"type": "appStoreVersions", "id": version_id}}}},
        })
    appeler("PATCH", f"/v1/reviewSubmissions/{soumission_id}", {
        "data": {"type": "reviewSubmissions", "id": soumission_id, "attributes": {"submitted": True}},
    })


def soumettre(version: str, build: int, commit: str, sans_revue: bool) -> int:
    objet_build = attendre_build(version, build)
    poser_a_tester(objet_build, commit)
    if sans_revue:
        print("TestFlight seul : --sans-revue.")
        return 0

    # L'état d'il y a 30 min ne vaut plus : une revue a pu s'ouvrir ou finir.
    versions, brutes = lire_versions()
    cible, permis, raison = viser(versions)
    if not permis or cle_version(cible) != cle_version(version):
        print(f"TestFlight seul : {raison}.")
        return 0

    premiere = not any(v.etat in VENDUES for v in versions)
    nouveautes = None if premiere else lire_nouveautes()

    existante = next((v for c, v in brutes.items() if cle_version(c) == cle_version(version)), None)
    if existante:
        version_id = existante["id"]
    else:
        version_id = appeler("POST", "/v1/appStoreVersions", {
            "data": {"type": "appStoreVersions",
                     "attributes": {"platform": "IOS", "versionString": version, "releaseType": "AFTER_APPROVAL"},
                     "relationships": {"app": {"data": {"type": "apps", "id": APP_ID}}}},
        })["data"]["id"]
        print(f"Version {version} créée.")

    appeler("PATCH", f"/v1/appStoreVersions/{version_id}/relationships/build",
            {"data": {"type": "builds", "id": objet_build["id"]}})
    if nouveautes:
        poser_nouveautes(version_id, nouveautes)
    envoyer_en_revue(version_id)
    print(f"{version} ({build}) envoyée en revue.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sous = parseur.add_subparsers(dest="commande", required=True)

    p = sous.add_parser("preparer", help="décider : construire, soumettre ou rien")
    p.add_argument("--commit", required=True, help="SHA du commit de main")

    s = sous.add_parser("soumettre", help="attendre le build, puis l'envoyer en revue si permis")
    s.add_argument("--version", required=True, help="version marketing, ex. 1.0.1")
    s.add_argument("--build", required=True, type=int, help="numéro du build")
    s.add_argument("--commit", required=True, help="SHA du commit de main")
    s.add_argument("--sans-revue", action="store_true", help="TestFlight seul")

    args = parseur.parse_args(argv)
    try:
        if args.commande == "preparer":
            return preparer(args.commit)
        return soumettre(args.version, args.build, args.commit, args.sans_revue)
    except ErreurApi as erreur:
        print(f"App Store Connect a refusé :\n{erreur}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
