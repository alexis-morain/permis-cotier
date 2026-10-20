/**
 * La typographie française (voir `src/lib/insecables.ts`) branchée sur le build.
 *
 * Le texte du site sort de trois endroits, et un seul passage ne les couvre pas :
 *
 * - le HTML des pages, construit à partir des `.astro`, de `src/lib/*.ts` et de
 *   la banque : `typographieDuHtml()` le relit dans `dist/` (ou `dist-app/`) ;
 * - les écrans de jeu, des îlots `client:only` : rien n'en est rendu au serveur,
 *   leur texte est dans le JavaScript. `typographieDesSources()` passe sur le
 *   JSX et les chaînes de prose avant que le bundle soit fait ;
 * - la banque, en JSON : `versAffichable` l'insécabilise en l'empaquetant.
 *
 * Rien ne part dans le bundle client : tout se fait au build.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { insecabiliser, insecabiliserHtml, lireEntitesEspaces } from '../src/lib/insecables.ts';

const RACINE_SRC = fileURLToPath(new URL('../src/', import.meta.url));

/** Une chaîne qui ressemble à une phrase : trois lettres de suite, un mot, pas de code. */
const RESSEMBLE_A_UNE_PHRASE = /\p{L}{2,}[ \u00A0]+\p{L}{2,}/u;
const CODE = /[{}<>=]/;

/** Méthodes dont l'argument chaîne est un motif ou un séparateur, pas un texte à lire. */
const METHODES_DE_CHAINE = new Set([
  'split', 'join', 'replace', 'replaceAll', 'indexOf', 'lastIndexOf', 'includes', 'startsWith', 'endsWith',
  'match', 'matchAll', 'search', 'test', 'localeCompare', 'padStart', 'padEnd', 'repeat',
]);

const estArgumentDeMethodeDeChaine = (n) => {
  const appel = n.parent;
  if (!ts.isCallExpression(appel) || !appel.arguments.includes(n)) return false;
  const f = appel.expression;
  return ts.isPropertyAccessExpression(f) && METHODES_DE_CHAINE.has(f.name.text);
};

/**
 * Réécrit un module TypeScript : le texte des JSX, les chaînes et les morceaux
 * de gabarit. Rend `null` quand rien ne change.
 */
export function typographierSource(code, nom = 'module.tsx') {
  if (!/[ \u00A0\u202F\n][;:!?»]|«|\d[ \u00A0]/u.test(code)) return null;
  const sf = ts.createSourceFile(nom, code, ts.ScriptTarget.Latest, true, nom.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const remplacements = [];
  const proposer = (debut, fin, brut, options) => {
    const nouveau = insecabiliser(lireEntitesEspaces(brut), options);
    if (nouveau !== brut) remplacements.push([debut, fin, nouveau]);
  };
  const brutParent = (n) => {
    for (let p = n.parent; p; p = p.parent) {
      if (ts.isJsxElement(p) && /^(code|pre|style|script|kbd|samp|textarea)$/.test(p.openingElement.tagName.getText(sf))) return true;
      if (ts.isTaggedTemplateExpression(p)) return true;
    }
    return false;
  };
  const visiter = (n) => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n) || ts.isLiteralTypeNode(n)) return;
    if (ts.isJsxText(n)) {
      if (!brutParent(n)) proposer(n.pos, n.end, code.slice(n.pos, n.end), { prose: true });
    } else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
      const parent = n.parent;
      const cle = (ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)) && parent.name === n;
      const nomJsx = ts.isJsxAttribute(parent) && parent.name === n;
      if (!cle && !nomJsx && !brutParent(n) && !estArgumentDeMethodeDeChaine(n)) {
        // Les délimiteurs (guillemet, backtick, `}` et `${`) ne font pas partie du texte.
        const debut = n.getStart(sf) + 1;
        const fin = n.end - (ts.isTemplateHead(n) || ts.isTemplateMiddle(n) ? 2 : 1);
        const brut = code.slice(debut, fin);
        // Un morceau de gabarit après `${…}` suit quelque chose ; une chaîne entière, non.
        const suitUneExpression = ts.isTemplateMiddle(n) || ts.isTemplateTail(n);
        proposer(debut, fin, brut, { prose: RESSEMBLE_A_UNE_PHRASE.test(brut) && !CODE.test(brut), debut: suitUneExpression });
      }
    }
    ts.forEachChild(n, visiter);
  };
  visiter(sf);
  if (remplacements.length === 0) return null;
  let sortie = code;
  for (const [debut, fin, nouveau] of remplacements.sort((a, b) => b[0] - a[0])) {
    sortie = sortie.slice(0, debut) + nouveau + sortie.slice(fin);
  }
  return sortie;
}

/** Greffon Vite : le texte des modules de `src/` (hors tests) avant le bundle. */
export function typographieDesSources() {
  return {
    name: 'permis-cotier:typographie-sources',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes('?') || !id.startsWith(RACINE_SRC)) return null;
      if (!/\.tsx?$/.test(id) || /\.(test|d)\.tsx?$/.test(id)) return null;
      const sortie = typographierSource(code, id);
      return sortie === null ? null : { code: sortie, map: null };
    },
  };
}

async function pagesHtml(dossier) {
  const trouvees = [];
  for (const entree of await readdir(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) trouvees.push(...(await pagesHtml(chemin)));
    else if (entree.name.endsWith('.html')) trouvees.push(chemin);
  }
  return trouvees;
}

/** Relit le dossier construit et typographie chaque page. */
export async function typographierDossier(dossier) {
  let touchees = 0;
  for (const page of await pagesHtml(dossier)) {
    const html = await readFile(page, 'utf-8');
    const sortie = insecabiliserHtml(html);
    if (sortie !== html) {
      await writeFile(page, sortie);
      touchees++;
    }
  }
  return touchees;
}

/**
 * Intégration Astro. À placer **avant** la PWA : `@vite-pwa/astro` calcule la
 * révision de chaque page dans `astro:build:done`, et une page réécrite après
 * lui garderait en précache une empreinte périmée.
 */
export function typographieDuHtml() {
  return {
    name: 'permis-cotier:typographie-html',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const touchees = await typographierDossier(fileURLToPath(dir));
        logger.info(`typographie : ${touchees} page(s) réécrites`);
      },
    },
  };
}
