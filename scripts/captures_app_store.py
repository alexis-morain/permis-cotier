"""Compose les captures App Store : légende, fond pâle, capture brute dans le cadre Apple.

    python3 scripts/captures_app_store.py [iphone|ipad ...]

Lit `captures/captures.json` et `captures/brutes/<appareil>/`, écrit
`captures/sortie/<appareil>/` (ignoré par git) et une planche de contrôle.

Les cadres (Apple Product Bezels) ne sont jamais dans le dépôt : leur licence
les réserve à la promotion de l'app. Ils sont lus dans le cache local
`~/Library/Caches/permis-cotier/bezels/` (ou la variable `BEZELS`).

Le rendu passe par Chrome headless, comme `fiches-pdf.mjs`. Chaque PNG est
ensuite aplati en RGB (Apple refuse l'alpha) et mesuré : une dimension fausse
arrête tout.
"""
import html
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

RACINE = Path(__file__).resolve().parent.parent
DOSSIER = RACINE / "captures"
BEZELS = Path(os.environ.get("BEZELS", Path.home() / "Library/Caches/permis-cotier/bezels"))

# Les quatre étiquettes de thème de DESIGN.md.
FONDS = {"bleu": "#e1edf6", "sable": "#fbf0d4", "rose": "#f8e4ec", "orange": "#f8e6d7"}
JAUNE = "#ffc72c"
ENCRE = "#191918"
DOUX = "#55534d"


def chrome() -> str:
    cache = Path.home() / "Library/Caches/ms-playwright"
    coquilles = []
    if cache.exists():
        for d in sorted((p for p in cache.iterdir() if p.name.startswith("chromium_headless_shell-")), reverse=True):
            coquilles += [s / "chrome-headless-shell" for s in d.iterdir()]
    candidats = [os.environ.get("CHROME"), *coquilles, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
    for c in candidats:
        if c and Path(c).exists():
            return str(c)
    sys.exit("Chrome introuvable : pose la variable CHROME")


def page(app: dict, cap: dict, cadre: Path, brute: Path) -> str:
    """Une capture en HTML : le texte en haut, l'appareil entier dessous, centré."""
    L, H = app["toile"]
    ex, ey, ew, eh = app["ecran"]
    t = app["texte"]
    with Image.open(cadre) as im:
        cw, ch = im.size
    # L'appareil prend toute la hauteur laissée par le texte (mesurée par le navigateur).
    return f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
html,body{{margin:0;width:{L}px;height:{H}px;overflow:hidden;background:{FONDS[cap['fond']]}}}
body{{display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,sans-serif;
  -webkit-font-smoothing:antialiased;color:{ENCRE}}}
header{{flex:0 0 {t['bloc']}px;box-sizing:border-box;padding:{t['haut']}px {t['marge']}px 0}}
.filet{{width:{round(t['titre'] * 1.1)}px;height:{round(t['titre'] * 0.14)}px;background:{JAUNE};border-radius:2px;margin-bottom:{round(t['titre'] * 0.42)}px}}
h1{{margin:0;font-size:{t['titre']}px;line-height:1.06;font-weight:800;letter-spacing:-0.02em;text-wrap:balance}}
p{{margin:{round(t['sous'] * 0.6)}px 0 0;font-size:{t['sous']}px;line-height:1.3;color:{DOUX};font-weight:500;text-wrap:pretty}}
main{{flex:1;min-height:0;display:flex;justify-content:center;align-items:flex-end;padding:{round(t['titre'] * 0.6)}px 0 {app['bas']}px}}
.appareil{{position:relative;height:100%;aspect-ratio:{cw}/{ch}}}
.appareil img{{position:absolute}}
.ecran{{left:{ex / cw * 100}%;top:{ey / ch * 100}%;width:{ew / cw * 100}%;height:{eh / ch * 100}%}}
.cadre{{left:0;top:0;width:100%;height:100%}}
</style></head><body>
<header><div class="filet"></div><h1>{html.escape(cap['titre'])}</h1><p>{html.escape(cap['sous'])}</p></header>
<main><div class="appareil"><img class="ecran" src="{brute.as_uri()}"><img class="cadre" src="{cadre.as_uri()}"></div></main>
</body></html>"""


def rendre(fichier_html: Path, sortie: Path, L: int, H: int) -> None:
    subprocess.run(
        [chrome(), "--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
         "--allow-file-access-from-files", f"--window-size={L},{H}", f"--screenshot={sortie}",
         "--default-background-color=ffffffff", fichier_html.as_uri()],
        check=True, capture_output=True, timeout=60)


def aplatir_et_verifier(png: Path, L: int, H: int) -> None:
    with Image.open(png) as im:
        if im.size != (L, H):
            sys.exit(f"{png.name} : {im.size}, attendu {(L, H)}")
        rgb = im.convert("RGB")
    rgb.save(png, optimize=True)


def planche(fichiers: list[Path], dest: Path, hauteur: int = 900) -> None:
    ims = [Image.open(f) for f in fichiers]
    vignettes = [i.resize((round(i.width * hauteur / i.height), hauteur), Image.LANCZOS) for i in ims]
    marge = 30
    toile = Image.new("RGB", (sum(v.width for v in vignettes) + marge * (len(vignettes) + 1), hauteur + 2 * marge), "white")
    x = marge
    for v in vignettes:
        toile.paste(v, (x, marge))
        x += v.width + marge
    toile.save(dest)


def main() -> None:
    conf = json.loads((DOSSIER / "captures.json").read_text())
    appareils = sys.argv[1:] or list(conf["appareils"])
    for nom in appareils:
        app = conf["appareils"][nom]
        cadre = BEZELS / app["cadre"]
        if not cadre.exists():
            sys.exit(f"Cadre absent : {cadre}. Télécharger les Product Bezels d'Apple (voir l'en-tête).")
        L, H = app["toile"]
        sortie = DOSSIER / "sortie" / nom
        sortie.mkdir(parents=True, exist_ok=True)
        faits = []
        with tempfile.TemporaryDirectory() as tmp:
            for cap in conf["captures"]:
                brute = DOSSIER / "brutes" / nom / cap["brute"]
                with Image.open(brute) as im:
                    if im.size != tuple(app["ecran"][2:]):
                        sys.exit(f"{brute} : {im.size}, l'écran du cadre fait {tuple(app['ecran'][2:])}")
                f = Path(tmp) / f"{cap['id']}.html"
                f.write_text(page(app, cap, cadre, brute))
                png = sortie / f"{cap['id']}.png"
                rendre(f, png, L, H)
                aplatir_et_verifier(png, L, H)
                faits.append(png)
                print(png.relative_to(RACINE), f"{L}×{H}")
        planche(faits, DOSSIER / "sortie" / f"planche-{nom}.png")


if __name__ == "__main__":
    main()
