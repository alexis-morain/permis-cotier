// Lance le validateur Python quand l'environnement le permet.
//
// En local et en CI, il tourne et casse le build si une question est mauvaise.
// Sur le constructeur Cloudflare, Python et pyyaml ne sont pas garantis : on
// saute plutôt que d'échouer. Le filet reste tendu, à deux endroits : le
// schéma zod des collections refuse toute question mal formée au build Astro,
// et la CI GitHub passe le validateur complet avant que `main` ne bouge.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const candidats = ['.venv/bin/python', 'python3', 'python'];
const python = candidats.find((c) => {
  if (c.startsWith('.') && !existsSync(c)) return false;
  return spawnSync(c, ['-c', 'import yaml'], { stdio: 'ignore' }).status === 0;
});

if (!python) {
  console.log('valider : ni Python ni pyyaml, étape sautée (le schéma zod prend le relais).');
  process.exit(0);
}

const { status } = spawnSync(python, ['scripts/valider.py'], { stdio: 'inherit' });
process.exit(status ?? 1);
