import type { SectionId } from '../components/home/homeSections';

const STORAGE_KEY = 'eciexpress.activeSection';

/** Sección elegida en la última sesión; 'comida' si no hay nada válido guardado. */
export function getStoredSection(): SectionId {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'tienda' ? 'tienda' : 'comida';
  } catch {
    return 'comida';
  }
}

/**
 * Aplica el tema de la sección a TODA la app y persiste la elección. El atributo
 * data-theme va en <html> (documentElement): así lo heredan todas las páginas, modales
 * y portales, no solo el Home. main.tsx lo aplica al arrancar con la sección guardada;
 * el toggle Comida/Tienda del Home es el único que la cambia.
 */
export function applySectionTheme(section: SectionId): void {
  const root = document.documentElement;
  if (section === 'tienda') {
    root.dataset.theme = 'tienda';
  } else {
    delete root.dataset.theme;
  }
  try {
    localStorage.setItem(STORAGE_KEY, section);
  } catch {
    // Almacenamiento no disponible (p. ej. modo privado): el tema aplica solo a esta pestaña.
  }
}
