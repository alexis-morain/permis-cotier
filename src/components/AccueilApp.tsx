import { useState } from 'react';
import { aujourdhui, charger } from '../lib/progression';
import { aRevoir, depuisLe, dernierExamen, echeance, joursDeSuite, reprise, type LeconAccueil } from '../lib/accueil';
// Lue en texte et posée par le composant, pas importée comme feuille : Astro
// attache la feuille d'un îlot `client:only` à toute page qui l'importe, et
// l'accueil du site l'importe aussi, sans jamais le rendre. Le site ne doit
// pas recevoir une ligne de ce CSS.
import css from './accueil-app.css?raw';

interface Props {
  /** Les leçons dans l'ordre du parcours, chacune avec le titre de son chapitre. */
  lecons: LeconAccueil[];
  /** Les identifiants publiés : les questions dues s'y bornent, comme sur `/revoir`. */
  ids: string[];
}

/**
 * L'accueil de l'app : quatre blocs, de ce qu'on fait maintenant à ce qui
 * attend plus loin. Rendu côté client seulement (`client:only`), la
 * progression se lit donc au premier rendu, sans état intermédiaire.
 */
export default function AccueilApp({ lecons, ids }: Props) {
  const [etat] = useState(() => charger());
  const jour = aujourdhui();

  const cours = reprise(lecons, etat);
  const revoir = aRevoir(etat, ids, jour);
  const examen = dernierExamen(etat, jour);
  const date = echeance(etat, jour);
  const serie = joursDeSuite(etat, jour);
  const part = cours.total > 0 ? cours.faites / cours.total : 0;

  return (
    <div className="accueilApp">
      <h1 className="visuellement-cache">Accueil</h1>

      <section className="accueilApp__bloc accueilApp__reprendre" aria-labelledby="accueil-reprendre">
        {cours.etat === 'termine' ? (
          <>
            <h2 id="accueil-reprendre" className="accueilApp__lecon">Cours terminé</h2>
            <Jauge part={part} faites={cours.faites} total={cours.total} />
            <a className="accueilApp__lien" href="/cours">Revoir le plan du cours</a>
          </>
        ) : (
          <>
            <p className="accueilApp__chapitre">
              {cours.prochaine.chapitre}, leçon {cours.rang} sur {cours.dansChapitre}
            </p>
            <h2 id="accueil-reprendre" className="accueilApp__lecon">{cours.prochaine.nom}</h2>
            <Jauge part={part} faites={cours.faites} total={cours.total} />
            <a className="bouton bouton--principal accueilApp__action" href={cours.prochaine.chemin}>
              {cours.etat === 'vide' ? 'Commencer' : 'Continuer'}
            </a>
          </>
        )}
      </section>

      <section className="accueilApp__bloc" aria-labelledby="accueil-revoir">
        <h2 id="accueil-revoir" className="accueilApp__titre">À revoir aujourd’hui</h2>
        {revoir.etat === 'jamais' && <p className="accueilApp__texte">Tes erreurs reviendront ici.</p>}
        {revoir.etat === 'rien' && <p className="accueilApp__texte">Rien à revoir aujourd’hui.</p>}
        {revoir.etat === 'du' && (
          <>
            <p className="accueilApp__texte">
              <b className="display accueilApp__nombre">{revoir.nombre}</b>{' '}
              question{revoir.nombre > 1 ? 's' : ''} à revoir
            </p>
            <a className="bouton accueilApp__action" href="/revoir">Revoir</a>
          </>
        )}
      </section>

      <section className="accueilApp__bloc" aria-labelledby="accueil-examen">
        <h2 id="accueil-examen" className="accueilApp__titre">Examen blanc</h2>
        <p className="accueilApp__texte">
          {examen
            ? `${examen.bonnes} sur ${examen.total}, ${examen.reussi ? 'réussi' : 'recalé'}, ${depuisLe(examen.depuis)}.`
            : 'Quarante questions, vingt secondes chacune.'}
        </p>
        <a className="bouton accueilApp__action" href="/examen">Nouvel examen blanc</a>
      </section>

      <section className="accueilApp__bloc" aria-labelledby="accueil-date">
        <h2 id="accueil-date" className="accueilApp__titre">Ton examen</h2>
        {date.etat === 'sansDate' && (
          <p className="accueilApp__texte">
            <a className="accueilApp__lien" href="/profil">Pose la date de ton examen</a>
          </p>
        )}
        {date.etat === 'avenir' && (
          <p className="accueilApp__texte">
            {date.jours === 1 ? (
              <b className="display accueilApp__nombre">Demain</b>
            ) : (
              <>
                Dans <b className="display accueilApp__nombre">{date.jours}</b> jours
              </>
            )}
          </p>
        )}
        {date.etat === 'aujourdhui' && <p className="accueilApp__texte accueilApp__fort">C’est aujourd’hui</p>}
        {date.etat === 'passe' && (
          <p className="accueilApp__texte">
            C’était {depuisLe(date.jours)}
          </p>
        )}
      </section>

      {serie > 1 && <p className="discret accueilApp__serie">{serie} jours de suite</p>}
      <style>{css}</style>
    </div>
  );
}

function Jauge({ part, faites, total }: { part: number; faites: number; total: number }) {
  return (
    <div className="accueilApp__avancement">
      <div className="accueilApp__jauge" aria-hidden="true">
        <span style={{ transform: `scaleX(${part})` }} />
      </div>
      <p className="accueilApp__compte">
        {faites} leçon{faites > 1 ? 's' : ''} sur {total}
      </p>
    </div>
  );
}
