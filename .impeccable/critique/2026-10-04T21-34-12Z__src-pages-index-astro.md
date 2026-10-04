---
target: accueil (remesure après fusion)
total_score: 25
max_score: 36
na_heuristics: 7
p0_count: 0
p1_count: 2
target_identity: "file:/Users/alex-pack/Developer/permis-cotier-accueil/src/pages/index.astro"
target_fingerprint: "sha256:fc025a494feb08e3a896eef464df45feb64c30ae6a718f34488511f04af8f3de"
target_path: /Users/alex-pack/Developer/permis-cotier-accueil/src/pages/index.astro
timestamp: 2026-10-04T21-34-12Z
slug: src-pages-index-astro
---
# Critique impeccable, 4 octobre 2026 (remesure après fusion) : l’accueil

Method: dual-agent (A: builder, revue de design · B: routine, détecteur). Worktree `permis-cotier-accueil` sur `main` `32660ae` (lots 1 à 6 fusionnés), `astro preview` du build sur `localhost:4341`, service worker désinscrit, 1280×800 et 390×844, clair et sombre. Cible : `src/pages/index.astro`. Run précédent : 24/36, trois P1.

**Réserve de méthode.** Les quatre évaluateurs (accueil et fiche, A et B) partageaient la même origine, donc le même `localStorage` : un état semé par l’un est apparu chez l’autre. Chaque constat de A a été relu dans le DOM juste après rechargement ; B n’a pas pu prouver l’état « qui revient », ce qui ne change rien à son résultat (un seul constat, identique dans tous les états). À l’avenir : un évaluateur par origine, ou des passes en série.

## Synthèse

**25/36** (heuristique 7 n/a), contre 24/36. Deux P1 du 4 octobre sont levés par les correctifs du lot 2 (« sans compte » en tête de la promesse, « test gratuit » dit comme le même examen) ; le troisième tient : **la bande d’ouverture ignore qui revient**. Un P1 neuf, voisin : **à la veille de l’épreuve, la page conseille deux examens blancs ce soir (en 14,4 px, à 3 800 px) et pousse une leçon en jaune.** Les deux se traitent par la bande adaptée, décidée au grill.

Le détecteur et la revue ne se recoupent sur rien : le seul constat mécanique est la ligne de flottaison (`side-tab`, faux positif accepté, ignoré en statique par `.impeccable/config.json`), les constats de la revue sont d’usage.

## Scan déterministe (Assessment B)

# Assessment B, accueil (detecteur + navigateur)

## Scan statique
- `impeccable detect --json src/pages/index.astro` : `[]`, code 0.
- `impeccable detect --json src/components/accueil-site.ts` : `[]`, code 0.
- Aucune regle, aucune ligne. `side-tab` ignore volontairement sur index.astro (config), donc le 0 ne prouve rien sur lui.

