import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { CRETE, creerLecteur, frisePourUneEcoute, programmer } from './signal-sonore';
import type { ContexteAudio } from './signal-sonore';
import { motifDe } from './motif-sonore';
import type { SignalSonore } from './motif-sonore';

/*
 * Un faux AudioContext qui enregistre ce qu'on programme : chaque oscillateur
 * garde sa fréquence, son départ et son arrêt, chaque gain la suite de ses
 * automatisations. Le son se lit alors comme un échéancier.
 */
type Appel = [string, number, number, number?];

class FauxParam {
  value = 0;
  appels: Appel[] = [];
  setValueAtTime(v: number, t: number) { this.appels.push(['set', v, t]); return this; }
  linearRampToValueAtTime(v: number, t: number) { this.appels.push(['lineaire', v, t]); return this; }
  exponentialRampToValueAtTime(v: number, t: number) { this.appels.push(['exp', v, t]); return this; }
  setTargetAtTime(v: number, t: number, c: number) { this.appels.push(['cible', v, t, c]); return this; }
  cancelScheduledValues(t: number) { this.appels.push(['annule', 0, t]); return this; }
  /** La plus haute valeur jamais visée. */
  crete() { return Math.max(...this.appels.map((a) => a[1])); }
}

class FauxNoeud {
  sorties: unknown[] = [];
  deconnecte = false;
  connect<T>(n: T): T { this.sorties.push(n); return n; }
  disconnect() { this.deconnecte = true; }
}

class FauxOscillateur extends FauxNoeud {
  type = 'sine';
  frequency = new FauxParam();
  debut: number | null = null;
  fin = Infinity;
  onde: unknown = null;
  start(t = 0) { this.debut = t; }
  stop(t = 0) { this.fin = Math.min(this.fin, t); }
  setPeriodicWave(o: unknown) { this.onde = o; }
}

class FauxGain extends FauxNoeud {
  gain = new FauxParam();
}

class FauxContexte {
  currentTime = 0;
  destination = new FauxNoeud();
  oscillateurs: FauxOscillateur[] = [];
  gains: FauxGain[] = [];
  createOscillator() { const o = new FauxOscillateur(); this.oscillateurs.push(o); return o; }
  createGain() { const g = new FauxGain(); this.gains.push(g); return g; }
  createPeriodicWave(reel: Float32Array, imag: Float32Array) { return { reel, imag }; }
}

const faux = () => new FauxContexte();
const commeContexte = (c: FauxContexte) => c as unknown as ContexteAudio;
const signal = (nom: string) => motifDe(`sons/${nom}.svg`)!;

/** Les sons du sifflet : départ, fin et hauteur, relatifs au début du signal. */
function souffles(c: FauxContexte, depart: number) {
  return c.oscillateurs
    .filter((o) => o.debut !== null)
    .map((o) => ({ debut: +(o.debut! - depart).toFixed(3), fin: +(o.fin - depart).toFixed(3), hz: o.frequency.value }));
}

/** Les coups de cloche : départs des oscillateurs sur la fondamentale. */
function coups(c: FauxContexte, depart: number, fondamentale: number) {
  return c.oscillateurs
    .filter((o) => o.frequency.value === fondamentale)
    .map((o) => +(o.debut! - depart).toFixed(3));
}

describe('programmer, au sifflet', () => {
  it('brume-stoppe : deux prolongés séparés de deux secondes', () => {
    const c = faux();
    const { debut, fin } = programmer(commeContexte(c), signal('brume-stoppe'));
    expect(souffles(c, debut)).toEqual([
      { debut: 0, fin: 5, hz: 440 },
      { debut: 7, fin: 12, hz: 440 },
    ]);
    expect(fin - debut).toBeCloseTo(12, 6);
  });

  it('avertissement-doute : cinq brefs en série rapide', () => {
    const c = faux();
    const { debut } = programmer(commeContexte(c), signal('avertissement-doute'));
    expect(souffles(c, debut).map((s) => [s.debut, s.fin])).toEqual([
      [0, 1], [1.5, 2.5], [3, 4], [4.5, 5.5], [6, 7],
    ]);
  });

  it('part un instant après maintenant, jamais dans le passé', () => {
    const c = faux();
    c.currentTime = 42;
    const { debut } = programmer(commeContexte(c), signal('coude'));
    expect(debut).toBeGreaterThan(42);
    expect(debut).toBeLessThan(42.2);
  });

  it('attaque et chute en cinquante millisecondes, crête à -12 dBFS', () => {
    const c = faux();
    const { debut } = programmer(commeContexte(c), signal('coude'));
    const enveloppe = c.gains.find((g) => c.oscillateurs[0]!.sorties.includes(g))!;
    expect(enveloppe.gain.appels).toEqual([
      ['set', 0, debut],
      ['lineaire', CRETE, debut + 0.05],
      ['set', CRETE, debut + 5 - 0.05],
      ['lineaire', 0, debut + 5],
    ]);
    expect(CRETE).toBeCloseTo(10 ** (-12 / 20), 6);
  });

  it('le coude : un seul prolongé, au sifflet du navire 1', () => {
    const c = faux();
    const { debut } = programmer(commeContexte(c), signal('coude'));
    expect(souffles(c, debut)).toEqual([{ debut: 0, fin: 5, hz: 440 }]);
  });

  it('deux navires dans un même motif : deux hauteurs, une par navire', () => {
    const signalEtReponse: SignalSonore = {
      nom: 'essai',
      instrument: 'sifflet',
      motif: [[5, 'p', 1], [1, null, null], [5, 'p', 2]],
      duree: 11,
    };
    const c = faux();
    const { debut } = programmer(commeContexte(c), signalEtReponse);
    expect(souffles(c, debut)).toEqual([
      { debut: 0, fin: 5, hz: 440 },
      { debut: 6, fin: 11, hz: 660 },
    ]);
  });
});

