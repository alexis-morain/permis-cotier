import { useEffect, useState } from 'react';
import { charger } from '../lib/progression';
import type { LeconSuivie } from '../lib/progression';
import './parcours.css';

/**
 * Le parcours : les chapitres et leurs leçons, dans l'ordre, avec ce que le
 * navigateur sait de chacune. Rendu au serveur sans état, hydraté pour
 * cocher les leçons faites et désigner la suivante.
 */

export interface LeconDuParcours {
  code: string;
  nom: string;
  /** Faux quand la leçon n'est que le résumé de la notion. */
  ecrite: boolean;
  duree: number;
}

export interface ChapitreAffichable {
  code: string;
  titre: string;
  promesse: string;
  lecons: LeconDuParcours[];
}

interface Props {
  chapitres: ChapitreAffichable[];
}

function Coche() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M2.5 8.5 6 12l7.5-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Parcours({ chapitres }: Props) {
  const [suivies, setSuivies] = useState<Record<string, LeconSuivie> | null>(null);
  useEffect(() => setSuivies(charger().lecons), []);

  const toutes = chapitres.flatMap((c) => c.lecons);
  const faites = toutes.filter((l) => suivies?.[l.code]).length;
  const prochaine = toutes.find((l) => !suivies?.[l.code]) ?? toutes[0];

  return (
    <div className="parcours">
      {suivies && prochaine && (
        <div className="parcours__reprise">
          {faites === 0 ? (
            <p>
              Aucune leçon faite pour l’instant. La première prend {prochaine.duree} min.
            </p>
          ) : (
            <p>
              <b>{faites}</b> leçon{faites > 1 ? 's' : ''} faite{faites > 1 ? 's' : ''} sur {toutes.length}.
              {faites === toutes.length ? ' Tout le cours est fait : tu peux le reprendre du début.' : ''}
            </p>
          )}
          <a className="bouton bouton--principal" href={`/cours/${prochaine.code}`} data-mesure="cours-reprise" data-mesure-notion={prochaine.code}>
            {faites === 0 ? 'Commencer' : 'Reprendre'} : {prochaine.nom}
          </a>
        </div>
      )}

      {chapitres.map((c) => {
        const faitesIci = c.lecons.filter((l) => suivies?.[l.code]).length;
        return (
          <section className="chapitre" id={c.code} key={c.code}>
            <div className="chapitre__entete">
              <h2>{c.titre}</h2>
              <p className="chapitre__promesse">{c.promesse}</p>
              <p className="chapitre__compte">
                <span className="pastille">
                  {suivies ? `${faitesIci} sur ${c.lecons.length}` : `${c.lecons.length} leçon${c.lecons.length > 1 ? 's' : ''}`}
                </span>
              </p>
            </div>
            <ol className="etapes">
              {c.lecons.map((l, i) => {
                const suivie = suivies?.[l.code];
                const estProchaine = prochaine?.code === l.code && !!suivies;
                const classe = `etape${suivie ? ' etape--faite' : ''}${estProchaine ? ' etape--prochaine' : ''}`;
                return (
                  <li key={l.code}>
                    <a href={`/cours/${l.code}`} className={classe} data-mesure="cours-lecon" data-mesure-notion={l.code}>
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
          </section>
        );
      })}
    </div>
  );
}
