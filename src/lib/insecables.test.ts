import { describe, expect, it } from 'vitest';
import { FINE, INSECABLE, insecabiliser, insecabiliserHtml } from './insecables';

const F = FINE;
const N = INSECABLE;

describe('insecabiliser : ponctuation', () => {
  it('met une espace fine avant ; ! ?', () => {
    expect(insecabiliser('Bien ; non ! Vraiment ?')).toBe(`Bien${F}; non${F}! Vraiment${F}?`);
  });

  it('met une insécable avant :', () => {
    expect(insecabiliser('Attention : feu rouge')).toBe(`Attention${N}: feu rouge`);
  });

  it('met des insécables dans les guillemets', () => {
    expect(insecabiliser('Il dit « tout va bien » puis part')).toBe(`Il dit «${N}tout va bien${N}» puis part`);
  });

  it('un guillemet fermant en tête de morceau (après une variable ou une balise)', () => {
    expect(insecabiliser(' ».')).toBe(`${N}».`);
    expect(insecabiliser('« ')).toBe(`«${N}`);
  });

  it('la ponctuation après un guillemet fermant', () => {
    expect(insecabiliser('un « mot » : voilà')).toBe(`un «${N}mot${N}»${N}: voilà`);
  });

  it('ne double pas une insécable déjà posée, quelle qu’elle soit', () => {
    expect(insecabiliser(`Quoi${N}? Si${F}! Non${N}: ok`)).toBe(`Quoi${F}? Si${F}! Non${N}: ok`);
    expect(insecabiliser(`«${N}a${N}»`)).toBe(`«${N}a${N}»`);
  });

  it('remplace une suite d’espaces plutôt que d’en ajouter', () => {
    expect(insecabiliser('Quoi  ?')).toBe(`Quoi${F}?`);
    expect(insecabiliser('Quoi\n   ?')).toBe(`Quoi${F}?`);
  });

  it('traite la ponctuation en tête de nœud, collée à une balise qui précède', () => {
    expect(insecabiliser(' : suite')).toBe(`${N}: suite`);
  });

  it('debut: false ne lie pas une ponctuation en tête de chaîne', () => {
    expect(insecabiliser(' : ', { debut: false })).toBe(' : ');
    expect(insecabiliser(' ; ', { debut: false })).toBe(' ; ');
    expect(insecabiliser('Oui : non', { debut: false })).toBe(`Oui${N}: non`);
  });

  it('laisse les heures, les URL et les ratios', () => {
    expect(insecabiliser('à 14:30 chez https://exemple.fr/a?b=1 et 1:50 000')).toBe(
      `à 14:30 chez https://exemple.fr/a?b=1 et 1:50${F}000`,
    );
  });

  it('ne touche pas un ? ou un : collé à ce qui suit', () => {
    expect(insecabiliser('voir /page ?a=1 et heure :30')).toBe('voir /page ?a=1 et heure :30');
  });

  it('laisse !important', () => {
    expect(insecabiliser('color: red !important')).toBe('color: red !important');
  });

  it('laisse les smileys', () => {
    expect(insecabiliser('bravo :) et ;) et :/ ')).toBe('bravo :) et ;) et :/ ');
  });

  it('accepte une parenthèse fermante après ? ou !', () => {
    expect(insecabiliser('(vraiment ?)')).toBe(`(vraiment${F}?)`);
  });

  it('ne touche pas un texte sans espace', () => {
    expect(insecabiliser('sans-espace')).toBe('sans-espace');
  });

  it('est idempotent', () => {
    const t = 'Il y a 40 questions : « oui » ; 12 000 m ? 1,85 € !';
    expect(insecabiliser(insecabiliser(t))).toBe(insecabiliser(t));
  });
});

describe('insecabiliser : nombres', () => {
  it('lie un nombre à son unité ou au mot qu’il compte', () => {
    expect(insecabiliser('40 questions, 5 milles, 300 m, 6 nœuds')).toBe(
      `40${N}questions, 5${N}milles, 300${N}m, 6${N}nœuds`,
    );
  });

  it('lie un nombre au symbole qui le suit', () => {
    expect(insecabiliser('12 % et 1,85 € et 20 °C')).toBe(`12${N}% et 1,85${N}€ et 20${N}°C`);
  });

  it('met U+202F aux milliers', () => {
    expect(insecabiliser('12 000 m et 1 250 000 €')).toBe(`12${F}000${N}m et 1${F}250${F}000${N}€`);
    expect(insecabiliser(`12${N}000`)).toBe(`12${F}000`);
  });

  it('ne prend pas deux nombres de longueur quelconque pour des milliers', () => {
    expect(insecabiliser('de 2022 500 à 12 34')).toBe('de 2022 500 à 12 34');
  });

  it('laisse un nombre devant un mot qu’il ne compte pas', () => {
    expect(insecabiliser('entre 5 et 10, soit 12 de plus, 3 d’entre eux')).toBe(
      'entre 5 et 10, soit 12 de plus, 3 d’entre eux',
    );
  });

  it('une seconde reste une seconde, pas une élision', () => {
    expect(insecabiliser('10 s et 10 s’en vont')).toBe(`10${N}s et 10 s’en vont`);
  });

  it('lie les heures « 14 h 30 »', () => {
    expect(insecabiliser('à 14 h 30')).toBe(`à 14${N}h${N}30`);
  });

  it('lie art. et n° à leur numéro', () => {
    expect(insecabiliser('art. 240 et n° 41/2018')).toBe(`art.${N}240 et n°${N}41/2018`);
  });

  it('ne scinde pas un identifiant ni un nombre accolé à des lettres', () => {
    expect(insecabiliser('H2 de la division 240-2.04 de')).toBe('H2 de la division 240-2.04 de');
  });

  it('ne touche pas un nombre devant une majuscule', () => {
    expect(insecabiliser('Règle 15 Navire')).toBe('Règle 15 Navire');
  });
});

