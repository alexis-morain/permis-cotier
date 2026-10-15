/**
 * `scripts/verifier-css-mobile.mjs` : le survol gardé et les contrôles qui
 * répondent au premier appui. Les règles sont des fonctions pures sur du CSS ;
 * le bundle se lit dans la CI.
 */
import { describe, it, expect } from 'vitest';
import { controler, regles, stylesEnLigne } from '../scripts/verifier-css-mobile.mjs';

const CONTROLES = ['.bouton', '.proposition'];
const avecTouche = '.bouton,.proposition{touch-action:manipulation}';

describe('verifier-css-mobile', () => {
  it('lit les règles avec leurs blocs @ englobants, commentaires et chaînes compris', () => {
    const css = '/* a:hover { } */ .a{content:"}{"} @media (min-width:1px){@supports (x:y){.b:hover{color:red}}}';
    expect(regles(css)).toEqual([
      { selecteur: '.a', declarations: 'content:"}{"', contexte: [] },
      { selecteur: '.b:hover', declarations: 'color:red', contexte: ['@media (min-width:1px)', '@supports (x:y)'] },
    ]);
  });

  it('un survol sous (hover: hover), même minifié ou imbriqué, passe', () => {
    const css = `${avecTouche} @media (hover:hover) and (pointer:fine){.bouton:hover{color:red}}
      @media (hover: hover) { @media (min-width: 40rem) { a:hover { color: red } } }`;
    expect(controler([{ fichier: 'a.css', css }], CONTROLES)).toEqual([]);
  });

  it('un survol hors garde est refusé, avec le fichier et le sélecteur', () => {
    const css = `${avecTouche} @media (min-width:40rem){.bouton:hover{color:red}} @media (hover:none){a:hover{color:red}}`;
    const d = controler([{ fichier: '_astro/a.css', css }], CONTROLES);
    expect(d).toHaveLength(2);
    expect(d[0]).toContain('_astro/a.css');
    expect(d[0]).toContain('.bouton:hover');
    expect(d[1]).toContain('a:hover');
  });

  it('un même survol hors garde dans cent pages se dit une fois', () => {
    const pages = Array.from({ length: 100 }, (_, i) => ({ fichier: `p${i}.html`, css: '.x:hover{color:red}' }));
    expect(controler(pages, [])).toHaveLength(1);
  });

  it('un contrôle présent dans le bundle sans touch-action est refusé', () => {
    const d = controler([{ fichier: 'a.css', css: '.bouton{color:red}.proposition{touch-action:manipulation}' }], CONTROLES);
    expect(d).toEqual(['.bouton n’a pas de touch-action: manipulation dans le bundle']);
  });

  it('touch-action: none ne compte pas, et un modificateur n’est pas le contrôle', () => {
    const css = '.bouton{touch-action:none}.proposition--cochee{touch-action:manipulation}.proposition{color:red}';
    expect(controler([{ fichier: 'a.css', css }], CONTROLES)).toHaveLength(2);
  });

  it('un contrôle absent du bundle ne se réclame pas', () => {
    expect(controler([{ fichier: 'a.css', css: '.autre{color:red}' }], CONTROLES)).toEqual([]);
  });

  it('les feuilles en ligne d’une page se lisent, attributs compris', () => {
    const html = '<style>.a:hover{color:red}</style><p></p><style data-astro-cid-x>.b{color:blue}</style>';
    expect(stylesEnLigne(html)).toBe('.a:hover{color:red}\n.b{color:blue}');
  });
});
