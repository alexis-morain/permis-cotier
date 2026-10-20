// Les trois parcours de la mesure de fluidité. Voir cdp.mjs.
//   node docs/captures-fluidite/mesure.mjs <port> [ralentissement] [étiquette] [safari17]
// `safari17` retire les View Transitions natives, comme Safari 16 et 17.
import { servir, lancer } from './cdp.mjs';

const port = Number(process.argv[2] ?? 4361);
const ralentissement = Number(process.argv[3] ?? 4);
const etiquette = process.argv[4] ?? 'mesure';
const sansTransitionsNatives = process.argv[5] === 'safari17';
const base = `http://127.0.0.1:${port}`;
const serveur = await servir(port);
const resultats = {};

/** Un lien posé puis cliqué : le routeur le suit comme un tap sur un lien de la page. */
const taperLien = (href) =>
  `(()=>{const a=document.createElement('a');a.href=${JSON.stringify(href)};document.body.append(a);a.click();a.remove();return true})()`;
const presente = (texte) => `[...document.querySelectorAll('a,button')].find(e=>e.offsetParent&&e.innerText.includes(${JSON.stringify(texte)}))`;

// 1. Accueil → examen blanc → première question.
{
  const b = await lancer({ ralentissement, sansTransitionsNatives });
  const r = (resultats['1. Accueil → examen → question'] = {});
  r['chargement de l’Accueil'] = await b.mesurer(() => b.aller(`${base}/accueil`), `!!(${presente('Faire un examen blanc')})`, 600);
  r['tap « Faire un examen blanc »'] = await b.mesurer(() => b.clic(presente('Faire un examen blanc')), `!!(${presente('Commencer l’examen')})`);
  r['tap « Commencer l’examen »'] = await b.mesurer(() => b.clic(presente('Commencer l’examen')), `!!document.querySelector('.proposition')`);
  await b.capture(`/tmp/fl/${etiquette}-1.png`);
  b.fin();
}

// 2. Fin d'une série → Accueil (dans l'onglet, puis comme au retour d'un autre onglet).
{
  const b = await lancer({ ralentissement, sansTransitionsNatives });
  const r = (resultats['2. Fin de série → Accueil'] = {});
  await b.aller(`${base}/entrainement/ecluses`);
  await b.attendre(`!!document.querySelector('.proposition')`);
  const suivant = `[...document.querySelectorAll('button')].find(e=>e.offsetParent&&/^Continuer/.test(e.innerText.trim()))`;
  for (let i = 0; i < 18; i++) {
    // la silhouette précède l'îlot : on attend le bouton, qui n'existe qu'une fois hydraté
    await b.attendre(`document.querySelector('.proposition')?.offsetParent && [...document.querySelectorAll('button')].some(e=>/Valider|Continuer/.test(e.innerText))`);
    await b.pause(150);
    await b.evalue(`document.querySelector('.proposition').click()`);
    await b.pause(200);
    await b.evalue(`[...document.querySelectorAll('button')].find(e=>/Valider/.test(e.innerText))?.click()`);
    await b.attendre(`!!(${suivant})`);
    if (i < 17) await b.evalue(`(${suivant}).click()`);
    else {
      r['dernière réponse → bilan'] = await b.mesurer(() => b.evalue(`(${suivant}).click()`), `!!(${presente('Refaire la série')})`);
    }
  }
  r['tap vers l’Accueil (même onglet)'] = await b.mesurer(() => b.evalue(taperLien('/accueil')), `!!(${presente('Faire un examen blanc')})`);
  await b.capture(`/tmp/fl/${etiquette}-2.png`);
  // Un autre onglet termine une leçon, puis celui-ci revient à l'écran : la coquille émet `app:onglet`.
  r['retour d’onglet, une leçon faite ailleurs'] = await b.mesurer(
    () =>
      b.evalue(`(()=>{const k='permis-cotier:progression';const e=JSON.parse(localStorage.getItem(k));
        e.lecons={...e.lecons,'balisage-lateral':{faiteLe:'2026-10-19',bonnes:2,total:2}};
        localStorage.setItem(k,JSON.stringify(e));window.dispatchEvent(new Event('app:onglet'));return true})()`),
    `!!(${presente('Continuer le cours')})`,
    600,
  );
  await b.capture(`/tmp/fl/${etiquette}-2b.png`);
  b.fin();
}

// 3. Cours → thème → leçon → leçon suivante.
{
  const b = await lancer({ ralentissement, sansTransitionsNatives });
  const r = (resultats['3. Cours → leçon → leçon suivante'] = {});
  r['chargement de Cours'] = await b.mesurer(() => b.aller(`${base}/cours`), `!!(${presente('Passer une écluse')})`, 600);
  r['tap sur un thème'] = await b.mesurer(() => b.evalue(taperLien('/cours/ecluses')), `!!(${presente('Approche et attente')})`);
  r['tap sur la leçon 1'] = await b.mesurer(() => b.evalue(taperLien('/cours/ecluses/ecluses-signaux-acces')), `!!(${presente('Tout lire')})`);
  r['tap sur la leçon 2'] = await b.mesurer(() => b.evalue(taperLien('/cours/ecluses/ecluses-approche')), `!!(${presente('Tout lire')})`);
  await b.capture(`/tmp/fl/${etiquette}-3.png`);
  b.fin();
}

serveur.close();
console.log(JSON.stringify(resultats, null, 1));
process.exit(0);
