import { useEffect, useState } from 'react';
import type React from 'react';
import { aujourdhui, charger, effacer, enregistrerProfil, sauvegarder } from '../lib/progression';
import { estDue } from '../lib/quiz';
import type { Etat } from '../lib/progression';
import {
  PALIERS,
  RYTHMES,
  indice,
  jalons,
  joursAvant,
  maitriseParTheme,
  notionsLesPlusFaibles,
  objectifDuJour,
  profilRempli,
  quatorzeJours,
  rappel,
  serieDeJours,
} from '../lib/profil';
import type { QuestionConnue } from '../lib/profil';
import { dateLisible, jourDeLaSemaine } from '../lib/jour';
import { nomDuTheme } from '../lib/themes-client';
import { evenement } from '../lib/mesure';
import Apparence from './Apparence';
import './profil.css';

interface Props {
  /** La banque publiée, réduite à l'identifiant et au thème. */
  banque: QuestionConnue[];
  totalLecons: number;
}

const JOURS_COURTS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/**
 * Le jour où « retenu » a changé de sens, et la date au-delà de laquelle on
 * n'en parle plus.
 *
 * Une question réussie une fois n'est plus une question retenue : il en faut
 * deux, deux jours différents. Le changement fait tomber l'indice d'un
 * candidat déjà avancé de 76 à 46, et une seule séance sur ce qu'il sait le
 * remet à 76. Ça se dit, une fois, à qui révisait avant — et ça ne se dit pas
 * à qui commence aujourd'hui, pour qui il n'y a jamais eu d'autre compte.
 * Passé un mois, l'indice est redevenu vrai tout seul et la phrase n'a plus
 * d'objet.
 */
const CHANGEMENT_COMPTAGE = '2026-09-10';
const FIN_AVIS_COMPTAGE = '2026-10-10';

function Coche() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M2.5 8.5 6 12l7.5-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * La fiche du candidat : où il en est, dit en un nombre et expliqué en
 * dessous, puis ce qu'il y a à faire aujourd'hui, ses thèmes faibles, ses
 * examens blancs, ses jalons, et enfin ses réglages. Tout vient du
 * navigateur, rien n'est envoyé.
 */
