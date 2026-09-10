import { describe, it, expect } from 'vitest';
import { cheminRetour, libelleRetour, lienLecon } from './retour';

describe('le retour vers la série', () => {
  it('accepte les seules adresses de jeu du site', () => {
    expect(cheminRetour('?retour=%2Fentrainement%2Fbalisage')).toBe('/entrainement/balisage');
    expect(cheminRetour('?retour=%2Fentrainement%2Fnotion%2Fbalisage-lateral')).toBe(
      '/entrainement/notion/balisage-lateral',
    );
    expect(cheminRetour('?retour=%2Frevoir')).toBe('/revoir');
    expect(cheminRetour('?retour=%2Fprofil%2Ferreurs')).toBe('/profil/erreurs');
  });

  it('refuse tout le reste, à commencer par ce qui sort du site', () => {
    // Un paramètre d'adresse vient de l'extérieur : il ne devient un lien que
    // s'il est l'une des adresses qu'on a nous-mêmes écrites.
    for (const brut of [
      '',
      '?retour=',
      '?retour=https%3A%2F%2Fexemple.fr',
      '?retour=%2F%2Fexemple.fr',
      '?retour=%2Fcours',
      '?retour=%2Fentrainement%2Fbalisage%3Fx%3D1',
      '?retour=javascript%3Aalert(1)',
    ]) {
      expect(cheminRetour(brut), brut).toBeNull();
    }
  });

  it('dit où l’on revient, dans les mots de l’écran d’où l’on vient', () => {
    expect(libelleRetour('/entrainement/balisage')).toBe('Revenir à ta série');
    expect(libelleRetour('/revoir')).toBe('Revenir à ta série du jour');
    expect(libelleRetour('/profil/erreurs')).toBe('Revenir à mes erreurs');
  });

  it('mène à la leçon d’une question, en gardant le chemin du retour', () => {
    expect(lienLecon('balisage', 'balisage-lateral', '/revoir')).toBe(
      '/cours/balisage/balisage-lateral?retour=%2Frevoir',
    );
  });
});
