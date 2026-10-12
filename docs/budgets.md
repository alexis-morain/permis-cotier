# Budgets du code

Trois bornes, écrites ici et pas devinées, que `scripts/verifier-budgets.mjs`
relit et que la CI refuse de dépasser. Un budget qu'on dépasse se discute dans
la PR : on change le chiffre ci-dessous, avec la raison, ou on change le code.
On ne contourne pas le script.

Décidées le 10 octobre 2026 (plan « app solide », décision 5), posées au lot 4.

## Les bornes

```json
{
  "lignesParFichier": 600,
  "pourAppDansLesComposants": 40,
  "examen": { "reference": 96310, "marge": 1024 }
}
```

**`lignesParFichier`** : aucun fichier de `src/components/` (tests exclus) ne
dépasse 600 lignes. `Quiz.tsx` en faisait 1 394, `ProfilCandidat.tsx` 661 ;
au-delà, un fichier se lit par recherche et plus d'un bout à l'autre. Les
morceaux de l'écran de jeu vivent dans `src/components/quiz/`, ceux de la
fiche dans `src/components/profil/`.

**`pourAppDansLesComposants`** : les mentions de `POUR_APP` dans
`src/components/` (tests et lignes d'`import` exclus), 40 au plus. La règle :
un composant d'app, un composant de site, un parent qui choisit
(`EnteteApp` / `EnteteSite`, `ActionsApp` / `ActionsSite`), plutôt qu'un
ternaire en milieu de phrase. Les commentaires qui nomment `POUR_APP`
comptent : ils disent une branche, et une branche de plus se paie.

**`examen`** : le code que charge `/examen` sur le site, en octets brotli,
HTML, CSS et JavaScript compris, mesuré par `scripts/poids.mjs`. La police
(fixe) et la banque JSON (qui grossit à chaque question publiée) n'y entrent
pas : ce budget garde le code, pas le contenu. `reference` est la mesure de
`main` au 12 octobre 2026 ; la page peut prendre `marge` octets de plus. Une
PR qui l'allège abaisse `reference` du même coup, pour que la marge ne
s'accumule pas.

## Relancer

```bash
npm run build                       # dist/ d'abord
node scripts/verifier-budgets.mjs   # 0 = dans les budgets
```
