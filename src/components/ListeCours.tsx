import { useEffect, useState } from 'react';
import { charger } from '../lib/progression';
import type { LeconSuivie } from '../lib/progression';
import { Coche } from './Parcours';
import './parcours.css';

/**
 * Les quatorze cours dans l'ordre du parcours, un par thème, avec ce que le
 * navigateur sait de chacun. Rendu au serveur avec les comptes de leçons ;
 * hydraté, il montre l'avancement de chaque cours, désigne celui où l'on en
 * est, et tend la leçon à faire maintenant.
 */

export interface CoursListe {
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
    </div>
  );
}
