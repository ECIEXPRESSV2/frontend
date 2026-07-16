import buildingImageMap from 'virtual:building-images';
import type { Map as MapLibreMap } from 'maplibre-gl';

const LAYER_ID = 'edificios';
const ROOF_LAYER_ID = 'edificios-techo';
const FALLBACK_COLOR = '#3b4252'; // mismo gris plano que ya tenía fill-extrusion-color
// Grosor (metros) de la "tapa" que hace de techo: una segunda fill-extrusion casi plana desde
// (altura - esto) hasta la altura real. Ver nota en applyBuildingTextures sobre por qué hace
// falta una capa aparte para que el techo tenga un color propio.
const ROOF_CAP_THICKNESS = 0.5;

type RGB = [number, number, number];

/**
 * Color promedio de una franja horizontal central-alta de la foto (por debajo del cielo, por
 * encima de pasto/arbustos en primer plano), descartando píxeles muy verdes -- follaje/pasto
 * que se cuela en esa franja y corre el promedio hacia verde/oliva en vez del color real de
 * la fachada.
 */
function sampleWallColor(source: CanvasImageSource, width: number, height: number): RGB {
  const sw = 32;
  const sh = 32;
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [150, 150, 150];

  ctx.drawImage(source, 0, height * 0.3, width, height * 0.3, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);

  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const pr = data[i];
    const pg = data[i + 1];
    const pb = data[i + 2];
    const isFoliage = pg > pr * 1.15 && pg > pb * 1.15;
    if (isFoliage) continue;
    r += pr;
    g += pg;
    b += pb;
    n++;
  }

  if (n === 0) {
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    n = data.length / 4;
  }

  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

/**
 * Color promedio de una franja alta de la foto (altura típica de techo/cornisa en fotos a nivel
 * de piso), descartando follaje Y cielo (píxeles muy azulados y muy claros).
 */
function sampleRoofColor(source: CanvasImageSource, width: number, height: number): RGB {
  const sw = 32;
  const sh = 16;
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [90, 90, 95];

  ctx.drawImage(source, 0, height * 0.08, width, height * 0.14, 0, 0, sw, sh);
  const { data } = ctx.getImageData(0, 0, sw, sh);

  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const pr = data[i];
    const pg = data[i + 1];
    const pb = data[i + 2];
    const isFoliage = pg > pr * 1.15 && pg > pb * 1.15;
    const isSky = pb > pr * 1.1 && pr + pg + pb > 480;
    if (isFoliage || isSky) continue;
    r += pr;
    g += pg;
    b += pb;
    n++;
  }

  if (n === 0) {
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    n = data.length / 4;
  }

  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

/**
 * Color de los edificios 3D del mapa decorativo (capa `edificios`, fill-extrusion): para cada
 * edificio con foto de referencia en public/edificios/ (mismo set que usa el selector de
 * ubicación, ver services/buildingImages.ts), toma el color promedio de pared y de techo de su
 * foto y los aplica como `fill-extrusion-color` PLANO (sin patrón/textura) -- un color sólido no
 * tiene nada que MapLibre pueda escalar con el zoom, así que se ve igual sin importar qué tan
 * cerca o lejos esté el mapa.
 *
 *   - Paredes: capa `edificios` existente, con el color de pared.
 *   - Techo: una SEGUNDA capa (`edificios-techo`), una fill-extrusion casi plana que va de
 *     (altura - ROOF_CAP_THICKNESS) a la altura real, con el color de techo. Una sola
 *     fill-extrusion NO puede pintar el techo distinto de las paredes (el paint se aplica igual
 *     a todas las caras); apilando dos, cada una tiene su propio color, y la "pared" de la capa
 *     del techo es tan delgada que no se nota.
 *
 * Se usa en los 3 mapas 3D del campus (CampusMapSection en la landing, LocationPickerModal y
 * StoreMapModal): en estos dos últimos, la capa `edificios` resalta en verde/rojo el edificio
 * elegido vía feature-state `sel`/`selStore` -- el color de la foto se conserva como fallback
 * dentro de ese mismo `case`, así que la selección se sigue viendo igual que antes.
 */
export async function applyBuildingTextures(map: MapLibreMap): Promise<void> {
  if (!map.getLayer(LAYER_ID)) return;

  const entries = Object.entries(buildingImageMap).filter(([, urls]) => urls.length > 0);
  const wallColors: Record<string, RGB> = {};
  const roofColors: Record<string, RGB> = {};

  await Promise.all(
    entries.map(async ([name, urls]) => {
      try {
        const { data: img } = await map.loadImage(urls[0]);
        const width = 'naturalWidth' in img ? img.naturalWidth : img.width;
        const height = 'naturalHeight' in img ? img.naturalHeight : img.height;

        wallColors[name] = sampleWallColor(img, width, height);
        roofColors[name] = sampleRoofColor(img, width, height);
      } catch {
        // foto rota/no cargó: ese edificio cae en el fallback gris (pared y techo)
      }
    }),
  );

  const names = Object.keys(wallColors);

  const buildColorMatch = (colors: Record<string, RGB>): unknown => {
    if (names.length === 0) return FALLBACK_COLOR;
    // Las expresiones de MapLibre son arrays recursivos heterogéneos (strings, sub-expresiones
    // como ['get', 'name'], etc.) -- unknown[] en vez de (string|number)[] para no chocar con
    // el elemento ['get', 'name'], que es un array, no un string ni un number.
    const expr: unknown[] = ['match', ['get', 'name']];
    for (const name of names) {
      const [r, g, b] = colors[name];
      expr.push(name, `rgb(${r},${g},${b})`);
    }
    expr.push(FALLBACK_COLOR);
    return expr;
  };

  map.setPaintProperty(LAYER_ID, 'fill-extrusion-height', [
    'max',
    0,
    ['-', ['get', 'height'], ROOF_CAP_THICKNESS],
  ]);

  // Conserva el resaltado verde/rojo (sel/selStore) que usan LocationPickerModal/StoreMapModal
  // para marcar el edificio elegido -- cae al color de la foto (en vez del gris plano original)
  // cuando no hay selección. En CampusMapSection, que nunca setea esos feature-state, el `case`
  // siempre resuelve directo al color de la foto.
  const wallColorExpr = [
    'case',
    ['boolean', ['feature-state', 'selStore'], false],
    '#22c55e',
    ['boolean', ['feature-state', 'sel'], false],
    '#e23b3b',
    buildColorMatch(wallColors),
  ];
  map.setPaintProperty(LAYER_ID, 'fill-extrusion-color', wallColorExpr as unknown as string);

  const roofColorValue = buildColorMatch(roofColors) as unknown as string;
  if (!map.getLayer(ROOF_LAYER_ID)) {
    map.addLayer(
      {
        id: ROOF_LAYER_ID,
        type: 'fill-extrusion',
        source: 'campus',
        paint: {
          'fill-extrusion-color': roofColorValue,
          'fill-extrusion-base': ['max', 0, ['-', ['get', 'height'], ROOF_CAP_THICKNESS]],
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-opacity': 0.96,
        },
      },
      'edificios-borde',
    );
  } else {
    map.setPaintProperty(ROOF_LAYER_ID, 'fill-extrusion-color', roofColorValue);
  }
}
