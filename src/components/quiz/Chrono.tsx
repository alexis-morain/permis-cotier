import { useEffect, useState } from 'react';
import { secondesRestantes } from '../../lib/session';
import { surRetourAuPremierPlan } from '../../lib/natif';

/**
 * Le chrono de l'examen : les secondes qui restent avant `echeance`, relues
 * sur l'heure à chaque seconde. L'état vit dans l'en-tête qui l'appelle, pas
 * dans la session : seul l'en-tête se refait à la seconde, l'énoncé et les
 * propositions restent en place. `echoir` part quand l'échéance est passée,
 * et c'est le seul moment où la session entend parler du temps.
 *
 * Un onglet caché voit son intervalle étranglé, une app suspendue le voit
 * gelé tout net. Le chrono est une horloge murale : au retour, on relit
 * l'heure sans attendre le prochain battement. `appStateChange` est le seul
 * signal qui arrive à coup sûr au retour de l'app — `visibilitychange` ne
 * part pas toujours dans une WKWebView rendue au premier plan. Les deux sont
 * branchés : une annonce en trop ne coûte rien, le réducteur ignore une
 * échéance qui n'est pas passée.
 */
export function useChrono(echeance: number | null, echoir: () => void): number | null {
  // L'heure lue au dernier battement, et l'échéance qu'elle concerne : à la
  // question suivante, l'heure d'avant ne vaut plus, on relit la vraie.
  const [lu, setLu] = useState({ echeance, maintenant: Date.now() });

  useEffect(() => {
    if (echeance === null) return;
    const battre = () => {
      const maintenant = Date.now();
      setLu({ echeance, maintenant });
      if (maintenant >= echeance) echoir();
    };
    const h = window.setInterval(battre, 1000);
    const surRetour = () => {
      if (!document.hidden) battre();
    };
    document.addEventListener('visibilitychange', surRetour);
    const debrancher = surRetourAuPremierPlan(battre);
    return () => {
      window.clearInterval(h);
      document.removeEventListener('visibilitychange', surRetour);
      debrancher();
    };
  }, [echeance, echoir]);

  if (echeance === null) return null;
  return secondesRestantes(echeance, lu.echeance === echeance ? lu.maintenant : Date.now());
}
