/**
 * Ce que VoiceOver trouvera dans l'app, relu sur `dist-app/` avant l'archive.
 *
 * Dynamic Type et VoiceOver se recettent sur un iPhone (lot D du plan final) ;
 * ce script ne remplace pas cette recette. Il garde ce qu'un build peut
 * prouver sans écran : chaque bouton et chaque lien porte un nom, chaque
 * image un `alt`, chaque champ son étiquette, aucun `tabindex` positif ne
 * bouscule l'ordre de lecture, aucune référence ARIA ne vise un identifiant
 * absent, et la page dit sa langue. Les « Accessibility Nutrition Labels »
 * d'App Store Connect se déclarent depuis ce qu'il prouve, pas plus.
 *
 * Ce qu'un îlot `client:only` rend après coup n'est pas dans le HTML servi :
 * l'écran de jeu se teste dans `Quiz.test.tsx`, ici on lit les pages.
 *
 *   node scripts/verifier-accessibilite.mjs [dossier]   # dist-app par défaut
 *
 * Sort en échec au premier défaut trouvé sur une page, avec la page et
 * l'élément.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const RACINE = fileURLToPath(new URL('..', import.meta.url));

const INTERACTIFS = 'a[href], button, [role="button"], [role="link"], [role="tab"], [role="switch"], [role="checkbox"], [role="menuitem"]';
const CHAMPS = 'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]), select, textarea';
const REFERENCES = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'for'];

/** Le texte qu'un lecteur d'écran lit pour un élément, sans ce qui lui est caché. */
function texteLu(noeud) {
  if (noeud.nodeType === 3) return noeud.textContent ?? '';
  if (noeud.nodeType !== 1) return '';
  if (noeud.getAttribute('aria-hidden') === 'true' || noeud.hasAttribute('hidden')) return '';
  const etiquette = noeud.getAttribute('aria-label');
  if (etiquette?.trim()) return etiquette;
  if (noeud.tagName === 'IMG') return noeud.getAttribute('alt') ?? '';
  if (noeud.tagName.toLowerCase() === 'svg') return noeud.querySelector('title')?.textContent ?? '';
  return [...noeud.childNodes].map(texteLu).join('');
}

/** Le nom accessible, au sens simplifié : ce qu'il faut pour qu'il ne soit pas vide. */
export function nomAccessible(element, doc) {
  const par = element.getAttribute('aria-labelledby');
  if (par) {
    const nom = par.split(/\s+/).map((id) => doc.getElementById(id)?.textContent ?? '').join(' ');
    if (nom.trim()) return nom.trim();
  }
  const lu = texteLu(element).replace(/\s+/g, ' ').trim();
  if (lu) return lu;
  if (element.tagName === 'INPUT') return (element.getAttribute('value') ?? '').trim();
  return (element.getAttribute('title') ?? '').trim();
}

function decrire(element) {
  const id = element.id ? `#${element.id}` : '';
  const classe = element.getAttribute('class')?.split(/\s+/)[0];
  return `<${element.tagName.toLowerCase()}${id}${classe ? `.${classe}` : ''}>`;
}

/** Les défauts d'une page, chacun une phrase. Fonction pure sur le HTML. */
export function auditerPage(html) {
  const doc = new JSDOM(html).window.document;
  const defauts = [];

  if (!/^fr\b/.test(doc.documentElement.getAttribute('lang') ?? '')) {
    defauts.push('`<html>` sans `lang="fr"` : VoiceOver lirait le français avec la voix d’une autre langue');
  }

  for (const el of doc.querySelectorAll(INTERACTIFS)) {
    if (el.closest('[aria-hidden="true"], [hidden], template')) continue;
    if (!nomAccessible(el, doc)) defauts.push(`${decrire(el)} sans nom : VoiceOver dirait « bouton » ou « lien », rien de plus`);
  }

  for (const img of doc.querySelectorAll('img')) {
    if (!img.hasAttribute('alt')) defauts.push(`${decrire(img)} sans \`alt\` (${img.getAttribute('src')}) : VoiceOver lirait le nom du fichier`);
  }

  for (const champ of doc.querySelectorAll(CHAMPS)) {
    const etiquete =
      champ.closest('label') ||
      (champ.id && doc.querySelector(`label[for="${champ.id}"]`)) ||
      champ.getAttribute('aria-label')?.trim() ||
      champ.getAttribute('aria-labelledby');
    if (!etiquete) defauts.push(`${decrire(champ)} sans étiquette`);
  }

  for (const el of doc.querySelectorAll('[tabindex]')) {
    if (Number(el.getAttribute('tabindex')) > 0) defauts.push(`${decrire(el)} en \`tabindex\` positif : il passe devant l’ordre de lecture`);
  }

  for (const attribut of REFERENCES) {
    for (const el of doc.querySelectorAll(`[${attribut}]`)) {
      for (const id of (el.getAttribute(attribut) ?? '').split(/\s+/).filter(Boolean)) {
        if (!doc.getElementById(id)) defauts.push(`${decrire(el)} : \`${attribut}\` vise « ${id} », absent de la page`);
      }
    }
  }

  const vus = new Map();
  for (const el of doc.querySelectorAll('[id]')) vus.set(el.id, (vus.get(el.id) ?? 0) + 1);
  for (const [id, n] of vus) if (n > 1) defauts.push(`l’identifiant « ${id} » sert ${n} fois : une étiquette viserait le mauvais élément`);

  return defauts;
}

async function pages(dossier) {
  const trouvees = [];
  for (const entree of await readdir(dossier, { withFileTypes: true, recursive: true })) {
    if (entree.isFile() && entree.name.endsWith('.html')) trouvees.push(join(entree.parentPath ?? entree.path, entree.name));
  }
  return trouvees.sort();
}

async function principal() {
  const dossier = resolve(RACINE, process.argv[2] ?? 'dist-app');
  const liste = await pages(dossier);
  if (liste.length === 0) {
    console.error(`Aucune page dans ${relative(RACINE, dossier)} : lancer \`npm run build:app\` d’abord.`);
    process.exitCode = 1;
    return;
  }
  let total = 0;
  for (const chemin of liste) {
    const defauts = auditerPage(await readFile(chemin, 'utf-8'));
    if (defauts.length === 0) continue;
    total += defauts.length;
    console.log(`\n${relative(dossier, chemin)}`);
    for (const d of defauts) console.log(`  - ${d}`);
  }
  console.log(
    total
      ? `\n${total} défaut(s) d’accessibilité dans ${relative(RACINE, dossier)}.`
      : `${liste.length} pages relues, aucun défaut d’accessibilité lisible dans le HTML.`,
  );
  process.exitCode = total ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await principal();
}
