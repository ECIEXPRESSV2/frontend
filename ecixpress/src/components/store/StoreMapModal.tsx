import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { X, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAvailableStores, type Store } from '../../services/storeService';

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
  label.textContent = stores.length === 1 ? stores[0].name : `${stores.length} tiendas`;
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

  const goToStore = (storeId: string) => {
    navigate(`/store/${storeId}`);
    onClose();
  };

  // Una sola tienda en el edificio: navega directo. Varias: muestra un popup para elegir.
  const selectStores = (map: maplibregl.Map, lngLat: [number, number], here: Store[]) => {
    if (here.length === 1) {
      goToStore(here[0].id);
      return;
    }
    popupRef.current?.remove();
    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col gap-1.5 min-w-[160px]';
    here.forEach((store) => {
      const btn = document.createElement('button');
      btn.textContent = store.name;
      btn.className = 'w-full text-left px-3 py-2 rounded-lg text-sm font-medium bg-yellow-50 text-amber-800 hover:bg-yellow-100 transition';
      btn.onclick = () => goToStore(store.id);
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
      <div className="w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
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
        </div>

        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50 text-sm text-gray-500">
          <MapPin size={16} className="text-emerald-500 flex-shrink-0" />
          Los edificios marcados en verde tienen una tienda disponible — toca uno para entrar.
        </div>
      </div>
    </div>
  );
};

export default StoreMapModal;
