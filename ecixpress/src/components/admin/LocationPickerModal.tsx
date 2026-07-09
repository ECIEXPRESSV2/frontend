import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { X, MapPin, Check, Loader2, Building2, ChevronUp, ChevronDown } from 'lucide-react';
import GalleryCarousel from '../store/GalleryCarousel';
import { getBuildingImages } from '../../services/buildingImages';

type CampusGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
};

type CampusFeature = {
  geometry: CampusGeometry;
  properties: {
    name?: string;
    height?: number;
  };
};

type CampusGeoJson = {
  features: CampusFeature[];
};

interface Props {
  open: boolean;
  initial?: string;
  onClose: () => void;
  onSelect: (location: string) => void;
}

function getCentroid(geometry: CampusGeometry): [number, number] {
  const ring = geometry.type === 'Polygon'
    ? geometry.coordinates[0]
    : geometry.coordinates[0][0];

  let x = 0;
  let y = 0;

  (ring as number[][]).forEach(([lng, lat]) => {
    x += lng;
    y += lat;
  });

  return [x / ring.length, y / ring.length];
}

function pixelsPerMeter(map: maplibregl.Map, lat: number) {
  const zoom = map.getZoom();

  const metersPerPixel =
    (156543.03392 * Math.cos((lat * Math.PI) / 180)) /
    Math.pow(2, zoom);

  return 1 / metersPerPixel;
}

function createBuildingHoverPin(map: maplibregl.Map) {
  const el = document.createElement('div');
  const body = document.createElement('div');
  const label = document.createElement('div');
  const tip = document.createElement('div');
  let activeBuilding: { lat: number; height: number } | null = null;

  el.className = 'building-pin building-pin--hidden';
  body.className = 'building-pin-body';
  label.className = 'building-pin-label';
  tip.className = 'building-pin-tip';
  body.append(label, tip);
  el.append(body);

  const marker = new maplibregl.Marker({
    element: el,
    anchor: 'bottom',
  })
    .setLngLat(map.getCenter())
    .addTo(map);

  function updateOffsets() {
    const extraPadding = 24;

    if (!activeBuilding) return;

    const ppm = pixelsPerMeter(map, activeBuilding.lat);

    marker.setOffset([
      0,
      -(activeBuilding.height * ppm + extraPadding),
    ]);
  }

  function show(feature: CampusFeature) {
    const name = feature.properties.name;
    if (!name) return;

    const [lng, lat] = getCentroid(feature.geometry);
    const height = Number(feature.properties.height ?? 0);

    activeBuilding = {
      lat,
      height: Number.isFinite(height) ? height : 0,
    };

    label.textContent = name;
    marker.setLngLat([lng, lat]);
    updateOffsets();
    el.classList.remove('building-pin--hidden');
  }

  function hide() {
    activeBuilding = null;
    el.classList.add('building-pin--hidden');
  }

  map.on('zoom', updateOffsets);

  return {
    show,
    hide,
    remove: () => {
      map.off('zoom', updateOffsets);
      marker.remove();
    },
  };
}

/**
 * Selector de ubicación: mapa 3D del campus. Al hacer click en un edificio se
 * selecciona (se resalta en rojo) y, al confirmar, se devuelve su nombre como
 * valor de "ubicación".
 *
 * Mapa inicial: luego se enriquecerá con indicadores de las tiendas existentes y
 * texturas en los edificios; la lógica de selección se mantiene.
 */
