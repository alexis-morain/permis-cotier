#!/usr/bin/env bash
# Le lot en cours. La table change à chaque session, git en garde l'histoire.
# Usage : scripts/lot.sh
set -u
cd "$(dirname "$0")/.."
PY=.venv/bin/python

lancer() {
  local src="$1" theme="$2" n="$3"
  [ -f "$src" ] || { echo "manque $src"; return; }
  echo "──── $(basename "$src" .md) → $theme (n=$n)"
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
  echo "  abandon sur $src"
}

regle() { lancer "data/sources/decret-77-733/regle-$1.md" "$2" "$3"; }

# Sécurité : la division 240, le plus gros trou de la banque (cible 12).
lancer data/sources/division-240/article-240-2-01.md securite 4   # zones de navigation, coupe-circuit
lancer data/sources/division-240/article-240-2-03.md securite 4   # armement basique, moins de 2 milles
lancer data/sources/division-240/article-240-2-04.md securite 3   # armement côtier, 2 à 6 milles
lancer data/sources/division-240/article-240-1-03.md securite 2   # rôle du chef de bord

# Signaux : les règles 35 à 37 du RIPAM (cible 10, quatre déjà écrites).
regle 35 signaux 4    # signaux par visibilité réduite
regle 36 signaux 2    # signaux pour appeler l'attention
regle 37 signaux 2    # signaux de détresse

# Balisage : la bande des 300 mètres, les plages et les pictogrammes.
lancer data/sources/arrete-1991-03-27/article-annexe-i.md balisage 4   # formes, tailles, chenaux
lancer data/sources/arrete-1991-03-27/article-annexe-ii.md balisage 2  # pictogrammes
lancer data/sources/arrete-1991-03-27/article-1.md balisage 1          # marques spéciales

# VHF : qui doit un CRR, qui s'en passe.
lancer data/sources/arrete-2005-05-18/article-1.md vhf 4

# Ski et responsabilités du chef de bord.
lancer data/sources/division-240/article-240-2-12.md ski-responsabilites 2

# Règles de barre : ce qui manque pour la cible de 18.
regle 09 barre-route 2    # chenaux étroits
regle 19 barre-route 2    # conduite par visibilité réduite

echo
echo "════ total en attente de relecture ════"
ls data/questions/_inbox/*.yaml 2>/dev/null | wc -l
