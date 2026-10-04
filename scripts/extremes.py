#!/usr/bin/env python3
"""Les données extrêmes de la banque publiée, pour durcir l'écran de jeu.

Lit `data/questions/<theme>/*.yaml` (statut `publie`) et rend les questions
qui tirent le plus sur la mise en page : l'énoncé le plus long, la proposition
la plus longue, l'explication la plus longue, la question à deux bonnes
réponses dont les quatre propositions pèsent le plus, le `alt` le plus long,
le plus grand nombre de sources. Usage : `python3 scripts/extremes.py [--json]`.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import yaml

RACINE = Path(__file__).resolve().parent.parent / "data" / "questions"


def charger() -> list[dict]:
    questions = []
    for fichier in sorted(RACINE.glob("*/*.yaml")):
        if fichier.parent.name.startswith("_"):
            continue
        q = yaml.safe_load(fichier.read_text(encoding="utf-8"))
        if not isinstance(q, dict) or q.get("statut") != "publie":
            continue
        questions.append(q)
    return questions


def extremes(questions: list[dict]) -> dict:
    def plus(cle, mesure):
        q = max(questions, key=mesure)
        return {"id": q["id"], cle: mesure(q)}

    enonce = plus("longueur", lambda q: len(q["enonce"]))
    proposition = max(
        ((q["id"], p["texte"]) for q in questions for p in q["propositions"]),
        key=lambda x: len(x[1]),
    )
    explication = plus("longueur", lambda q: len(q.get("explication", "")))
    deux_quatre = [q for q in questions if len(q["reponses"]) == 2 and len(q["propositions"]) == 4]
    lourde = max(deux_quatre, key=lambda q: sum(len(p["texte"]) for p in q["propositions"]))
    alts = [q for q in questions if q.get("visuel")]
    alt = max(alts, key=lambda q: len(q["visuel"].get("alt", "")))
    sources = plus("sources", lambda q: len(q.get("sources", [])))
    visuel_deux = [q for q in deux_quatre if q.get("visuel")]
    visuel_lourde = (
        max(visuel_deux, key=lambda q: sum(len(p["texte"]) for p in q["propositions"]) + len(q["enonce"]))
        if visuel_deux
        else None
    )
    return {
        "publiees": len(questions),
        "enonce_le_plus_long": {**enonce, "texte": next(q["enonce"] for q in questions if q["id"] == enonce["id"])},
        "proposition_la_plus_longue": {"id": proposition[0], "longueur": len(proposition[1]), "texte": proposition[1]},
        "explication_la_plus_longue": explication,
        "deux_reponses_quatre_propositions": {
            "nombre": len(deux_quatre),
            "la_plus_lourde": {
                "id": lourde["id"],
                "total_propositions": sum(len(p["texte"]) for p in lourde["propositions"]),
                "propositions": [p["texte"] for p in lourde["propositions"]],
            },
            "avec_visuel_la_plus_lourde": visuel_lourde["id"] if visuel_lourde else None,
        },
        "alt_le_plus_long": {"id": alt["id"], "longueur": len(alt["visuel"]["alt"]), "fichier": alt["visuel"]["fichier"]},
        "le_plus_de_sources": sources,
    }


if __name__ == "__main__":
    resultat = extremes(charger())
    if "--json" in sys.argv:
        print(json.dumps(resultat, ensure_ascii=False, indent=2))
    else:
        for cle, valeur in resultat.items():
            print(f"{cle}: {json.dumps(valeur, ensure_ascii=False)}")
