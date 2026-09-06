import { useEffect, useState } from 'react';
import { aujourdhui, charger } from '../lib/progression';
import type { Etat } from '../lib/progression';
import { PALIERS, indice, objectifDuJour, profilRempli, rappel, serieDeJours } from '../lib/profil';
import type { QuestionConnue } from '../lib/profil';

interface Props {
  /** La banque publiée, pour ne pas compter ce que `/revoir` ne joue plus. */
  banque: QuestionConnue[];
}

const STYLE = `
  .reprise { border-top: 2px solid var(--filet); padding-top: 0.9rem; margin-top: 1.25rem; font-size: 0.95rem; }
  .reprise p { margin: 0; }
  .reprise__raison { margin-top: 0.4rem; font-weight: 600; }
  .reprise q { quotes: '« ' ' »'; }
`;

/**
 * Sur l'accueil, dans la bande marine : où on en est, en deux lignes.
 * L'indice, l'objectif du jour, la série, les erreurs à revoir, et le lien
 * vers la fiche. Pour qui arrive pour la première fois, l'invitation à dire
 * pourquoi il passe le permis.
 */
export default function Reprise({ banque }: Props) {
  const [etat, setEtat] = useState<Etat | null>(null);
  useEffect(() => setEtat(charger()), []);

  if (!etat) return null;

  const publiees = new Set(banque.map((q) => q.id));
  const vues = Object.entries(etat.questions).filter(([id]) => publiees.has(id));
  const aRevoir = vues.filter(([, e]) => !e.derniereReussie).length;
  const rien = vues.length === 0 && etat.examens.length === 0;
  const raison = rappel(etat.profil);

  if (rien && !profilRempli(etat.profil)) {
    return (
      <div className="reprise">
        <p>
          Première fois ici ?{' '}
          <a href="/profil/depart" data-mesure="accueil-profil-depart">Dis en trente secondes pourquoi tu passes le permis</a> :
          le site se règle à ta main, et te le rappelle quand ça coince.
        </p>
        <style>{STYLE}</style>
      </div>
    );
  }

  const jour = aujourdhui();
  const ind = indice(etat, banque);
  const objectif = objectifDuJour(etat, jour);
  const serie = serieDeJours(etat, jour);
  const prenom = etat.profil.prenom.trim();
  const faites = Math.min(objectif.faites, objectif.cible);

  return (
    <div className="reprise">
      <p>
        {prenom ? `${prenom}, ` : ''}indice de préparation <b>{ind.score}</b> sur 100,{' '}
        {PALIERS[ind.palier].titre.toLowerCase()}. Aujourd’hui <b>{faites}</b> question{faites > 1 ? 's' : ''} sur{' '}
        {objectif.cible}
        {serie.jours > 0 && (
          <>
            , <b>{serie.jours}</b> jour{serie.jours > 1 ? 's' : ''} de suite
          </>
        )}
        .
        {aRevoir > 0 && (
          <>
            {' '}
            <a href="/revoir" data-mesure="accueil-revoir"><b>{aRevoir}</b> question{aRevoir > 1 ? 's' : ''} à revoir</a>.
          </>
        )}{' '}
        <a href="/profil" data-mesure="accueil-profil">Ta fiche</a>.
      </p>
      {raison && (
        <p className="reprise__raison">
          Tu passes ce permis pour <q>{raison}</q>
        </p>
      )}
      <style>{STYLE}</style>
    </div>
  );
}
