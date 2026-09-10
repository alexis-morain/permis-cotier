/**
 * La cible du build : le site, ou la coquille iOS.
 *
 * Une seule variable d'environnement, `CIBLE=app`, comme `SITE_URL` pilote
 * déjà le domaine. Elle est figée à la construction par `vite.define` : le
 * navigateur n'a pas de `process`, et un test qui ne définit rien retombe sur
 * le site, qui est le cas normal.
 *
 * Ce que la cible « app » change, et pourquoi :
 *
 * - `build.format` passe en `directory`. Le serveur d'assets de Capacitor, sur
 *   un chemin sans extension, y ajoute `/index.html` ; avec le format `file`
 *   du site le fichier s'appelle `examen.html`, et chaque lien rendrait 404.
 * - PWA coupée : un service worker par-dessus des fichiers déjà locaux, ce
 *   sont deux caches qui se marchent dessus, dont un périmé.
 * - Sitemap coupé, pages `question/` non construites : du pur référencement,
 *   sept mégaoctets et demi que rien dans l'app ne va voir.
 * - Mesure coupée : le traceur est déjà fermé à tout hôte hors
 *   `lepermiscotier.fr`, donc en `capacitor://localhost` il ne compterait
 *   rien. Le garder reviendrait à déclarer un appel réseau tiers en échange de
 *   zéro donnée, et à renoncer au « aucune donnée collectée » de la fiche.
 * - Navigation web masquée : la barre d'onglets native la remplace, et c'est
 *   le signal que la revue Apple regarde en premier.
 */
declare const __POUR_APP__: boolean;

export const POUR_APP: boolean =
  typeof __POUR_APP__ === 'boolean' ? __POUR_APP__ : false;
