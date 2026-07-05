/* Dark mode = solo variables CSS: .dark en <html> intercambia el bloque de tokens.
   index.html aplica la clase antes del primer paint leyendo estas mismas claves. */

const KEY = 'theme';

export function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

export function setDark(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem(KEY, dark ? 'dark' : 'light');
}

/** Vuelve a seguir prefers-color-scheme del sistema */
export function clearThemeOverride(): void {
  localStorage.removeItem(KEY);
  const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', prefersDark);
}

export function hasThemeOverride(): boolean {
  return localStorage.getItem(KEY) !== null;
}