export default function ProfilCandidat({ banque, totalLecons }: Props) {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [confirme, setConfirme] = useState(false);
  const [jour] = useState(() => aujourdhui());

  useEffect(() => setEtat(charger()), []);

  if (!etat) return null;

  function ecrire(suivant: Etat) {
    sauvegarder(suivant);
    setEtat(suivant);
  }

  const p = etat.profil;
  const prenom = p.prenom.trim();
  const raison = rappel(p);
  const ind = indice(etat, banque);
  const palier = PALIERS[ind.palier];
  const objectif = objectifDuJour(etat, jour);
  const serie = serieDeJours(etat, jour);
  const cases = quatorzeJours(etat, jour);
  const themes = maitriseParTheme(etat, banque);
  const faibles = notionsLesPlusFaibles(etat, banque, 3);
  const listeJalons = jalons(etat, banque, totalLecons);
  const atteints = listeJalons.filter((j) => j.atteint).length;
  const jours = etat.dateExamen ? joursAvant(etat.dateExamen, jour) : null;
  const publiees = new Set(banque.map((q) => q.id));
  const vues = Object.entries(etat.questions).filter(([id]) => publiees.has(id));
  // Ce que compte la pastille est ce que `/revoir` joue : les questions dues.
  const aRevoir = vues.filter(([, e]) => estDue(e, jour)).length;
  const examens = etat.examens.filter((x) => x.total > 0);
  const recus = examens.filter((x) => x.reussi).length;
  const meilleur = examens.reduce((m, x) => Math.max(m, x.bonnes), 0);
  const rien = vues.length === 0 && examens.length === 0 && Object.keys(etat.lecons).length === 0;
  // Le changement de comptage ne concerne que ceux qui révisaient avant lui.
  const direLeChangement =
    jour < FIN_AVIS_COMPTAGE && vues.some(([, e]) => e.vueLe < CHANGEMENT_COMPTAGE);

  // La prochaine chose à faire, une seule : ce qui est dû aujourd'hui d'abord,
  // sinon ce que le point de départ conseille.
  const suite = aRevoir > 0
    // « Revoir mes 1 question » ne se dit pas : au singulier, c'est le
    // déterminant qui porte le compte, pas un chiffre devant un pluriel absent.
    ? {
        href: '/revoir',
        texte:
          aRevoir > 1
            ? `Revoir mes ${aRevoir} questions du jour`
            : 'Revoir ma question du jour',
      }
    : p.depart === 'zero' && Object.keys(etat.lecons).length < totalLecons
      ? { href: '/cours', texte: 'Continuer le cours' }
      : { href: '/examen', texte: 'Faire un examen blanc' };

  return (
    <div className="fiche">
      <header className="fiche__tete">
        <h1>{prenom ? `${prenom}, voilà où tu en es.` : 'Voilà où tu en es.'}</h1>
        {raison ? (
          <p className="rappel">
            <span className="rappel__amorce">Tu passes ce permis pour</span>
            <q>{raison}</q>
            <a className="rappel__modifier" href="/profil/depart">modifier</a>
          </p>
        ) : (
          <div className="encadre fiche__invitation">
            <p>
              <b>Trente secondes pour dire pourquoi tu passes le permis.</b> On te le rappellera le jour
              où un examen blanc est recalé, et la fiche se règle à ta main.
            </p>
            <a className="bouton bouton--principal" href="/profil/depart" data-mesure="profil-invitation">
              Répondre
            </a>
          </div>
        )}
      </header>

      <section className="fiche__indice" aria-labelledby="indice-titre">
        <h2 id="indice-titre" className="visuellement-cache">Indice de préparation</h2>
        <div className="indice">
          <p className="indice__nombre">
            <span className="display">{ind.score}</span>
            <small> / 100</small>
          </p>
          <div className="indice__texte">
            <p className="indice__palier">{palier.titre}</p>
            <p>{rien ? 'Rien d’enregistré dans ce navigateur pour l’instant.' : palier.phrase}</p>
          </div>
        </div>
        {/* Trois calques pleins, du plus long au plus court, chacun mis à
            l'échelle : la part se lit à la couleur qui s'arrête, et le
            mouvement passe par `transform`, jamais par `width`. */}
        <div className="indice__jauge" role="img" aria-label={`${ind.parts.vu} points pour ce qui est vu, ${ind.parts.retenu} pour ce qui est retenu, ${ind.parts.examens} pour les examens blancs`}>
          <span
            className="indice__part indice__part--examens"
            style={{ '--part': (ind.parts.vu + ind.parts.retenu + ind.parts.examens) / 100 } as React.CSSProperties}
          />
          <span
            className="indice__part indice__part--retenu"
            style={{ '--part': (ind.parts.vu + ind.parts.retenu) / 100 } as React.CSSProperties}
          />
          <span
            className="indice__part indice__part--vu"
            style={{ '--part': ind.parts.vu / 100 } as React.CSSProperties}
          />
        </div>
        <ul className="indice__legende" aria-hidden="true">
          <li><i className="indice__puce indice__puce--vu" />Vu {ind.parts.vu} sur 20</li>
          <li><i className="indice__puce indice__puce--retenu" />Retenu {ind.parts.retenu} sur 35</li>
          <li><i className="indice__puce indice__puce--examens" />Examens {ind.parts.examens} sur 45</li>
        </ul>
        {direLeChangement && (
          <p className="indice__changement">
            Depuis le 10 septembre, on compte autrement : une question n’est retenue qu’après deux
            réussites, deux jours différents. Ton indice a baissé d’un coup. Une séance sur ce que
            tu sais déjà le remet où il était.
          </p>
        )}
        <details className="fiche__details">
          <summary>Comment c’est compté</summary>
          <p>
            Vingt points pour la part de la banque que tu as rencontrée, {vues.length} question{vues.length > 1 ? 's' : ''} sur{' '}
            {banque.length}. Trente-cinq pour la part de ces questions réussies deux jours différents : une seule bonne
            réponse ne compte pas comme une mémoire, la correction était encore à l’écran. Quarante-cinq pour
            la moyenne de tes trois derniers examens blancs terminés
            {ind.examensComptes > 0 ? `, ${ind.examensComptes} pour l’instant` : ', aucun pour l’instant'}.
            « Prêt » demande en plus deux examens reçus sur les trois derniers : un nombre ne dit pas qu’on tient
            quarante questions en vingt secondes chacune.
          </p>
        </details>
      </section>

      <section className="fiche__jour" aria-labelledby="jour-titre">
        <h2 id="jour-titre">Aujourd’hui</h2>
        <div className="jour">
          <div className="jour__objectif">
            <p className="jour__chiffre">
              <span className="display">{Math.min(objectif.faites, objectif.cible)}</span>
              <span className="discret"> sur {objectif.cible} questions</span>
            </p>
            <div className="jour__barre" aria-hidden="true">
              <span style={{ transform: `scaleX(${Math.min(1, objectif.faites / objectif.cible)})` }} />
            </div>
            <p className="discret jour__note">
              {objectif.atteint
                ? `Objectif du jour fait${objectif.faites > objectif.cible ? `, et ${objectif.faites - objectif.cible} de plus` : ''}.`
                : objectif.faites === 0
                  ? 'Rien encore aujourd’hui.'
                  : `Encore ${objectif.cible - objectif.faites} pour l’objectif.`}
            </p>
          </div>
          <div className="jour__serie">
            <p className="jour__chiffre">
              <span className="display">{serie.jours}</span>
              <span className="discret"> jour{serie.jours > 1 ? 's' : ''} de suite</span>
            </p>
            <ol className="jours" aria-label="Les quatorze derniers jours">
              {cases.map((c, i) => {
                const actif = c.reponses > 0;
                const estAujourdhui = i === cases.length - 1;
                return (
                  <li
                    key={c.date}
                    className={`jours__case${actif ? ' jours__case--actif' : ''}${estAujourdhui ? ' jours__case--aujourdhui' : ''}`}
                    aria-label={`${dateLisible(c.date)} : ${c.reponses} réponse${c.reponses > 1 ? 's' : ''}`}
                  >
                    <span aria-hidden="true">{JOURS_COURTS[jourDeLaSemaine(c.date) ?? 0]}</span>
                  </li>
                );
              })}
            </ol>
            <p className="discret jour__note">
              {serie.jours === 0
                ? 'Une question aujourd’hui, et la série démarre.'
                : serie.aujourdhui
                  ? 'La série tient.'
                  : 'Une question avant ce soir, et la série tient.'}
            </p>
          </div>
        </div>

        {jours !== null && (
          <p className="jour__examen">
            {jours > 1 && <><b>Examen dans {jours} jours</b>, le {dateLisible(etat.dateExamen!)}.</>}
            {jours === 1 && <><b>Examen demain.</b> Deux examens blancs ce soir, puis dors.</>}
            {jours === 0 && <><b>Examen aujourd’hui.</b> Bon vent.</>}
            {jours < 0 && <>La date d’examen est passée. Tu peux la changer plus bas.</>}
            {jours > 1 && banque.length > vues.length && (
              <span className="discret">
                {' '}Il te reste {banque.length - vues.length} questions jamais vues : environ{' '}
                {Math.max(1, Math.ceil((banque.length - vues.length) / jours))} par jour pour toutes les voir.
              </span>
            )}
          </p>
        )}

        <div className="jeu__actions">
          <a className="bouton bouton--principal" href={suite.href} data-mesure="profil-suite" data-mesure-vers={suite.href}>
            {suite.texte}
          </a>
          {suite.href !== '/examen' && <a className="bouton" href="/examen">Examen blanc</a>}
          {suite.href !== '/cours' && <a className="bouton bouton--discret" href="/cours">Le cours</a>}
        </div>
        {/* Relire n'est pas rejouer, et les deux gestes ne se remplacent pas. */}
        <p className="discret jour__note">
          <a href="/profil/erreurs" data-mesure="profil-erreurs">Relire ce que j’ai raté</a>, la
          bonne réponse et l’explication en face, sans rejouer.
        </p>
      </section>

      {!rien && faibles.length > 0 && (
        <section className="fiche__faibles" aria-labelledby="faibles-titre">
          <h2 id="faibles-titre">À reprendre en premier</h2>
          <p className="discret">
            Quatorze thèmes, cent cinq notions : « feux et marques » ne dit pas si le trou est le
            remorquage ou la portée des feux. Ces trois-là sont ce qui tient le moins.
          </p>
          <ul className="faibles">
            {faibles.map((n) => (
              <li className="faible" key={n.code}>
                <p className="faible__nom">
                  <b>{n.nom}</b> <span className="discret">{nomDuTheme(n.theme)}</span>
                </p>
                <p className="faible__note discret">
                  {n.vues === 0
                    ? `Jamais ouverte, ${n.total} question${n.total > 1 ? 's' : ''} en banque.`
                    : `${n.retenues} retenue${n.retenues > 1 ? 's' : ''} sur ${n.vues} vue${n.vues > 1 ? 's' : ''}, ${n.total} en banque.`}
                </p>
                <p className="faible__actions">
                  <a className="faible__lecon" href={n.chemin} data-mesure="profil-notion-lecon" data-mesure-notion={n.code}>
                    La leçon
                  </a>
                  <a
                    className="faible__serie"
                    href={`/entrainement/notion/${n.code}`}
                    data-mesure="profil-notion-serie"
                    data-mesure-notion={n.code}
                  >
                    Ses questions
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="fiche__themes" aria-labelledby="themes-titre">
        <h2 id="themes-titre">Thème par thème</h2>
        <p className="discret">
          Les plus faibles d’abord. Retenu, c’est réussi deux jours différents : une question revient un jour plus tard,
          puis trois, puis sept, puis vingt et un. Une faute la ramène tout de suite et remet le compteur à zéro.
        </p>
        <ul className="maitrise">
          {themes.map((t) => (
            <li
              key={t.code}
              style={{ '--vues': t.vues / t.total, '--retenues': t.retenues / t.total } as React.CSSProperties}
            >
              <a href={`/entrainement/${t.code}`} data-mesure="profil-theme" data-mesure-theme={t.code}>
                <b>{nomDuTheme(t.code)}</b>
                <span className="maitrise__note">
                  {t.vues === 0 ? (
                    <span className="pastille">jamais ouvert</span>
                  ) : (
                    <>
                      <span className={t.retenues < t.vues ? 'maitrise__faible' : ''}>{t.retenues}</span>
                      <span className="discret"> retenues sur {t.vues} vues, {t.total} en banque</span>
                    </>
                  )}
                </span>
                <span className="maitrise__jauge" aria-hidden="true">
                  <span className="maitrise__vues" />
                  <span className="maitrise__retenues" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="fiche__examens" aria-labelledby="examens-titre">
        <h2 id="examens-titre">Examens blancs</h2>
        {examens.length === 0 ? (
          <p className="discret">
            Aucun examen blanc terminé. Quarante questions, vingt secondes chacune : c’est ce qui pèse le plus dans l’indice.
          </p>
        ) : (
          <>
            <p>
              <b>{examens.length}</b> terminé{examens.length > 1 ? 's' : ''}, <b>{recus}</b> reçu{recus > 1 ? 's' : ''}.
              Meilleur score : <b>{meilleur} sur 40</b>.
              {examens.length >= 2 && (
                <>
                  {' '}Le dernier fait{' '}
                  {examens[0]!.bonnes === examens[1]!.bonnes
                    ? 'le même score que l’avant-dernier'
                    : `${Math.abs(examens[0]!.bonnes - examens[1]!.bonnes)} ${examens[0]!.bonnes > examens[1]!.bonnes ? 'de plus' : 'de moins'} que l’avant-dernier`}
                  .
                </>
              )}
            </p>
            <ol className="examens" aria-label="Les derniers examens blancs, le plus récent en premier">
              {examens.slice(0, 8).map((x, i) => (
                <li key={`${x.date}-${i}`} style={{ '--part': x.bonnes / x.total } as React.CSSProperties}>
                  <span className="examens__date">{dateLisible(x.date)}</span>
                  <span className={`examens__score${x.reussi ? ' examens__score--recu' : ' examens__score--recale'}`}>
                    {x.bonnes} / {x.total}
                  </span>
                  <span className="examens__verdict">{x.reussi ? 'reçu' : 'recalé'}</span>
                </li>
              ))}
            </ol>
            <p className="discret">Le trait marque 35 sur 40, la barre d’admission.</p>
          </>
        )}
      </section>

      <section className="fiche__jalons" aria-labelledby="jalons-titre">
        <h2 id="jalons-titre">Jalons</h2>
        <p className="discret">
          {atteints} sur {listeJalons.length}. Un jalon atteint reste atteint.
        </p>
        <ul className="jalons">
          {listeJalons.map((j) => (
            <li key={j.code} className={`jalon${j.atteint ? ' jalon--atteint' : ''}`}>
              <span className="jalon__marque" aria-hidden="true">{j.atteint && <Coche />}</span>
              <span className="jalon__corps">
                <b>{j.titre}</b>
                <span className="discret">{j.detail}</span>
              </span>
              <span className="visuellement-cache">{j.atteint ? ', atteint' : ', à atteindre'}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="fiche__reglages" aria-labelledby="reglages-titre">
        <h2 id="reglages-titre">Tes réglages</h2>
        <p className="discret">Tout reste dans ce navigateur. Changer d’appareil ou vider le cache efface la fiche.</p>

        <div className="reglage">
          <label htmlFor="reglage-prenom">Prénom</label>
          <input
            id="reglage-prenom"
            className="champ"
            type="text"
            autoComplete="given-name"
            maxLength={40}
            value={p.prenom}
            onChange={(e) => ecrire(enregistrerProfil(etat, { ...p, prenom: e.target.value }))}
          />
        </div>

        <div className="reglage">
          <p className="reglage__titre">Pourquoi tu passes le permis</p>
          <p className="reglage__valeur">
            {raison ? <q>{raison}</q> : <span className="discret">Pas encore dit.</span>}{' '}
            <a href="/profil/depart">{profilRempli(p) ? 'Modifier mes réponses' : 'Répondre'}</a>
          </p>
        </div>

        <div className="reglage">
          <p className="reglage__titre" id="reglage-rythme">Questions par jour</p>
          <div className="segmente" role="group" aria-labelledby="reglage-rythme">
            {RYTHMES.map((r) => (
              <button
                key={r.questions}
                type="button"
                className="segmente__option"
                aria-pressed={(p.rythme ?? RYTHMES[1]!.questions) === r.questions}
                onClick={() => ecrire(enregistrerProfil(etat, { ...p, rythme: r.questions }))}
              >
                {r.questions} <span className="discret">{r.nom}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="reglage">
          <label htmlFor="reglage-date">Date de l’examen</label>
          <div className="reglage__ligne">
            <input
              id="reglage-date"
              className="champ"
              type="date"
              value={etat.dateExamen ?? ''}
              onChange={(e) => {
                ecrire({ ...etat, dateExamen: e.target.value || null });
                if (e.target.value) evenement('date-examen-renseignee');
              }}
            />
            {etat.dateExamen && (
              <button className="signaler" type="button" onClick={() => ecrire({ ...etat, dateExamen: null })}>
                effacer la date
              </button>
            )}
          </div>
        </div>

        <div className="reglage">
          <p className="reglage__titre" id="reglage-apparence">Apparence</p>
          <Apparence idTitre="reglage-apparence" />
        </div>

        <div className="reglage">
          <p className="reglage__titre">Vie privée et licences</p>
          <p className="reglage__valeur">
            La mesure d’audience, la version de la banque et les licences sont sur la page{' '}
            <a href="/parametres">réglages du site</a>.
          </p>
        </div>

        <div className="reglage reglage--danger">
          <p className="reglage__titre">Effacer</p>
          {confirme ? (
            <div className="jeu__actions">
              <button
                className="bouton bouton--principal"
                type="button"
                onClick={() => {
                  effacer();
                  setConfirme(false);
                  setEtat(charger());
                }}
              >
                Oui, tout effacer
              </button>
              <button className="bouton bouton--discret" type="button" onClick={() => setConfirme(false)}>
                Annuler
              </button>
            </div>
          ) : (
            <p className="reglage__valeur">
              <button className="bouton" type="button" onClick={() => setConfirme(true)} disabled={rien && !profilRempli(p)}>
                Effacer ma progression et ma fiche
              </button>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
