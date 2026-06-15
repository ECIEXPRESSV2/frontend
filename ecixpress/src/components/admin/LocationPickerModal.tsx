import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { X, MapPin, Check, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  initial?: string;
  onClose: () => void;
  onSelect: (location: string) => void;
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
  const selectedIdRef = useRef<string | number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !containerRef.current) return;
    setSelected(initial ?? null);
    setLoading(true);
    selectedIdRef.current = null;

    const el = containerRef.current;
    // El estilo y los datos viven en /public — edítalos sin tocar este componente.
    const map = new maplibregl.Map({
      container: el,
      style: '/campus-style.json',
      center: [-74.043725, 4.782866],
      zoom: 16.7,
      pitch: 55,
      bearing: -18,
      maxPitch: 75,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);

    map.on('load', () => {
      // Calcula los bounds desde el GeoJSON público para encuadrar todos los edificios.
      fetch('/campus.geojson')
        .then((r) => r.json())
        .then((campus: { features: { geometry: { coordinates: number[][][] } }[] }) => {
          const b = new maplibregl.LngLatBounds();
          campus.features.forEach((f) =>
            f.geometry.coordinates[0].forEach((c) => b.extend(c as [number, number])),
          );
          map.fitBounds(b, { padding: 50, bearing: -18, pitch: 55, maxZoom: 18, duration: 0 });
          map.resize();
        })
        .finally(() => setLoading(false));

      map.on('click', 'edificios', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        if (selectedIdRef.current !== null) {
          map.setFeatureState({ source: 'campus', id: selectedIdRef.current }, { sel: false });
        }
        selectedIdRef.current = f.id ?? null;
        if (f.id !== undefined) map.setFeatureState({ source: 'campus', id: f.id }, { sel: true });
        setSelected((f.properties?.name as string) ?? null);
      });
      map.on('mouseenter', 'edificios', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'edificios', () => { map.getCanvas().style.cursor = ''; });
    });

    return () => {
      ro.disconnect();
      map.remove();
    };
  }, [open, initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
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
        </div>

        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <MapPin size={16} className="text-yellow-500 flex-shrink-0" />
            {selected ? (
              <span className="text-gray-900 font-medium truncate">{selected}</span>
            ) : (
              <span className="text-gray-400">Ningún edificio seleccionado</span>
            )}
          </div>
          <button
            disabled={!selected}
            onClick={() => {
              if (selected) {
                onSelect(selected);
                onClose();
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 text-white font-semibold text-sm hover:bg-yellow-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={16} /> Usar esta ubicación
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPickerModal;
