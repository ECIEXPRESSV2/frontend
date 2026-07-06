import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { X, MapPin, Loader2, Store as StoreIcon, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getAvailableStores,
  getStoreImages,
  type Store,
  type StoreGalleryImage,
} from '../../services/storeService';
import { isFavorite } from '../../services/favoritesStore';
import GalleryCarousel from './GalleryCarousel';

/** Escapa texto para insertarlo con innerHTML sin riesgo de inyección. */
const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Corazón minimalista (mismo ícono de Lucide que en el home), en rojo relleno, como SVG inline. */
const HEART_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:5px;flex-shrink:0">' +
  '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';

/** Escribe en `el` el nombre de la tienda, con un corazón rojo minimalista delante si es favorita. */
const setStoreLabel = (el: HTMLElement, store: Store): void => {
  el.innerHTML = (isFavorite(store.id) ? HEART_SVG : '') + escapeHtml(store.name);
};

type CampusGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
};

type CampusFeature = {
  id?: string | number;
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
  onClose: () => void;
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

function createStorePin(
  map: maplibregl.Map,
  feature: CampusFeature,
  stores: Store[],
  onSelect: (stores: Store[], lngLat: [number, number]) => void,
) {
  const el = document.createElement('div');
  const body = document.createElement('div');
  const label = document.createElement('div');
  const tip = document.createElement('div');

  el.className = 'store-pin';
  body.className = 'store-pin-body';
  label.className = 'store-pin-label';
  tip.className = 'store-pin-tip';
  if (stores.length === 1) setStoreLabel(label, stores[0]);
  else label.textContent = `${stores.length} tiendas`;
  body.append(label, tip);
  el.append(body);

  const [lng, lat] = getCentroid(feature.geometry);
  const height = Number(feature.properties.height ?? 0);

  body.addEventListener('click', (ev) => {
    ev.stopPropagation();
    onSelect(stores, [lng, lat]);
  });

  const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
    .setLngLat([lng, lat])
    .addTo(map);

  function updateOffset() {
    const ppm = pixelsPerMeter(map, lat);
    const extraPadding = 24;
    marker.setOffset([0, -((Number.isFinite(height) ? height : 0) * ppm + extraPadding)]);
  }

  updateOffset();
  map.on('zoom', updateOffset);

  return {
    remove: () => {
      map.off('zoom', updateOffset);
      marker.remove();
    },
  };
}

const StoreMapModal: React.FC<Props> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const campusRef = useRef<CampusGeoJson | null>(null);
  const pinsRef = useRef<ReturnType<typeof createStorePin>[]>([]);
  const storesRef = useRef<Store[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storesError, setStoresError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Panel inferior de vista previa de una tienda (galería + botón "Elegir tienda").
  const [panelStore, setPanelStore] = useState<Store | null>(null);
  const [panelImages, setPanelImages] = useState<StoreGalleryImage[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelMin, setPanelMin] = useState(false); // panel minimizado (solo cabecera)
  const panelReqRef = useRef<string | null>(null); // guarda contra respuestas obsoletas
  const selRef = useRef<string | null>(null);      // edificio (location) resaltado en verde

  const goToStore = (storeId: string) => {
    navigate(`/store/${storeId}`);
    onClose();
  };

  // Resalta en verde el edificio de una tienda (feature-state "sel"); limpia el anterior.
  const highlightBuilding = (location: string | null) => {
    const map = mapRef.current;
    if (!map || !map.getSource('campus')) return;
    if (selRef.current && selRef.current !== location) {
      map.setFeatureState({ source: 'campus', id: selRef.current }, { selStore: false });
    }
    if (location) {
      map.setFeatureState({ source: 'campus', id: location }, { selStore: true });
    }
    selRef.current = location;
  };

  // Cierra el panel y quita el resaltado del edificio.
  const closePanel = () => {
    highlightBuilding(null);
    setPanelStore(null);
    setPanelMin(false);
  };

  // Abre el panel inferior con la vista previa de la tienda y carga su galería (endpoint público).
  const openStorePanel = (store: Store) => {
    popupRef.current?.remove();
    highlightBuilding(store.location); // resalta su edificio en verde en el mapa 3D
    panelReqRef.current = store.id;
    setPanelStore(store);
    setPanelMin(false);
    setPanelImages([]);
    setPanelLoading(true);
    (async () => {
      try {
        const token = await getToken().catch(() => null);
        const res = await getStoreImages(store.id, token);
        if (panelReqRef.current === store.id) setPanelImages(res.images);
      } catch {
        if (panelReqRef.current === store.id) setPanelImages([]); // se trata como "sin imágenes"
      } finally {
        if (panelReqRef.current === store.id) setPanelLoading(false);
      }
    })();
  };

  // Una sola tienda en el edificio: abre su panel. Varias: muestra un popup para elegir cuál.
  const selectStores = (map: maplibregl.Map, lngLat: [number, number], here: Store[]) => {
    if (here.length === 1) {
      openStorePanel(here[0]);
      return;
    }
    popupRef.current?.remove();
    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col gap-1.5 min-w-[160px]';
    here.forEach((store) => {
      const btn = document.createElement('button');
      setStoreLabel(btn, store);
      btn.className = 'w-full text-left px-3 py-2 rounded-lg text-sm font-medium bg-yellow-50 text-amber-800 hover:bg-yellow-100 transition';
      btn.onclick = () => openStorePanel(store);
      wrapper.append(btn);
    });
    popupRef.current = new maplibregl.Popup({ closeButton: true, offset: 12 })
      .setLngLat(lngLat)
      .setDOMContent(wrapper)
      .addTo(map);
  };

  // Carga las tiendas disponibles cada vez que se abre el mapa.
  useEffect(() => {
    if (!open) return;
    setPanelStore(null); // arranca sin panel al reabrir el mapa
    setPanelMin(false);
    selRef.current = null; // el mapa se recrea al reabrir; sin resaltado previo
    let active = true;
    (async () => {
      setStoresLoading(true);
      setStoresError(null);
      try {
        const token = await getToken().catch(() => null);
        const data = await getAvailableStores(token);
        if (active) setStores(data);
      } catch (e) {
        if (active) setStoresError(e instanceof Error ? e.message : 'No se pudieron cargar las tiendas');
      } finally {
        if (active) setStoresLoading(false);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Setup del mapa 3D del campus (mismo estilo/centro que el selector de admin).
  useEffect(() => {
    if (!open || !containerRef.current) return;
    setMapReady(false);

    const el = containerRef.current;
    const map = new maplibregl.Map({
      container: el,
      style: '/campus-style.json',
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
    let disposed = false;

    map.on('load', () => {
      fetch('/campus.geojson')
        .then((r) => r.json())
        .then((campus: CampusGeoJson) => {
          if (disposed) return;
          campusRef.current = campus;

          const b = new maplibregl.LngLatBounds();
          campus.features.forEach((f) =>
            (f.geometry.type === 'Polygon'
              ? f.geometry.coordinates[0]
              : f.geometry.coordinates[0][0]
            ).forEach((c) => b.extend(c as [number, number])),
          );
          map.fitBounds(b, { padding: 50, bearing: -18, pitch: 55, maxZoom: 18, duration: 0 });
          map.resize();
          setMapReady(true);
        })
        .catch(() => {
          if (!disposed) setMapReady(true);
        });

      map.on('click', 'edificios', (e) => {
        const f = e.features?.[0];
        const name = f?.properties?.name as string | undefined;
        if (!name) return;
        const here = storesRef.current.filter((s) => s.location === name);
        if (!here.length) return;
        selectStores(map, getCentroid(f!.geometry as unknown as CampusGeometry), here);
      });
      map.on('mousemove', 'edificios', (e) => {
        const f = e.features?.[0];
        const name = f?.properties?.name as string | undefined;
        const hasStore = !!name && storesRef.current.some((s) => s.location === name);
        map.getCanvas().style.cursor = hasStore ? 'pointer' : '';
      });
      map.on('mouseleave', 'edificios', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    return () => {
      disposed = true;
      ro.disconnect();
      popupRef.current?.remove();
      pinsRef.current.forEach((pin) => pin.remove());
      pinsRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Dibuja un pin por edificio una vez que el mapa y las tiendas están listos.
  useEffect(() => {
    storesRef.current = stores;
    const map = mapRef.current;
    const campus = campusRef.current;
    if (!mapReady || !map || !campus || storesLoading) return;

    pinsRef.current.forEach((pin) => pin.remove());
    pinsRef.current = [];

    const byLocation = new Map<string, Store[]>();
    stores.forEach((store) => {
      const list = byLocation.get(store.location) ?? [];
      list.push(store);
      byLocation.set(store.location, list);
    });

    campus.features.forEach((feature) => {
      const name = feature.properties.name;
      if (!name) return;
      const here = byLocation.get(name);
      if (!here?.length) return;
      pinsRef.current.push(createStorePin(map, feature, here, (s, lngLat) => selectStores(map, lngLat, s)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, stores, storesLoading]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden" role="dialog" aria-modal="true" data-modal-root="true">
        <div className="h-1 shrink-0 bg-[#F4B942]" />
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Elige una tienda en el mapa</h2>
            <p className="text-xs text-gray-500">Toca el edificio de la tienda que quieres visitar</p>
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
          {storesError && (
            <div className="absolute top-3 left-3 right-3 z-10 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
              {storesError}
            </div>
          )}
          {/* h-full/w-full (no absolute): el CSS de MapLibre fuerza position:relative en el
              contenedor del mapa, así que no podemos depender de `absolute inset-0`. */}
          <div ref={containerRef} className="h-full w-full" />
          {(!mapReady || storesLoading) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Loader2 className="animate-spin text-yellow-500" size={32} />
            </div>
          )}

          {/* Panel inferior: vista previa de la tienda elegida (nombre + galería + botón elegir).
              Pegado al borde inferior y a los lados del mapa, sin márgenes; compacto. */}
          {panelStore && (
            <div className="absolute inset-x-0 bottom-0 z-30 border-t-2 border-yellow-300 bg-white shadow-[0_-8px_24px_rgba(17,24,39,0.18)]">
              {/* Tirador tipo "sello de sobre": círculo amarillo centrado, con su centro sobre la
                  línea superior del panel (mitad afuera, mitad adentro). Minimiza/expande. */}
              <button
                onClick={() => setPanelMin(m => !m)}
                aria-label={panelMin ? 'Expandir panel' : 'Minimizar panel'}
                title={panelMin ? 'Expandir' : 'Minimizar'}
                className="absolute left-1/2 top-0 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-yellow-400 text-black shadow-lg ring-2 ring-white transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"
              >
                {panelMin ? <ChevronUp size={18} strokeWidth={2.5} /> : <ChevronDown size={18} strokeWidth={2.5} />}
              </button>

              {/* Cabecera: nombre de la tienda en panel blanco con amarillo */}
              <div className="flex items-center justify-between gap-3 border-b border-yellow-100 bg-yellow-50 px-3 py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-yellow-400 text-white">
                    <StoreIcon size={13} />
                  </span>
                  <h3 className="truncate text-sm font-bold text-gray-900">{panelStore.name}</h3>
                </div>
                <button
                  onClick={closePanel}
                  aria-label="Cerrar vista previa"
                  className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-white hover:text-gray-700"
                >
                  <X size={17} />
                </button>
              </div>

              {/* Cuerpo: al minimizar colapsa la altura suavemente (grid 1fr→0fr), así el panel
                  baja poco a poco y el sello amarillo (anclado al borde superior) baja con él. */}
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${panelMin ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
              >
                <div className="overflow-hidden">
                  {/* Galería a todo el ancho (pegada a los lados); vacío/carga con su padding. */}
                  {panelLoading ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
                      <Loader2 size={15} className="animate-spin" /> Cargando imágenes…
                    </div>
                  ) : panelImages.length === 0 ? (
                    <div className="mx-3 my-2 rounded-lg border border-dashed border-gray-200 bg-gray-50/60 py-5 text-center text-sm text-gray-500">
                      Sin imágenes de referencia
                    </div>
                  ) : (
                    <GalleryCarousel images={panelImages} compact />
                  )}

                  <div className="px-3 pb-2 pt-1">
                    <button
                      onClick={() => goToStore(panelStore.id)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-gray-950 shadow-sm transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    >
                      <Check size={16} /> Elegir tienda
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50 text-sm text-gray-500">
          <MapPin size={16} className="text-emerald-500 flex-shrink-0" />
          Toca un edificio con tienda para ver su vista previa; el seleccionado se marca en verde.
        </div>
      </div>
    </div>
  );
};

export default StoreMapModal;
