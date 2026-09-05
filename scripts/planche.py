#!/usr/bin/env python3
"""Bâtit la planche de relecture des visuels animés, en une page autonome.

    python3 scripts/planche.py --sortie /tmp/planche.html

Les visuels animés se relisent mal un par un : ce qui compte, c'est de voir
côte à côte une cardinale Est et une cardinale Ouest, un feu à éclats et un feu
à occultations, un son bref et un son prolongé. La page les met en regard,
famille par famille, avec pour chacun la règle dont il sort, son texte
alternatif tel qu'il part dans les questions, et les questions qui le portent.

Un bouton fige l'ensemble dans l'état `prefers-reduced-motion`. C'est le
contrôle qui compte : un dessin animé qui ne dit plus rien une fois arrêté est
un dessin raté, et c'est l'état que verra un lecteur qui a demandé moins de
mouvement. Les deux versions sont embarquées en data URI, rien ne se recharge.

La page est autonome, sans requête réseau autre que la feuille de polices : on
peut l'ouvrir depuis le disque, l'envoyer, ou la publier telle quelle.
"""
from __future__ import annotations

import argparse
import base64
import html
import re
import sys
from pathlib import Path

import yaml

RACINE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RACINE / "scripts"))

import rythmes  # noqa: E402
import situations  # noqa: E402
import sons  # noqa: E402

# L'abréviation portée sur la carte marine, terme de métier que le dessin ne
# peut pas montrer et qui sert d'étiquette à la plaque.
ABREVIATIONS = {
    "cardinale-nord": "Q", "cardinale-est": "Q (3)", "cardinale-sud": "Q (6) + LFl",
    "cardinale-ouest": "Q (9)", "danger-isole": "Fl (2)",
    "eaux-saines-eclat-long": "LFl", "eaux-saines-morse-a": "Mo (A)",
    "danger-nouveau": "Al Bu J", "caractere-fixe": "F", "caractere-a-eclats": "Fl",
    "caractere-a-occultations": "Oc", "caractere-isophase": "Iso",
    "caractere-scintillant": "Q", "caractere-scintillant-rapide": "VQ",
    "laterale-babord": "Fl R", "laterale-tribord": "Fl G", "speciale": "Fl Y",
}


def corps_media(svg: str) -> str:
    """Le contenu de la règle @media prefers-reduced-motion, accolades équilibrées."""
    marque = "@media (prefers-reduced-motion:reduce){"
    i = svg.find(marque)
    if i == -1:
        return ""
    j, profondeur = i + len(marque), 1
    while j < len(svg) and profondeur:
        profondeur += (svg[j] == "{") - (svg[j] == "}")
        j += 1
    return svg[i + len(marque):j - 1]


def fige(svg: str) -> str:
    """Le même dessin, mouvement coupé, sans dépendre du réglage du lecteur."""
    regles = corps_media(svg)
    return svg if not regles else svg.replace("</svg>", f"<style>{regles}</style>\n</svg>")


def uri(svg: str) -> str:
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode("ascii")


def questions_porteuses() -> dict[str, list[str]]:
    porteuses: dict[str, list[str]] = {}
    for fichier in sorted((RACINE / "data" / "questions").glob("*/*.yaml")):
        q = yaml.safe_load(fichier.read_text(encoding="utf-8"))
        visuel = q.get("visuel") if isinstance(q, dict) else None
        if visuel:
            porteuses.setdefault(visuel["fichier"], []).append(q["id"])
    return porteuses


def numero_de_regle(texte: str) -> str:
    m = re.search(r"règle (\d+)(?: ([a-z])\))?", texte)
    if not m:
        return "RIPAM"
    return f"Règle {m.group(1)}" + (f" {m.group(2)})" if m.group(2) else "")


def motif_en_barres(motif) -> str:
    """Le motif d'un signal sonore en barres dessinées plutôt qu'en glyphes.

    Des caractères comme ▨ ou ▏ dépendent de la police du lecteur et se
    dégradent mal ; des barres en CSS rendent partout à l'identique et
    reprennent le langage de la frise du dessin.
    """
    return "".join(
        f'<i class="t t--{s}"></i>' for _, s in motif if s is not None and s in "bpvc"
    )


