// Helpers de imágenes de tienda para SUBIDA (previsualización + compresión en el navegador).
//
// La URL pública de LECTURA del logo y el banner ya NO se reconstruye por convención: el backend
// la persiste en `store.imageUrl` y `store.bannerUrl` (contenedor único `stores`), así que los
// componentes leen esas columnas directamente. Aquí solo quedan utilidades para preparar el
// archivo antes de mandarlo al backend, que es quien tiene permiso de ESCRITURA en el Blob.

/** Lee un archivo de imagen como data URL (base64) para previsualizarlo antes de subirlo. */
export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });

/**
 * Redimensiona (máx. `maxDimension` px por lado) y recomprime la imagen a WebP EN EL NAVEGADOR,
 * antes de subirla. Reduce mucho el peso (una foto de cámara de 5-8 MB baja a ~300-600 KB) sin que
 * el usuario deba preocuparse por el tamaño, preserva la transparencia (útil para logos) y acelera
 * la carga de las páginas públicas. Si el navegador no puede procesarla, devuelve `null` y el
 * llamador usa el archivo original.
 */
export async function compressImageToWebp(
  file: File,
  maxDimension = 1600,
  quality = 0.85,
): Promise<File | null> {
  try {
    const dataUrl = await fileToDataUrl(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se pudo decodificar la imagen'));
      image.src = dataUrl;
    });

    const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality),
    );
    // Navegador sin soporte de codificación WebP en canvas → dejar que el llamador use el original.
    if (!blob || blob.type !== 'image/webp') return null;

    const name = `${file.name.replace(/\.[^.]+$/, '')}.webp`;
    return new File([blob], name, { type: 'image/webp' });
  } catch {
    return null;
  }
}
