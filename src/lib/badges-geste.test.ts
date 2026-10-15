import { describe, it, expect } from 'vitest';
import { gagnerAuGeste } from './badges-geste';
import { annoncesDesBadges } from './badges';
import { charger, etatInitial, sauvegarder, terminerLecon, type Etat, type Stockage } from './progression';
import { notionsDuTheme } from './notions';
import type { QuestionConnue } from './profil';

const JOUR = '2026-10-14';

class Memoire implements Stockage {
  map = new Map<string, string>();
  ecritures = 0;
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.ecritures += 1; this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

const ecluses: QuestionConnue[] = Array.from({ length: 5 }, (_, k) => ({ id: `ecluses-${k}`, theme: 'ecluses' }));

function leconsSuivies(theme: string): Etat {
  return notionsDuTheme(theme).reduce((e, n) => terminerLecon(e, n.code, { bonnes: 1, total: 1 }, '2026-10-12'), etatInitial());
}

describe('annoncesDesBadges', () => {
  it('dit le palier par son nom, le thème par le sien, et le fait du jour', () => {
    expect(
      annoncesDesBadges([{ theme: 'ecluses', palier: 'parcouru', date: JOUR, lecons: 3 }]),
    ).toEqual([
      { cle: 'ecluses:parcouru', palier: 'Parcouru', theme: 'Écluses', fait: 'Les 3 leçons des écluses suivies, le 14 octobre.' },
    ]);
  });

  it('garde l’ordre reçu', () => {
    const a = annoncesDesBadges([
      { theme: 'balisage', palier: 'retenu', date: JOUR, retenues: 40, total: 50 },
      { theme: 'balisage', palier: 'sur', date: JOUR },
    ]);
    expect(a.map((x) => x.cle)).toEqual(['balisage:retenu', 'balisage:sur']);
    expect(a[0]!.fait).toBe('40 questions sur 50 retenues, le 14 octobre.');
  });
});

describe('gagnerAuGeste', () => {
  it('attribue, garde, et rend ce qui est à annoncer', async () => {
    const m = new Memoire();
    sauvegarder(leconsSuivies('ecluses'), m);
    const annonces = await gagnerAuGeste(ecluses, JOUR, m);
    expect(annonces.map((a) => a.cle)).toEqual(['ecluses:parcouru']);
    expect(charger(m).badges).toEqual({ ecluses: { parcouru: JOUR } });
  });

  it('n’annonce qu’une fois : le geste suivant ne rend rien', async () => {
    const m = new Memoire();
    sauvegarder(leconsSuivies('ecluses'), m);
    await gagnerAuGeste(ecluses, JOUR, m);
    expect(await gagnerAuGeste(ecluses, '2026-10-15', m)).toEqual([]);
    expect(charger(m).badges).toEqual({ ecluses: { parcouru: JOUR } });
  });

  it('n’écrit rien quand rien n’est gagné', async () => {
    const m = new Memoire();
    sauvegarder(etatInitial(), m);
    const avant = m.ecritures;
    expect(await gagnerAuGeste(ecluses, JOUR, m)).toEqual([]);
    expect(m.ecritures).toBe(avant);
  });

  it('relit l’état au moment du geste, pas avant', async () => {
    const m = new Memoire();
    sauvegarder(etatInitial(), m);
    const promesse = gagnerAuGeste(ecluses, JOUR, m);
    // Écrit pendant que le module des badges arrive : il doit être compté.
    sauvegarder(leconsSuivies('ecluses'), m);
    expect((await promesse).map((a) => a.cle)).toEqual(['ecluses:parcouru']);
  });
});
