#!/usr/bin/env python3
"""Valide la banque de questions.

Mêmes règles que le schéma zod du site (`src/lib/schema.ts`), appliquées aux
fichiers YAML avant le build. Une violation casse le déploiement.

    python3 scripts/valider.py             # toute la banque
    python3 scripts/valider.py --inbox     # y compris les brouillons générés
    python3 scripts/valider.py fichier.yaml [...]

Code de sortie 0 si tout passe, 1 sinon.
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import yaml

RACINE = Path(__file__).resolve().parents[1]

# Ordre de l'arrêté du 28 septembre 2007, art. 1er § 1.2.
CODES_THEMES = [
    "balisage",
    "balisage-region-b",
    "barre-route",
    "signaux",
    "feux-marques",
    "securite",
    "titre-conduite",
    "vhf",
    "ski-responsabilites",
    "carburant",
    "environnement",
    "meteo",
    "carte-marine",
    "ecluses",
]

NOTIONS_TS = RACINE / "src" / "lib" / "notions.ts"
_RE_NOTION = re.compile(
    r"^\s+code: '([a-z0-9-]+)',\n\s+theme: '([a-z0-9-]+)',", re.M
)


def notions_declarees() -> dict[str, str]:
    """Les notions du référentiel, lues dans `src/lib/notions.ts`.

    Le TypeScript reste la source de vérité : c'est lui que le site consomme.
    On l'extrait au lieu de le recopier, un référentiel de cent notions
    recopié à la main finissant toujours par diverger. Un test vérifie que
    l'extraction ramène bien le compte attendu, une reformulation du fichier
    casse donc bruyamment au lieu de vider silencieusement la liste.
    """
    if not NOTIONS_TS.exists():
        return {}
    texte = NOTIONS_TS.read_text(encoding="utf-8")
    return {code: theme for code, theme in _RE_NOTION.findall(texte)}


NOTIONS = notions_declarees()

STATUTS = ["brouillon", "relu", "publie", "retire"]
STATUTS_RELUS = {"relu", "publie"}

RE_ID = re.compile(r"^[a-z][a-z0-9-]*-\d{4}$")
RE_PROPOSITION = re.compile(r"^[a-d]$")
RE_REF = re.compile(r"^[a-z0-9-]+$")
RE_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# L'arrêté ne dit pas combien de cases une question comporte, et l'épreuve
# ne l'annonce pas non plus. Un énoncé qui le dit supprime le seul jugement
# que les questions à deux réponses servent à entraîner.
RE_COMPTE_REPONSES = re.compile(
    r"\b(deux|trois)\s+(?:\w+\s+)?(r[ée]ponses?|affirmations?|propositions?|cases?)\b",
    re.I,
)
RE_CREDIT = re.compile(r"^(genere|code|auteur|commons:.+)$")
RE_FICHIER_VISUEL = re.compile(r"^[a-z0-9][a-z0-9/_-]*\.(svg|png|webp|jpg)$")

CHAMPS = {
    "id", "option", "theme", "statut", "difficulte", "enonce", "visuel", "notion",
    "propositions", "reponses", "explication", "sources", "meta",
}
CHAMPS_META = {"cree_le", "genere_par", "relu_par", "relu_le", "relu_par_2"}
CHAMPS_SOURCE = {"texte", "ref", "url", "version"}
CHAMPS_VISUEL = {"fichier", "alt", "credit"}


@dataclass(frozen=True)
class Probleme:
    fichier: Path
    code: str
    message: str

    def __str__(self) -> str:
        return f"{self.fichier}: [{self.code}] {self.message}"


def _texte(valeur: Any) -> str:
    return valeur.strip() if isinstance(valeur, str) else ""


def valider_question(q: Any, fichier: Path, racine: Path) -> list[Probleme]:
    """Contrôle une question déjà désérialisée. Ne touche pas au disque, sauf
    pour vérifier qu'un visuel référencé existe sous `public/visuels/`."""
    p: list[Probleme] = []

    def ko(code: str, message: str) -> None:
        p.append(Probleme(fichier=fichier, code=code, message=message))

    if not isinstance(q, dict):
        ko("racine", "le fichier ne contient pas un objet YAML")
        return p

    inconnus = sorted(set(q) - CHAMPS)
    if inconnus:
        ko("champs-inconnus", f"champs non prévus : {', '.join(inconnus)}")

    theme = q.get("theme")
    if theme not in CODES_THEMES:
        ko("theme", f"thème inconnu : {theme!r}")

    ident = q.get("id")
    if not isinstance(ident, str) or not RE_ID.match(ident):
        ko("id", f"identifiant attendu <theme>-<4 chiffres>, reçu {ident!r}")
    elif theme in CODES_THEMES and not ident.startswith(f"{theme}-"):
        ko("id", f"l'identifiant doit commencer par « {theme}- », reçu {ident!r}")

    notion = q.get("notion")
    if notion is not None:
        if not isinstance(notion, str) or notion not in NOTIONS:
            ko("notion", f"notion inconnue : {notion!r}")
        elif NOTIONS[notion] != theme:
            ko(
                "notion",
                f"la notion {notion!r} relève du thème {NOTIONS[notion]!r}, pas de {theme!r}",
            )

    if q.get("option") != "cotier":
        ko("option", "seule l'option « cotier » existe en V1")

    statut = q.get("statut")
    if statut not in STATUTS:
        ko("statut", f"statut attendu parmi {', '.join(STATUTS)}, reçu {statut!r}")

    difficulte = q.get("difficulte")
    if not isinstance(difficulte, int) or isinstance(difficulte, bool) or not 1 <= difficulte <= 3:
        ko("difficulte", f"difficulté attendue entre 1 et 3, reçu {difficulte!r}")

    if len(_texte(q.get("enonce"))) < 10:
        ko("enonce", "énoncé vide ou trop court")

    if len(_texte(q.get("explication"))) < 20:
        ko("explication", "explication vide ou trop courte")

    propositions = q.get("propositions")
    ids_propositions: list[str] = []
    if not isinstance(propositions, list) or not 2 <= len(propositions) <= 4:
        ko("propositions", "il faut de 2 à 4 propositions")
    else:
        for prop in propositions:
            if not isinstance(prop, dict) or set(prop) - {"id", "texte"}:
                ko("propositions", f"proposition mal formée : {prop!r}")
                continue
            pid = prop.get("id")
            if not isinstance(pid, str) or not RE_PROPOSITION.match(pid):
                ko("propositions", f"identifiant de proposition attendu entre a et d, reçu {pid!r}")
            else:
                ids_propositions.append(pid)
            if not _texte(prop.get("texte")):
                ko("propositions", f"proposition {pid!r} sans texte")
        if len(set(ids_propositions)) != len(ids_propositions):
            ko("propositions", "identifiants de proposition dupliqués")

    reponses = q.get("reponses")
    if not isinstance(reponses, list) or not 1 <= len(reponses) <= 2:
        ko("reponses", "il faut 1 ou 2 bonnes réponses")
    else:
        if len(set(reponses)) != len(reponses):
            ko("reponses", "réponse dupliquée")
        for r in reponses:
            if r not in ids_propositions:
                ko("reponses", f"la réponse {r!r} n'est pas dans les propositions")

    # Huit énoncés l'ont annoncé avant qu'on l'interdise, dont un relu par une
    # personne : la règle ne tient que si elle est mécanique.
    if RE_COMPTE_REPONSES.search(_texte(q.get("enonce"))):
        ko("enonce", "l'énoncé annonce le nombre de bonnes réponses, "
                     "ce que l'épreuve ne fait jamais")

    sources = q.get("sources")
    if not isinstance(sources, list) or not sources:
        ko("sources", "au moins une source est obligatoire")
    else:
        for s in sources:
            if not isinstance(s, dict):
                ko("sources", f"source mal formée : {s!r}")
                continue
            if set(s) - CHAMPS_SOURCE:
                ko("sources", f"champs de source non prévus : {sorted(set(s) - CHAMPS_SOURCE)}")
            if len(_texte(s.get("texte"))) < 3:
                ko("sources", "chaque source doit porter un « texte » citable")
            ref = s.get("ref")
            if not isinstance(ref, str) or not RE_REF.match(ref):
                ko("sources", f"référence attendue en minuscules, chiffres et tirets, reçu {ref!r}")
            # Une référence bien formée mais sans dossier renvoie le candidat
            # vers un texte qui n'existe pas : la citation ne se vérifie plus.
            elif not (racine / "data" / "sources" / ref).is_dir():
                ko("sources", f"source absente du disque : data/sources/{ref}/")
            version = s.get("version")
            if version is not None and not (isinstance(version, str) and RE_DATE.match(version)):
                ko("sources", f"version de source attendue au format AAAA-MM-JJ, reçu {version!r}")

    visuel = q.get("visuel")
    if visuel is not None:
        if not isinstance(visuel, dict):
            ko("visuel", "le visuel doit être un objet")
        else:
            if set(visuel) - CHAMPS_VISUEL:
                ko("visuel", f"champs de visuel non prévus : {sorted(set(visuel) - CHAMPS_VISUEL)}")
            fichier_visuel = visuel.get("fichier")
            if not isinstance(fichier_visuel, str) or not RE_FICHIER_VISUEL.match(fichier_visuel):
                ko("visuel.fichier", f"chemin de visuel invalide : {fichier_visuel!r}")
            elif not (racine / "public" / "visuels" / fichier_visuel).is_file():
                ko("visuel.fichier", f"visuel absent du disque : public/visuels/{fichier_visuel}")
            if len(_texte(visuel.get("alt"))) < 3:
                ko("visuel.alt", "texte alternatif vide ou trop court")
            credit = visuel.get("credit")
            if not isinstance(credit, str) or not RE_CREDIT.match(credit):
                ko("visuel.credit", f"crédit attendu : genere, code, auteur ou commons:<auteur>, reçu {credit!r}")

    meta = q.get("meta")
    if not isinstance(meta, dict):
        ko("meta", "bloc meta manquant")
    else:
        if set(meta) - CHAMPS_META:
            ko("meta", f"champs de meta non prévus : {sorted(set(meta) - CHAMPS_META)}")
        if not RE_DATE.match(str(meta.get("cree_le", ""))):
            ko("meta.cree_le", "date de création attendue au format AAAA-MM-JJ")
        if meta.get("genere_par") not in {"claude", "humain"}:
            ko("meta.genere_par", "genere_par attendu : claude ou humain")
        if statut in STATUTS_RELUS and not _texte(meta.get("relu_par")):
            ko("meta.relu_par", f"le statut « {statut} » exige meta.relu_par")
        for champ in ("relu_le",):
            if meta.get(champ) is not None and not RE_DATE.match(str(meta[champ])):
                ko(f"meta.{champ}", "date attendue au format AAAA-MM-JJ")

    return p


