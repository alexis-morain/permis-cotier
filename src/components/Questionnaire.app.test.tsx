/** @vitest-environment jsdom */
/** Le questionnaire dans la coquille : ouvert depuis Réglages, son Retour y ramène. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import Questionnaire from './Questionnaire';

vi.mock('../lib/cible', () => ({ POUR_APP: true }));

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn();
  document.body.innerHTML =
    '<a class="retour__lien" href="/profil"><span class="visuellement-cache"> : Ta fiche</span></a><div id="racine"></div>';
});
afterEach(() => {
  cleanup();
  history.replaceState(null, '', '/');
});

describe('le retour du questionnaire dans l’app', () => {
  it('ramène à Réglages quand la requête le dit', () => {
    history.replaceState(null, '', '/profil/depart?retour=%2Fparametres');
    render(<Questionnaire totalQuestions={10} />, { container: document.getElementById('racine')! });
    expect(document.querySelector('.retour__lien')!.getAttribute('href')).toBe('/parametres');
  });
  it('garde la Fiche sans requête', () => {
    render(<Questionnaire totalQuestions={10} />, { container: document.getElementById('racine')! });
    expect(document.querySelector('.retour__lien')!.getAttribute('href')).toBe('/profil');
  });
});
