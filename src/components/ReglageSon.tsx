import { useEffect, useState } from 'react';
import { jouer, reglerSon, sonActif } from '../lib/son';

/**
 * L'interrupteur des sons de l'app, sur l'écran des réglages.
 *
 * Une vraie case à cocher sous le rôle `switch` : VoiceOver dit « Jouer les
 * sons, interrupteur, activé », et toute la ligne se touche, 44 pt de haut.
 * La case est cachée à l'œil, pas au lecteur d'écran ; le rail et le curseur
 * sont dessinés à côté.
 *
 * Rallumer joue le son d'une bonne réponse : on entend tout de suite ce
 * qu'on vient d'activer. Couper ne joue rien, évidemment.
 */
export default function ReglageSon() {
  const [actif, setActif] = useState(true);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    setActif(sonActif());
    setPret(true);
  }, []);

  // Rien tant que l'état n'est pas lu : un interrupteur qui bascule seul au
  // chargement ferait douter de ce qu'il enregistre.
  if (!pret) return null;

  function basculer(valeur: boolean) {
    reglerSon(valeur);
    setActif(valeur);
    if (valeur) void jouer('juste');
  }

  return (
    <div className="reglageSon">
      <label className="interrupteur">
        <span className="interrupteur__libelle">Jouer les sons</span>
        <input
          className="interrupteur__case"
          type="checkbox"
          role="switch"
          checked={actif}
          aria-describedby="reglage-son-aide"
          onChange={(e) => basculer(e.target.checked)}
        />
        <span className="interrupteur__rail" aria-hidden="true" />
      </label>
      <p id="reglage-son-aide" className="discret">
        Les sons suivent le bouton silencieux de ton iPhone.
      </p>
      <style>{`
        .reglageSon p { margin-top: 0.25rem; }
        .interrupteur {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          min-height: 2.75rem;
          font-weight: 700;
          cursor: pointer;
        }
        .interrupteur__case {
          position: absolute;
          opacity: 0;
          width: 1px;
          height: 1px;
          margin: 0;
        }
        .interrupteur__rail {
          flex: none;
          position: relative;
          width: 3.25rem;
          height: 2rem;
          border: 2px solid var(--filet-fort);
          border-radius: 1rem;
          background: var(--fond-2);
          transition: background var(--transition), border-color var(--transition);
        }
        .interrupteur__rail::before {
          content: '';
          position: absolute;
          top: 0.1875rem;
          left: 0.1875rem;
          width: 1.375rem;
          height: 1.375rem;
          border-radius: 50%;
          background: var(--filet-fort);
          transition: transform var(--transition), background var(--transition);
        }
        .interrupteur__case:checked + .interrupteur__rail {
          background: var(--accent);
          border-color: var(--marine);
        }
        .interrupteur__case:checked + .interrupteur__rail::before {
          background: var(--marine);
          transform: translateX(1.25rem);
        }
        .interrupteur__case:focus-visible + .interrupteur__rail {
          outline: 3px solid var(--anneau);
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .interrupteur__rail, .interrupteur__rail::before { transition: none; }
        }
      `}</style>
    </div>
  );
}
