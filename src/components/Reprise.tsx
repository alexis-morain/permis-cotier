import { useEffect, useState } from 'react';
import { charger, statistiques } from '../lib/progression';
import type { Statistiques } from '../lib/progression';

interface Props {
  /** Les identifiants publiés, pour ne pas compter ce que `/revoir` ne joue plus. */
  ids?: string[];
}

/** Rappel de l'état local : questions vues, questions à revoir, dernier score. */
export default function Reprise({ ids }: Props) {
  const [stats, setStats] = useState<Statistiques | null>(null);
  useEffect(() => setStats(statistiques(charger(), ids)), [ids]);

  if (!stats || stats.vues === 0) return null;

  return (
    <p className="reprise">
      Tu as déjà vu <b>{stats.vues}</b> question{stats.vues > 1 ? 's' : ''}
      {stats.aRevoir > 0 && (
        <>
          , dont <a href="/revoir" data-umami-event="accueil-revoir"><b>{stats.aRevoir}</b> à revoir</a>
        </>
      )}.
      {stats.dernierScore && (
        <>
          {' '}Dernier examen blanc&nbsp;: <b>{stats.dernierScore.bonnes} sur {stats.dernierScore.total}</b>,{' '}
          {stats.dernierScore.reussi ? 'reçu' : 'recalé'}.
        </>
      )}
      <style>{`.reprise { border-top: 2px solid var(--filet); padding-top: 0.9rem; margin-top: 1.25rem; font-size: 0.95rem; }`}</style>
    </p>
  );
}
