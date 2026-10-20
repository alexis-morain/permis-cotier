/**
 * La typographie française des espaces, appliquée au build.
 *
 * - U+202F (espace fine insécable) avant `;` `!` `?`, et comme séparateur de
 *   milliers ;
 * - U+00A0 (espace insécable) avant `:`, à l'intérieur des guillemets
 *   `« … »`, entre un nombre et son unité ou le mot qu'il compte.
 *
 * Ce module ne tourne qu'à la construction (jamais dans le bundle client) :
 * `insecabiliserHtml` relit les pages de `dist/`, `insecabiliser` est aussi
 * appelé sur la banque quand elle est empaquetée. Il ne crée jamais d'espace :
 * il remplace une espace ordinaire (ou déjà insécable) et laisse « 14:30 »,
 * « https://… », « ?a=1 » comme ils sont. Idempotent.
 *
 * Reste en syntaxe effaçable : Node le charge tel quel (config Astro, scripts).
 */

export const FINE = '\u202F';
export const INSECABLE = '\u00A0';

/** Les espaces qui précèdent une ponctuation : on les remplace, on ne les double pas. */
const BLANCS = '[ \\t\\r\\n\\u00A0\\u202F\\u2009]+';

/**
 * Mots qui suivent un nombre sans qu'il les compte : « entre 5 et 10 »,
 * « le 12 de ce mois ». Sans eux l'insécable collerait n'importe quoi.
 */
const SANS_UNITE = new Set([
  'et', 'ou', 'a', 'à', 'au', 'aux', 'de', 'du', 'des', 'en', 'le', 'la', 'les', 'par', 'pour',
  'sur', 'sous', 'dans', 'qui', 'que', 'est', 'sont', 'se', 'ne', 'ni', 'soit', 'puis', 'mais',
  'avec', 'sans', 'vers', 'entre', 'chez', 'ce', 'cet', 'cette', 'ces', 'il', 'ils', 'on', 'y',
  'pas', 'plus', 'moins', 'ont', 'elle', 'elles', 'ainsi', 'donc', 'car', 'or', 'si',
]);

/** Élisions : « 5 d'entre eux », mais « 10 s » reste des secondes. */
const ELISIONS = new Set(['d', 'l', 's', 'n', 'm', 'j', 't', 'c', 'qu']);

const SYMBOLES = '%‰€$£°';

/**
 * Début de motif d'une ponctuation à lier : une espace précédée de quelque
 * chose. `debut: true` accepte aussi le début du morceau, quand ce qui précède
 * est une balise ou une expression (`</b> : suite`, `${n} : suite`) ; une
 * chaîne entière, elle, ne commence pas après quelque chose, et `' : '`
 * (séparateur d'un `split`) doit rester tel quel.
 */
const apres = (debut: boolean) => (debut ? '(?:(?<=\\S)|^)' : '(?<=\\S)');

function fineAvantPonctuation(texte: string, debut: boolean): string {
  // `;` et `:` : pas un smiley (`;)`, `:/`), `:` pas collé à ce qui suit (14 :30).
  // `!` et `?` : pas devant une lettre ou un chiffre (`!important`, `?a=1`).
  return texte
    .replace(new RegExp(`${apres(debut)}${BLANCS}(?=;(?![\\p{L}\\p{N}()/\\\\|\\[\\]]))`, 'gu'), FINE)
    .replace(new RegExp(`${apres(debut)}${BLANCS}(?=[!?](?![\\p{L}\\p{N}_-]))`, 'gu'), FINE)
    .replace(new RegExp(`${apres(debut)}${BLANCS}(?=:(?![\\p{L}\\p{N}()/\\\\|\\[\\]]))`, 'gu'), INSECABLE);
}

function guillemets(texte: string, debut: boolean): string {
  return texte
    .replace(new RegExp(`«${BLANCS}`, 'g'), `«${INSECABLE}`)
    .replace(new RegExp(`${apres(debut)}${BLANCS}»`, 'g'), `${INSECABLE}»`);
}

function milliers(texte: string): string {
  return texte.replace(
    /(?<![\p{L}\p{N}.,\-/])(\d{1,3})((?:[ \u00A0\u202F]\d{3})+)(?!\d)/gu,
    (_, tete: string, groupes: string) => tete + groupes.replace(/[ \u00A0\u202F]/g, FINE),
  );
}

/** Un nombre entier ou décimal, milliers joints, qui n'est pas la queue d'un autre jeton. */
const NOMBRE = String.raw`(?<![\p{L}\p{N}.,\-/])\d+(?:\u202F\d{3})*(?:[.,]\d+)?`;

function nombreEtUnite(texte: string): string {
  return texte
    .replace(new RegExp(`(${NOMBRE})[ \u00A0](?=[${SYMBOLES}])`, 'gu'), `$1${INSECABLE}`)
    .replace(
      new RegExp(`(${NOMBRE})[ \u00A0]([a-zà-ÿœæ]+)(['’]?)`, 'gu'),
      (tout: string, nombre: string, mot: string, apostrophe: string) => {
        const exclus = apostrophe ? ELISIONS : SANS_UNITE;
        return exclus.has(mot) ? tout : `${nombre}${INSECABLE}${mot}${apostrophe}`;
      },
    )
    .replace(/(?<=\d[ \u00A0]?h)[ \u00A0](?=\d)/g, INSECABLE)
    .replace(/(?<![\p{L}\p{N}])(art\.|n°|§)[ \u00A0](?=\d)/gu, `$1${INSECABLE}`);
}

