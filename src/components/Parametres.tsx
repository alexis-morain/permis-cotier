import { useEffect, useState } from 'react';
import { charger, effacer, sauvegarder, statistiques } from '../lib/progression';
import type { Statistiques } from '../lib/progression';

export default function Parametres() {
  const [stats, setStats] = useState<Statistiques | null>(null);
  const [confirme, setConfirme] = useState(false);
  const [date, setDate] = useState('');

  useEffect(() => {
    const etat = charger();
    setStats(statistiques(etat));
    setDate(etat.dateExamen ?? '');
  }, []);

  function toutEffacer() {
    effacer();
    setStats(statistiques(charger()));
    setDate('');
    setConfirme(false);
  }

  function effacerDate() {
    sauvegarder({ ...charger(), dateExamen: null });
    setDate('');
  }

  if (!stats) return null;

  return (
    <div>
      <h2>Ta progression</h2>
      {stats.vues === 0 ? (
        <p className="discret">Rien d’enregistré dans ce navigateur pour l’instant.</p>
      ) : (
        <p>
          {stats.vues} question{stats.vues > 1 ? 's' : ''} vue{stats.vues > 1 ? 's' : ''},
          dont {stats.aRevoir} à revoir. {stats.examensTermines} examen
          {stats.examensTermines > 1 ? 's' : ''} blanc{stats.examensTermines > 1 ? 's' : ''} terminé
          {stats.examensTermines > 1 ? 's' : ''}.
        </p>
      )}

      {date && (
        <p>
          Date d’examen enregistrée : <b>{date}</b>.{' '}
          <button className="signaler" type="button" onClick={effacerDate}>l’effacer</button>
        </p>
      )}

      <p className="discret">
        Tout est gardé dans ce navigateur, rien n’est envoyé. Changer d’appareil ou vider le cache
        efface la progression. Un code de synchronisation anonyme arrive plus tard.
      </p>

      {confirme ? (
        <p className="jeu__actions">
          <button className="bouton bouton--principal" type="button" onClick={toutEffacer}>
            Oui, tout effacer
          </button>
          <button className="bouton bouton--discret" type="button" onClick={() => setConfirme(false)}>
            Annuler
          </button>
        </p>
      ) : (
        <p>
          <button className="bouton" type="button" onClick={() => setConfirme(true)} disabled={stats.vues === 0}>
            Effacer ma progression
          </button>
        </p>
      )}
    </div>
  );
}
