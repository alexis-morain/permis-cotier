# permis-cotier

Site de révision au permis plaisance option côtière. Examens blancs au format de
l'épreuve et entraînement par thème, gratuits, sans compte, hors ligne une fois
la page visitée.

Chaque question cite le texte réglementaire dont elle est tirée. La banque est
écrite depuis les articles, jamais reprise chez un éditeur.

**En ligne : https://lepermiscotier.fr**

Un Worker Cloudflare relié à ce dépôt sert le site : un push sur `main`
construit et déploie. `www` redirige vers l'apex en 301, et le sous-domaine de
préversion reste fermé. Une préversion, elle, referme son `robots.txt` toute
seule tant que son hôte finit par `.workers.dev` ou `.pages.dev`.

## Ce que ce site n'est pas

Il n'est ni officiel, ni agréé, ni « conforme ». L'administration ne publie
aucune banque de questions d'État, et personne ne peut prétendre reproduire
celle de l'examen. Le site prépare **au format de l'épreuve** : 40 questions,
1 ou 2 bonnes réponses, 5 erreurs admises, 20 secondes par question.

**Toutes les questions publiées à ce jour sont relues par une seule personne,
Alexis Morain.** Le champ `meta.relu_par` de chaque fichier porte le nom de son
relecteur : `alexis` une fois relue, `claude` tant qu'un lot écrit par le modèle
depuis l'article cité attend sa relecture, et le pied de page du site compte
les deux au moment du build. Une deuxième relecture par un tiers est prévue
avant décembre 2026. En attendant, une erreur est possible : le bouton de
signalement est sur chaque question, et les signalements sont traités dans la
semaine.

Le site n'est pas entièrement statique. Deux fonctions serveur tournent sur
Cloudflare : l'envoi d'un signalement d'erreur, et plus tard le code de
synchronisation de progression. Tout le reste est du HTML généré au build.
Aucun compte, aucune donnée personnelle, aucun cookie.

La fréquentation est comptée par une instance Umami auto-hébergée : pas de
cookie, pas d'identifiant de visiteur, rien qui suive quelqu'un d'un site à
l'autre, et le compte ne se remplit que depuis `lepermiscotier.fr` — ni une
préversion, ni un poste de développement n'y entrent. Chacun peut s'en retirer
depuis les réglages. Les noms d'événements sont dans `src/lib/mesure.ts`.

## Le format de l'épreuve

QCM de 40 questions, 5 erreurs admises, bénéfice de 18 mois. Arrêté du
28 septembre 2007, article 1er § 1.1, modifié par l'arrêté du 22 avril 2022,
en vigueur au 1er juin 2022. L'arrêté fixe le programme et le barème, mais ni la
durée, ni le support, ni le type de question : les 20 secondes par question et
les 1 à 2 bonnes réponses viennent de la description de l'épreuve par les
opérateurs agréés.

Aucune pondération par thème n'est publiée. La répartition utilisée pour le
tirage est une hypothèse de travail, ajustée avec les signalements.

## Démarrer

```bash
npm install
uv venv && uv pip install -r requirements.txt
npm run dev
```

| Commande | Ce qu'elle fait |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | valide la banque puis construit le site |
| `npm test` | tests du moteur (tirage, correction, chrono, progression) |
| `npm run valider` | valide les fichiers YAML de la banque |
| `npm run credits` | régénère `data/CREDITS.md` depuis les fiches de visuels |
| `npm run ecluses` | redessine les signaux d'écluse |
| `npm run carte` | redessine les planches de carte marine |
| `npm run build:pages` | build sans le validateur Python, celui de Cloudflare |
| `.venv/bin/python -m pytest tests -q` | tests du validateur |

## Le cours

`/cours` prend les 105 notions du programme dans un ordre d'apprentissage.
Chaque thème a son cours, `/cours/<thème>`, quatorze en tout, qui dit pourquoi
il compte, ce qu'on saura faire, par quel bout le prendre, ses pièges, et liste
ses leçons ; une leçon par notion, à `/cours/<thème>/<notion>`. Une leçon est un
fichier `data/cours/<notion>.yaml` : accroche, étapes, piège, mémo, sources,
comme une question elle cite ses textes. Une notion sans fichier aurait une
leçon courte, le résumé de sa fiche, jouable mais en `noindex` ; toutes sont
rédigées à ce jour. Chaque leçon se termine par jusqu'à trois questions de la
banque sur la notion ; la progression reste dans le navigateur. Les leçons
écrites par le modèle sans `meta.relu_par` le disent en page : une relecture
humaine est attendue. Les anciennes adresses `/cours/<notion>` redirigent en 301
depuis `public/_redirects`.

## Ajouter une question

L'ordre ne change jamais : lire l'article, écrire la question, relire. Les
banques concurrentes servent à compter les thèmes, jamais à lire des questions
avant d'en écrire.

```bash
# 1. Récupérer la source, une fois par texte
python scripts/sources.py ripam --regles 20-31
python scripts/sources.py legifrance --texte LEGITEXT000006057206 --ref arrete-2007-09-28

# 2. Générer des brouillons dans data/questions/_inbox/
python scripts/generer.py --source data/sources/decret-77-733/regle-26.md \
    --theme feux-marques --n 5

# 3. Relire, corriger, passer le statut à « relu », déplacer dans le dossier du thème
# 4. Valider
npm run valider
```

Une question sans source n'entre pas. Le statut `publie` exige `meta.relu_par`.

## Structure

```
data/questions/<theme>/<id>.yaml   une question par fichier, statut dans le fichier
data/questions/_inbox/             brouillons générés, en attente de relecture
data/cours/<notion>.yaml           une leçon par notion, écrite depuis ses sources
data/sources/<ref>/                extraits d'articles cités (Licence Ouverte 2.0)
data/VERSION                       version de la banque, dans le cache hors ligne
data/CREDITS.md                    crédits des visuels, généré par script
prompts/question.md                gabarit de génération
scripts/                           sources.py, generer.py, valider.py, credits.py
src/lib/                           moteur : thèmes, notions, parcours, cours, schéma, tirage,
                                   session, progression, mesure
src/pages/                         Astro : accueil, cours, thèmes, questions, examen, entraînement
src/components/                    îlot React du quiz
functions/api/                     signalement, puis synchronisation
```

## Visuels

Aucun visuel dont dépend une réponse ne sort d'un générateur d'images. Deux
sources seulement : Wikimedia Commons, avec auteur et licence dans
`data/CREDITS.md`, ou un composant paramétré du site pour les feux de navires.
L'IA ne sert qu'aux scènes décoratives, jamais à ce qui porte la réponse.

## Licences

- Code : [MIT](LICENSE).
- Banque de questions et visuels produits pour le projet :
  [CC BY-SA 4.0](LICENSE-BANQUE).
- Textes réglementaires cités : Licence Ouverte 2.0 (Etalab).
- Visuels repris de Commons : leur licence d'origine, tracée dans
  `data/CREDITS.md`.

Les contributions à la banque sont examinées au cas par cas. Alexis Morain reste
titulaire des droits sur la banque d'origine.
