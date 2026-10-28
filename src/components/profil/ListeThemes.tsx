import type React from 'react';
import { jaugesParTheme } from '../../lib/profil';
import type { QuestionConnue } from '../../lib/profil';
import type { Etat } from '../../lib/progression';
import { nomDuTheme } from '../../lib/themes-client';
import PaliersDuTheme from './PaliersDuTheme';
import EtiquetteGroupe from './EtiquetteGroupe';
import { accorde } from './accorde';

interface Props {
  etat: Etat;
  banque: QuestionConnue[];
  /** Les premiers thèmes travaillés seulement, sans ceux « pas encore ouverts ». */
  limite?: number;
}

/** Ce que la jauge d'un thème dit à voix haute : le compte, que la barre ne porte pas. */
function leCompte(t: { vues: number; retenues: number; ratees: number; total: number }): string {
  const retenues = `${t.retenues} ${t.retenues > 1 ? 'retenues' : 'retenue'}`;
  const ratees = t.ratees > 0 ? `, ${t.ratees} ${t.ratees > 1 ? 'ratées' : 'ratée'}` : '';
  return `${retenues}${ratees} sur ${accorde(t.vues, 'vue')}, ${t.total} en banque`;
}

/** Les thèmes en jauges, les plus fragiles d'abord. Sert la Fiche et l'écran « Tous les thèmes ». */
export default function ListeThemes({ etat, banque, limite }: Props) {
  const jauges = jaugesParTheme(etat, banque);
  const travailles = limite === undefined ? jauges.travailles : jauges.travailles.slice(0, limite);
  return (
    <>
      <ul className="maitrise">
        {travailles.map((t) => (
          <li key={t.code} style={{ '--pourcent': t.pourcent / 100 } as React.CSSProperties}>
            <a href={`/entrainement/${t.code}`} data-mesure="profil-theme" data-mesure-theme={t.code}>
              <span className="maitrise__nom">
                <b>{nomDuTheme(t.code)}</b>
                <EtiquetteGroupe theme={t.code} />
              </span>
              <span className="maitrise__pourcent">{t.pourcent}{'\u00a0'}%</span>
              <span className="maitrise__jauge" aria-hidden="true">
                <span className="maitrise__retenues" />
              </span>
              <span className="visuellement-cache maitrise__lu">{leCompte(t)}</span>
            </a>
            <PaliersDuTheme etat={etat} banque={banque} theme={t.code} vues={t.vues} />
          </li>
        ))}
      </ul>
      {limite === undefined && jauges.neufs.length > 0 && (
        <>
          <h3 className="maitrise__titre">Pas encore ouverts</h3>
          <ul className="maitrise maitrise--neufs">
            {jauges.neufs.map((t) => (
              <li key={t.code}>
                <a href={`/entrainement/${t.code}`} data-mesure="profil-theme" data-mesure-theme={t.code}>
                  <span className="maitrise__nom">
                    <b>{nomDuTheme(t.code)}</b>
                    <EtiquetteGroupe theme={t.code} />
                  </span>
                  <span className="discret">{accorde(t.total, 'question')}</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
