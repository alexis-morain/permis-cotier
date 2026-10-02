/**
 * La police du site : Archivo, en sous-ensemble.
 *
 * Le fichier de `@fontsource-variable/archivo` pèse 90 Ko pour deux cent
 * trente caractères latins, parce qu'il porte neuf graisses sur deux axes.
 * Le site n'en tire que les graisses 400 à 800 et les largeurs 100 et 125 :
 * `scripts/police.py` taille le fichier à cette mesure, 52 Ko, et le pose
 * dans `public/polices/` sous un nom qui porte son empreinte, pour que
 * `_headers` puisse le dire immuable sans jamais servir un ancien fichier
 * sous un nom neuf. Le script réécrit cette constante et `global.css` ; les
 * deux sont tenus ensemble par `police.test.ts`.
 */
export const POLICE = '/polices/archivo-latin.c1ee93fa.woff2';

/** Ce que le lot E promet : moins de 55 Ko. */
export const POIDS_MAX_POLICE = 55_000;
