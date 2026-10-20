import { describe, expect, it } from 'vitest';
import { typographierSource } from '../../scripts/typographie.mjs';

const N = ' ';
const F = ' ';

describe('typographierSource', () => {
  it('passe le texte JSX et laisse le code', () => {
    const code = 'export const A = () => <p className="a b">Quoi ? Là : 40 questions</p>;';
    expect(typographierSource(code, 'A.tsx')).toBe(
      `export const A = () => <p className="a b">Quoi${F}? Là${N}: 40${N}questions</p>;`,
    );
  });

  it('passe les chaînes de prose et les morceaux de gabarit', () => {
    const code = "const a = 'Source : le décret'; const b = `Cours suivant : ${x} ? « ok »`;";
    expect(typographierSource(code, 'a.ts')).toBe(
      `const a = 'Source${N}: le décret'; const b = \`Cours suivant${N}: \${x}${F}? «${N}ok${N}»\`;`,
    );
  });

  it('ne lie pas « nombre + mot » dans une chaîne de code', () => {
    expect(typographierSource("const c = '0 auto'; const d = 'x 1 forwards}';", 'a.ts')).toBeNull();
  });

  it('laisse imports, clés, types littéraux, code et gabarits balisés', () => {
    const code =
      "import x from './a ? b';\ntype T = 'a ? b';\nconst o = { 'a ? b': 1 };\n" +
      'const css = css`a ? b`;\nconst r = <code>x ? y</code>;';
    expect(typographierSource(code, 'a.tsx')).toBeNull();
  });

  it('laisse les séparateurs et les motifs de chaîne', () => {
    const code =
      "const t = x.split(' : '); const u = y.join(' ; '); const v = z.replace(' ?', ''); const w = ' : ';" +
      'const m = `${a} : ${b}`;';
    // seul le gabarit, qui suit une expression, est lié
    expect(typographierSource(code, 'a.ts')).toBe(
      "const t = x.split(' : '); const u = y.join(' ; '); const v = z.replace(' ?', ''); const w = ' : ';" +
        `const m = \`\${a}${N}: \${b}\`;`,
    );
  });

  it('ne double pas ce qui est déjà posé et lit &nbsp;', () => {
    expect(typographierSource(`const a = 'Oui${N}: non'; const b = <p>Si&nbsp;: oui</p>;`, 'a.tsx')).toBe(
      `const a = 'Oui${N}: non'; const b = <p>Si${N}: oui</p>;`,
    );
  });

  it('rend null quand il n’y a rien à faire', () => {
    expect(typographierSource('export const a = 1;', 'a.ts')).toBeNull();
  });
});
