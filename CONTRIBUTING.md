# Contribuer à permis-cotier

Une erreur dans une question, une explication confuse, un moyen mnémotechnique
qui aide : tout est bienvenu. Le plus simple est le bouton « Signaler » sous
chaque question du site. Pour proposer un changement directement, ouvre une PR.

## Les règles de la banque

1. **Une affirmation, une source.** Chaque question cite le texte réglementaire
   dont elle découle (arrêté, division, règlement, avec l'article). Une question
   sans source n'entre pas. Les fiches de `data/sources/` résument ces textes.
2. **La relecture est humaine.** Alexis relit chaque question contre sa source
   avant de la publier. N'écris pas `relu_par: alexis` : la CI le refuse sur une
   PR extérieure.
3. **Pas de visuel porteur de réponse généré par IA.** Les visuels viennent de
   Wikimedia Commons (licence tracée dans `data/CREDITS.md`) ou sont dessinés
   par script depuis leur description (`scripts/feux.py`, `scripts/balisage.py`…).
4. **Licence.** La banque et ses visuels sont sous CC BY-SA 4.0
   (`LICENSE-BANQUE`), le code sous MIT. Ouvrir une PR vaut accord pour publier
   ta contribution sous ces licences.

## Vérifier avant d'envoyer

```bash
scripts/check.sh --rapide   # banque et tests, une minute
scripts/check.sh            # tout ce que fait la CI
```

Si tu modifies un cours, un dessin ou une fiche de révision, les fichiers qui
en dérivent (PDF des fiches, SVG, `CREDITS.md`) n'ont pas à être regénérés à la
main : `scripts/regenerer.sh` le fait, et un bot le fait sur la PR.

## Ce qui se passe sur ta PR

- **La CI** vérifie la banque, les visuels, le build du site et de l'app.
- **autofix.ci** pousse un commit dans ta PR si des fichiers dérivés sont
  périmés (laisse la case « Allow edits by maintainers » cochée).
- **Un tri automatique** pose des labels (zone touchée, taille, `à-relire`).
- **Une revue IA** (Claude, CodeRabbit) peut être demandée par Alexis. Ses
  remarques sont des pistes, la décision reste à Alexis.

Sans réponse de ta part 30 jours après une demande de modification (label
`attente-auteur`), la PR est relancée, puis fermée 14 jours plus tard. Elle se
rouvre à tout moment.