const LocationPickerModal: React.FC<Props> = ({ open, initial, onClose, onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const selectedIdRef = useRef<string | number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [panelMin, setPanelMin] = useState(false); // panel de vista previa minimizado
  const [loading, setLoading] = useState(true);

  // Cierra el panel y quita el resaltado (rojo) del edificio.
  const closePanel = () => {
    const map = mapRef.current;
    if (map && selectedIdRef.current !== null) {
      map.setFeatureState({ source: 'campus', id: selectedIdRef.current }, { sel: false });
    }
    selectedIdRef.current = null;
    setSelected(null);
    setPanelMin(false);
  };

  useEffect(() => {
    if (!open || !containerRef.current) return;
    setSelected(initial ?? null);
    setPanelMin(false);
    setLoading(true);
    selectedIdRef.current = null;

    const el = containerRef.current;
    // El estilo y los datos viven en /public — edítalos sin tocar este componente.
    const map = new maplibregl.Map({
      container: el,
      style: '/campus-map-style.json',
      center: [-74.043725, 4.782866],
      zoom: 16.7,
      pitch: 55,
      bearing: -18,
      maxPitch: 75,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);
    let buildingHoverPin: ReturnType<typeof createBuildingHoverPin> | undefined;
    let disposed = false;

    map.on('load', () => {
      // Calcula los bounds desde el GeoJSON público para encuadrar todos los edificios.
      fetch('/campus-map.geojson')
        .then((r) => r.json())
        .then((campus: CampusGeoJson) => {
          if (disposed) return;

          const b = new maplibregl.LngLatBounds();
          campus.features.forEach((f) =>
            (f.geometry.type === 'Polygon'
              ? f.geometry.coordinates[0]
              : f.geometry.coordinates[0][0]
            ).forEach((c) => b.extend(c as [number, number])),
          );
          map.fitBounds(b, { padding: 50, bearing: -18, pitch: 55, maxZoom: 18, duration: 0 });
          map.resize();
          buildingHoverPin = createBuildingHoverPin(map);
          // Al editar (ubicación previa), resalta ese edificio en rojo y muestra su panel.
          if (initial) {
            map.setFeatureState({ source: 'campus', id: initial }, { sel: true });
            selectedIdRef.current = initial;
          }
        })
        .finally(() => {
          if (!disposed) setLoading(false);
        });

      map.on('click', 'edificios', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        if (selectedIdRef.current !== null) {
          map.setFeatureState({ source: 'campus', id: selectedIdRef.current }, { sel: false });
        }
        selectedIdRef.current = f.id ?? null;
        if (f.id !== undefined) map.setFeatureState({ source: 'campus', id: f.id }, { sel: true });
        setSelected((f.properties?.name as string) ?? null);
        setPanelMin(false); // muestra el panel expandido al elegir otro edificio
      });
      map.on('mousemove', 'edificios', (e) => {
        const f = e.features?.[0];
        if (!f) return;

        map.getCanvas().style.cursor = 'pointer';
        buildingHoverPin?.show(f as unknown as CampusFeature);
      });
      map.on('mouseleave', 'edificios', () => {
        map.getCanvas().style.cursor = '';
        buildingHoverPin?.hide();
      });
    });

    return () => {
      disposed = true;
      ro.disconnect();
      buildingHoverPin?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [open, initial]);

  if (!open) return null;

  // Imágenes de referencia del edificio seleccionado (estáticas, desde /public; hoy vacío).
  const panelImages = getBuildingImages(selected);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden" role="dialog" aria-modal="true" data-modal-root="true">
        <div className="h-1 shrink-0 bg-[#F4B942]" />
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Elegir ubicación en el campus</h2>
            <p className="text-xs text-gray-500">Toca un edificio en el mapa 3D para seleccionarlo</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 relative bg-[#e9e6dd]">
          {/* h-full/w-full (no absolute): el CSS de MapLibre fuerza position:relative en el
              contenedor del mapa, así que no podemos depender de `absolute inset-0`. */}
          <div ref={containerRef} className="h-full w-full" />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Loader2 className="animate-spin text-yellow-500" size={32} />
            </div>
          )}

          {/* Panel inferior: vista previa del edificio elegido (nombre + imágenes + botón usar).
              Mismo patrón que el panel de tiendas; las imágenes vienen de /public (hoy vacío). */}
          {selected && (
            <div className="absolute inset-x-0 bottom-0 z-30 border-t-2 border-yellow-300 bg-white shadow-[0_-8px_24px_rgba(17,24,39,0.18)]">
              {/* Tirador tipo "sello de sobre": círculo amarillo centrado sobre la línea superior. */}
              <button
                onClick={() => setPanelMin(m => !m)}
                aria-label={panelMin ? 'Expandir panel' : 'Minimizar panel'}
                title={panelMin ? 'Expandir' : 'Minimizar'}
                className="absolute left-1/2 top-0 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-yellow-400 text-black shadow-lg ring-2 ring-white transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"
              >
                {panelMin ? <ChevronUp size={18} strokeWidth={2.5} /> : <ChevronDown size={18} strokeWidth={2.5} />}
              </button>

              {/* Cabecera: nombre del bloque en panel blanco con amarillo */}
              <div className="flex items-center justify-between gap-3 border-b border-yellow-100 bg-yellow-50 px-3 py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-yellow-400 text-white">
                    <Building2 size={13} />
                  </span>
                  <h3 className="truncate text-sm font-bold text-gray-900">{selected}</h3>
                </div>
                <button
                  onClick={closePanel}
                  aria-label="Cerrar vista previa"
                  className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-white hover:text-gray-700"
                >
                  <X size={17} />
                </button>
              </div>

              {/* Cuerpo: colapsa suavemente al minimizar. */}
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${panelMin ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
              >
                <div className="overflow-hidden">
                  {panelImages.length === 0 ? (
                    <div className="mx-3 my-2 rounded-lg border border-dashed border-gray-200 bg-gray-50/60 py-5 text-center text-sm text-gray-500">
                      Sin imágenes de referencia
                    </div>
                  ) : (
                    <GalleryCarousel images={panelImages} compact />
                  )}

                  <div className="px-3 pb-2 pt-1">
                    <button
                      onClick={() => { onSelect(selected); onClose(); }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-gray-950 shadow-sm transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    >
                      <Check size={16} /> Usar esta ubicación
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50 text-sm text-gray-500">
          <MapPin size={16} className="text-yellow-500 flex-shrink-0" />
          Toca un edificio para ver su vista previa y usarlo como ubicación.
        </div>
      </div>
    </div>
  );
};

export default LocationPickerModal;
