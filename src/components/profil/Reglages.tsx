import { useState } from 'react';
import { annoncerDateExamen, effacer, enregistrerProfil, type Etat } from '../../lib/progression';
import { RYTHMES, profilRempli, rappel } from '../../lib/profil';
import { evenement } from '../../lib/mesure';
import Apparence from '../Apparence';
import { ceQuiPartira } from './partira';

interface Props {
  etat: Etat;
  /** Rien n'a encore été fait : ni question, ni examen, ni leçon. */
  rien: boolean;
  /** La fiche vient d'être effacée : on le dit à la place du bouton. */
  efface: boolean;
  ecrire: (suivant: Etat) => void;
  /** Après l'effacement : la fiche relit l'état vide et remonte en haut. */
  surEffacement: () => void;
}

/**
 * Les réglages de la fiche : prénom, raison, rythme, date d'examen,
 * apparence, et l'effacement, confirmé avant de partir.
 */
export default function Reglages({ etat, rien, efface, ecrire, surEffacement }: Props) {
  const [confirme, setConfirme] = useState(false);
  const p = etat.profil;
  const raison = rappel(p);

  const partira = ceQuiPartira(etat);

  return (
    <section className="fiche__reglages" aria-labelledby="reglages-titre">
      <h2 id="reglages-titre">Tes réglages</h2>
      <p className="discret">
        Tout reste dans ce navigateur. Changer d’appareil, ou effacer les données du site, efface la fiche.
      </p>

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
              const valeur = e.target.value || null;
              ecrire({ ...etat, dateExamen: valeur });
              if (valeur) evenement('date-examen-renseignee');
              // Dans l'app, la coquille arme sur cette annonce les rappels
              // J-7, J-3, J-1 et le matin même, et demande la permission
              // ici, où le candidat voit à quoi elle sert.
              annoncerDateExamen(valeur);
            }}
          />
          {etat.dateExamen && (
            <button
              className="signaler"
              type="button"
              onClick={() => {
                ecrire({ ...etat, dateExamen: null });
                annoncerDateExamen(null);
              }}
            >
              Effacer la date
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
          <>
            {partira && <p className="reglage__valeur">{partira}</p>}
            <div className="jeu__actions">
              {/* Le bouton qui ouvrait la confirmation vient de disparaître :
                  sans ceci, le focus tombait sur `body`. */}
              <button className="bouton" type="button" onClick={() => setConfirme(false)} autoFocus>
                Annuler
              </button>
              <button
                className="bouton bouton--danger"
                type="button"
                onClick={() => {
                  effacer();
                  setConfirme(false);
                  surEffacement();
                }}
              >
                Oui, tout effacer
              </button>
            </div>
          </>
        ) : efface && rien && !profilRempli(p) ? (
          <p className="reglage__valeur" role="status">Fiche effacée.</p>
        ) : rien && !profilRempli(p) ? (
          <p className="reglage__valeur discret">Rien à effacer pour l’instant.</p>
        ) : (
          <p className="reglage__valeur">
            <button className="bouton" type="button" onClick={() => setConfirme(true)}>
              Effacer ma progression et ma fiche
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