def fichiers_questions(racine: Path, avec_inbox: bool = False) -> list[Path]:
    base = racine / "data" / "questions"
    if not base.is_dir():
        return []
    fichiers = sorted(f for f in base.rglob("*.yaml") if avec_inbox or "_inbox" not in f.parts)
    return fichiers


def valider_banque(racine: Path, avec_inbox: bool = False) -> list[Probleme]:
    problemes: list[Probleme] = []
    vus: dict[str, Path] = {}

    for fichier in fichiers_questions(racine, avec_inbox):
        relatif = fichier.relative_to(racine)
        try:
            q = yaml.safe_load(fichier.read_text(encoding="utf-8"))
        except yaml.YAMLError as erreur:
            problemes.append(Probleme(relatif, "yaml", f"YAML illisible : {erreur}"))
            continue

        problemes.extend(valider_question(q, relatif, racine))

        if not isinstance(q, dict):
            continue
        ident, theme = q.get("id"), q.get("theme")
        if isinstance(ident, str):
            if ident in vus:
                problemes.append(Probleme(relatif, "id-duplique", f"identifiant déjà pris par {vus[ident]}"))
            else:
                vus[ident] = relatif
            if fichier.stem != ident and "_inbox" not in fichier.parts:
                problemes.append(Probleme(relatif, "nom-de-fichier", f"le fichier doit s'appeler {ident}.yaml"))
        if isinstance(theme, str) and "_inbox" not in fichier.parts and fichier.parent.name != theme:
            problemes.append(Probleme(relatif, "dossier", f"attendu dans data/questions/{theme}/"))

    return problemes


