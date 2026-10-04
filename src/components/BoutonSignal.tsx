import { useEffect, useRef } from 'react';

/**
 * L'enveloppe React du bouton « Écouter le signal » (`bouton-signal.ts`).
 *
 * Elle se pose juste après la frise, qu'il retrouve en voisine, et ne rend
 * qu'un paragraphe caché : le bouton arrive en `import()` et s'y installe.
 * L'îlot `Quiz` ne porte ainsi ni la table ni le moteur. Démontée, quand la
 * question change ou que l'écran se ferme, elle coupe le son.
 */
export default function BoutonSignal({ fichier }: { fichier: string }) {
  const lieu = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let demonter: (() => void) | null = null;
    let parti = false;
    import('./bouton-signal')
      .then(({ monterBoutonSignal }) => {
        if (parti || !lieu.current) return;
        demonter = monterBoutonSignal(lieu.current, fichier);
      })
      .catch(() => {
        /* Morceau introuvable (hors ligne, version neuve) : la frise reste muette. */
      });
    return () => {
      parti = true;
      demonter?.();
    };
  }, [fichier]);

  return <p className="signal-ecoute-lieu" ref={lieu} hidden />;
}
