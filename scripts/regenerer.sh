#!/usr/bin/env bash
# Regénère ce qu'une PR a laissé périmé, et rien d'autre.
#
# Chaque générateur a son `--verifier`, celui de la CI. Ici on ne relance que
# ceux dont le verifier échoue : un générateur relancé pour rien réécrirait des
# fichiers à l'identique, sauf les PDF des fiches, où Chrome écrit la date, et
# où seule la fiche périmée doit être réimprimée.
#
# Appelé par `.github/workflows/autofix.yml` ; le diff qu'il laisse est poussé
# dans la PR par autofix.ci. Marche aussi en local :
#
#   scripts/regenerer.sh
#
# Ce qui demande un jugement n'est pas ici : les redites de la banque
# (`doublons.py`, le champ `famille` se choisit) et la relecture (`relu_par`).
set -euo pipefail

cd "$(dirname "$0")/.."

PY="${PY:-python3}"

# Ordre : les dessins d'abord, puis les crédits qui les listent, puis les
# fiches qui les impriment.
GENERATEURS=(feux balisage navires ecluses carte rythmes situations sons sons_app schemas_revision credits)

for g in "${GENERATEURS[@]}"; do
  if ! "$PY" "scripts/$g.py" --verifier >/dev/null 2>&1; then
    printf '== %s : périmé, regénéré\n' "$g"
    "$PY" "scripts/$g.py"
  fi
done

# Les fiches PDF : `--verifier` nomme celles qui sont périmées ou absentes.
perimees=$(node scripts/fiches-pdf.mjs --verifier 2>&1 >/dev/null \
  | awk -F' : ' '/ : (PDF périmé|pas de PDF)/ { print $1 }' || true)

if [[ -n "$perimees" ]]; then
  printf '== fiches : %s\n' "$(echo "$perimees" | tr '\n' ' ')"
  npx astro build >/dev/null
  # shellcheck disable=SC2086
  node scripts/fiches-pdf.mjs $perimees
fi

# Une fiche sans YAML (« PDF sans fiche ») se retire à la main : on le dit.
node scripts/fiches-pdf.mjs --verifier || true
