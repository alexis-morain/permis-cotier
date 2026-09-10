"""Mécanique commune aux scripts qui dessinent des SVG dans `public/visuels/`.

Sept scripts partageaient le même `main()` au mot près : écrire les fichiers,
ou en mode `--verifier`, comparer au contenu déjà écrit et échouer si l'un
d'eux n'est plus à jour. Ce qui varie d'un script à l'autre — le nom de la
commande npm, le mot qui compte les éléments, le complément qu'un script
ajoute après le nom du fichier écrit — reste le paramètre de `main_dessin`.
Le calcul des SVG eux-mêmes reste dans chaque script : ce module ne dessine
rien.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path


def main_dessin(
    argv: list[str] | None,
    *,
    racine: Path,
    sortie: Path,
    elements: dict[str, str],
    commande_npm: str,
    label: str,
    suffixes: dict[str, str] | None = None,
) -> int:
    """Écrit ou vérifie les SVG de `elements` (nom -> contenu du fichier).

    `label` accorde les messages de compte, par exemple "marque(s)" ou
    "signal(aux) sonore(s)" : chaque script porte sa propre irrégularité de
    pluriel, ce module ne la devine pas. `suffixes` ajoute, pour les noms qui
    y figurent, un complément après le chemin dans le message d'écriture
    (feux.py y met la règle RIPAM concernée).
    """
    suffixes = suffixes or {}
    parseur = argparse.ArgumentParser(description=__doc__)
    parseur.add_argument("--verifier", action="store_true", help="échoue au lieu d'écrire")
    args = parseur.parse_args(argv)

    sortie.mkdir(parents=True, exist_ok=True)
    perimes = []
    for nom, dessin in elements.items():
        chemin = sortie / f"{nom}.svg"
        if args.verifier:
            if not chemin.is_file() or chemin.read_text(encoding="utf-8") != dessin:
                perimes.append(chemin.relative_to(racine))
            continue
        chemin.write_text(dessin, encoding="utf-8")
        complement = suffixes.get(nom, "")
        print(f"écrit {chemin.relative_to(racine)}{complement}")

    if args.verifier:
        for chemin in perimes:
            print(f"{chemin} n'est plus à jour, lance `npm run {commande_npm}`", file=sys.stderr)
        if perimes:
            return 1
        print(f"{len(elements)} {label} à jour.")
        return 0

    print(f"\n{len(elements)} {label} dans {sortie.relative_to(racine)}/")
    return 0
