export { THEMES, CODES_THEMES, themeParCode, estCodeTheme, cibleTotaleJ1 } from './themes';
import { themeParCode } from './themes';

export function nomDuTheme(code: string): string {
  return themeParCode(code)?.nom ?? code;
}
