import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Escanea `public/edificios/<nombre-del-edificio>/` y expone las imágenes de cada
 * edificio como un módulo virtual (`virtual:building-images`).
 *
 * Idea: quien administra el campus solo tiene que crear una carpeta por edificio
 * dentro de `public/edificios/` y soltar ahí las fotos. No hay que tocar código:
 *   - En build, se escanea la carpeta y el mapa queda incrustado en el bundle.
 *   - En dev, al añadir/quitar archivos se recarga la página automáticamente.
 *
 * Como el navegador NO puede listar directorios en runtime (es un front estático),
 * este escaneo en tiempo de build/dev es la forma de que "lo que se sube aparezca".
 */

const VIRTUAL_ID = 'virtual:building-images';
const RESOLVED_ID = '\0' + VIRTUAL_ID;
const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|svg)$/i;
const FOLDER = 'edificios';

function scan(publicDir: string): Record<string, string[]> {
  const root = path.join(publicDir, FOLDER);
  const map: Record<string, string[]> = {};
  if (!fs.existsSync(root)) return map;

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const dir = path.join(root, entry.name);
    const files = fs
      .readdirSync(dir)
      .filter((f) => IMAGE_RE.test(f))
      // orden natural: 1.jpg, 2.jpg, ..., 10.jpg (no 1, 10, 2)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    if (files.length === 0) continue;

    map[entry.name] = files.map(
      (f) => `/${FOLDER}/${encodeURIComponent(entry.name)}/${encodeURIComponent(f)}`,
    );
  }

  return map;
}

export default function buildingImages(): Plugin {
  let publicDir = '';

  return {
    name: 'building-images',

    configResolved(config) {
      publicDir = config.publicDir;
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },

    load(id) {
      if (id === RESOLVED_ID) {
        return `export default ${JSON.stringify(scan(publicDir))};`;
      }
      return null;
    },

    configureServer(server) {
      const root = path.join(publicDir, FOLDER);
      server.watcher.add(root);

      const onChange = (file: string) => {
        // solo nos interesan cambios dentro de public/edificios
        if (!file.startsWith(root)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };

      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
      server.watcher.on('addDir', onChange);
      server.watcher.on('unlinkDir', onChange);
    },
  };
}
