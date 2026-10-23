import { useEffect, useState } from 'react';
import { aujourdhui, charger } from '../lib/progression';
import { surProgressionChangee } from '../lib/vivant';
import { aRevoir, dateDuJour, depuisLe, dernierExamen, echeance, joursDeSuite, prochaineAction, reprise, type LeconAccueil } from '../lib/accueil';
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
 * attend plus loin. La grande carte marine est la prochaine chose à faire
 * (`prochaineAction`), et elle ne reparaît pas plus bas. Chaque bouton dit un verbe et ce qu'il ouvre, avec les
 * mots de la fiche pour les mêmes destinations (audit du 14 octobre). Rendu côté client seulement (`client:only`), la
 * progression se lit donc au premier rendu, sans état intermédiaire.
 */
export default function AccueilApp({ lecons, ids }: Props) {
  const [etat, setEtat] = useState(() => charger());
  // Une leçon faite dans un autre onglet : l'accueil la relit sans se recharger.
  useEffect(() => surProgressionChangee(() => setEtat(charger())), []);
  const jour = aujourdhui();

  const cours = reprise(lecons, etat);
  const revoir = aRevoir(etat, ids, jour);
  const examen = dernierExamen(etat, jour);
  const date = echeance(etat, jour);
  const serie = joursDeSuite(etat, jour);
  const part = cours.total > 0 ? cours.faites / cours.total : 0;
  const tete = prochaineAction(etat, ids, jour);

  const carteCours = (enTete: boolean) => (
    <section
      key="cours"
      className={`accueilApp__bloc${enTete ? ' accueilApp__reprendre' : ''}`}
      aria-labelledby="accueil-reprendre"
    >
      {cours.etat === 'termine' ? (
        <>
          <h2 id="accueil-reprendre" className={enTete ? 'accueilApp__lecon' : 'accueilApp__titre'}>Cours terminé</h2>
          <Jauge part={part} faites={cours.faites} total={cours.total} />
          {enTete ? <a className="accueilApp__lien" href="/cours">Revoir le plan du cours</a> : <Aller href="/cours">Revoir le plan du cours</Aller>}
        </>
      ) : (
        <>
          <p className="accueilApp__chapitre">
            {cours.prochaine.chapitre}, leçon {cours.rang} sur {cours.dansChapitre}
          </p>
          <h2 id="accueil-reprendre" className={enTete ? 'accueilApp__lecon' : 'accueilApp__titre'}>{cours.prochaine.nom}</h2>
          <Jauge part={part} faites={cours.faites} total={cours.total} />
          {enTete ? (
            <a className="bouton bouton--principal accueilApp__bouton" href={cours.prochaine.chemin}>
              {cours.etat === 'vide' ? 'Commencer le cours' : 'Continuer le cours'}
            </a>
          ) : (
            <Aller href={cours.prochaine.chemin}>{cours.etat === 'vide' ? 'Commencer le cours' : 'Continuer le cours'}</Aller>
          )}
        </>
      )}
    </section>
  );

  const carteRevoir = (enTete: boolean) => (
    <section
      key="revoir"
      className={`accueilApp__bloc${enTete ? ' accueilApp__reprendre' : ''}`}
      aria-labelledby="accueil-revoir"
    >
      <h2 id="accueil-revoir" className={enTete ? 'accueilApp__lecon' : 'accueilApp__titre'}>À revoir aujourd’hui</h2>
      {revoir.etat === 'jamais' && <p className="accueilApp__texte">Tes erreurs reviendront ici.</p>}
      {revoir.etat === 'rien' && <p className="accueilApp__texte">Rien à revoir aujourd’hui.</p>}
      {revoir.etat === 'du' && (
        <>
          <p className={enTete ? 'accueilApp__chapitre accueilApp__chapitre--bas' : 'accueilApp__texte'}>
            {enTete ? null : <b className="display accueilApp__nombre">{revoir.nombre}</b>}
            {enTete ? `${revoir.nombre} ` : ' '}question{revoir.nombre > 1 ? 's' : ''} à revoir
          </p>
          {enTete ? (
            <a className="bouton bouton--principal accueilApp__bouton" href="/revoir">Faire ma série du jour</a>
          ) : (
            <Aller href="/revoir">Faire ma série du jour</Aller>
          )}
        </>
      )}
    </section>
  );

  const carteExamen = (enTete: boolean) => (
    <section
      key="examen"
      className={`accueilApp__bloc${enTete ? ' accueilApp__reprendre' : ''}`}
      aria-labelledby="accueil-examen"
    >
      <h2 id="accueil-examen" className={enTete ? 'accueilApp__lecon' : 'accueilApp__titre'}>Examen blanc</h2>
      <p className={enTete ? 'accueilApp__chapitre accueilApp__chapitre--bas' : 'accueilApp__texte'}>
        {examen
          ? `${examen.bonnes} sur ${examen.total}, ${examen.reussi ? 'réussi' : 'recalé'}, ${depuisLe(examen.depuis)}.`
          : 'Quarante questions, vingt secondes chacune.'}
      </p>
      {enTete ? (
        <a className="bouton bouton--principal accueilApp__bouton" href="/examen">Faire un examen blanc</a>
      ) : (
        <Aller href="/examen">Faire un examen blanc</Aller>
      )}
    </section>
  );

  const carteDate = (
    <section key="date" className="accueilApp__bloc" aria-labelledby="accueil-date">
      <h2 id="accueil-date" className="accueilApp__titre">Ton épreuve</h2>
      {date.etat === 'sansDate' && (
        <p className="accueilApp__texte">
          <Aller href="/parametres">Pose la date de ton épreuve</Aller>
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
      {date.etat !== 'sansDate' && <Aller href="/parametres">Modifier la date</Aller>}
    </section>
  );

  // La carte mise en avant passe en tête, une seule fois ; les autres suivent
  // dans l'ordre d'avant.
  const cartes = [
    ['cours', carteCours],
    ['serie', carteRevoir],
    ['examen', carteExamen],
  ] as const;
  const ordre = [...cartes].sort(([a], [b]) => Number(b === tete) - Number(a === tete));

  return (
    <div className="accueilApp">
      <header className="accueilApp__entete">
        <p className="accueilApp__jour">{dateDuJour(jour)}</p>
        <h1 className="accueilApp__h1">Accueil</h1>
      </header>

      {ordre.map(([nom, carte]) => carte(nom === tete))}
      {carteDate}

      {serie > 1 && <p className="discret accueilApp__serie">{serie} jours de suite</p>}
      <style>{css}</style>
    </div>
  );
}

/**
 * Le lien d'une carte. Son `::after` couvre toute la carte (voir
 * `accueil-app.css`) : c'est la carte entière qui se touche, le lien porte
 * le nom pour VoiceOver.
 */
function Aller({ href, children }: { href: string; children: string }) {
  return (
    <a className="accueilApp__action" href={href}>
      {children}
      <span className="accueilApp__chevron" aria-hidden="true">›</span>
    </a>
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
