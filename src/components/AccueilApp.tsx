import { useEffect, useState, type ReactNode } from 'react';
import { aujourdhui, charger } from '../lib/progression';
import { dateLisible } from '../lib/jour';
import { groupeDuTheme } from '../lib/groupes';
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
 * L'accueil de l'app : ce qu'on fait maintenant, puis ce qui attend. En haut,
 * un panneau pour la prochaine chose à faire (`prochaineAction`), avec le seul
 * bouton jaune de l'écran ; dessous, « Ensuite », une liste de rangées pour le
 * reste. La chose mise en avant ne reparaît pas dans la liste. Chaque libellé
 * dit un verbe et ce qu'il ouvre, avec les mots de la fiche pour les mêmes
 * destinations (audit du 14 octobre). Rendu côté client seulement
 * (`client:only`), la progression se lit donc au premier rendu, sans état
 * intermédiaire.
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

  const verbeCours = cours.etat === 'vide' ? 'Commencer le cours' : 'Continuer le cours';
  const phraseExamen = examen
    ? `${examen.bonnes} sur ${examen.total}, ${examen.reussi ? 'réussi' : 'recalé'}, ${depuisLe(examen.depuis)}.`
    : 'Quarante questions, vingt secondes chacune.';

  // Le panneau du haut : la prochaine chose à faire, avec son bouton jaune.
  const panneau = {
    cours: (
      <section key="cours" className="accueilApp__tete" aria-labelledby="accueil-tete">
        {cours.etat === 'termine' ? (
          <>
            <h2 id="accueil-tete" className="accueilApp__titre">Cours terminé</h2>
            <Rail part={part} faites={cours.faites} total={cours.total} />
            <a className="accueilApp__lien" href="/cours">Revoir le plan du cours</a>
          </>
        ) : (
          <>
            <Chapitre lecon={cours.prochaine} rang={cours.rang} dansChapitre={cours.dansChapitre} />
            <h2 id="accueil-tete" className="accueilApp__titre">{cours.prochaine.nom}</h2>
            <Rail part={part} faites={cours.faites} total={cours.total} />
            <a className="bouton bouton--principal accueilApp__bouton" href={cours.prochaine.chemin}>{verbeCours}</a>
          </>
        )}
      </section>
    ),
    serie: (
      <section key="serie" className="accueilApp__tete" aria-labelledby="accueil-tete">
        <h2 id="accueil-tete" className="accueilApp__titre">À revoir aujourd’hui</h2>
        {revoir.etat === 'du' && (
          <>
            <p className="accueilApp__ligne">{revoir.nombre} question{revoir.nombre > 1 ? 's' : ''} à revoir</p>
            <a className="bouton bouton--principal accueilApp__bouton" href="/revoir">Faire ma série du jour</a>
          </>
        )}
      </section>
    ),
    examen: (
      <section key="examen" className="accueilApp__tete" aria-labelledby="accueil-tete">
        <h2 id="accueil-tete" className="accueilApp__titre">Examen blanc</h2>
        <p className="accueilApp__ligne">{phraseExamen}</p>
        <a className="bouton bouton--principal accueilApp__bouton" href="/examen">Faire un examen blanc</a>
      </section>
    ),
  }[tete];

  // Les rangées d'« Ensuite » : dans l'ordre d'avant, sans celle du panneau.
  const rangees = [
    tete !== 'cours' && (
      cours.etat === 'termine' ? (
        <Rangee key="cours" href="/cours" icone={ICONES.cours} titre="Cours terminé" sous="Revoir le plan du cours" valeur={`${cours.faites} sur ${cours.total}`} />
      ) : (
        <Rangee key="cours" href={cours.prochaine.chemin} icone={ICONES.cours} titre={verbeCours} sous={cours.prochaine.nom} valeur={`${cours.faites} sur ${cours.total}`} />
      )
    ),
    tete !== 'serie' && (
      <Rangee
        key="serie"
        href={revoir.etat === 'du' ? '/revoir' : undefined}
        icone={ICONES.revoir}
        titre="À revoir aujourd’hui"
        sous={revoir.etat === 'du' ? 'Faire ma série du jour' : revoir.etat === 'jamais' ? 'Tes erreurs reviendront ici.' : 'Rien à revoir aujourd’hui.'}
        valeur={revoir.etat === 'du' ? (
          <>
            {revoir.nombre}
            <span className="visuellement-cache"> question{revoir.nombre > 1 ? 's' : ''} à revoir</span>
          </>
        ) : undefined}
      />
    ),
    tete !== 'examen' && (
      <Rangee
        key="examen"
        href="/examen"
        icone={ICONES.examen}
        titre="Examen blanc"
        sous={examen ? `${examen.reussi ? 'Réussi' : 'Recalé'}, ${depuisLe(examen.depuis)}` : 'Quarante questions, vingt secondes chacune.'}
        valeur={examen ? (
          <span className={`etiquette etiquette--${examen.reussi ? 'juste' : 'faux'}`}>{examen.bonnes} sur {examen.total}</span>
        ) : undefined}
      />
    ),
    <Rangee
      key="date"
      href="/parametres"
      icone={ICONES.date}
      titre="Ton épreuve"
      sous={
        date.etat === 'sansDate' ? 'Pose la date de ton épreuve'
        : date.etat === 'avenir' ? (date.jours === 1 ? 'Demain' : `Dans ${date.jours} jours`)
        : date.etat === 'aujourdhui' ? 'C’est aujourd’hui'
        : `C’était ${depuisLe(date.jours)}`
      }
      valeur={date.etat !== 'sansDate' && etat.dateExamen ? dateLisible(etat.dateExamen) : undefined}
    />,
  ];

  return (
    <div className="accueilApp">
      <header className="accueilApp__entete">
        <h1 className="accueilApp__h1">Accueil</h1>
        <p className="accueilApp__jour">
          {dateDuJour(jour)}
          {serie > 1 && <>, <span>{serie} jours de suite</span></>}
        </p>
      </header>

      {panneau}

      <section className="accueilApp__ensuite" aria-labelledby="accueil-ensuite">
        <h2 id="accueil-ensuite" className="accueilApp__soustitre">Ensuite</h2>
        <ul className="accueilApp__liste">{rangees}</ul>
      </section>
      <style>{css}</style>
    </div>
  );
}

