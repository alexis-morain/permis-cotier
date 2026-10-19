import type React from 'react';
import { derniersExamens, resumeExamens } from '../../lib/profil';
import { dateLisible } from '../../lib/jour';
import { ERREURS_ADMISES, TAILLE_EXAMEN } from '../../lib/quiz';
import type { Etat } from '../../lib/progression';

const SEUIL = TAILLE_EXAMEN - ERREURS_ADMISES;

/** Un score moyen en français : « 33,5 » et non « 33.5 ». */
const nombre = (n: number) => String(n).replace('.', ',');

/**
 * Les dix derniers examens blancs en barres, le plus récent à droite, et la
 * ligne pointillée du seuil (35 sur 40, cinq erreurs admises). Du HTML et du
 * CSS : la hauteur d'une barre est une propriété personnalisée, comme celles
 * de l'indice. Reçu ou recalé ne tient pas à la couleur : la barre recalée est
 * creuse, et chaque barre a son texte (« 37 sur 40, reçu, 12 octobre »).
 */
export default function DerniersExamens({ etat }: { etat: Etat }) {
  const examens = derniersExamens(etat);
  const resume = resumeExamens(etat);

  return (
    <section className="fiche__examens" aria-labelledby="examens-titre">
      <h2 id="examens-titre">Derniers examens blancs</h2>
      {examens.length === 0 ? (
        <p className="examens-vide">
          Aucun examen blanc passé pour l’instant.{' '}
          <a href="/examen" data-mesure="profil-examen-vide" data-mesure-vers="/examen">Faire un examen blanc</a>
        </p>
      ) : (
        <>
          <div className="barres__cadre">
            <ol className="barres" aria-label="Les derniers examens blancs, le plus récent à droite">
              {examens.map((x, i) => (
                <li
                  key={`${x.date}-${i}`}
                  className={`barres__barre${x.reussi ? '' : ' barres__barre--recale'}`}
                  style={{ '--part': x.bonnes / x.total } as React.CSSProperties}
                >
                  <span className="visuellement-cache">
                    {`${x.bonnes} sur ${x.total}, ${x.reussi ? 'reçu' : 'recalé'}, ${dateLisible(x.date)}`}
                  </span>
                  <span className="barres__score" aria-hidden="true">{x.bonnes}</span>
                </li>
              ))}
            </ol>
            <span className="barres__ligne" aria-hidden="true" />
            <span className="barres__seuil">Seuil {SEUIL}</span>
          </div>
          <div className="examens-chiffres">
            <div>
              <b>{resume.passes}</b>
              <span className="discret">{resume.passes > 1 ? 'examens passés' : 'examen passé'}</span>
            </div>
            <div>
              <b>{nombre(resume.moyenne!)} / {TAILLE_EXAMEN}</b>
              <span className="discret">{resume.sur > 1 ? `moyenne des ${resume.sur} derniers` : 'moyenne'}</span>
            </div>
            <div>
              <b>{resume.recus} sur {resume.sur}</b>
              <span className="discret">{resume.sur > 1 ? `reçus parmi les ${resume.sur} derniers` : 'reçu'}</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
