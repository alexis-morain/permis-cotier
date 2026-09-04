#!/usr/bin/env bash
# Premier lot : les règles du RIPAM qui pèsent le plus à l'examen.
# Usage : scripts/lot.sh
set -u
cd "$(dirname "$0")/.."
PY=.venv/bin/python

lancer() {
  local regle="$1" theme="$2" n="$3"
  local src="data/sources/decret-77-733/regle-${regle}.md"
  [ -f "$src" ] || { echo "manque $src"; return; }
  echo "──── règle $regle → $theme (n=$n)"
  # Deux tentatives : les appels enchaînés à `claude -p` se font parfois
  # jeter par la limite de débit, et ça repasse à la fois suivante.
  for essai in 1 2; do
    if "$PY" scripts/generer.py --source "$src" --theme "$theme" --n "$n" 2>&1 \
        | grep -v 'Permission deny rule' | tail -3; then
      return
    fi
    echo "  échec, nouvelle tentative dans 20 s"
    sleep 20
  done
  echo "  abandon sur la règle $regle"
}

# Feux et marques : règles 21 à 31
lancer 21 feux-marques 4   # définitions des feux, secteurs
lancer 23 feux-marques 4   # navires à propulsion mécanique
lancer 24 feux-marques 4   # remorquage et poussage
lancer 25 feux-marques 4   # navires à voile et à l'aviron
lancer 27 feux-marques 4   # non maîtres de leur manœuvre
lancer 30 feux-marques 3   # au mouillage et échoués

# Règles de barre et de route : règles 12 à 19
lancer 12 barre-route 3    # navires à voile entre eux
lancer 13 barre-route 3    # navire qui en rattrape un autre
lancer 14 barre-route 3    # routes directement opposées
lancer 15 barre-route 3    # routes qui se croisent
lancer 18 barre-route 4    # responsabilités réciproques

echo
echo "════ total en attente de relecture ════"
ls data/questions/_inbox/*.yaml 2>/dev/null | wc -l
