import type { APIRoute } from 'astro';
import { questionsPubliees, nomDuTheme } from '../lib/banque';
import { GUIDE } from '../lib/guide';
import { leconsEcrites } from '../lib/lecons';
import { NOTIONS } from '../lib/notions';
import { COURS, cheminCours, leconsDuParcours } from '../lib/parcours';
import type { Entree } from '../lib/recherche';
import { THEMES } from '../lib/themes';

/**
 * L'index de la recherche, écrit une fois au build.
 *
 * Il est servi à part et chargé à la première ouverture de la recherche, pas
 * au chargement des pages : personne ne paie cent kilo-octets pour un écran
 * qu'il n'ouvrira peut-être jamais. Une fois chargé, il tient dans le cache
 * hors ligne comme le reste du site.
 *
 * L'ordre des entrées est celui de leur poids : ce qui sert à réviser d'abord,
 * les questions en dernier. Le classement d'un résultat ne s'y joue pas —
 * `src/lib/recherche.ts` le calcule — mais à score égal, l'ordre de l'index
 * départage, et il vaut mieux qu'il dise quelque chose.
 */

/** Les écrans du site qui ne sont ni du cours ni de la banque. */
const PAGES: readonly Entree[] = [
  {
    genre: 'page',
    titre: 'Examen blanc',
    resume: 'Quarante questions tirées au sort, vingt secondes chacune, cinq erreurs admises.',
    url: '/examen',
    mots: 'test blanc simulation chrono minuteur quarante 40 questions epreuve',
  },
  {
    genre: 'page',
    titre: 'Entraînement par thème',
    resume: 'Des séries courtes, corrigées après chaque réponse, dans le thème de ton choix.',
    url: '/entrainement',
    mots: 'exercice entrainer serie reviser correction immediate',
  },
  {
    genre: 'page',
    titre: 'Le cours, leçon par leçon',
    resume: 'Le programme dans l’ordre où on l’apprend : un cours par thème, une leçon par notion.',
    url: '/cours',
    mots: 'lecons cours parcours apprendre debuter zero',
  },
  {
    genre: 'page',
    titre: 'Les quatorze thèmes',
    resume: 'Le programme de l’épreuve, thème par thème, dans l’ordre de l’arrêté.',
    url: '/themes',
    mots: 'programme matieres sommaire arrete',
  },
  {
    genre: 'page',
    titre: 'Les questions à revoir',
    resume: 'Celles que tu as ratées, reprises tant qu’elles ne sont pas acquises.',
    url: '/revoir',
    mots: 'erreurs ratees revision progression rattrapage',
  },
  {
    genre: 'page',
    titre: 'Guide du permis côtier',
    resume: 'Le prix, l’examen, les limites du titre : les réponses, avec le texte qui les fonde.',
    url: '/guide',
    mots: 'faq questions frequentes',
  },
  {
    genre: 'page',
    titre: 'Réglages',
    resume: 'Effacer ta progression, te retirer du comptage d’audience.',
    url: '/parametres',
    mots: 'parametres options preferences effacer donnees confidentialite',
  },
  {
    genre: 'page',
    titre: 'Qui écrit ces questions',
    resume: 'Comment la banque est écrite, relue, et d’où viennent les sources.',
    url: '/a-propos',
    mots: 'a propos auteur alexis morain methode relecture',
  },
  {
    genre: 'page',
    titre: 'Signaler une erreur',
    resume: 'Une question fausse, un visuel douteux : le dire prend trente secondes.',
    url: '/signaler',
    mots: 'erreur signalement contact bug faute',
  },
  {
    genre: 'page',
    titre: 'Crédits',
    resume: 'Les visuels repris ailleurs, leurs auteurs et leurs licences.',
    url: '/credits',
    mots: 'licences wikimedia commons attribution',
  },
];

export const GET: APIRoute = async () => {
  const ecrites = await leconsEcrites();
  const questions = await questionsPubliees();

  // Une leçon écrite est le meilleur endroit où atterrir : elle explique. Le
  // corps entre dans l'index sans s'afficher, c'est lui qui fait tomber la
  // bonne leçon sur « qui s'écarte » ou « bande large ».
  const lecons: Entree[] = leconsDuParcours()
    .filter((l) => ecrites.has(l.notion.code))
    .map((l) => {
      const source = ecrites.get(l.notion.code)!;
      return {
        genre: 'lecon',
        titre: l.notion.nom,
        contexte: `Leçon ${l.rangDansCours} · ${l.cours.titre}`,
        resume: source.accroche,
        // Le chemin vient du parcours et non d'un gabarit recopié : les leçons
        // ont déjà déménagé une fois, de /cours/<notion> à /cours/<thème>/<notion>.
        url: l.chemin,
        // Le résumé de la notion n'est pas repris ici : il est déjà l'entrée
        // « notion » du même sujet, et l'index se paie au chargement.
        mots: [...source.etapes.map((e) => e.titre), ...source.retenir, source.piege ?? ''].join(' '),
      };
    });

  // La fiche de notion double la leçon sur le nom, exprès : l'une explique,
  // l'autre récapitule et donne ses questions. Les deux se cherchent.
  const notions: Entree[] = NOTIONS.map((n) => ({
    genre: 'notion',
    titre: n.nom,
    contexte: nomDuTheme(n.theme),
    resume: n.resume,
    url: `/notion/${n.code}`,
    mots: n.ancrage,
  }));

  const themes: Entree[] = THEMES.map((t) => ({
    genre: 'theme',
    titre: t.nom,
    contexte: 'Thème du programme',
    resume: t.intitule,
    url: `/theme/${t.code}`,
    mots: t.description,
  }));

  const guide: Entree[] = GUIDE.map((p) => ({
    genre: 'guide',
    titre: p.court,
    contexte: 'Guide',
    resume: p.reponse,
    url: `/guide/${p.slug}`,
    mots: `${p.titre} ${p.question}`,
  }));

  // Un cours par thème. Ce qu'il promet et ce qu'il fait rater se cherchent :
  // « oublier que le sens conventionnel s'inverse » est une vraie requête.
  // Le « pourquoi » et la « méthode » restent dehors, ils parlent de la façon
  // d'apprendre et pollueraient les résultats.
  const cours: Entree[] = COURS.map((c) => ({
    genre: 'cours',
    titre: c.titre,
    contexte: 'Cours du thème',
    resume: c.promesse,
    url: cheminCours(c.code),
    mots: [...c.savoirFaire, ...c.pieges].join(' '),
  }));

  // L'énoncé seul. L'explication et les propositions doubleraient le poids du
  // fichier pour retrouver une question qu'on ne cherche presque jamais par
  // son corrigé.
  const banque: Entree[] = questions.map((q) => ({
    genre: 'question',
    titre: q.enonce,
    contexte: nomDuTheme(q.theme),
    url: `/question/${q.id}`,
  }));

  const index: Entree[] = [...cours, ...lecons, ...notions, ...themes, ...guide, ...PAGES, ...banque];

  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
};