/**
 * Le texte brut d'un nœud (aucune balise), typographié.
 *
 * `prose: false` écarte la règle « nombre + mot » : pour une chaîne de code qui
 * n'est peut-être pas une phrase (`'0 auto'`, `'1 forwards}'`) la liaison
 * casserait la valeur. `debut: false` : le morceau est une chaîne entière et
 * rien ne le précède, une ponctuation en tête n'est pas à lier (`' : '`).
 */
export function insecabiliser(texte: string, { prose = true, debut = true } = {}): string {
  if (!/[ \u00A0\u202F\u2009\n]/.test(texte)) return texte;
  const typographie = milliers(guillemets(fineAvantPonctuation(texte, debut), debut));
  return prose ? nombreEtUnite(typographie) : typographie;
}

/** Entités d'espace que l'on lit comme leurs caractères pour ne pas les doubler. */
export function lireEntitesEspaces(texte: string): string {
  return texte
    .replace(/&(?:nbsp|#160|#xa0|#xA0);/g, INSECABLE)
    .replace(/&(?:#8239|#x202f|#x202F);/g, FINE);
}

/** Éléments dont le contenu n'est pas de la prose. */
const BRUT = new Set(['script', 'style', 'code', 'pre', 'textarea', 'kbd', 'samp']);

/** `<meta>` dont le `content` est lu par des humains (résultats, aperçus de partage). */
const META_LUES = /\b(?:name|property)\s*=\s*"(?:description|og:title|og:description|twitter:title|twitter:description)"/;

const BALISE = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][^\s/>]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;

/**
 * Passe sur les nœuds texte d'une page HTML, et sur eux seuls : `traiter`
 * reçoit le texte (entités d'espace lues) et rend le texte de remplacement.
 * Balises, attributs, commentaires, URL et le contenu de `script`, `style`,
 * `code`, `pre` n'y passent jamais ; seul le `content` des `meta` de
 * description et de partage est traité. Le JSON-LD est un `script` : intact.
 */
export function surLesNoeudsTexte(html: string, traiter: (texte: string) => string): string {
  let sortie = '';
  let curseur = 0;
  let nomBrut = '';
  const texte = (morceau: string) => {
    sortie += nomBrut ? morceau : traiter(lireEntitesEspaces(morceau));
  };
  for (const m of html.matchAll(BALISE)) {
    texte(html.slice(curseur, m.index));
    curseur = m.index + m[0].length;
    const [balise, fermante = '', nom = '', attributs = ''] = m;
    if (balise.startsWith('<!--')) {
      sortie += balise;
      continue;
    }
    const bas = nom.toLowerCase();
    if (BRUT.has(bas)) {
      if (fermante) {
        if (bas === nomBrut) nomBrut = '';
      } else if (!attributs.endsWith('/') && !nomBrut) {
        nomBrut = bas;
      }
    }
    if (bas === 'meta' && !fermante && META_LUES.test(attributs)) {
      sortie += balise.replace(/(\bcontent\s*=\s*")([^"]*)(")/, (_, a: string, v: string, z: string) => a + traiter(lireEntitesEspaces(v)) + z);
    } else {
      sortie += balise;
    }
  }
  texte(html.slice(curseur));
  return sortie;
}

/** Les chaînes d'une valeur JSON, clés exclues, passées par `traiter`. */
function surLesChaines(valeur: unknown, traiter: (texte: string) => string): unknown {
  if (typeof valeur === 'string') return traiter(valeur);
  if (Array.isArray(valeur)) return valeur.map((v) => surLesChaines(v, traiter));
  if (valeur && typeof valeur === 'object') {
    return Object.fromEntries(Object.entries(valeur).map(([k, v]) => [k, surLesChaines(v, traiter)]));
  }
  return valeur;
}

const JSON_DE_DONNEES = /(<script\b[^>]*\btype="application\/json"[^>]*>)([\s\S]*?)(<\/script>)/g;

/**
 * Les `<script type="application/json">` portent des données que le script
 * de la page écrit ensuite à l'écran (noms de leçons, énoncés). On passe leurs
 * chaînes, pas leurs clés. Le JSON-LD (`application/ld+json`) n'est pas
 * concerné. Un JSON que `JSON.stringify` ne reproduirait pas à l'identique est
 * laissé tel quel.
 */
export function surLeJsonDeDonnees(html: string, traiter: (texte: string) => string): string {
  return html.replace(JSON_DE_DONNEES, (tout, ouvrante: string, corps: string, fermante: string) => {
    try {
      const valeur = JSON.parse(corps);
      if (JSON.stringify(valeur) !== corps) return tout;
      return ouvrante + JSON.stringify(surLesChaines(valeur, traiter)) + fermante;
    } catch {
      return tout;
    }
  });
}

/** Typographie les nœuds texte d'une page HTML, et les chaînes de ses données JSON. */
export function insecabiliserHtml(html: string): string {
  return surLeJsonDeDonnees(surLesNoeudsTexte(html, insecabiliser), insecabiliser);
}
