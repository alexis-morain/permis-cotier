import { describe, it, expect } from 'vitest';
import { POUR_APP } from './cible';
import { banqueGardee, chercherMiseAJour, plusRecente } from './banque-locale';

/**
 * La banque qui se met à jour sans passer par Apple.
 *
 * Ce qui se teste ici est la comparaison de versions, seule pièce de logique
 * pure du module, et le fait que rien ne tourne côté site. Le reste — IndexedDB
 * et le téléchargement — se vérifie au simulateur, sur une banque publiée.
 */

describe('la comparaison de versions', () => {
  it('compare des nombres, pas du texte', () => {
    // Le piège : « 1.10.10 » est plus récent que « 1.10.9 », alors que
    // l'ordre alphabétique dit le contraire.
    expect(plusRecente('1.10.10', '1.10.9')).toBe(true);
    expect(plusRecente('1.10.9', '1.10.10')).toBe(false);
    expect(plusRecente('1.9.0', '1.10.0')).toBe(false);
    expect(plusRecente('2.0.0', '1.99.99')).toBe(true);
  });

  it('ne tient pas une version pour plus récente qu’elle-même', () => {
    expect(plusRecente('1.10.2', '1.10.2')).toBe(false);
  });

  it('complète les rangs absents par zéro', () => {
    expect(plusRecente('1.11', '1.10.2')).toBe(true);
    expect(plusRecente('1.10', '1.10.0')).toBe(false);
    expect(plusRecente('1.10.1', '1.10')).toBe(true);
  });

  it('ne se laisse pas défaire par un numéro abîmé', () => {
    expect(plusRecente('', '1.10.2')).toBe(false);
    expect(plusRecente('abc', '1.10.2')).toBe(false);
    expect(plusRecente('1.10.2', 'abc')).toBe(true);
  });
});

describe('hors de la coquille', () => {
  it('ne garde ni ne cherche rien', async () => {
    expect(POUR_APP).toBe(false);
    await expect(banqueGardee()).resolves.toBeNull();
    // Aucun appel réseau : la fonction sort sur `POUR_APP` avant le `fetch`.
    await expect(chercherMiseAJour('1.0.0')).resolves.toBeNull();
  });
});
