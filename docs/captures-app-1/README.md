# Captures du lot 1 — l'app au doigt

Chromium headless (CDP) à 390 × 844, `dist-app/` servi en local,
`html[data-app]`, toucher émulé (`hover: none`). `-avant` : `main` à
`6b37103` ; `-apres` : la branche `app-solide-lot1`. Ni Chromium ni le
simulateur ne reproduisent le survol collé ni le zoom au focus d'iOS : les
captures montrent les écrans, les mesures ci-dessous montrent l'écart.

- `recherche-focalisee-cours-14px-*` : la recherche de l'onglet Cours, ouverte,
  au plus petit réglage de Dynamic Type (base à 14 px).
- `proposition-apres-appui-*` : une série d'entraînement après deux appuis
  (A puis B ; la question admet deux réponses, les deux sont cochées).
- `questionnaire-depart-*` : le premier écran du questionnaire.

## Taille calculée des champs (`getComputedStyle`)

| Champ | Base 14 px avant | Base 14 px après | Base 17 px (défaut iOS), avant et après |
|---|---|---|---|
| Recherche (page et fenêtre) | 14,7 px | 16 px | 17,85 px |
| Fiche : prénom, date | 14 px | 16 px | 17 px |
| Questionnaire : phrase, date, prénom | 14 px | 16 px | 17 px |

Sous 16 px, WebKit iOS zoome sur le champ au focus.

## Survol forcé par CDP sous `hover: none`

| Contrôle | Avant | Après |
|---|---|---|
| `.bouton` (Fiche) | fond `#ffc72c` → `#ffd35a` | inchangé |
| `.segmente__option` | fond transparent → `#e6ecf5` | inchangé |
| `.choix__option` (questionnaire) | bord `#6e85a8` → `#0b1d3a`, l'air d'une case cochée | inchangé |
| `.proposition` | inchangé (neutralisé par `app-jeu.css`) | inchangé (garde) |

`.proposition` : `touch-action` passe de `auto` à `manipulation`.
