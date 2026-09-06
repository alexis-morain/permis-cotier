import { useEffect, useState } from 'react';
import { charger, statistiques } from '../lib/progression';
import type { Statistiques } from '../lib/progression';

/**
 * Sur la page des réglages du site : un rappel de ce que ce navigateur
 * retient, et le renvoi vers la fiche, où tout se règle et s'efface.
 */
export default function Parametres() {
  const [stats, setStats] = useState<Statistiques | null>(null);
  useEffect(() => setStats(statistiques(charger())), []);

  if (!stats) return null;

  return (
    <p>
      {stats.vues === 0
        ? 'Rien d’enregistré dans ce navigateur pour l’instant. '
        : `${stats.vues} question${stats.vues > 1 ? 's' : ''} vue${stats.vues > 1 ? 's' : ''}, ${stats.examensTermines} examen${stats.examensTermines > 1 ? 's' : ''} blanc${stats.examensTermines > 1 ? 's' : ''} terminé${stats.examensTermines > 1 ? 's' : ''}. `}
      Le détail, tes réglages et l’effacement sont sur <a href="/profil">ta fiche</a>.
    </p>
  );
}