describe('insecabiliserHtml', () => {
  it('ne touche que les nœuds texte', () => {
    const html = '<p class="a b" title="Qui ? Là : 5 m">Qui ? Là : 5 m</p>';
    expect(insecabiliserHtml(html)).toBe(`<p class="a b" title="Qui ? Là : 5 m">Qui${F}? Là${N}: 5${N}m</p>`);
  });

  it('saute script, style, code, pre et le JSON-LD', () => {
    const html =
      '<style>a{color:red !important}</style><script>var a = b ? c : d;</script>' +
      '<script type="application/ld+json">{"name":"Quoi ? Là : 5 m"}</script>' +
      '<code>x ? y : z</code><pre>x ? y</pre><p>x ? y</p>';
    expect(insecabiliserHtml(html)).toBe(
      '<style>a{color:red !important}</style><script>var a = b ? c : d;</script>' +
        '<script type="application/ld+json">{"name":"Quoi ? Là : 5 m"}</script>' +
        `<code>x ? y : z</code><pre>x ? y</pre><p>x${F}? y</p>`,
    );
  });

  it('ne se laisse pas tromper par un > dans un attribut', () => {
    expect(insecabiliserHtml('<a href="/a?b" data-x="1 > 0 ?">Oui ?</a>')).toBe(
      `<a href="/a?b" data-x="1 > 0 ?">Oui${F}?</a>`,
    );
  });

  it('saute les commentaires', () => {
    expect(insecabiliserHtml('<!-- a ? b --><p>a ?</p>')).toBe(`<!-- a ? b --><p>a${F}?</p>`);
  });

  it('lit &nbsp; comme une insécable et ne la double pas', () => {
    expect(insecabiliserHtml('<p>Oui&nbsp;: non</p>')).toBe(`<p>Oui${N}: non</p>`);
  });

  it('typographie le <title> et les meta de description et de partage', () => {
    const html =
      '<title>Permis : 40 questions</title>' +
      '<meta name="description" content="Révise : 40 questions ?">' +
      '<meta property="og:title" content="Un titre : ok">' +
      '<meta name="robots" content="index, follow ?">' +
      '<link rel="canonical" href="https://x.fr/a?b">';
    expect(insecabiliserHtml(html)).toBe(
      `<title>Permis${N}: 40${N}questions</title>` +
        `<meta name="description" content="Révise${N}: 40${N}questions${F}?">` +
        `<meta property="og:title" content="Un titre${N}: ok">` +
        '<meta name="robots" content="index, follow ?">' +
        '<link rel="canonical" href="https://x.fr/a?b">',
    );
  });

  it('le CSS en ligne dans un svg reste intact', () => {
    const html = '<svg><style>.a{animation:x 1 forwards}</style><text>Oui ?</text></svg>';
    expect(insecabiliserHtml(html)).toBe(`<svg><style>.a{animation:x 1 forwards}</style><text>Oui${F}?</text></svg>`);
  });

  it('est idempotent', () => {
    const html = '<p>Il y a 40 questions : « oui » ; 12 000 m ?</p>';
    expect(insecabiliserHtml(insecabiliserHtml(html))).toBe(insecabiliserHtml(html));
  });
});

describe('insecabiliserHtml : données JSON', () => {
  it('passe les chaînes d’un JSON de données, pas ses clés ni le JSON-LD', () => {
    const donnees = '<script type="application/json" id="d">{"Qui ?":["Là : 5 m"],"n":3}</script>';
    const ld = '<script type="application/ld+json">{"name":"Là : 5 m"}</script>';
    expect(insecabiliserHtml(donnees + ld)).toBe(
      `<script type="application/json" id="d">{"Qui ?":["Là${N}: 5${N}m"],"n":3}</script>` + ld,
    );
  });

  it('laisse un JSON mis en forme autrement ou invalide', () => {
    const joli = '<script type="application/json">{ "a": "Là : 5 m" }</script>';
    const casse = '<script type="application/json">{"a": </script>';
    expect(insecabiliserHtml(joli + casse)).toBe(joli + casse);
  });
});