/**
 * Le chapitre de la leçon, « Balisage, leçon 3 sur 10 », en étiquette à la
 * couleur du groupe de son thème. Le thème est le segment du chemin
 * (`/cours/<thème>/<leçon>`) : la page ne le passe pas à part.
 */
function Chapitre({ lecon, rang, dansChapitre }: { lecon: LeconAccueil; rang: number; dansChapitre: number }) {
  const groupe = groupeDuTheme(lecon.chemin.split('/')[2] ?? '');
  return (
    <p className={`etiquette accueilApp__chapitre${groupe ? ` etiquette--${groupe.couleur}` : ''}`}>
      {lecon.chapitre}, leçon {rang} sur {dansChapitre}
    </p>
  );
}

interface PropsRangee {
  /** Sans adresse, la rangée dit seulement où on en est : pas de chevron. */
  href?: string;
  icone: ReactNode;
  titre: string;
  sous: string;
  valeur?: ReactNode;
}

/**
 * Une rangée d'« Ensuite » : l'icône dans un carré lavis, le libellé et sa
 * légende, la valeur à droite, le chevron qui dit que la rangée mène ailleurs.
 */
function Rangee({ href, icone, titre, sous, valeur }: PropsRangee) {
  const contenu = (
    <>
      <span className="accueilApp__ico" aria-hidden="true">{icone}</span>
      <span className="accueilApp__txt">
        {titre}
        <small className="accueilApp__sous">{sous}</small>
      </span>
      {valeur !== undefined && <span className="accueilApp__val">{valeur}</span>}
      {href && <span className="accueilApp__chev" aria-hidden="true">›</span>}
    </>
  );
  return <li>{href ? <a className="accueilApp__rangee" href={href}>{contenu}</a> : <div className="accueilApp__rangee">{contenu}</div>}</li>;
}

/** Le rail d'avancement du cours : un filet rempli d'encre, « 2 leçons sur 105 » en légende. */
function Rail({ part, faites, total }: { part: number; faites: number; total: number }) {
  return (
    <div className="accueilApp__avancement">
      <div className="accueilApp__rail" aria-hidden="true">
        <span style={{ transform: `scaleX(${part})` }} />
      </div>
      <p className="accueilApp__compte">
        {faites} leçon{faites > 1 ? 's' : ''} sur {total}
      </p>
    </div>
  );
}

/** Les icônes des rangées, au trait de l'encre : les mêmes que celles de la maquette. */
const trait = { width: 18, height: 18, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 } as const;
const ICONES = {
  cours: (
    <svg {...trait}><path d="M5 3h8a2 2 0 0 1 2 2v12H7a2 2 0 0 1-2-2z" /><path d="M5 14a2 2 0 0 1 2-2h8" /></svg>
  ),
  revoir: (
    <svg {...trait}><path d="M4 10a6 6 0 1 0 2-4.5M4 4v3h3" /></svg>
  ),
  examen: (
    <svg {...trait}><rect x="4" y="3" width="12" height="14" rx="2" /><path d="M7 7h6M7 10h6M7 13h3" /></svg>
  ),
  date: (
    <svg {...trait}><circle cx="10" cy="10" r="7" /><path d="M10 6v4l3 2" /></svg>
  ),
};
