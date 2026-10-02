#!/usr/bin/env python3
"""
Taille la police du site à sa mesure.

`@fontsource-variable/archivo` livre Archivo en 90 Ko : neuf graisses de 100
à 900, les largeurs de 62 à 125, et toutes les fonctions OpenType. Le site
n'en tire que les graisses 400 à 800, les largeurs 100 et 125 (`--large`), les
chiffres tabulaires et le crénage. Ce script :

  1. restreint les deux axes à ce que le CSS emploie (`varLib.instancer`),
     ce qui ôte les deltas inutiles : 90 → 59 Ko ;
  2. sous-ensemble sur la plage Unicode déclarée dans `global.css`, lue sur
     place pour n'avoir qu'une source, et sur les fonctions utiles :
     59 → 52 Ko ;
  3. pose le fichier dans `public/polices/` sous un nom qui porte son
     empreinte, retire l'ancien, et réécrit l'adresse dans `global.css` et
     dans `src/lib/police.ts`, que `Base.astro` lit pour le préchargement.

`src/lib/police.test.ts` vérifie que les trois désignent le même fichier et
qu'il tient sous 55 Ko. Le nom et la licence (OFL, name IDs 13 et 14) restent
dans le fichier.

Dépendances hors du `.venv` du dépôt, dans un venv à part :

    python3 -m venv .venv-polices && .venv-polices/bin/pip install fonttools brotli
    .venv-polices/bin/python scripts/police.py

Usage : python3 scripts/police.py [--verifier]
"""
from __future__ import annotations

import hashlib
import io
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

RACINE = Path(__file__).resolve().parent.parent
SOURCE = RACINE / "node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2"
DOSSIER = RACINE / "public/polices"
CSS = RACINE / "src/styles/global.css"
CONSTANTE = RACINE / "src/lib/police.ts"
PREFIXE = "archivo-latin"

# Ce que le CSS emploie : `font-weight` de 400 à 800, `font-stretch` 100 % et
# `--large` 125 %. Tout autre point des axes serait servi par interpolation
# vers une graisse que personne ne demande.
AXES = {"wght": (400, 800), "wdth": (100, 125)}

# Les fonctions gardées : crénage, ligatures, chiffres tabulaires (le site les
# demande partout) et proportionnels, composition, formes locales, le
# positionnement des accents combinants (U+0304 et U+0308 sont dans la plage),
# et `rvrn`, que toute police variable exige. Fractions et exposants ne servent
# nulle part.
FONCTIONS = ["kern", "liga", "tnum", "pnum", "ccmp", "locl", "mark", "mkmk", "rvrn"]

# Les noms gardés : famille, style, identifiants, version, et la licence OFL
# avec son adresse, qu'un sous-ensemble doit emporter.
NOMS = [0, 1, 2, 3, 4, 5, 6, 13, 14]


def plage_unicode(css: str) -> str:
    """La `unicode-range` de la seule `@font-face` de `global.css`."""
    trouve = re.search(r"unicode-range:\s*([^;]+);", css)
    if not trouve:
        sys.exit("global.css ne déclare pas de unicode-range")
    return trouve.group(1)


def tailler(source: Path, plage: str) -> bytes:
    # `recalcTimestamp=False` : sans lui, `head.modified` prend l'heure de la
    # sauvegarde et deux passes rendent deux empreintes pour le même dessin.
    police = TTFont(source, recalcTimestamp=False)
    restreinte = instancer.instantiateVariableFont(police, AXES, updateFontNames=False)
    tampon = io.BytesIO()
    restreinte.flavor = "woff2"
    restreinte.save(tampon)

    # Relue depuis les octets : le sous-ensemble sur une table `gvar` encore
    # paresseuse après l'instanciation perd des glyphes.
    police = TTFont(io.BytesIO(tampon.getvalue()), recalcTimestamp=False)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = FONCTIONS
    options.name_IDs = NOMS
    options.notdef_outline = True
    options.hinting = False
    sous = subset.Subsetter(options)
    sous.populate(unicodes=subset.parse_unicodes(plage.replace("U+", "").replace(" ", "")))
    sous.subset(police)
    sortie = io.BytesIO()
    police.save(sortie)
    return sortie.getvalue()


def couverture(source: Path, resultat: bytes, plage: str) -> list[int]:
    """Les points de code de la plage que la source avait et que le résultat n'a plus."""
    voulus = set(subset.parse_unicodes(plage.replace("U+", "").replace(" ", "")))
    avant = set(TTFont(source).getBestCmap()) & voulus
    apres = set(TTFont(io.BytesIO(resultat)).getBestCmap())
    return sorted(avant - apres)


def adresse_courante() -> str | None:
    trouve = re.search(r"export const POLICE = '([^']+)';", CONSTANTE.read_text(encoding="utf-8"))
    return trouve.group(1) if trouve else None


def ecrire(resultat: bytes) -> str:
    empreinte = hashlib.sha256(resultat).hexdigest()[:8]
    nom = f"{PREFIXE}.{empreinte}.woff2"
    DOSSIER.mkdir(parents=True, exist_ok=True)
    for ancien in DOSSIER.glob(f"{PREFIXE}.*.woff2"):
        if ancien.name != nom:
            ancien.unlink()
    (DOSSIER / nom).write_bytes(resultat)
    adresse = f"/polices/{nom}"

    css = CSS.read_text(encoding="utf-8")
    css_neuf = re.sub(r"src: url\('[^']+'\) format\('woff2-variations'\);", f"src: url('{adresse}') format('woff2-variations');", css, count=1)
    if css_neuf == css and adresse not in css:
        sys.exit("global.css : la ligne `src: url(…) format('woff2-variations')` est introuvable")
    CSS.write_text(css_neuf, encoding="utf-8")

    ts = CONSTANTE.read_text(encoding="utf-8")
    CONSTANTE.write_text(re.sub(r"export const POLICE = '[^']+';", f"export const POLICE = '{adresse}';", ts), encoding="utf-8")
    return adresse


def main() -> None:
    verifier = "--verifier" in sys.argv
    plage = plage_unicode(CSS.read_text(encoding="utf-8"))
    resultat = tailler(SOURCE, plage)
    perdus = couverture(SOURCE, resultat, plage)
    if perdus:
        sys.exit(f"{len(perdus)} caractères de la plage ont été perdus : {', '.join(f'U+{c:04X}' for c in perdus[:10])}")

    if verifier:
        attendue = f"/polices/{PREFIXE}.{hashlib.sha256(resultat).hexdigest()[:8]}.woff2"
        courante = adresse_courante()
        if courante != attendue or not (RACINE / "public" / attendue.lstrip("/")).exists():
            sys.exit(f"la police servie ({courante}) n'est pas celle que ce script produit ({attendue}) : relancer sans --verifier")
        print(f"police à jour : {attendue}, {len(resultat)} octets")
        return

    adresse = ecrire(resultat)
    print(f"{SOURCE.stat().st_size} → {len(resultat)} octets, écrit dans public{adresse}, global.css et src/lib/police.ts repointés")


if __name__ == "__main__":
    main()
