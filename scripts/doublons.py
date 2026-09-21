#!/usr/bin/env python3
"""Cherche les questions qui se liraient comme une redite dans un même examen.

Un relecteur lit une question à la fois, et chacune est juste : ce sont les
*régularités* qui lui échappent. Quatre cardinales partagent leur énoncé mot
pour mot, deux signaux de brume partagent leur tournure — tirés ensemble sur
quarante questions, ils donnent l'impression d'une banque qui se répète.

La réponse n'est pas de fusionner : aucune de ces paires ne teste la même
chose. C'est le tirage de l'examen qui n'en prend qu'une, par le champ
`famille` (voir `tirerExamen` dans `src/lib/quiz.ts`).

    python3 scripts/doublons.py             # le rapport, pour juger
    python3 scripts/doublons.py --verifier  # en CI

Ce que `--verifier` refuse est strictement mécanique : deux énoncés identiques
au mot près qui ne partagent pas de famille. Tout le reste est affiché et
laissé au jugement — un seuil ne sait pas distinguer une redite d'une tournure
maison partagée par tout un thème.

Le critère du jugement, pour que la colonne « à juger » se relise. Deux
questions font famille quand, tirées ensemble, **l'une renseigne l'autre** :

  - énoncé identique au mot près, seul le visuel change (les quatre cardinales
    de jour) ;
  - même bonne réponse sur deux visuels différents (les deux rythmes d'eaux
    saines : reconnaître l'un donne l'autre) ;
  - la bonne réponse de l'une figure en distracteur de l'autre (les trois
    signaux de brume d'un navire de 25 mètres, où la réponse de `signaux-0005`
    est le distracteur *a* de `signaux-0006`) ;
  - même tableau, donc **même espace de réponse** : les quatre lignes de la
    règle 22 se répondent toutes par une valeur en milles prise dans la même
    colonne, et deux d'entre elles dans un examen se lisent comme un exercice
    de table. C'est le cas général dont les trois précédents sont des espèces.

Ce qui ne suffit pas : la tournure. « Tu relèves ce feu de nuit, que peux-tu en
dire ? » monte à 0,92 entre une marque spéciale et un navire qui pêche — deux
sujets sans rapport, aucune information ne passe de l'une à l'autre, et les
mettre en famille appauvrirait le tirage sans rien corriger. C'est pourquoi
`balisage-0021` (cardinale Est) et `balisage-0035` (eaux saines) restent dans
deux familles distinctes malgré 0,81 : leurs espaces de réponse sont disjoints.
"""
from __future__ import annotations

import argparse
import itertools
import re
import sys
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from valider import fichiers_questions  # noqa: E402

RACINE = Path(__file__).resolve().parents[1]

# En dessous, les énoncés ne se ressemblent plus assez pour qu'un candidat
# sente une redite. Relevé sur la banque de 516 questions : 17 paires au-dessus,
# dont dix étaient de vraies redites et sept la tournure maison d'un thème.
SEUIL_RAPPORT = 0.80


@dataclass(frozen=True)
class Question:
    id: str
    theme: str
    notion: str | None
    famille: str | None
    enonce: str
    propositions: str


@dataclass(frozen=True)
class Paire:
    a: Question
    b: Question
    enonce: float
    propositions: float

    @property
    def meme_famille(self) -> bool:
        return self.a.famille is not None and self.a.famille == self.b.famille

    @property
    def identiques(self) -> bool:
        return self.a.enonce == self.b.enonce


def normaliser(texte: str) -> str:
    """Minuscules, sans accents ni ponctuation : deux énoncés qui ne diffèrent
    que par une virgule sont le même énoncé pour le candidat qui les lit."""
    plat = unicodedata.normalize("NFKD", texte.lower())
    plat = "".join(c for c in plat if not unicodedata.combining(c))
    return " ".join(re.sub(r"[^a-z0-9]+", " ", plat).split())


def questions_publiees(racine: Path = RACINE) -> list[Question]:
    publiees: list[Question] = []
    for fichier in fichiers_questions(racine):
        try:
            q = yaml.safe_load(fichier.read_text(encoding="utf-8"))
        except yaml.YAMLError:
            continue
        if not isinstance(q, dict) or q.get("statut") != "publie":
            continue
        propositions = q.get("propositions") or []
        publiees.append(
            Question(
                id=str(q.get("id")),
                theme=str(q.get("theme")),
                notion=q.get("notion"),
                famille=q.get("famille"),
                enonce=normaliser(str(q.get("enonce", ""))),
                propositions=normaliser(
                    " ".join(str(p.get("texte", "")) for p in propositions if isinstance(p, dict))
                ),
            )
        )
    return publiees


def paires_proches(questions: list[Question], seuil: float = SEUIL_RAPPORT) -> list[Paire]:
    """Les paires dont les énoncés se ressemblent au-delà du seuil, la plus
    ressemblante d'abord."""
    proches: list[Paire] = []
    for a, b in itertools.combinations(questions, 2):
        ratio = SequenceMatcher(None, a.enonce, b.enonce).ratio()
        if ratio < seuil:
            continue
        proches.append(
            Paire(a, b, ratio, SequenceMatcher(None, a.propositions, b.propositions).ratio())
        )
    proches.sort(key=lambda p: (-p.enonce, p.a.id, p.b.id))
    return proches


def rapport(paires: list[Paire]) -> str:
    if not paires:
        return "Aucune paire d'énoncés proches."
    lignes = [f"{len(paires)} paire(s) d'énoncés proches, la plus ressemblante d'abord.", ""]
    for p in paires:
        if p.meme_famille:
            etat = f"famille {p.a.famille}"
        elif p.identiques:
            etat = "IDENTIQUES, SANS FAMILLE"
        else:
            etat = "à juger"
        memes_notions = p.a.notion == p.b.notion and p.a.notion is not None
        lignes.append(
            f"{p.enonce:.2f}  propositions {p.propositions:.2f}  "
            f"{p.a.id:<24} {p.b.id:<24} {'même notion' if memes_notions else '           '}  {etat}"
        )
    return "\n".join(lignes)


def manquements(paires: list[Paire]) -> list[Paire]:
    """Ce qu'on refuse sans jugement : deux énoncés identiques au mot près et
    pas de famille pour empêcher qu'ils tombent ensemble."""
    return [p for p in paires if p.identiques and not p.meme_famille]


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__)
    parseur.add_argument(
        "--verifier",
        action="store_true",
        help="échoue si deux énoncés identiques ne partagent pas de famille",
    )
    parseur.add_argument("--seuil", type=float, default=SEUIL_RAPPORT)
    args = parseur.parse_args(argv)

    paires = paires_proches(questions_publiees(), args.seuil)

    if not args.verifier:
        print(rapport(paires))
        return 0

    fautives = manquements(paires)
    if fautives:
        for p in fautives:
            print(
                f"{p.a.id} et {p.b.id} ont le même énoncé mot pour mot et aucune famille "
                f"commune : ils peuvent tomber dans le même examen.",
                file=sys.stderr,
            )
        return 1
    print(f"{len(paires)} paire(s) proche(s), aucune à énoncé identique sans famille.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
