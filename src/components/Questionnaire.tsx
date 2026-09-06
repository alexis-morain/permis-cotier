import { useEffect, useRef, useState } from 'react';
import { aujourdhui, charger, enregistrerProfil, sauvegarder } from '../lib/progression';
import type { Profil } from '../lib/progression';
import { DEPARTS, MOTIVATIONS, RYTHMES, joursAvant, rappel } from '../lib/profil';
import { evenement } from '../lib/mesure';
import './profil.css';

/**
 * Le questionnaire de départ : six écrans, une question par écran, de
 * grandes options qu'on tape du pouce. Rien n'est obligatoire, tout se
 * modifie après depuis la fiche, et rien ne part du navigateur.
 *
 * La question qui compte est la première : pourquoi. C'est ce qu'on rappelle
 * au candidat sur l'écran de résultat quand l'examen blanc est recalé, et en
 * tête de sa fiche. Le reste règle le site à sa main : d'où il part, combien
 * de questions par jour, quand est l'épreuve.
 */
type Ecran = 'pourquoi' | 'phrase' | 'depart' | 'rythme' | 'date' | 'prenom' | 'fin';
const ECRANS: readonly Ecran[] = ['pourquoi', 'phrase', 'depart', 'rythme', 'date', 'prenom', 'fin'];

