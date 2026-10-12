/**
 * `scripts/verifier-accessibilite.mjs` : ce que VoiceOver trouvera dans l'app,
 * relu sur le HTML. Chaque défaut est fabriqué dans une page minimale ; la
 * page saine n'en rend aucun.
 */
import { describe, it, expect } from 'vitest';
import { auditerPage } from '../scripts/verifier-accessibilite.mjs';

const page = (corps: string, lang = 'fr') => `<!doctype html><html lang="${lang}"><body>${corps}</body></html>`;

describe('auditerPage', () => {
  it('une page saine ne rend rien', () => {
    const html = page(`
      <h1>Cours</h1>
      <a href="/cours/balisage">Lire le balisage</a>
      <button type="button" aria-label="Fermer"><svg aria-hidden="true"></svg></button>
      <a href="/"><img src="/logo.svg" alt="Permis côtier"></a>
      <label for="d">Date</label><input id="d" type="date">
      <label>Prénom <input type="text"></label>
      <div role="group" aria-labelledby="t"><p id="t">Titre</p></div>
      <img src="/deco.svg" alt="">
    `);
    expect(auditerPage(html)).toEqual([]);
  });

  it('une page sans langue française est un défaut', () => {
    expect(auditerPage(page('<p>x</p>', 'en'))).toHaveLength(1);
  });

  it('un bouton ou un lien sans nom est un défaut, même avec une icône cachée', () => {
    const d = auditerPage(page('<button type="button"><svg aria-hidden="true"></svg></button><a href="/x"> </a>'));
    expect(d).toHaveLength(2);
  });

  it('une image sans alt est un défaut, une image décorative à alt vide ne l’est pas', () => {
    expect(auditerPage(page('<img src="/a.svg">'))).toHaveLength(1);
    expect(auditerPage(page('<img src="/a.svg" alt="">'))).toEqual([]);
  });

  it('un champ sans étiquette est un défaut', () => {
    expect(auditerPage(page('<input type="date">'))).toHaveLength(1);
  });

  it('un tabindex positif est un défaut, zéro et moins un ne le sont pas', () => {
    expect(auditerPage(page('<h2 tabindex="-1">x</h2><div tabindex="0">y</div>'))).toEqual([]);
    expect(auditerPage(page('<div tabindex="2">y</div>'))).toHaveLength(1);
  });

  it('une référence ARIA vers un identifiant absent est un défaut', () => {
    expect(auditerPage(page('<div aria-describedby="absent">x</div>'))).toHaveLength(1);
  });

  it('un identifiant en double est un défaut', () => {
    expect(auditerPage(page('<p id="a">x</p><p id="a">y</p>'))).toHaveLength(1);
  });

  it('ce qui est caché aux lecteurs d’écran n’est pas relu', () => {
    expect(auditerPage(page('<div aria-hidden="true"><a href="/x"></a></div>'))).toEqual([]);
  });
});
