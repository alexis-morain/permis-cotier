import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent } from 'react';

interface Props {
  titre: string;
  message: string;
  /** Le verbe de ce que l'alerte fait si on l'accepte : jamais « OK ». */
  confirmer: string;
  surAnnuler: () => void;
  surConfirmer: () => void;
}

/**
 * Une alerte à l'iOS pour une action qu'on ne peut pas défaire
 * (`alerts.md`) : un titre, une phrase au plus, deux boutons en rangée,
 * « Annuler » à gauche et le verbe à droite. Le focus part sur Annuler, qui ne
 * détruit rien ; c'est à l'écran qui l'ouvre de rendre le focus à sa cellule.
 * Échap annule, Tab tourne entre les deux boutons.
 *
 * Le bouton de droite n'est pas rouge : le candidat vient de toucher « Effacer
 * ma progression » lui-même, l'alerte confirme son geste et ne le contredit
 * pas (`alerts.md` › « destructive style … people didn't deliberately choose »).
 */
export default function Alerte({ titre, message, confirmer, surAnnuler, surConfirmer }: Props) {
  const id = useId();
  const annuler = useRef<HTMLButtonElement>(null);
  const accepter = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    annuler.current?.focus();
  }, []);

  function surTouche(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      surAnnuler();
    } else if (e.key === 'Tab') {
      // Deux boutons : l'alerte est modale, le focus n'en sort pas.
      e.preventDefault();
      (document.activeElement === annuler.current ? accepter : annuler).current?.focus();
    }
  }

  return (
    <div className="alerte" onKeyDown={surTouche}>
      <div
        className="alerte__carte"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-titre`}
        aria-describedby={`${id}-message`}
      >
        <div className="alerte__texte">
          <p id={`${id}-titre`} className="alerte__titre">{titre}</p>
          <p id={`${id}-message`} className="alerte__message">{message}</p>
        </div>
        <div className="alerte__boutons">
          <button ref={annuler} type="button" className="alerte__bouton" onClick={surAnnuler}>
            Annuler
          </button>
          <button ref={accepter} type="button" className="alerte__bouton alerte__bouton--fort" onClick={surConfirmer}>
            {confirmer}
          </button>
        </div>
      </div>
    </div>
  );
}
