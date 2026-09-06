#!/usr/bin/env python3
"""Change le nombre de propositions d'une question, sans toucher au reste.

La banque est née à quatre propositions partout. La cible est 2, 3 ou 4, et la
conversion se fait en retirant des distracteurs, jamais en ajoutant du texte.
L'édition est textuelle et non un aller-retour YAML : un `yaml.safe_dump`
reformaterait les blocs `>-`, les guillemets et l'ordre des clés, noierait la
relecture du diff et réveillerait le piège des « : » dans un texte alternatif.

    python3 scripts/convertir.py data/questions/vhf/vhf-0003.yaml --retirer c,d
    python3 scripts/convertir.py <fichier> --retirer b --garder-relecture

Par défaut la question repart en `relu_par: claude` : sa forme a changé, la
relecture humaine porte sur une question qui n'existe plus. Le pied de page du
site compte ces relectures au build, il se met à jour tout seul.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Iterable

LETTRES = "abcd"


def _bloc(lignes: list[str], cle: str) -> tuple[int, int]:
    """Les bornes du bloc d'une clé de premier niveau, fin exclue."""
    debut = next((i for i, l in enumerate(lignes) if l.startswith(f"{cle}:")), None)
    if debut is None:
        raise ValueError(f"clé « {cle} » absente de la question")
    fin = debut + 1
    while fin < len(lignes) and (lignes[fin].startswith(" ") or not lignes[fin].strip()):
        fin += 1
    return debut, fin


def _propositions(lignes: list[str], debut: int, fin: int) -> list[tuple[str, list[str]]]:
    """Chaque proposition : son identifiant et ses lignes, textes multilignes compris."""
    trouvees: list[tuple[str, list[str]]] = []
    for i in range(debut + 1, fin):
        if lignes[i].startswith("  - id: "):
            trouvees.append((lignes[i].removeprefix("  - id: ").strip(), [lignes[i]]))
        elif trouvees:
            trouvees[-1][1].append(lignes[i])
    return trouvees


def convertir(texte: str, a_retirer: Iterable[str]) -> str:
    """Retire des propositions, renumérote de `a` à `d`, suit les réponses."""
    a_retirer = list(a_retirer)
    lignes = texte.splitlines(keepends=True)

    debut_p, fin_p = _bloc(lignes, "propositions")
    debut_r, fin_r = _bloc(lignes, "reponses")
    propositions = _propositions(lignes, debut_p, fin_p)
    ids = [pid for pid, _ in propositions]
    reponses = [l.removeprefix("  - ").strip() for l in lignes[debut_r + 1 : fin_r] if l.strip()]

    for pid in a_retirer:
        if pid not in ids:
            raise ValueError(f"la proposition « {pid} » n'existe pas dans cette question")
        if pid in reponses:
            raise ValueError(f"la proposition « {pid} » porte une bonne réponse")

    gardees = [(pid, corps) for pid, corps in propositions if pid not in a_retirer]
    plancher = 3 if len(reponses) > 1 else 2
    if len(gardees) < plancher:
        mot = "trois propositions" if plancher == 3 else "deux propositions"
        raison = ", la question ayant deux bonnes réponses" if plancher == 3 else ""
        reste = "aucune" if not gardees else f"{len(gardees)}"
        raise ValueError(f"il resterait {reste} : il en faut au moins {mot}{raison}")

    # Renumérotation dans l'ordre, sans trou : la lettre dit le rang.
    nouveau = {ancien: LETTRES[rang] for rang, (ancien, _) in enumerate(gardees)}
    bloc_p: list[str] = []
    for ancien, corps in gardees:
        bloc_p.append(f"  - id: {nouveau[ancien]}\n")
        bloc_p.extend(corps[1:])
    bloc_r = [f"  - {nouveau[r]}\n" for r in reponses]

    return "".join(
        lignes[: debut_p + 1] + bloc_p + lignes[fin_p : debut_r + 1] + bloc_r + lignes[fin_r :]
    )


def marquer_a_relire(texte: str, relecteur: str = "claude") -> str:
    """Rend la question au modèle : sa forme a changé, la relecture ne vaut plus."""
    sortie = []
    for ligne in texte.splitlines(keepends=True):
        if ligne.startswith("  relu_le:"):
            continue
        if ligne.startswith("  relu_par:"):
            ligne = f"  relu_par: {relecteur}\n"
        sortie.append(ligne)
    return "".join(sortie)


def lire_lot(chemin: Path) -> list[tuple[Path, list[str]]]:
    """Un lot de conversions : une ligne « chemin ids » par question.

    Un thème se convertit d'un coup, et le lot reste lisible à côté du diff :
    on voit d'un coup d'œil quelle proposition part de quelle question.
    """
    travaux = []
    for numero, ligne in enumerate(chemin.read_text(encoding="utf-8").splitlines(), 1):
        ligne = ligne.split("#", 1)[0].strip()
        if not ligne:
            continue
        morceaux = ligne.split()
        if len(morceaux) != 2:
            raise ValueError(f"{chemin}, ligne {numero} : attendu « chemin ids », reçu {ligne!r}")
        fichier, ids = morceaux
        travaux.append((Path(fichier), [p for p in ids.split(",") if p]))
    return travaux


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__)
    parseur.add_argument("fichier", type=Path, nargs="?")
    parseur.add_argument("--retirer", help="identifiants à retirer, séparés par une virgule")
    parseur.add_argument(
        "--lot",
        type=Path,
        help="fichier de lot : une ligne « chemin ids » par question, # pour un commentaire",
    )
    parseur.add_argument(
        "--garder-relecture",
        action="store_true",
        help="ne pas repasser relu_par à claude (relecture humaine faite dans la même passe)",
    )
    args = parseur.parse_args(argv)

    if args.lot:
        travaux = lire_lot(args.lot)
    elif args.fichier and args.retirer:
        travaux = [(args.fichier, [p.strip() for p in args.retirer.split(",") if p.strip()])]
    else:
        parseur.error("donne un fichier avec --retirer, ou un --lot")

    echecs = 0
    for chemin, ids in travaux:
        texte = chemin.read_text(encoding="utf-8")
        try:
            sortie = convertir(texte, ids)
        except ValueError as e:
            print(f"\033[31m{chemin}\033[0m : {e}", file=sys.stderr)
            echecs += 1
            continue
        if not args.garder_relecture:
            sortie = marquer_a_relire(sortie)
        chemin.write_text(sortie, encoding="utf-8")
        print(f"{chemin} : {texte.count('  - id: ')} → {sortie.count('  - id: ')} propositions")

    return 1 if echecs else 0


if __name__ == "__main__":
    sys.exit(main())
