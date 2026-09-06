import { useEffect, useState } from 'react';
import { APPARENCES, appliquerApparence, choisirApparence, lireApparence } from '../lib/apparence';
import type { Apparence as Choix } from '../lib/apparence';
import { evenement } from '../lib/mesure';

interface Props {
  /** L'identifiant du titre qui nomme le groupe. */
  idTitre: string;
}

/**
 * Clair, sombre, ou comme le système. Trois boutons, celui qui vaut est
 * enfoncé. Le choix s'applique tout de suite et se garde dans ce navigateur.
 */
export default function Apparence({ idTitre }: Props) {
  const [choix, setChoix] = useState<Choix>('auto');
  const [pret, setPret] = useState(false);

  useEffect(() => {
    setChoix(lireApparence());
    setPret(true);
  }, []);

  if (!pret) return null;

  function changer(valeur: Choix) {
    choisirApparence(valeur);
    appliquerApparence(valeur);
    setChoix(valeur);
    evenement('apparence-changee', { apparence: valeur });
  }

  return (
    <div className="segmente" role="group" aria-labelledby={idTitre}>
      {APPARENCES.map((a) => (
        <button
          key={a.code}
          type="button"
          className="segmente__option"
          aria-pressed={choix === a.code}
          onClick={() => changer(a.code)}
        >
          {a.nom}
        </button>
      ))}
    </div>
  );
}