def _echappe(t: str) -> str:
    return html.escape(t, quote=True)


def plaque(v: dict, famille: str) -> str:
    liens = "".join(
        f'<a class="q" href="https://lepermiscotier.fr/question/'
        f'{_echappe(i)}">{_echappe(i)}</a>'
        for i in v["questions"]
    ) or '<span class="q q--vide">aucune question</span>'
    etiquette = v["etiquette"] if famille == "sons" else _echappe(v["etiquette"])
    return f'''<figure class="plaque">
  <img class="plaque__vue" src="{v['anime']}" data-fige="{v['fige']}" data-anime="{v['anime']}" alt="" width="240" height="{v['hauteur']}">
  <figcaption>
    <p class="plaque__cle"><span class="abrev abrev--{famille}">{etiquette}</span><code>{_echappe(v['nom'])}</code></p>
    <p class="plaque__regle">{_echappe(v['regle'])}</p>
    <p class="plaque__alt"><span class="etiq">Texte alternatif</span>{_echappe(v['alt'])}</p>
    <p class="plaque__q">{liens}</p>
  </figcaption>
</figure>'''


def rassembler() -> tuple[list, list, list]:
    porteuses = questions_porteuses()

    def entree(famille, nom, alt, regle, etiquette, hauteur):
        chemin = f"{famille}/{nom}.svg"
        svg = (RACINE / "public" / "visuels" / chemin).read_text(encoding="utf-8")
        return {"nom": nom, "alt": alt, "regle": regle, "etiquette": etiquette,
                "hauteur": hauteur, "questions": porteuses.get(chemin, []),
                "anime": uri(svg), "fige": uri(fige(svg))}

    feux = [entree("rythmes", n, r["alt"], r["regle"], ABREVIATIONS[n], 132)
            for n, r in rythmes.RYTHMES.items()]
    scenes = list(situations.SCENES.items()) + list(situations.SCHEMAS.items())
    rencontres = [entree("situations", n, s["alt"], s["regle"],
                         numero_de_regle(s["regle"]), 200) for n, s in scenes]
    sonores = [entree("sons", n, s["alt"], s["regle"], motif_en_barres(s["motif"]), 120)
               for n, s in sons.SIGNAUX.items()]
    return feux, rencontres, sonores


GABARIT = (Path(__file__).resolve().parent / "planche.html")


def batir() -> str:
    feux, rencontres, sonores = rassembler()
    total = len(feux) + len(rencontres) + len(sonores)
    n_q = len({i for v in feux + rencontres + sonores for i in v["questions"]})
    page = GABARIT.read_text(encoding="utf-8")
    jetons = {
        "@TOTAL@": str(total),
        "@N_FEUX@": str(len(feux)),
        "@N_RENCONTRES@": str(len(rencontres)),
        "@N_SONS@": str(len(sonores)),
        "@N_QUESTIONS@": str(n_q),
        "@FEUX@": "\n".join(plaque(v, "feux") for v in feux),
        "@RENCONTRES@": "\n".join(plaque(v, "rencontres") for v in rencontres),
        "@SONS@": "\n".join(plaque(v, "sons") for v in sonores),
    }
    for jeton, valeur in jetons.items():
        page = page.replace(jeton, valeur)
    reste = re.findall(r"@[A-Z_]+@", page)
    if reste:
        raise SystemExit(f"jeton non remplacé dans le gabarit : {sorted(set(reste))}")
    return page


def main(argv: list[str] | None = None) -> int:
    parseur = argparse.ArgumentParser(description=__doc__)
    parseur.add_argument("--sortie", required=True, type=Path,
                         help="où écrire la page ; rien n'est écrit dans le dépôt")
    args = parseur.parse_args(argv)
    page = batir()
    args.sortie.write_text(page, encoding="utf-8")
    feux, rencontres, sonores = rassembler()
    print(f"{len(feux) + len(rencontres) + len(sonores)} plaques "
          f"({len(feux)} feux, {len(rencontres)} rencontres, {len(sonores)} sons), "
          f"{round(len(page) / 1024)} ko dans {args.sortie}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