## Navigateur (onglet tab-1, SW desinscrit + caches vides, mutation DOM/script OK, live-server port 8400)
Un seul constat, identique dans les 4 passes : `side-tab`, `border-bottom: 6px`, couleur oklch(84% 0.19 80.46), element `SECTION.ouverture` (la bande d'ouverture).
- 1280x800, stockage vide : 1 x side-tab (sur ouverture). Lecture console faite a partir du tampon cumule, le repere de cette passe n'a pas ete pose (premier bloc du tampon).
- 390x844, stockage vide : 1 x side-tab (apres le repere MARK-390-vide).
- 390x844, candidat recale : 1 x side-tab (apres MARK-390-recale).
- 1280x800, candidat recale : 1 x side-tab (apres MARK-1280-recale).
Aucun autre constat, aucune erreur console.

## Faux positif
- `side-tab` sur `section.ouverture` : bordure basse de 6 px (pas un liseré lateral) sur une bande pleine largeur ; la regle le classe en side-tab par la seule epaisseur. Voulu par le projet (ligne de flottaison, ignore dans .impeccable/config.json pour le scan statique) ; le detecteur navigateur, lui, ne lit pas cette config, d'ou son retour.

## Etapes ratees / reserves
- L'etat "candidat qui revient" n'est pas prouve : j'ai ecrit un etat valide (version 1, un examen 30/40 reussi:false, la veille), mais apres rechargement le localStorage contenait un autre etat (profil "Camille", 8 questions x 5 themes, examens 28/09 reussi + 02/10 recale, dateExamen 2026-10-24, activite sur 8 jours). Je ne l'ai pas ecrit : un script de la page, un seed de dev ou une autre session sur cette origine l'a pose. Consequence : la passe "stockage vide" n'etait peut-etre pas vide non plus (je n'ai pas lu le stockage avant chacune), et le texte de `section.ouverture` etait le texte par defaut ("Revise le permis cotier au format de l'epreuve...") dans les deux etats : je n'ai pas vu de bande adaptee a qui revient. A verifier : d'ou vient ce seed, et ou l'adaptation s'affiche.
- Le filtre `pattern` de read_console_messages a rendu "No console logs" une fois (tampon vide apres navigation) ; les constats ci-dessus viennent de la lecture non filtree du tampon cumule.
- `live-server stop` : "Stopped live server on port 8400" ; il a ajoute un message "config_missing / could not remove live script tag" (pas de .impeccable/live/config.json, rien a retirer). Port 8400 ferme (curl muet, PID 8233 absent). `git status --short` vide : aucun fichier du depot modifie.
- Nettoyage : localStorage vide (length 0), resize_window remis en desktop. Onglet tab-1 laisse ouvert.

## Revue de design (Assessment A)

# Assessment A : revue de design de l'accueil

Cible : `src/pages/index.astro`, `src/components/accueil-site.ts` et `src/lib/profil.ts` (worktree `impeccable-accueil`, au niveau de `main` `32660ae`, rien de modifié). J'ai regardé le build servi sur `localhost:4341`, après désinscription du service worker, à 1280×800 et 390×844, en clair et en sombre. Le détecteur n'a pas tourné.

**Comment les états ont été semés.** Je les ai écrits directement dans `localStorage`, au schéma de `progression.ts`, sans jouer de vraie partie. Quatre états : nouveau venu (stockage vide) ; recalé 32 sur 40 avec questionnaire rempli ; reçu 37 sur 40 avec 12 leçons faites et l'examen le lendemain ; 4 leçons faites sans examen.

**Une réserve.** Une autre session écrivait dans le même `localStorage` pendant ma revue : un état « Camille, 30 sur 40, recalé, examen le 25/10 » est apparu sans que je l'aie posé. Chaque constat ci-dessous a donc été relu dans le DOM juste après le rechargement. En partant, je n'ai pas vidé le stockage : ce qu'il contenait n'était plus mon état.

## Verdict de spécificité

**L'identité est faite pour ce produit. La structure est celle de n'importe quelle page d'accueil.**

Ce qui ne pourrait servir à personne d'autre :
- la bande marine et sa ligne de flottaison jaune de 6 px ;
- les boutons à bord plein ;
- la question montrée en vrai (`barre-route-0029`, son visuel de rencontre étrave contre étrave, ses deux bonnes réponses, l'étiquette jaune « Source » devant « RIPAM, règle 14 a) ») ;
- des comptes lus au build (622, 105, 14) et non écrits à la main ;
- une voix qui dit ce que le site n'est pas.

Ce qui est interchangeable :
- l'enchaînement « héros en deux colonnes avec panneau de chiffres géants », puis « comment ça marche en trois colonnes », puis « à quoi ça ressemble », puis « liste de tout », puis FAQ, puis « qui sommes-nous ». C'est le gabarit de toute page de présentation de SaaS.
- Le panneau « 622 / 105 » en display 51 px est le motif du chiffre-héros. Les nombres sont vrais, mais le geste est générique.
- Les trois colonnes de `.trois` (titre, pastille, paragraphe, chacune pareille) frôlent la « grille de cartes identiques » que DESIGN.md refuse. Les filets à la place des cadres ne changent pas la structure.

L'occasion manquée la plus nette : le produit sait des choses que les autres ignorent (dernier examen, date de l'épreuve, erreurs à revoir, raison de passer le permis), et la bande d'ouverture n'en montre rien.

## Score de santé (heuristiques de Nielsen)

| # | Heuristique | Note | Constat clé |
|---|---|---|---|
| 1 | Visibilité de l'état du système | 2 | L'état du candidat existe mais il est enterré : `[data-reprise]` est à 2 100 px sur ordinateur, à 4 000 px sur téléphone, en 15,2 px. La bande ne change que le libellé du bouton jaune. |
| 2 | Correspondance avec le monde réel | 3 | Tutoiement, phrases courtes, format de l'épreuve dit en clair. Accrocs : « Indice 37 sur 100, tu démarres » après un 32 sur 40 ; « région B », « RIPAM », « division 240 » jamais expliqués sur la page. |
| 3 | Contrôle et liberté | 3 | Rien ne piège. La date s'efface (« C'est passé. Efface la date au-dessus »), tout se relit ou s'efface depuis la fiche. |
| 4 | Cohérence et standards | 3 | Le système visuel tient, en clair comme en sombre. Écarts : en sombre, la bande `rgb(10,23,48)` a exactement le fond de la page, et la signature « bande marine » disparaît ; le pied de page répète presque mot pour mot « Ce que ce site est ». |
| 5 | Prévention des erreurs | 3 | Une seule saisie, un `input type=date` natif, une date passée traitée en clair. Peu de surface d'erreur. |
| 6 | Reconnaissance plutôt que rappel | 3 | Les libellés sont visibles et la navigation est en mots. Mais le conseil de la veille (« Fais deux examens blancs ce soir ») est à quatre écrans du bouton qui devrait l'appliquer : il faut s'en souvenir en remontant. |
| 7 | Flexibilité et efficacité | n/a | Surface Persuade : pas de parcours d'expert attendu sur l'accueil. La touche `/` de la recherche existe, sans plus. |
| 8 | Esthétique et minimalisme | 2 | 5 400 px sur ordinateur, 8 900 px sur téléphone (dix écrans et demi), six sections. Doublons : « sans compte » trois fois en haut, la section `.quoi` et son pied de page, la liste des quatorze cours qui refait `/cours`. |
| 9 | Diagnostic et récupération des erreurs | 3 | Recalé, la page dit le score, le nombre de questions à revoir (avec lien) et la raison de départ. C'est juste dans le fond, trop discret dans la forme. |
| 10 | Aide et documentation | 3 | Le guide en cinq questions sourcées, « Comment ces questions sont écrites », la fiche. Rien de contextuel près de l'indice. |
| **Total** | | **25/36** | **69 % : Acceptable, à un point de Bon** |

Heuristique notée n/a : 7. Maximum applicable : 36.

## Charge cognitive

Trois manquements sur huit à la check-list : **charge modérée**.

- **Choix minimaux : raté.** Au premier écran, six options à la décision : « Commencer le cours », « Passer un examen blanc », « le test gratuit du permis côtier » (qui annonce être le même examen), « Entraîne-toi thème par thème », « Comment ces questions sont écrites », plus la recherche. S'y ajoutent les six entrées de navigation. Le lien vers le test est un doublon assumé pour le référencement, mais il coûte une décision au candidat.
- **Hiérarchie visuelle : ratée pour qui revient.** Ce qu'il vient chercher (dernier examen, date, erreurs) est en corps 15,2 px, sans titre, sous un chapô sur la vie privée. La chose la plus forte de son écran reste « Révise le permis côtier au format de l'épreuve. », qu'il a déjà lue.
- **Dévoilement progressif : raté.** Toute la carte du site est déroulée sur l'accueil : les 14 cours avec leur promesse, les 5 questions du guide, le manifeste en trois paragraphes.
- Tenus : focus unique pour le nouveau venu (un bouton jaune), regroupement (filets, colonnes), une chose à la fois, aucun pont de mémoire pour le nouveau venu, blocs de quatre au plus.

## Parcours émotionnel

- **Nouveau venu.** La promesse est nette, le format est dit dès le chapô (« quarante questions, vingt secondes chacune, cinq erreurs admises »). Le **pic**, c'est la question montrée : un vrai visuel, deux bonnes réponses nommées en toutes lettres, l'article en bas. C'est le moment le plus convaincant de la page. Ensuite vient un **creux** : les quatorze cours, cinq questions de guide et trois paragraphes de manifeste. La **fin** est honnête : « 512 des 622 questions sont relues par Alexis Morain ». Elle rassure, mais sur un ton de notice.
- **Recalé qui revient.** Il arrive sur la même bande que le premier jour, avec « Commencer le cours » en jaune, comme s'il n'avait rien fait. Son « 32 sur 40, recalé » et la phrase « Tu passes ce permis pour louer un bateau cet été, sans demander à personne. » existent, et c'est le meilleur texte de la page. Mais il faut descendre de 2 100 px (4 000 px sur téléphone) pour les trouver, en petit. Juste à côté, « Indice 37 sur 100, tu démarres » lui retire ce que la raison venait de lui donner. Le moment de réassurance est écrit, mais placé là où il ne sert pas.
- **Reçu qui revient.** Rien ne marque le reçu à l'accueil, et c'est défendable : le pavillon Q est sur l'écran de résultat. Mais la ligne dit « Léa, indice 43 sur 100, en route » juste sous « 37 sur 40, reçu ». Le chiffre dément le résultat.
- **Quelques leçons.** La bande s'adapte bien : « 4 leçons faites sur 105. » puis « Reprendre : Eaux saines ». C'est le seul état où l'ouverture fait son travail. Plus bas : « Indice 0 sur 100, tu démarres », après quatre leçons et douze questions, alors que `PALIERS.demarre` promet « Une leçon ou une série de questions, et il bouge ».

## Points forts

1. **La question montrée sert de preuve.** Une question réelle remplace tout témoignage : son visuel, ses propositions, la mention « bonne réponse » en toutes lettres (WCAG 1.4.1 respecté), l'explication et l'étiquette jaune « Source » sur un filet. La règle des deux bonnes réponses s'y montre sans être dite. C'est le positionnement (« aucun concurrent ne trace ses questions à l'article ») rendu visible en un bloc.
2. **La voix.** « Rien n'oblige à les prendre dans cet ordre, mais c'est dans cet ordre qu'ils se répondent », « la durée n'est pas dans l'arrêté, elle vient des opérateurs agréés », « Il n'est ni officiel, ni agréé ». Le site dit ce qu'il sait et ce qu'il ne sait pas. Aucune accroche marketing.
3. **Le système visuel tient d'un bout à l'autre.** Mesures en sombre : contrastes de 8,9:1 à 17,8:1. Anneau de focus jaune sur la bande, visible au clavier. Liens de navigation à 44 px de haut sur téléphone. Aucune page plus large que l'écran à 390 px. Le chapô à 18,4 px se lit bien sur la bande.

## Problèmes prioritaires

**[P1] La bande d'ouverture ignore qui revient.**
- *Quoi.* Recalé, reçu ou à la veille de l'épreuve, le candidat voit le même `h1`, le même chapô et le même panneau « 622 / 105 ». Seul le bouton jaune change, et seulement si des leçons sont faites : le recalé qui n'a fait que des examens garde « Commencer le cours ». Son état (`.reprendre`) et sa date (`[data-date-examen]`) sont en quatrième section, à 2 100 px sur ordinateur et à 4 000 px sur téléphone.
- *Pourquoi.* Le panneau de chiffres sert une fois, au premier passage ; après, il occupe la meilleure place de l'écran pour rien. Le candidat qui revient est celui qui a le plus de valeur, et il ne voit pas qu'on le reconnaît.
- *Correctif.* Quand `charger()` rend un état non vide, le panneau `.ouverture__cote` cède la place à l'état du candidat : la ligne du dernier examen, le compte à rebours, les N questions à revoir, et la raison quand le dernier examen est recalé. Le titre peut rester (référencement), mais le chapô se raccourcit pour qui revient. `.reprendre` ne garde que la phrase sur la vie privée et le champ de date, ou le champ remonte dans le panneau quand aucune date n'est posée.
- *Commande.* `/impeccable layout`, puis `/impeccable onboard` pour les états vides et pleins.

**[P1] À la veille de l'épreuve, la page conseille une chose et en pousse une autre.**
- *Quoi.* Examen demain : `compteARebours` écrit « Demain. Fais deux examens blancs ce soir. » en 14,4 px gris, à 3 800 px sur téléphone. Au même moment, le bouton jaune de la bande dit « Reprendre : Veille et vitesse de sécurité », une leçon, et « Passer un examen blanc » reste le bouton blanc.
- *Pourquoi.* La seule consigne utile ce soir-là est invisible, et le bouton principal la contredit. Le bon geste est relégué au second rang par la page elle-même.
- *Correctif.* L'action principale se calcule depuis l'état. À trois jours ou moins de l'épreuve, « Passer un examen blanc » devient le bouton jaune et la leçon passe en secondaire. Après un examen recalé, le principal devient « Revoir mes 8 erreurs » vers `/revoir`. Le compte à rebours monte dans la bande, au-dessus des boutons, à la place de « 12 leçons faites sur 105. ».
- *Commande.* `/impeccable clarify`.

**[P2] L'indice de préparation, affiché seul, démoralise et contredit le reste.**
- *Quoi.* Trois constats : « 0 sur 100, tu démarres » après 4 leçons et 12 questions ; « 37 sur 100, tu démarres » après 32 sur 40 ; « 43 sur 100, en route » juste sous « 37 sur 40, reçu ». La part « retenu » exige deux jours et la part « vu » se divise par 622 : le nombre ne bouge pas aux premières séances, contrairement à ce que dit `PALIERS.demarre`. L'accueil le montre sans aucune explication.
- *Pourquoi.* Le chiffre arrive juste après le résultat et le désavoue. Pour un candidat qui révise seul, c'est une raison de fermer l'onglet.
- *Correctif.* Sur l'accueil, montrer ce qui se lit d'un coup d'œil : le dernier examen, les erreurs à revoir, l'objectif du jour. Garder l'indice pour la fiche, où ses trois parts sont expliquées, ou ne l'afficher qu'après un premier examen complet. Revoir la phrase de `PALIERS.demarre`, qui promet un mouvement que le calcul ne donne pas. Le calcul lui-même touche `profil.ts` et la fiche : c'est une décision produit, à trancher par Alexis.
- *Commande.* `/impeccable clarify`.

**[P2] La page est trop longue et se répète.**
- *Quoi.* Dix écrans et demi sur téléphone. « Sans compte » apparaît trois fois avant la deuxième section (chapô, `h2` de `.reprendre`, chapô de `.reprendre`). La section `.quoi` est reprise presque mot pour mot par le pied de page (« Site de révision indépendant… il ne délivre aucun titre »). La liste des quatorze cours (`.cours`, 2 113 px sur téléphone) refait `/cours`.
- *Pourquoi.* Le pic de la page (la question montrée) est noyé entre un haut chargé et une queue qui ressemble à une notice. Sur téléphone, personne n'atteint le guide.
- *Correctif.* Fondre `.quoi` dans le pied de page, qui le dit déjà. Réduire `.cours` aux noms de cours, sur deux colonnes même sur téléphone, ou à un lien « Les quatorze cours ». Ramener le chapô de `.reprendre` à une phrase posée au-dessus du champ de date.
- *Commande.* `/impeccable distill`.

**[P2] La question montrée est mal composée sur téléphone, et une typographie fautive s'y glisse.**
- *Quoi.* À 390 px, la mention « bonne réponse », poussée à droite en `white-space: nowrap`, prend environ 110 px : « L'autre navire vient sur tribord de son côté. » se casse sur quatre lignes, un mot ou deux par ligne. À 1280 px, l'énoncé finit par un « ? » seul sur sa ligne, parce que l'espace qui le précède est une espace ordinaire (U+0020). Les cinq questions du guide ont la même espace ordinaire avant leur « ? ».
- *Pourquoi.* C'est le bloc qui doit prouver le soin du site, et c'est là que la mise en page casse.
- *Correctif.* Sous 30 rem, poser « bonne réponse » sous le texte de la proposition, pas à côté. Insérer une espace fine insécable avant « ? ! ; : » au rendu des textes de la banque et du guide, par un filtre unique.
- *Commandes.* `/impeccable adapt` et `/impeccable typeset`.

## Signaux d'alerte par persona

**Inès, projet : candidate qui révise sur son téléphone la veille de l'épreuve.** Elle a posé sa date, a fait 12 leçons et vient d'être reçue à un examen blanc. Le soir, dans le train :
- Premier écran : « Révise le permis côtier au format de l'épreuve. », puis « 12 leçons faites sur 105. » et un gros bouton jaune « Reprendre : Veille et vitesse de sécurité ». Rien ne dit « demain ».
- « Demain. Fais deux examens blancs ce soir. » est à 3 800 px, en 14,4 px gris, sous un paragraphe sur la vie privée. Elle ne le verra pas.
- Si elle descend quand même : « indice 43 sur 100, en route » la veille de l'épreuve, juste après un reçu. Risque d'angoisse inutile.
- Ses « 14 questions à revoir » sont un lien en ligne, au milieu d'une phrase de 15,2 px, pas un bouton.

**Casey (téléphone, distrait).**
- La navigation défile à l'horizontale et « Programm… » est coupé : « Guide » et « Ta fiche », l'entrée de qui revient, sont hors champ, sans indice qu'on peut faire défiler.
- Le champ de date, seul geste utile, est à 4 160 px.
- Les deux boutons de la bande sont au milieu de l'écran (470 à 580 px), donc atteignables ; c'est bien.

**Jordan (première fois).**
- Les deux boutons sont clairs, mais « le test gratuit du permis côtier » se présente comme « le même » que l'examen blanc : Jordan se demandera lequel prendre.
- L'invitation au questionnaire de départ (« Première fois ici ? Dis en trente secondes pourquoi tu passes le permis ») parle exactement à Jordan, mais elle est à 4 000 px sur téléphone, en 15,2 px, sans bouton. En pratique, il ne la trouve pas.
- « Le balisage en région B », « RIPAM », « division 240 » ne sont expliqués nulle part sur la page.

## Observations mineures

- « le même, en dix minutes » : quarante questions à vingt secondes font 13 min 20 au plus. Un site qui cite ses articles ne devrait pas arrondir à son avantage.
- La section `.quoi` dit « On lit l'article, on écrit la question, on relit. ». Le pied de page, plus honnête, précise que 110 questions ne sont relues que par le modèle. Les deux phrases devraient se rejoindre.
- `.reprendre` sur ordinateur : l'état en 15,2 px, puis une colonne vide d'environ 450 px, puis le cadre de la date à droite. La composition a l'air inachevée.
- En sombre, la bande a exactement le fond de la page (`rgb(10,23,48)`) : seule la ligne jaune la délimite, et le parti de DESIGN.md (une bande marine pleine largeur) disparaît.
- « Ta fiche » prend une majuscule en milieu de phrase dans `.reprise` (« … à revoir. Ta fiche. »), alors que le chapô écrit « ta fiche » : un lien sans phrase autour.
- Le panneau « 622 / 105 » ne mène nulle part ; « 622 » pourrait mener à `/themes`.

## Questions provocantes

- Et si, dès la deuxième visite, la bande d'ouverture n'était plus une page de présentation mais un tableau de bord d'une ligne : « Examen dans 1 jour. Dernier blanc : 37 sur 40, reçu. [Passer un examen blanc] » ?
- Un nombre sur 100 sert-il un candidat qui révise seul, alors que l'épreuve se juge en « cinq erreurs au plus » ? Pourquoi ne pas parler la langue du barème : « tes trois derniers blancs : 4, 7 et 3 erreurs » ?
- La raison de passer le permis est le texte le plus fort de la page. Pourquoi est-elle en 15,2 px, à quatre écrans du haut, le jour exact où elle doit servir ?
- Qu'est-ce que l'accueil perdrait vraiment sans la liste des quatorze cours ni le manifeste, puisque le pied de page et `/cours` les portent déjà ?
- La question montrée est le meilleur argument du site. Et si on pouvait y répondre, au lieu de la lire corrigée d'avance ?