def compter_publiees(racine: Path) -> dict[str, int]:
    compte = {code: 0 for code in CODES_THEMES}
    for fichier in fichiers_questions(racine):
        try:
            q = yaml.safe_load(fichier.read_text(encoding="utf-8"))
        except yaml.YAMLError:
            continue
        if isinstance(q, dict) and q.get("statut") == "publie" and q.get("theme") in compte:
            compte[q["theme"]] += 1
    return compte


def _rapport(problemes: Iterable[Probleme], total: int, racine: Path) -> int:
    problemes = list(problemes)
    if problemes:
        for p in problemes:
            print(str(p), file=sys.stderr)
        print(f"\n{len(problemes)} problème(s) sur {total} question(s).", file=sys.stderr)
        return 1
    publiees = compter_publiees(racine)
    print(f"{total} question(s) valide(s), dont {sum(publiees.values())} publiée(s).")
    return 0


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description="Valide la banque de questions.")
    parseur.add_argument("fichiers", nargs="*", type=Path, help="fichiers à valider (défaut : toute la banque)")
    parseur.add_argument("--inbox", action="store_true", help="valide aussi data/questions/_inbox/")
    parseur.add_argument("--racine", type=Path, default=RACINE)
    args = parseur.parse_args(argv)

    if args.fichiers:
        problemes: list[Probleme] = []
        for fichier in args.fichiers:
            try:
                q = yaml.safe_load(fichier.read_text(encoding="utf-8"))
            except yaml.YAMLError as erreur:
                problemes.append(Probleme(fichier, "yaml", f"YAML illisible : {erreur}"))
                continue
            problemes.extend(valider_question(q, fichier, args.racine))
        return _rapport(problemes, len(args.fichiers), args.racine)

    total = len(fichiers_questions(args.racine, args.inbox))
    return _rapport(valider_banque(args.racine, args.inbox), total, args.racine)


if __name__ == "__main__":
    raise SystemExit(main())
