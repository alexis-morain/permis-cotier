#!/usr/bin/env bash
# Le gate du dépôt : rejoue les étapes de `.github/workflows/ci.yml`, dans le
# même ordre, et rend 0 quand tout est vert.
#
# Il s'équipe lui-même. La CI fait `npm ci` et `pip install` dans des étapes à
# part ; une session cloud clone le dépôt nu, sans `node_modules` ni `.venv`, et
# un gate qui compterait sur eux mourrait sur des erreurs de résolution sans
# qu'une ligne du projet soit en cause.
#
# Toute étape ajoutée à ci.yml s'ajoute ici, au même rang.
#
#   scripts/check.sh            tout, comme la CI
#   scripts/check.sh --rapide   la banque et les tests, sans types ni builds
set -euo pipefail

cd "$(dirname "$0")/.."

RAPIDE=0
[[ "${1:-}" == "--rapide" ]] && RAPIDE=1

etape() {
  local nom="$1"; shift
  printf '\n== %s\n' "$nom"
  if ! "$@"; then
    printf '\nROUGE : %s\n' "$nom" >&2
    exit 1
  fi
}

# --- Équipement -------------------------------------------------------------

# `npm ci` quand `node_modules` manque ou date d'avant le verrou.
if [[ ! -d node_modules || package-lock.json -nt node_modules/.package-lock.json ]]; then
  etape "npm ci" npm ci --no-audit --no-fund
fi

PY=.venv/bin/python
if [[ ! -x "$PY" ]]; then
  etape "venv Python" python3 -m venv .venv
fi
if ! "$PY" -c 'import yaml, pytest' 2>/dev/null; then
  etape "pip install" "$PY" -m pip install -q -r requirements.txt
fi

# --- Les étapes de ci.yml ---------------------------------------------------

etape "Valider la banque"                 "$PY" scripts/valider.py
etape "Redites de la banque"              "$PY" scripts/doublons.py --verifier
etape "Crédits des visuels"               "$PY" scripts/credits.py --verifier
etape "Visuels de feux"                   "$PY" scripts/feux.py --verifier
etape "Marques de balisage"               "$PY" scripts/balisage.py --verifier
etape "Navires"                           "$PY" scripts/navires.py --verifier
etape "Signaux d'écluse"                  "$PY" scripts/ecluses.py --verifier
etape "Planches de carte marine"          "$PY" scripts/carte.py --verifier
etape "Rythmes de feux"                   "$PY" scripts/rythmes.py --verifier
etape "Situations de rencontre"           "$PY" scripts/situations.py --verifier
etape "Signaux sonores"                   "$PY" scripts/sons.py --verifier
etape "Sons de l'app"                     "$PY" scripts/sons_app.py --verifier
etape "Tests du validateur"               "$PY" -m pytest tests -q
etape "Tests du moteur"                   npm test

if [[ $RAPIDE == 1 ]]; then
  printf '\nSAUTÉ (--rapide) : types, build du site, cible, audit SEO, budgets, build, CSS tactile et accessibilité de l app.\n'
  printf 'Ce vert-là ne vaut pas celui de la CI.\n'
  exit 0
fi

etape "Types"                             npx astro check --minimumSeverity error
etape "Build"                             npx astro build
etape "Rien de l'app dans le site"        node scripts/verifier-cible.mjs
etape "Audit SEO du build"                node scripts/audit-seo.mjs
etape "Budgets du code"                   node scripts/verifier-budgets.mjs
etape "Build de la cible app"             npm run build:app
etape "CSS tactile de la cible app"        node scripts/verifier-css-mobile.mjs dist-app
etape "Accessibilité de la cible app"     node scripts/verifier-accessibilite.mjs dist-app

# --- Le trou ----------------------------------------------------------------

cat <<'FIN'

VERT. Ce que ce gate ne vérifie pas, et qui demande une relecture d'Alexis
avant fusion (voir CLAUDE.md, « Le trou ») :
  - data/questions/ : la vérité d'une question contre son texte source ;
  - ios/ : la coquille Swift, qui ne se construit que sur un Mac ;
  - le rendu : captures, gestes, sons, au navigateur ou au simulateur.
FIN
