/**
 * Le moteur qui fait entendre un signal sonore du RIPAM, en Web Audio.
 *
 * Aucun fichier audio : le son se fabrique à la demande depuis la table de
 * `sons-motifs.json`, la même que les frises. Ce module est chargé en
 * `import()` au premier appui sur « Écouter le signal » ; il ne touche ni au
 * DOM ni à React, et se teste avec un faux contexte qui enregistre.
 *
 * Ce qui est sourcé : les durées (règle 32), la hauteur du sifflet (annexe III,
 * § 1 b), toutes deux dans `sons.py`. Ce qui est une convention : le timbre du
 * sifflet, la crête et les enveloppes, écrits ici.
 */
import { TABLE } from './motif-sonore';
import type { SignalSonore, TableSonore } from './motif-sonore';

/** Ce que le moteur demande au contexte : un `AudioContext`, ou un faux qui enregistre. */
export type ContexteAudio = Pick<
  BaseAudioContext,
  'currentTime' | 'destination' | 'createOscillator' | 'createGain' | 'createPeriodicWave'
>;

/** -12 dBFS : jamais plus fort qu'une notification. */
export const CRETE = 10 ** (-12 / 20);
/** Attaque et chute du sifflet : pas de clic, et un bref reste un bref. */
const RAMPE = 0.05;
/** Attaque d'un coup de cloche : un battant frappe, il ne monte pas. */
const FRAPPE = 0.005;
/** Le son part un instant après l'appui, jamais dans le passé du contexte. */
const AVANCE = 0.05;
/**
 * Le timbre du sifflet : la fondamentale et deux harmoniques. Un sinus pur
 * sonne comme un signal de test ; l'octave porte aussi le son sur le
 * haut-parleur d'un téléphone, qui rend mal le bas de la bande.
 */
const HARMONIQUES = [0, 1, 0.45, 0.12];

export interface Programme {
  /** Instants, dans l'horloge du contexte, où le signal commence et finit. */
  debut: number;
  fin: number;
  arreter(): void;
}

/** Pose sur le contexte tous les sons d'un signal, de son début à sa fin. */
export function programmer(contexte: ContexteAudio, signal: SignalSonore, table: TableSonore = TABLE): Programme {
  const debut = contexte.currentTime + AVANCE;
  const fin = debut + signal.duree;
  const oscillateurs: OscillatorNode[] = [];

  const maitre = contexte.createGain();
  maitre.gain.value = 1;
  maitre.connect(contexte.destination);

  const son = (hz: number, depart: number, arret: number): GainNode => {
    const o = contexte.createOscillator();
    const g = contexte.createGain();
    o.frequency.value = hz;
    o.connect(g).connect(maitre);
    oscillateurs.push(o);
    o.start(depart);
    o.stop(arret);
    return g;
  };

  if (signal.instrument === 'sifflet') {
    const reel = new Float32Array(HARMONIQUES.length);
    const onde = contexte.createPeriodicWave(reel, Float32Array.from(HARMONIQUES));
    let t = debut;
    for (const [d, sorte, navire] of signal.motif) {
      if (sorte !== null) {
        const g = son(table.sifflet.hz[String(navire ?? 1)] ?? 440, t, t + d);
        oscillateurs.at(-1)!.setPeriodicWave(onde);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(CRETE, t + RAMPE);
        g.gain.setValueAtTime(CRETE, t + d - RAMPE);
        g.gain.linearRampToValueAtTime(0, t + d);
      }
      t += d;
    }
  } else {
    const { hz, partiels, volee } = table.cloche;
    const somme = partiels.reduce((s, [, amp]) => s + amp!, 0);
    // Les coups d'une volée se recouvrent : chaque coup s'allège de ce que la
    // résonance des précédents porte encore, et la volée tient sous la crête.
    const pas = (volee[1] ?? 1) - (volee[0] ?? 0);
    const tassement = 1 - Math.exp(-pas / (partiels[0]?.[2] ?? 1));
    const coup = (depart: number, niveau: number) => {
      for (const [rapport, amp, decroissance] of partiels) {
        const g = son(hz * rapport!, depart, Math.min(depart + 5 * decroissance!, fin));
        g.gain.setValueAtTime(0, depart);
        g.gain.linearRampToValueAtTime((CRETE * niveau * amp!) / somme, depart + FRAPPE);
        g.gain.setTargetAtTime(0, depart + FRAPPE, decroissance!);
      }
    };
    let t = debut;
    for (const [d, sorte] of signal.motif) {
      if (sorte === 'c') coup(t, 1);
      if (sorte === 'v') for (const dt of volee) if (dt < d) coup(t + dt, tassement);
      t += d;
    }
    // La cloche résonne encore quand le motif finit : on l'éteint, sans clic.
    maitre.gain.setValueAtTime(1, fin - RAMPE);
    maitre.gain.linearRampToValueAtTime(0, fin);
  }

  return {
    debut,
    fin,
    arreter() {
      const maintenant = contexte.currentTime;
      maitre.gain.cancelScheduledValues(maintenant);
      maitre.gain.setTargetAtTime(0, maintenant, 0.01);
      for (const o of oscillateurs) {
        try {
          o.stop(maintenant + RAMPE);
        } catch {
          /* Un vieux WebKit refuse un second `stop` : le premier tient déjà. */
        }
      }
    },
  };
}

export interface Lecteur {
  readonly enCours: boolean;
  /** Joue le signal, sauf si un autre sonne déjà : rend alors `false`, sans rien empiler. */
  jouer(signal: SignalSonore, surFin?: () => void): boolean;
  /** Coupe tout ; `surFin` est appelé, une seule fois, comme à la fin naturelle. */
  arreter(): void;
}

export function creerLecteur(contexte: ContexteAudio): Lecteur {
  let courant: { programme: Programme; surFin?: () => void; minuterie: ReturnType<typeof setTimeout> } | null = null;

  const finir = () => {
    if (!courant) return;
    const { surFin, minuterie } = courant;
    courant = null;
    clearTimeout(minuterie);
    surFin?.();
  };

  return {
    get enCours() {
      return courant !== null;
    },
    jouer(signal, surFin) {
      if (courant) return false;
      const programme = programmer(contexte, signal);
      const minuterie = setTimeout(finir, (programme.fin - contexte.currentTime) * 1000);
      courant = { programme, surFin, minuterie };
      return true;
    },
    arreter() {
      courant?.programme.arreter();
      finir();
    },
  };
}

/**
 * La frise rejouée avec le son : une seule passe, qui s'arrête sur sa dernière
 * image (curseur au bout, ondes éteintes). Le SVG d'origine boucle sans fin ;
 * on en sert une copie, puisqu'une image ne se rembobine pas de l'extérieur.
 */
export function frisePourUneEcoute(svg: string): string {
  return svg.replace(/(\.(?:son|curseur)\{[^}]*?) infinite\}/g, '$1 1 forwards}');
}
