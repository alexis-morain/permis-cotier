import { useEffect, useState } from 'react';
import { charger, sauvegarder } from '../lib/progression';
import { evenement } from '../lib/mesure';
import { programmerRappels } from '../lib/natif';

/**
 * « Ton examen est quand ? » Facultative, gardée dans le navigateur, jamais
 * envoyée nulle part. Elle sert à afficher le compte à rebours, et à savoir
 * si les gens révisent la veille ou trois semaines avant.
 */
function joursAvant(date: string): number | null {
  const cible = new Date(`${date}T00:00:00`);
  if (Number.isNaN(cible.getTime())) return null;
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  return Math.round((cible.getTime() - aujourdhui.getTime()) / 86_400_000);
}

export default function DateExamen() {
  const [date, setDate] = useState<string>('');
  const [pret, setPret] = useState(false);

  useEffect(() => {
    setDate(charger().dateExamen ?? '');
    setPret(true);
  }, []);

  function enregistrer(valeur: string) {
    setDate(valeur);
    sauvegarder({ ...charger(), dateExamen: valeur || null });
    // Une date posée est la meilleure intention que le site puisse lire :
    // elle dit qu'il reste des jours à réviser, pas qu'on passe en visiteur.
    if (valeur) evenement('date-examen-renseignee');
    // Dans l'app, la date arme les rappels J-7, J-3, J-1 et le matin même.
    // C'est le seul moment où la permission se demande : le candidat vient de
    // poser sa date, il voit à quoi elle sert. Sur le site, sans effet.
    void programmerRappels(valeur || null);
  }

  if (!pret) return null;

  const jours = date ? joursAvant(date) : null;

  return (
    <div className="dateExamen">
      <label htmlFor="date-examen">Ton examen est quand&nbsp;?</label>
      <input
        id="date-examen"
        className="champ"
        type="date"
        value={date}
        onChange={(e) => enregistrer(e.target.value)}
      />
      {jours !== null && (
        <p className="discret" style={{ margin: '0.5rem 0 0' }}>
          {jours > 1 && `Dans ${jours} jours. Environ ${Math.max(1, Math.ceil(120 / jours))} questions par jour pour tout voir.`}
          {jours === 1 && 'Demain. Fais deux examens blancs ce soir.'}
          {jours === 0 && 'Aujourd’hui. Bon vent.'}
          {jours < 0 && 'C’est passé. Tu peux effacer la date dans les réglages.'}
        </p>
      )}
      <p className="discret" style={{ margin: '0.4rem 0 0' }}>
        Gardée dans ce navigateur, rien n’est envoyé.
      </p>
      <style>{`
        .dateExamen label { display: block; font-weight: 700; margin-bottom: 0.4rem; }
      `}</style>
    </div>
  );
}
