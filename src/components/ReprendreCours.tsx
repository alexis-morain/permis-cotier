import { useEffect, useState } from 'react';
import { charger, leconsFaites } from '../lib/progression';

interface Props {
  /** Les leçons dans l'ordre du parcours, code et nom. */
  lecons: { code: string; nom: string }[];
}

/**
 * Sur l'accueil : où on en est dans le cours, et la leçon à faire maintenant.
 * Avant hydratation, l'invitation à commencer ; après, le compte réel.
 */
export default function ReprendreCours({ lecons }: Props) {
  const [faites, setFaites] = useState<Record<string, boolean> | null>(null);
  useEffect(() => setFaites(leconsFaites(charger())), []);

  const nombre = lecons.filter((l) => faites?.[l.code]).length;
  const prochaine = lecons.find((l) => !faites?.[l.code]) ?? lecons[0];
  if (!prochaine) return null;

  return (
    <p className="reprendreCours">
      {nombre > 0 && (
        <span className="reprendreCours__compte">
          <b>{nombre}</b> leçon{nombre > 1 ? 's' : ''} faite{nombre > 1 ? 's' : ''} sur {lecons.length}.{' '}
        </span>
      )}
      <a className="bouton bouton--principal" href={`/cours/${prochaine.code}`} data-mesure="accueil-cours" data-mesure-notion={prochaine.code}>
        {nombre > 0 ? `Reprendre : ${prochaine.nom}` : 'Commencer le cours'}
      </a>
      <style>{`
        .reprendreCours { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem 1.25rem; margin: 1.5rem 0 0; }
        .reprendreCours__compte { font-weight: 600; }
      `}</style>
    </p>
  );
}
