/** @vitest-environment jsdom */
/**
 * La Fiche dans la coquille : elle relit la progression quand un autre onglet
 * l'a écrite (`app:progression`). Sur le site, rien n'écoute — c'est
 * `ProfilCandidat.test.tsx`, dans la cible par défaut.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import ProfilCandidat from './ProfilCandidat';
import ThemesProfil from './ThemesProfil';
import { charger, enregistrerReponse, etatInitial, sauvegarder } from '../lib/progression';

vi.mock('../lib/cible', () => ({ POUR_APP: true }));

const banque = [{ id: 'vhf-0', theme: 'vhf', notion: 'vhf-canaux' }];

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn();
});
afterEach(() => cleanup());

describe('la fiche dans l’app', () => {
  it('relit les réponses écrites dans un autre onglet, sans recharger', () => {
    render(<ProfilCandidat banque={banque} totalLecons={105} />);
    expect(screen.getByText(/Elle se remplit en jouant/)).toBeTruthy();

    sauvegarder(enregistrerReponse(etatInitial(), 'vhf-0', false, '2026-09-20'));
    act(() => {
      window.dispatchEvent(new Event('app:progression'));
    });

    expect(screen.queryByText(/Elle se remplit en jouant/)).toBeNull();
  });

  describe('allégée : le bilan seulement', () => {
    const themes = ['vhf', 'balisage', 'meteo', 'feux', 'securite'];
    const grosse = themes.map((t, i) => ({ id: `${t}-0`, theme: t, notion: `${t}-n` , i }));
    const banqueFournie = grosse.map(({ id, theme, notion }) => ({ id, theme, notion }));

    function jouer() {
      let e = etatInitial();
      themes.forEach((t, i) => {
        // Plus de fautes sur les derniers : l'ordre « fragile d'abord » se voit.
        e = enregistrerReponse(e, `${t}-0`, i < 2, '2026-09-20');
      });
      sauvegarder(e);
    }

    it('ne porte ni prénom, ni rythme, ni date, ni apparence, ni effacement', () => {
      jouer();
      render(<ProfilCandidat banque={banqueFournie} totalLecons={105} />);
      expect(screen.queryByLabelText('Prénom')).toBeNull();
      expect(screen.queryByText('Tes réglages')).toBeNull();
      expect(screen.queryByText(/Apparence/)).toBeNull();
      expect(screen.queryByText(/Effacer/)).toBeNull();
      expect(screen.queryByText(/Jalons/i)).toBeNull();
    });

    it('montre trois thèmes et un lien vers tous les autres', () => {
      jouer();
      render(<ProfilCandidat banque={banqueFournie} totalLecons={105} />);
      const section = screen.getByRole('heading', { name: 'Thème par thème' }).closest('section')!;
      expect(within(section).getAllByRole('listitem').filter((li) => li.querySelector('.maitrise__pourcent'))).toHaveLength(3);
      const lien = within(section).getByRole('link', { name: /Tous les thèmes/ });
      expect(lien.getAttribute('href')).toBe('/profil/themes');
    });

    it('replie les quatorze jours', () => {
      jouer();
      render(<ProfilCandidat banque={banqueFournie} totalLecons={105} />);
      const d = screen.getByText('Tes quatorze derniers jours').closest('details')!;
      expect(d.hasAttribute('open')).toBe(false);
      expect(d.querySelector('ol.jours')).toBeTruthy();
    });

    it('renvoie « plus bas » vers les Réglages', () => {
      jouer();
      sauvegarder({ ...charger(), dateExamen: '2026-01-01' });
      render(<ProfilCandidat banque={banqueFournie} totalLecons={105} />);
      expect(screen.getByRole('link', { name: 'dans les Réglages' }).getAttribute('href')).toBe('/parametres');
    });

    it('l’écran « Tous les thèmes » les liste tous', () => {
      jouer();
      render(<ThemesProfil banque={banqueFournie} />);
      expect(screen.getByRole('heading', { level: 1, name: 'Tous les thèmes' })).toBeTruthy();
      expect(document.querySelectorAll('.maitrise__pourcent')).toHaveLength(5);
    });
  });
});
