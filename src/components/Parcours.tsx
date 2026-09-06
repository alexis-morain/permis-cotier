import { useEffect, useState } from 'react';
import { charger } from '../lib/progression';
import type { LeconSuivie } from '../lib/progression';
import './parcours.css';

/**
 * Les leçons d'un cours, dans l'ordre, avec ce que le navigateur sait de
 * chacune. Rendu au serveur sans état, hydraté pour cocher les leçons faites
 * et désigner la suivante. Tout fait, il tend le cours d'après.
 */

export interface LeconDuParcours {
  code: string;
  nom: string;
  chemin: string;
  /** Faux quand la leçon n'est que le résumé de la notion. */
  ecrite: boolean;
  duree: number;
}

export interface CoursAffichable {
  code: string;
  titre: string;
  lecons: LeconDuParcours[];
}

interface Props {
  cours: CoursAffichable;
  suivant?: { chemin: string; titre: string };
}

export function Coche() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M2.5 8.5 6 12l7.5-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Parcours({ cours, suivant }: Props) {
  const [suivies, setSuivies] = useState<Record<string, LeconSuivie> | null>(null);
  useEffect(() => setSuivies(charger().lecons), []);

  const { lecons } = cours;
  const faites = lecons.filter((l) => suivies?.[l.code]).length;
  const tout = suivies !== null && faites === lecons.length;
  const prochaine = lecons.find((l) => !suivies?.[l.code]) ?? lecons[0];

  return (
    <div className="parcours">
      {suivies && prochaine && (
        <div className="parcours__reprise">
          {faites === 0 ? (
            <p>Aucune leçon faite pour l’instant. La première prend {prochaine.duree} min.</p>
          ) : tout ? (
            <p>
              <b>Cours fait</b>, {lecons.length} leçon{lecons.length > 1 ? 's' : ''} sur {lecons.length}.
              {suivant ? ' Tu peux passer au suivant.' : ' C’était le dernier du parcours.'}
            </p>
          ) : (
            <p>
              <b>{faites}</b> leçon{faites > 1 ? 's' : ''} faite{faites > 1 ? 's' : ''} sur {lecons.length}.
            </p>
          )}
          {tout && suivant ? (
            <p className="parcours__boutons">
              <a className="bouton bouton--principal" href={suivant.chemin} data-mesure="cours-suivant" data-mesure-cours={suivant.chemin}>
                Cours suivant : {suivant.titre}
              </a>
              <a className="bouton" href={prochaine.chemin} data-mesure="cours-reprise" data-mesure-notion={prochaine.code}>
                Refaire : {prochaine.nom}
              </a>
            </p>
          ) : (
            <a className="bouton bouton--principal" href={prochaine.chemin} data-mesure="cours-reprise" data-mesure-notion={prochaine.code}>
              {faites === 0 ? 'Commencer' : tout ? 'Refaire' : 'Reprendre'} : {prochaine.nom}
            </a>
          )}
        </div>
      )}

      <p className="chapitre__compte">
        <span className="pastille">
          {suivies ? `${faites} sur ${lecons.length}` : `${lecons.length} leçon${lecons.length > 1 ? 's' : ''}`}
        </span>
      </p>

      <ol className="etapes">
        {lecons.map((l, i) => {
          const suivie = suivies?.[l.code];
          const estProchaine = prochaine?.code === l.code && !!suivies && !tout;
          const classe = `etape${suivie ? ' etape--faite' : ''}${estProchaine ? ' etape--prochaine' : ''}`;
          return (
            <li key={l.code}>
              <a href={l.chemin} className={classe} data-mesure="cours-lecon" data-mesure-notion={l.code}>
                <span className="etape__rang" aria-hidden="true">
                  {suivie ? <Coche /> : i + 1}
                </span>
                <span className="etape__corps">
                  <span className="etape__nom">{l.nom}</span>
                  <span className="etape__meta discret">
                    {l.duree} min
                    {!l.ecrite && ' · résumé seulement'}
                    {suivie && suivie.total > 0 && ` · ${suivie.bonnes} sur ${suivie.total}`}
                    {estProchaine && ' · à faire maintenant'}
                  </span>
                </span>
                <span className="visuellement-cache">
                  {suivie ? ', leçon faite' : estProchaine ? ', prochaine leçon' : ''}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
