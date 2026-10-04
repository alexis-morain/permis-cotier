/** @vitest-environment jsdom */
/**
 * Le script en ligne tel que le build le pose dans la page : empaqueté par
 * esbuild depuis `bande-avant-rendu.ts`, exécuté sans module ni import.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { CLE_STOCKAGE, enregistrerExamen, etatInitial } from './progression';

let code = '';
beforeAll(() => {
  // Dans un processus à part : esbuild ne tourne pas sous jsdom.
  const script = resolve(process.cwd(), 'scripts/bande-avant-rendu.mjs');
  code = execFileSync(process.execPath, [script], { encoding: 'utf8' });
});

function page() {
  document.body.innerHTML = `
    <section class="ouverture">
      <script type="application/json" id="accueil-donnees">${JSON.stringify({
        lecons: [{ code: 'balisage-lateral', nom: 'Marques latérales', chemin: '/cours/balisage/balisage-lateral' }],
        banque: [{ id: 'vhf-0', theme: 'vhf' }],
      })}</script>
      <div class="page ouverture__grille" data-bande-grille>
        <div class="ouverture__texte ouverture__texte--nouveau"><h1>Révise le permis côtier</h1></div>
      </div>
    </section>`;
}
const executer = () => new Function(code)();

beforeEach(() => {
  localStorage.clear();
  page();
});

describe('le script en ligne de la bande', () => {
  it('se suffit à lui-même : ni import, ni export, ni require', () => {
    expect(code).not.toMatch(/\bimport\s*[{(*"']|\bexport\s|\brequire\(/);
  });

  it('tient sous un seul try, horloge comprise', () => {
    expect(code.startsWith('try{')).toBe(true);
    expect(code.endsWith('}catch(e){}')).toBe(true);
    const Intl0 = globalThis.Intl;
    // @ts-expect-error une horloge absente, pour voir le script se taire
    globalThis.Intl = undefined;
    try {
      expect(executer).not.toThrow();
    } finally {
      globalThis.Intl = Intl0;
    }
  });

  it('reste petit : il est dans le HTML de chaque visite de l’accueil', () => {
    expect(code.length).toBeLessThan(9000);
    expect(code).not.toContain('Signaux et pavillons');
  });

  it('pose la bande de qui revient depuis le vrai stockage', () => {
    const etat = enregistrerExamen(etatInitial(), { date: '2020-01-01', bonnes: 37, total: 40, reussi: true });
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat));
    executer();
    expect(document.querySelector('.ouverture')?.getAttribute('data-bande')).toBe('recu');
    expect(document.querySelector('.ouverture__texte--retour h1')?.textContent).toBe('Dernier examen blanc : 37\u00a0sur\u00a040, reçu.');
  });

  it('laisse le nouveau venu tel quel, et ne lève rien sur un stockage abîmé', () => {
    const avant = document.body.innerHTML;
    executer();
    localStorage.setItem(CLE_STOCKAGE, '{abîmé');
    expect(executer).not.toThrow();
    expect(document.body.innerHTML).toBe(avant);
  });
});
