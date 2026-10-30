/**
 * L'app sur iPad : les feuilles `app-*` gardent une seule colonne de jeu.
 * Au-dessus de 60 rem, `quiz.css` met l'examen en grille (question, carnet) ;
 * l'app n'a pas de carnet, et ses barres du bas, qui débordent par
 * `margin-inline: calc(50% - 50vw)`, ne tiennent que dans une colonne centrée.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const racine = new URL('../../', import.meta.url);
const lire = (chemin: string) => readFileSync(new URL(chemin, racine), 'utf-8');

describe('iPad : la colonne de jeu', () => {
  const jeu = lire('src/styles/app-jeu.css');
  const bloc = jeu.slice(jeu.indexOf('@media (min-width: 50rem)'));

  it('l’examen redevient une colonne flex étirée, centrée, de 44 rem', () => {
    expect(bloc).toMatch(/\.jeu--examen\s*{[^}]*display:\s*flex/);
    expect(bloc).toMatch(/\.jeu--examen\s*{[^}]*align-items:\s*stretch/);
    expect(bloc).toMatch(/\.jeu--examen\s*{[^}]*max-width:\s*44rem/);
  });

  it('les barres du bas recalent leur contenu sur la colonne', () => {
    expect(bloc).toMatch(/\.jeu__pied\s*{[^}]*padding-inline:[^;]*50vw - 22rem/);
    expect(bloc).toMatch(/\.jeu > \.jeu__actions--collant\s*{[^}]*padding-inline:[^;]*50vw - 22rem/);
  });

  it('la page ne dépasse pas la colonne de lecture', () => {
    expect(lire('src/styles/app.css')).toMatch(/html\[data-app\] \.page\s*{\s*width:\s*min\(100% - 32px, 46rem\)/);
  });
});

describe('iPad : le résultat', () => {
  it('le lien de partage est centré sur la colonne, pas dans une boîte de 54ch', () => {
    expect(lire('src/styles/app-jeu.css')).toMatch(/\.resultat__partage\s*{[^}]*max-width:\s*none/);
  });
});
