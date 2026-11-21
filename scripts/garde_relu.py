#!/usr/bin/env python3
"""Refuse un `relu_par: alexis` posé par une PR qui n'est pas d'Alexis.

    python scripts/garde_relu.py <sha de base>

Lit le YAML, pas le diff : une valeur sur la ligne suivante, un scalaire plié
ou un échappement unicode disent tous `alexis` une fois parsés, et un grep sur
le diff les laissait passer. Pour chaque fichier de `data/` modifié par la PR,
compare les `relu_par` de la base et de la tête, clé par clé :

- `alexis` à la tête là où la base ne l'avait pas : échec ;
- `alexis` des deux côtés dans un fichier retouché : avertissement, la
  relecture est à refaire.

Appelé par `ci.yml` sur les PR extérieures seulement.
"""
from __future__ import annotations

import subprocess
import sys

import yaml


def git(*args: str) -> str:
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True).stdout


def relus(texte: str | None) -> dict[str, str]:
    """Chemin de chaque clé `relu_par` vers sa valeur normalisée."""
    if texte is None:
        return {}
    try:
        documents = list(yaml.safe_load_all(texte))
    except yaml.YAMLError:
        return {}  # valider.py le refusera de toute façon
    trouves: dict[str, str] = {}

    def parcourir(noeud: object, chemin: str) -> None:
        if isinstance(noeud, dict):
            for cle, valeur in noeud.items():
                ici = f"{chemin}/{cle}"
                if str(cle).strip().lower() == "relu_par":
                    trouves[ici] = str(valeur).strip().lower()
                parcourir(valeur, ici)
        elif isinstance(noeud, list):
            for i, valeur in enumerate(noeud):
                parcourir(valeur, f"{chemin}[{i}]")

    for n, doc in enumerate(documents):
        parcourir(doc, f"#{n}")
    return trouves


def version(sha: str, chemin: str) -> str | None:
    try:
        return git("show", f"{sha}:{chemin}")
    except subprocess.CalledProcessError:
        return None


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print(__doc__, file=sys.stderr)
        return 2
    base = argv[0]
    fichiers = git("diff", "--name-only", "--diff-filter=AMR", "-z", base, "HEAD", "--", "data/").split("\0")
    fautes = 0
    for chemin in filter(None, fichiers):
        if not chemin.endswith((".yaml", ".yml")):
            continue
        avant = relus(version(base, chemin))
        apres = relus(version("HEAD", chemin))
        for cle, valeur in apres.items():
            if valeur != "alexis":
                continue
            if avant.get(cle) != "alexis":
                print(f"::error file={chemin}::relu_par: alexis posé par cette PR ({cle}). Seul Alexis l'écrit, après avoir relu.")
                fautes += 1
            else:
                print(f"::warning file={chemin}::Fichier déjà relu, retouché par cette PR : relecture à refaire.")
    return 1 if fautes else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
