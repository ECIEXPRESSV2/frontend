# Imágenes de referencia de edificios

Cada subcarpeta corresponde a un edificio del campus. Las imágenes que pongas dentro
se muestran en el selector de ubicación (al crear/editar una tienda), en el panel de
vista previa del edificio.

## Cómo añadir imágenes

1. Entra a la carpeta del edificio (ej: `Bloque A/`, `Cafeteria/`).
   - El nombre de la carpeta se compara con el del mapa ignorando mayúsculas, acentos
     y espacios, así que `Bloque A`, `bloque-a` o `bloquea` funcionan igual.
   - Si el edificio no tiene carpeta todavía, créala con su nombre.
2. Suelta ahí las fotos. Formatos aceptados: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`,
   `.avif`, `.svg`.

## Reglas

- Se muestran **hasta 10 imágenes** por edificio.
- Si pones **más de 10**, se muestran 10 elegidas al azar.
- Con 10 o menos, se muestran todas, ordenadas por nombre de archivo
  (usa `1.jpg`, `2.jpg`, ... para controlar el orden).

## Notas técnicas

- El escaneo lo hace `vite-plugin-building-images` en build y en el dev server.
- En desarrollo, al añadir/quitar archivos la página se recarga sola.
- Los archivos que no sean imágenes (como este `README.md` o los `.gitkeep`) se ignoran.
