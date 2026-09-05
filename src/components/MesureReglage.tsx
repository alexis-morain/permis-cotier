import { useEffect, useState } from 'react';
import { couperMesure, mesureCoupee } from '../lib/mesure';

/**
 * L'interrupteur de la mesure d'audience.
 *
 * Il existe pour deux raisons. La première : quelqu'un qui ne veut pas être
 * compté doit pouvoir le dire, même quand la mesure est anonyme et sans
 * cookie. La seconde est plus terre à terre — celui qui tient le site le
 * visite dix fois par jour, et ses allers-retours fausseraient ses propres
 * chiffres s'il ne pouvait pas se retirer du compte.
 *
 * Le réglage vaut pour ce navigateur seulement. Le traceur relit la clé avant
 * chaque envoi, donc cocher agit tout de suite ; décocher rend les clics au
 * compte sur-le-champ, et la page vue au prochain chargement — le traceur
 * n'installe son écoute qu'une fois, au démarrage, et ne la rattrape pas.
 */
export default function MesureReglage() {
  const [coupee, setCoupee] = useState(false);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    setCoupee(mesureCoupee());
    setPret(true);
  }, []);

  // Rien tant que l'état local n'est pas lu : une case affichée décochée puis
  // cochée d'un coup ferait douter de ce qu'elle enregistre.
  if (!pret) return null;

  function basculer(valeur: boolean) {
    couperMesure(valeur);
    setCoupee(valeur);
  }

  return (
    <p className="mesureReglage">
      <label>
        <input
          type="checkbox"
          checked={coupee}
          onChange={(e) => basculer(e.target.checked)}
        />
        <span>Ne pas compter mes visites dans la fréquentation</span>
      </label>
      <span className="discret">
        {coupee
          ? 'Ce navigateur est hors du compte, dès maintenant.'
          : 'Vaut pour ce navigateur. Couper agit tout de suite, remettre au prochain chargement de page.'}
      </span>
      <style>{`
        .mesureReglage { display: flex; flex-direction: column; gap: 0.25rem; }
        .mesureReglage label {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          min-height: 2.75rem;
          font-weight: 700;
          cursor: pointer;
        }
        .mesureReglage input { width: 1.15rem; height: 1.15rem; accent-color: var(--accent); }
      `}</style>
    </p>
  );
}
