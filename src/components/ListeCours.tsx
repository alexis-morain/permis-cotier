import { useEffect, useState } from 'react';
import { charger } from '../lib/progression';
import type { LeconSuivie } from '../lib/progression';
import { POUR_APP } from '../lib/cible';
import { Coche } from './Parcours';
import './parcours.css';

/**
 * Les quatorze cours dans l'ordre du parcours, un par thème, avec ce que le
 * navigateur sait de chacun. Rendu au serveur avec les comptes de leçons ;
 * hydraté, il montre l'avancement de chaque cours, désigne celui où l'on en
 * est, et tend la leçon à faire maintenant.
 */

interface CoursListe {
  code: string;
  titre: string;
  promesse: string;
  chemin: string;
  minutes: number;
  lecons: { code: string; nom: string; chemin: string; ecrite: boolean; duree: number }[];
}

interface Props {
  cours: CoursListe[];
}

export type EtatChapitre = 'vide' | 'encours' | 'fait';

/** Où en est un chapitre, au compte de ses leçons faites. */
export function etatDuChapitre(faites: number, total: number): EtatChapitre {
  if (faites === 0) return 'vide';
  return faites >= total ? 'fait' : 'encours';
}

const MOT_ETAT: Record<EtatChapitre, string> = {
  vide: 'pas commencé',
  encours: 'en cours',
  fait: 'terminé',
};

/**
 * Les chapitres tels que la coquille les montre : une cellule pleine largeur
 * par chapitre, un disque numéroté, le titre, le compte et une jauge. L'état
 * est dit par le disque et, en toutes lettres, par son nom accessible : la
 * couleur seule ne dit jamais rien.
 */
function ChapitresApp({ cours, suivies }: Props & { suivies: Record<string, LeconSuivie> | null }) {
  return (
    <ol className="chapitres">
      {cours.map((c, i) => {
        const total = c.lecons.length;
        const faitesIci = c.lecons.filter((l) => suivies?.[l.code]).length;
        const etat = etatDuChapitre(faitesIci, total);
        return (
          <li key={c.code}>
            <a
              href={c.chemin}
              className={`chapitres__cellule chapitres__cellule--${etat}`}
              data-mesure="cours-ouvert"
              data-mesure-cours={c.code}
            >
              <span className="chapitres__disque" role="img" aria-label={`Chapitre ${i + 1}, ${MOT_ETAT[etat]}`}>
                {etat === 'fait' ? <Coche /> : <span aria-hidden="true">{i + 1}</span>}
              </span>
              <span className="chapitres__corps">
                <span className="chapitres__titre">{c.titre}</span>
                <span className="chapitres__compte">
                  {suivies ? `${faitesIci} / ${total} leçons` : `${total} leçon${total > 1 ? 's' : ''}`}
                </span>
                <span className="chapitres__jauge" aria-hidden="true">
                  <span style={{ transform: `scaleX(${faitesIci / total})` }} />
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

export default function ListeCours({ cours }: Props) {
  const [suivies, setSuivies] = useState<Record<string, LeconSuivie> | null>(null);
  useEffect(() => setSuivies(charger().lecons), []);

  const toutes = cours.flatMap((c) => c.lecons);
  const faites = toutes.filter((l) => suivies?.[l.code]).length;
  const prochaine = toutes.find((l) => !suivies?.[l.code]) ?? toutes[0];
  const enCours = cours.find((c) => c.lecons.some((l) => l.code === prochaine?.code));

  return (
    <div className="coursListe">
      {suivies && prochaine && (
        <div className="parcours__reprise">
          {faites === 0 ? (
            <p>Aucune leçon faite pour l’instant. La première prend {prochaine.duree} min.</p>
          ) : (
            <p>
              <b>{faites}</b> leçon{faites > 1 ? 's' : ''} faite{faites > 1 ? 's' : ''} sur {toutes.length}.
              {faites === toutes.length ? ' Tout le cours est fait : tu peux le reprendre du début.' : ''}
            </p>
          )}
          <a className="bouton bouton--principal" href={prochaine.chemin} data-mesure="cours-reprise" data-mesure-notion={prochaine.code}>
            {faites === 0 ? 'Commencer' : 'Reprendre'} : {prochaine.nom}
          </a>
        </div>
      )}

      {POUR_APP ? (
        <ChapitresApp cours={cours} suivies={suivies} />
      ) : (
        <ol className="coursListe__liste">
          {cours.map((c, i) => {
            const faitesIci = c.lecons.filter((l) => suivies?.[l.code]).length;
            const fait = suivies !== null && faitesIci === c.lecons.length;
            const actif = !!suivies && enCours?.code === c.code && !fait;
            const classe = `coursListe__item${fait ? ' coursListe__item--fait' : ''}${actif ? ' coursListe__item--encours' : ''}`;
            return (
              <li key={c.code} className={classe}>
                <a href={c.chemin} data-mesure="cours-ouvert" data-mesure-cours={c.code}>
                  <span className="coursListe__rang" aria-hidden="true">
                    {fait ? <Coche /> : i + 1}
                  </span>
                  <span className="coursListe__corps">
                    <span className="coursListe__titre">{c.titre}</span>
                    <span className="coursListe__promesse">{c.promesse}</span>
                    <span className="coursListe__meta discret">
                      <span>{suivies ? `${faitesIci} sur ${c.lecons.length}` : `${c.lecons.length} leçon${c.lecons.length > 1 ? 's' : ''}`}</span>
                      <span> · {c.minutes} min</span>
                      {actif && <span> · en cours</span>}
                    </span>
                  </span>
                  <span className="visuellement-cache">{fait ? ', cours fait' : actif ? ', cours en cours' : ''}</span>
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
