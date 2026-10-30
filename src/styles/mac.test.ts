/**
 * L'app sur Mac : la souris. Les boutons de l'app ont leurs propres couleurs
 * (`html[data-app] .bouton…`), plus spécifiques que les `:hover` de
 * `global.css` : sans règle de survol à eux, ils ne bougeaient pas sous le
 * pointeur (vu à l'écran le 30 octobre). Le survol reste réservé aux
 * pointeurs fins, l'iPhone n'en voit rien.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const racine = new URL('../../', import.meta.url);
const app = readFileSync(new URL('src/styles/app.css', racine), 'utf-8');

describe('Mac : le survol des boutons de l’app', () => {
  const debut = app.indexOf('@media (hover: hover) and (pointer: fine)');
  const bloc = app.slice(debut, app.indexOf('\n}\n', debut));

  it('n’existe que pour un pointeur fin', () => {
    expect(debut).toBeGreaterThan(-1);
  });

  it('le bouton principal s’assombrit à peine, moins qu’à l’appui', () => {
    expect(bloc).toMatch(
      /html\[data-app\] \.bouton--principal:hover\s*{[^}]*background:\s*color-mix\(in srgb, var\(--jaune\) 95%, #000\)/,
    );
  });

  it('le bouton second prend le fond de l’appui', () => {
    expect(bloc).toMatch(
      /html\[data-app\] \.bouton:not\(\.bouton--principal\):not\(\.bouton--discret\):hover\s*{[^}]*background:\s*var\(--fond-2\)/,
    );
  });

  // Même spécificité que `:active` et `[disabled]` : c'est l'ordre qui
  // tranche, et l'appui comme le bouton éteint doivent l'emporter.
  it('vient avant l’appui et l’état désactivé', () => {
    expect(debut).toBeLessThan(app.indexOf('html[data-app] .bouton--principal:active'));
    expect(debut).toBeLessThan(app.indexOf('html[data-app] .bouton[disabled]'));
  });
});