describe('programmer, à la cloche', () => {
  it('brume-echouement : trois coups, la volée, trois coups', () => {
    const c = faux();
    const { debut, fin } = programmer(commeContexte(c), signal('brume-echouement'));
    const t = coups(c, debut, 440);
    expect(t.slice(0, 3)).toEqual([0, 1, 2]);
    expect(t.slice(-3)).toEqual([9.35, 10.35, 11.35]);
    const volee = t.slice(3, -3);
    expect(volee).toHaveLength(17);
    expect(volee[0]).toBeCloseTo(3.35 + 0.0828, 3);
    expect(volee.every((x) => x > 3.35 && x < 8.35)).toBe(true);
    expect(fin - debut).toBeCloseTo(11.7, 6);
  });

  it('chaque coup sonne les quatre partiels de la cloche de bord', () => {
    const c = faux();
    programmer(commeContexte(c), signal('brume-mouillage'));
    const hauteurs = new Set(c.oscillateurs.map((o) => +o.frequency.value.toFixed(1)));
    expect([...hauteurs].sort((a, b) => a - b)).toEqual([440, 880, 1214.4, 2376]);
  });

  it('aucun coup ne dépasse la crête, et la volée se tasse pour ne pas la crever', () => {
    const c = faux();
    programmer(commeContexte(c), signal('brume-echouement'));
    const parDepart = new Map<number, number>();
    for (const g of c.gains) {
      const attaque = g.gain.appels.find((a) => a[0] === 'lineaire');
      if (attaque) parDepart.set(attaque[2], (parDepart.get(attaque[2]) ?? 0) + attaque[1]);
    }
    const sommes = [...parDepart.values()];
    expect(Math.max(...sommes)).toBeLessThanOrEqual(CRETE + 1e-9);
    // Un coup de volée est plus doux qu'un coup isolé : ils se recouvrent.
    expect(Math.min(...sommes)).toBeLessThan(Math.max(...sommes) * 0.6);
  });

  it('rien ne sonne après la fin du motif', () => {
    const c = faux();
    const { fin } = programmer(commeContexte(c), signal('brume-echouement'));
    expect(Math.max(...c.oscillateurs.map((o) => o.fin))).toBeLessThanOrEqual(fin + 1e-9);
  });
});

describe('le lecteur', () => {
  afterEach(() => vi.useRealTimers());

  it("un deuxième appui pendant la lecture n'empile pas deux sons", () => {
    const c = faux();
    const lecteur = creerLecteur(commeContexte(c));
    expect(lecteur.jouer(signal('brume-stoppe'))).toBe(true);
    const avant = c.oscillateurs.length;
    expect(lecteur.jouer(signal('brume-stoppe'))).toBe(false);
    expect(lecteur.jouer(signal('coude'))).toBe(false);
    expect(c.oscillateurs).toHaveLength(avant);
    expect(lecteur.enCours).toBe(true);
  });

  it("l'arrêt coupe tout, tout de suite", () => {
    const c = faux();
    const lecteur = creerLecteur(commeContexte(c));
    const fini = vi.fn();
    lecteur.jouer(signal('brume-echouement'), fini);
    c.currentTime = 2;
    lecteur.arreter();
    expect(c.oscillateurs.every((o) => o.fin <= 2.1)).toBe(true);
    expect(lecteur.enCours).toBe(false);
    expect(fini).toHaveBeenCalledTimes(1);
    // Et l'on peut rejouer.
    expect(lecteur.jouer(signal('coude'))).toBe(true);
  });

  it('dit quand le signal a fini, une seule fois', () => {
    vi.useFakeTimers();
    const c = faux();
    const lecteur = creerLecteur(commeContexte(c));
    const fini = vi.fn();
    lecteur.jouer(signal('coude'), fini);
    vi.advanceTimersByTime(4900);
    expect(fini).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(fini).toHaveBeenCalledTimes(1);
    expect(lecteur.enCours).toBe(false);
    lecteur.arreter();
    expect(fini).toHaveBeenCalledTimes(1);
  });
});

describe('la frise pour une écoute', () => {
  const svg = readFileSync(new URL('../../public/visuels/sons/coude.svg', import.meta.url), 'utf-8');

  it("joue une seule fois et s'arrête sur sa dernière image", () => {
    const une = frisePourUneEcoute(svg);
    expect(une).toMatch(/\.son\{[^}]*coude-son 8\.5s step-end 1 forwards\}/);
    expect(une).toMatch(/\.curseur\{[^}]*coude-balayage 8\.5s linear 1 forwards\}/);
  });

  it('laisse battre les ondes, que la frise éteint à la fin', () => {
    expect(frisePourUneEcoute(svg)).toMatch(/\.onde\{[^}]*propagation 1\.05s linear infinite\}/);
  });

  it('ne touche à rien d’autre', () => {
    const une = frisePourUneEcoute(svg);
    expect(une.replace(/ 1 forwards/g, ' infinite')).toBe(svg);
  });
});