function douceur(): ScrollBehavior {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

interface Props {
  /** Questions publiées, pour dire ce que le rythme choisi représente. */
  totalQuestions: number;
}

export default function Questionnaire({ totalQuestions }: Props) {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [dateExamen, setDateExamen] = useState('');
  const [index, setIndex] = useState(0);
  const titre = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const etat = charger();
    setProfil(etat.profil);
    setDateExamen(etat.dateExamen ?? '');
  }, []);

  // Chaque écran commence en haut, le titre prend le focus : au lecteur
  // d'écran comme au pouce, on sait où on est.
  useEffect(() => {
    if (index === 0) return;
    window.scrollTo({ top: 0, behavior: douceur() });
    titre.current?.focus({ preventScroll: true });
  }, [index]);

  if (!profil) return null;

  const ecran = ECRANS[index] ?? 'pourquoi';
  const dernier = ECRANS.length - 1;

  function ecrire(suivant: Profil, date = dateExamen) {
    setProfil(suivant);
    sauvegarder({ ...enregistrerProfil(charger(), suivant), dateExamen: date || null });
  }

  function avancer() {
    const prochain = index + 1;
    if (ECRANS[prochain] === 'fin' && profil) {
      const rempli = { ...profil, rempliLe: aujourdhui() };
      ecrire(rempli);
      // Le nombre de cases et le rythme, jamais la phrase ni le prénom.
      evenement('profil-rempli', {
        motivations: rempli.motivations.length,
        rythme: rempli.rythme ?? 0,
        depart: rempli.depart ?? 'non-dit',
        date: dateExamen ? 'oui' : 'non',
      });
    }
    setIndex(prochain);
  }

  function reculer() {
    setIndex(Math.max(0, index - 1));
  }

  function basculerMotivation(code: string) {
    if (!profil) return;
    const deja = profil.motivations.includes(code);
    ecrire({
      ...profil,
      motivations: deja ? profil.motivations.filter((m) => m !== code) : [...profil.motivations, code],
    });
  }

  const p = profil;
  const jours = dateExamen ? joursAvant(dateExamen, aujourdhui()) : null;
  const conseil = DEPARTS.find((d) => d.code === p.depart) ?? DEPARTS[1]!;
  const raison = rappel(p);

  return (
    <div className="questionnaire">
      <div className="questionnaire__entete">
        <p className="questionnaire__etape">
          {ecran === 'fin' ? 'C’est noté' : `${index + 1} sur ${dernier}`}
          <span className="discret"> · rien n’est obligatoire, rien n’est envoyé</span>
        </p>
        <div className="questionnaire__barre" aria-hidden="true">
          <span style={{ transform: `scaleX(${index / dernier})` }} />
        </div>
      </div>

      {ecran === 'pourquoi' && (
        <section className="questionnaire__ecran">
          <h1 ref={titre} tabIndex={-1}>Pourquoi tu passes le permis côtier ?</h1>
          <p className="discret">Coche ce qui te ressemble. On te le rappellera le jour où ça coince.</p>
          <ul className="choix" role="list">
            {MOTIVATIONS.map((m) => {
              const coche = p.motivations.includes(m.code);
              return (
                <li key={m.code}>
                  <button
                    type="button"
                    className={`choix__option${coche ? ' choix__option--coche' : ''}`}
                    aria-pressed={coche}
                    onClick={() => basculerMotivation(m.code)}
                  >
                    <span className="choix__case" aria-hidden="true" />
                    <span>{m.libelle}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {ecran === 'phrase' && (
        <section className="questionnaire__ecran">
          <h1 ref={titre} tabIndex={-1}>Dis-le avec tes mots.</h1>
          <p className="discret">
            Une phrase, la tienne. C’est elle qu’on affichera quand un examen blanc sera recalé,
            avant la case cochée.
          </p>
          <label className="visuellement-cache" htmlFor="phrase">Ta raison, en une phrase</label>
          <textarea
            id="phrase"
            className="champ questionnaire__phrase"
            rows={3}
            maxLength={160}
            placeholder="Emmener mon père pêcher au large, cet été."
            value={p.phrase}
            onChange={(e) => ecrire({ ...p, phrase: e.target.value })}
          />
          <p className="discret questionnaire__compte">{p.phrase.length} / 160</p>
        </section>
      )}

      {ecran === 'depart' && (
        <section className="questionnaire__ecran">
          <h1 ref={titre} tabIndex={-1}>Tu pars d’où ?</h1>
          <p className="discret">Ça règle ce qu’on te propose en premier : le cours, ou un examen blanc.</p>
          <ul className="choix" role="list">
            {DEPARTS.map((d) => {
              const coche = p.depart === d.code;
              return (
                <li key={d.code}>
                  <button
                    type="button"
                    className={`choix__option${coche ? ' choix__option--coche' : ''}`}
                    aria-pressed={coche}
                    onClick={() => ecrire({ ...p, depart: d.code })}
                  >
                    <span className="choix__case choix__case--ronde" aria-hidden="true" />
                    <span>{d.libelle}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {ecran === 'rythme' && (
        <section className="questionnaire__ecran">
          <h1 ref={titre} tabIndex={-1}>Combien de questions par jour ?</h1>
          <p className="discret">
            Un objectif qu’on tient vaut mieux qu’un grand qu’on lâche. Tu pourras le changer depuis ta fiche.
          </p>
          <ul className="choix" role="list">
            {RYTHMES.map((r) => {
              const coche = p.rythme === r.questions;
              return (
                <li key={r.questions}>
                  <button
                    type="button"
                    className={`choix__option${coche ? ' choix__option--coche' : ''}`}
                    aria-pressed={coche}
                    onClick={() => ecrire({ ...p, rythme: r.questions })}
                  >
                    <span className="choix__nombre display" aria-hidden="true">{r.questions}</span>
                    <span className="choix__corps">
                      <b>{r.nom}</b>
                      <span className="discret">{r.detail}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {ecran === 'date' && (
        <section className="questionnaire__ecran">
          <h1 ref={titre} tabIndex={-1}>Ton examen est quand ?</h1>
          <p className="discret">
            Sers à compter les jours et à répartir ce qui reste à voir. Laisse vide si tu ne sais pas encore.
          </p>
          <label className="visuellement-cache" htmlFor="date-examen">Date de l’examen</label>
          <input
            id="date-examen"
            className="champ questionnaire__date"
            type="date"
            value={dateExamen}
            onChange={(e) => {
              setDateExamen(e.target.value);
              ecrire(p, e.target.value);
              if (e.target.value) evenement('date-examen-renseignee');
            }}
          />
          {jours !== null && (
            <p className="questionnaire__jours">
              {jours > 1 && `Dans ${jours} jours.`}
              {jours === 1 && 'Demain.'}
              {jours === 0 && 'Aujourd’hui. Bon vent.'}
              {jours < 0 && 'Cette date est passée : tu repasses, ou tu la changes.'}
            </p>
          )}
        </section>
      )}

      {ecran === 'prenom' && (
        <section className="questionnaire__ecran">
          <h1 ref={titre} tabIndex={-1}>Un prénom, pour la fiche ?</h1>
          <p className="discret">Il reste dans ce navigateur. Il ne sert qu’à te parler à toi.</p>
          <label className="visuellement-cache" htmlFor="prenom">Prénom</label>
          <input
            id="prenom"
            className="champ questionnaire__prenom"
            type="text"
            autoComplete="given-name"
            maxLength={40}
            value={p.prenom}
            onChange={(e) => ecrire({ ...p, prenom: e.target.value })}
          />
        </section>
      )}

      {ecran === 'fin' && (
        <section className="questionnaire__ecran">
          <h1 ref={titre} tabIndex={-1}>
            {p.prenom.trim() ? `C’est noté, ${p.prenom.trim()}.` : 'C’est noté.'}
          </h1>
          {raison && (
            <p className="rappel">
              <span className="rappel__amorce">Tu passes ce permis pour</span>
              <q>{raison}</q>
            </p>
          )}
          <p>{conseil.conseil}</p>
          {jours !== null && jours > 0 && p.rythme && (
            <p className="discret">
              À {p.rythme} questions par jour, tu en verras {jours * p.rythme} d’ici là. La banque en compte{' '}
              {totalQuestions}.
            </p>
          )}
          <div className="jeu__actions">
            <a className="bouton bouton--principal" href={conseil.lien} data-mesure="profil-depart-suite" data-mesure-vers={conseil.code}>
              {conseil.lien === '/cours' ? 'Commencer le cours' : 'Faire un examen blanc'}
            </a>
            <a className="bouton" href="/profil">Voir ma fiche</a>
          </div>
        </section>
      )}

      {ecran !== 'fin' && (
        <div className="jeu__actions questionnaire__actions">
          <button className="bouton bouton--principal" type="button" onClick={avancer}>
            {index === dernier - 1 ? 'Terminer' : 'Continuer'}
          </button>
          {index > 0 ? (
            <button className="bouton bouton--discret" type="button" onClick={reculer}>Retour</button>
          ) : (
            <a className="bouton bouton--discret" href="/profil">Plus tard</a>
          )}
        </div>
      )}
    </div>
  );
}
