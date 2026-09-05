/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import MesureReglage from './MesureReglage';
import { CLE_ARRET } from '../lib/mesure';

describe('interrupteur de la mesure', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('part décoché quand rien n’est coupé', () => {
    render(<MesureReglage />);
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  });

  it('coupe et rétablit la mesure de ce navigateur', () => {
    render(<MesureReglage />);
    const case_ = screen.getByRole('checkbox');

    fireEvent.click(case_);
    expect(localStorage.getItem(CLE_ARRET)).toBe('1');
    expect(screen.getByText(/hors du compte/)).toBeTruthy();

    fireEvent.click(case_);
    expect(localStorage.getItem(CLE_ARRET)).toBeNull();
  });

  it('retrouve un choix déjà fait', () => {
    localStorage.setItem(CLE_ARRET, '1');
    render(<MesureReglage />);
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
  });
});
