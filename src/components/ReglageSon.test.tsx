/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ReglageSon from './ReglageSon';
import { CLE_SON, jouer } from '../lib/son';

vi.mock('../lib/son', async (original) => ({
  ...(await original<typeof import('../lib/son')>()),
  jouer: vi.fn(async () => {}),
}));

describe('interrupteur des sons', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(jouer).mockClear();
  });
  afterEach(cleanup);

  it('est un interrupteur nommé, activé par défaut, avec son aide', () => {
    render(<ReglageSon />);
    const inter = screen.getByRole('switch', { name: 'Jouer les sons' }) as HTMLInputElement;
    expect(inter.checked).toBe(true);
    expect(inter.type).toBe('checkbox');
    const aide = document.getElementById(inter.getAttribute('aria-describedby') ?? '');
    expect(aide?.textContent).toBe('Les sons suivent le bouton silencieux de ton iPhone.');
  });

  it('se coupe sans rien jouer, se rallume en jouant « juste » une fois', () => {
    render(<ReglageSon />);
    const inter = screen.getByRole('switch') as HTMLInputElement;

    fireEvent.click(inter);
    expect(inter.checked).toBe(false);
    expect(localStorage.getItem(CLE_SON)).toBe('coupe');
    expect(jouer).not.toHaveBeenCalled();

    fireEvent.click(inter);
    expect(inter.checked).toBe(true);
    expect(localStorage.getItem(CLE_SON)).toBeNull();
    expect(jouer).toHaveBeenCalledTimes(1);
    expect(jouer).toHaveBeenCalledWith('juste');
  });

  it('retrouve un choix déjà fait', () => {
    localStorage.setItem(CLE_SON, 'coupe');
    render(<ReglageSon />);
    expect((screen.getByRole('switch') as HTMLInputElement).checked).toBe(false);
  });
});
