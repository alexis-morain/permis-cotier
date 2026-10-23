import { useEffect, useState } from 'react';
import { charger } from '../lib/progression';
import type { Etat } from '../lib/progression';
import type { QuestionConnue } from '../lib/profil';
import { surProgressionChangee } from '../lib/vivant';
import ListeThemes from './profil/ListeThemes';
import './profil.css';

/** L'écran poussé depuis la Fiche de l'app : tous les thèmes, du plus fragile au plus neuf. */
export default function ThemesProfil({ banque }: { banque: QuestionConnue[] }) {
  const [etat, setEtat] = useState<Etat | null>(null);
  useEffect(() => setEtat(charger()), []);
  useEffect(() => surProgressionChangee(() => setEtat(charger())), []);
  if (!etat) return null;
  return (
    <div className="fiche">
      <header className="fiche__tete">
        <h1>Tous les thèmes</h1>
        <p className="discret">Part des questions retenues, les plus fragiles d’abord.</p>
      </header>
      <section className="fiche__themes" aria-label="Thème par thème">
        <ListeThemes etat={etat} banque={banque} />
      </section>
    </div>
  );
}
