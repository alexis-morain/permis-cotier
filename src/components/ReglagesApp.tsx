import { useEffect, useRef, useState } from 'react';
import { annoncerDateExamen, charger, effacer, enregistrerProfil, sauvegarder } from '../lib/progression';
import type { Etat } from '../lib/progression';
import { RYTHMES, RYTHME_PAR_DEFAUT, rappel } from '../lib/profil';
import { surProgressionChangee } from '../lib/vivant';
import { ceQuiPartira } from './profil/partira';
import ReglageSon from './ReglageSon';
import Alerte from './reglages/Alerte';

interface Props {
  version: string;
  total: number;
}

/**
 * Les Réglages de l'app, groupés comme ceux d'iOS : un titre de section en
 * petit, une carte blanche, des cellules séparées d'un filet (`settings.md`,
 * `lists-and-tables.md`). Ce qui se règle de temps en temps : la date de
 * l'épreuve, le rythme, le prénom, la raison, les sons. L'effacement ferme la
 * page, en rouge, derrière une alerte.
 *
 * L'apparence n'y est pas : l'app suit le système (`dark-mode.md`).
 */
export default function ReglagesApp({ version, total }: Props) {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [alerte, setAlerte] = useState(false);
  const [efface, setEfface] = useState(false);
  const declencheur = useRef<HTMLButtonElement>(null);
  const message = useRef<HTMLParagraphElement>(null);

  // La cellule d'effacement a disparu : le focus passe au message qui le dit.
  useEffect(() => {
    if (efface) message.current?.focus({ preventScroll: true });
  }, [efface]);

  useEffect(() => setEtat(charger()), []);
  useEffect(() => surProgressionChangee(() => setEtat(charger())), []);

  if (!etat) return null;

  const p = etat.profil;
  const raison = rappel(p);
  // Rien d'enregistré, raison comprise : l'effacement n'aurait rien à défaire.
  const rien =
    Object.keys(etat.questions).length === 0 &&
    etat.examens.length === 0 &&
    Object.keys(etat.lecons).length === 0 &&
    p.rempliLe === null &&
    etat.dateExamen === null;

  function ecrire(suivant: Etat) {
    sauvegarder(suivant);
    setEtat(suivant);
  }

  return (
    <div className="reglagesApp">
      <section aria-labelledby="reglages-epreuve">
        <h2 id="reglages-epreuve" className="reglagesApp__titre">Ton épreuve</h2>
        <ul className="cellules">
          <li>
            <label className="cellules__ligne" htmlFor="reglage-date">
              <span>Date de l’examen</span>
              <input
                id="reglage-date"
                className="reglagesApp__champ"
                type="date"
                value={etat.dateExamen ?? ''}
                onChange={(e) => {
                  const valeur = e.target.value || null;
                  ecrire({ ...etat, dateExamen: valeur });
                  // La coquille arme sur cette annonce les rappels J-7, J-3,
                  // J-1 et le matin même, et demande la permission ici, où le
                  // candidat voit à quoi elle sert.
                  annoncerDateExamen(valeur);
                }}
              />
            </label>
          </li>
          {etat.dateExamen && (
            <li>
              <button
                type="button"
                className="cellules__ligne reglagesApp__bouton"
                onClick={() => {
                  ecrire({ ...etat, dateExamen: null });
                  annoncerDateExamen(null);
                }}
              >
                Effacer la date
              </button>
            </li>
          )}
        </ul>
      </section>

      <section aria-labelledby="reglages-rythme">
        <h2 id="reglages-rythme" className="reglagesApp__titre">Ton rythme</h2>
        <ul className="cellules">
          <li className="reglagesApp__pile">
            <p id="reglage-rythme" className="reglagesApp__libelle">Questions par jour</p>
            <div className="segmente" role="group" aria-labelledby="reglage-rythme">
              {RYTHMES.map((r) => (
                <button
                  key={r.questions}
                  type="button"
                  className="segmente__option"
                  aria-pressed={(p.rythme ?? RYTHME_PAR_DEFAUT) === r.questions}
                  onClick={() => ecrire(enregistrerProfil(etat, { ...p, rythme: r.questions }))}
                >
                  {r.questions} <span className="discret">{r.nom}</span>
                </button>
              ))}
            </div>
          </li>
        </ul>
      </section>

      <section aria-labelledby="reglages-toi">
        <h2 id="reglages-toi" className="reglagesApp__titre">Toi</h2>
        <ul className="cellules">
          <li>
            <label className="cellules__ligne" htmlFor="reglage-prenom">
              <span>Prénom</span>
              <input
                id="reglage-prenom"
                className="reglagesApp__champ"
                type="text"
                autoComplete="given-name"
                maxLength={40}
                placeholder="Facultatif"
                value={p.prenom}
                onChange={(e) => ecrire(enregistrerProfil(etat, { ...p, prenom: e.target.value }))}
              />
            </label>
          </li>
          <li>
            <a className="cellules__ligne" href="/profil/depart?retour=%2Fparametres">
              <span>Pourquoi tu passes le permis</span>
              <span className="reglagesApp__valeur discret">{raison ?? 'Pas encore dit'}</span>
              <span className="cellules__chevron" aria-hidden="true">›</span>
            </a>
          </li>
        </ul>
      </section>

      <section aria-labelledby="reglages-sons">
        <h2 id="reglages-sons" className="reglagesApp__titre">Sons</h2>
        <ul className="cellules">
          <li><ReglageSon /></li>
        </ul>
      </section>

      <section aria-labelledby="reglages-version">
        <h2 id="reglages-version" className="reglagesApp__titre">Cette version</h2>
        <ul className="cellules">
          <li className="cellules__ligne">
            <span>Banque de questions</span>
            <span className="discret">{`version ${version}, ${total} question${total > 1 ? 's' : ''}`}</span>
          </li>
        </ul>
      </section>

      {/* L'app ne mesure rien : `Mesure.astro` n'y est pas rendu. Dire le
          contraire serait faux, et c'est ce que la revue Apple lit en premier. */}
      <section aria-labelledby="reglages-savoir">
        <h2 id="reglages-savoir" className="reglagesApp__titre">Ce que l’app sait de toi</h2>
        <p className="reglagesApp__pied">
          Rien. Aucun compte, aucun traceur, aucune mesure d’audience. Ta progression et ta date
          d’examen restent sur cet appareil. Un signalement d’erreur part par courrier, et
          seulement si tu l’envoies.
        </p>
      </section>

      <section aria-labelledby="reglages-licences">
        <h2 id="reglages-licences" className="reglagesApp__titre">Licences</h2>
        <p className="reglagesApp__pied">
          Code sous <a href="https://opensource.org/licenses/MIT">MIT</a>. Banque de questions sous{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr">CC BY-SA 4.0</a> : tu peux la
          reprendre, à condition de citer et de partager aux mêmes conditions.{' '}
          <a href="/credits">Crédits des visuels</a>.
        </p>
      </section>

      <section aria-label="Effacer">
        {rien ? (
          <p ref={message} className="reglagesApp__pied" role={efface ? 'status' : undefined} tabIndex={efface ? -1 : undefined}>
            {efface ? 'Progression effacée.' : 'Rien à effacer pour l’instant.'}
          </p>
        ) : (
          <ul className="cellules">
            <li>
              <button
                ref={declencheur}
                type="button"
                className="cellules__ligne reglagesApp__bouton reglagesApp__danger"
                aria-haspopup="dialog"
                onClick={() => setAlerte(true)}
              >
                Effacer ma progression
              </button>
            </li>
          </ul>
        )}
      </section>

      {alerte && (
        <Alerte
          titre="Effacer ta progression ?"
          message={`${ceQuiPartira(etat)} Ça ne se récupère pas.`.trim()}
          confirmer="Effacer"
          surAnnuler={() => {
            setAlerte(false);
            declencheur.current?.focus();
          }}
          surConfirmer={() => {
            effacer();
            setAlerte(false);
            setEtat(charger());
            setEfface(true);
          }}
        />
      )}
    </div>
  );
}
