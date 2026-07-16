import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin, Rotate3d } from 'lucide-react';
import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';
import { applyBuildingTextures } from '../../services/buildingTextures';

// ─── Tipos (mismos contratos que StoreMapModal) ─────────────────────────────
type CampusGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
};

type CampusFeature = {
  geometry: CampusGeometry;
  properties: {
    name?: string;
    tipo?: string;
    height?: number;
  };
};

type CampusGeoJson = {
  features: CampusFeature[];
};

/** Edificios que funcionan como puntos de recogida reales en el campus. */
const PICKUP_TYPES = new Set(['Cafeteria', 'Punto de comida']);

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

function pixelsPerMeter(map: MapLibreMap, lat: number) {
  const zoom = map.getZoom();
  const metersPerPixel =
    (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  return 1 / metersPerPixel;
}

const CampusMapSection: React.FC = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // El mapa (y el chunk de maplibre, ~1MB) solo se cargan cuando la sección entra al viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !containerRef.current) return;

    let disposed = false;
    let map: MapLibreMap | null = null;
    let rafId = 0;
    const markers: MapLibreMarker[] = [];
    const zoomHandlers: (() => void)[] = [];

    (async () => {
      const [{ default: maplibregl }] = await Promise.all([
        import('maplibre-gl'),
        import('maplibre-gl/dist/maplibre-gl.css'),
      ]);
      if (disposed || !containerRef.current) return;

      map = new maplibregl.Map({
        container: containerRef.current,
        style: '/campus-map-style.json',
        center: [-74.043725, 4.782866],
        zoom: 16.7,
        pitch: 60,
        bearing: -18,
        maxPitch: 75,
        cooperativeGestures: true,
        attributionControl: false,
        locale: {
          'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl + scroll para hacer zoom en el mapa',
          'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ + scroll para hacer zoom en el mapa',
          'CooperativeGesturesHandler.MobileHelpText': 'Usa dos dedos para mover el mapa',
        },
      });
      const currentMap = map;

      currentMap.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

      // Auto-rotación lenta hasta que el usuario toma el control.
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let interacted = false;
      const stopSpin = () => { interacted = true; };
      (['mousedown', 'touchstart', 'wheel'] as const).forEach((ev) =>
        currentMap.getCanvas().addEventListener(ev, stopSpin, { passive: true })
      );
      const spin = () => {
        if (!interacted) currentMap.setBearing(currentMap.getBearing() + 0.02);
        rafId = requestAnimationFrame(spin);
      };

      currentMap.on('load', () => {
        fetch('/campus-map.geojson')
          .then((r) => r.json())
          .then((campus: CampusGeoJson) => {
            if (disposed) return;

            const bounds = new maplibregl.LngLatBounds();
            campus.features.forEach((f) =>
              (f.geometry.type === 'Polygon'
                ? f.geometry.coordinates[0]
                : f.geometry.coordinates[0][0]
              ).forEach((c) => bounds.extend(c as [number, number]))
            );
            currentMap.fitBounds(bounds, { padding: 60, bearing: -18, pitch: 60, maxZoom: 17.6, duration: 0 });
            applyBuildingTextures(currentMap).catch(() => {});

            campus.features
              .filter((f) => f.properties.tipo && PICKUP_TYPES.has(f.properties.tipo) && f.properties.name)
              .forEach((feature) => {
                const [lng, lat] = getCentroid(feature.geometry);
                const height = Number(feature.properties.height ?? 0);
                const name = feature.properties.name as string;

                const el = document.createElement('div');
                el.className = 'landing-map-pin';
                el.innerHTML =
                  `<div class="landing-map-pin-label">${name}</div>` +
                  '<div class="landing-map-pin-dot"><div class="landing-map-pin-ring"></div></div>';

                el.addEventListener('click', (ev) => {
                  ev.stopPropagation();
                  currentMap.flyTo({ center: [lng, lat], zoom: 18, duration: 900 });

                  const content = document.createElement('div');
                  content.className = 'flex flex-col gap-2 min-w-[170px] p-1';
                  const title = document.createElement('p');
                  title.className = 'font-semibold text-sm text-gray-900';
                  title.textContent = name;
                  const subtitle = document.createElement('p');
                  subtitle.className = 'text-xs text-gray-500 -mt-1';
                  subtitle.textContent = 'Punto de recogida';
                  const btn = document.createElement('button');
                  btn.textContent = 'Pedir aquí';
                  btn.className = 'w-full px-3 py-2 rounded-lg text-sm font-semibold text-gray-900 bg-gradient-to-r from-primary to-amber-500 hover:from-amber-500 hover:to-amber-600 transition';
                  btn.onclick = () => navigate('/signup');
                  content.append(title, subtitle, btn);

                  new maplibregl.Popup({ closeButton: true, offset: 18 })
                    .setLngLat([lng, lat])
                    .setDOMContent(content)
                    .addTo(currentMap);
                });

                const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
                  .setLngLat([lng, lat])
                  .addTo(currentMap);
                markers.push(marker);

                // Compensa la altura 3D del edificio para que el pin quede sobre el techo.
                const updateOffset = () => {
                  const ppm = pixelsPerMeter(currentMap, lat);
                  marker.setOffset([0, -((Number.isFinite(height) ? height : 0) * ppm + 10)]);
                };
                updateOffset();
                currentMap.on('zoom', updateOffset);
                zoomHandlers.push(() => currentMap.off('zoom', updateOffset));
              });

            setMapReady(true);
            if (!prefersReduced) rafId = requestAnimationFrame(spin);
          })
          .catch(() => {
            if (!disposed) setMapReady(true);
          });
      });
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      zoomHandlers.forEach((off) => off());
      markers.forEach((m) => m.remove());
      map?.remove();
    };
  }, [inView, navigate]);

  return (
    <section ref={sectionRef} id="campus-map" className="relative py-20 md:py-28 px-6 bg-gradient-to-b from-white via-gray-50 to-white overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-yellow-300/15 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 border border-yellow-300">
            <MapPin size={14} className="text-a11y-yellow-dark" />
            <span className="font-body text-sm font-semibold text-a11y-yellow-darker tracking-wide">
              Campus real · Mapa 3D
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-gray-900 leading-tight">
            Tu pedido te espera{' '}
            <span className="bg-gradient-to-r from-primary to-amber-600 bg-clip-text text-transparent">aquí</span>
          </h2>
          <p className="font-body text-lg text-gray-600 max-w-2xl mx-auto">
            Explora el campus en 3D. Cada punto ámbar es una cafetería o kiosko real
            listo para entregarte tu pedido.
          </p>
        </div>

        <div className="relative h-[420px] md:h-[540px] rounded-3xl overflow-hidden border border-gray-200 shadow-xl bg-[#e9e6dd]">
          <div ref={containerRef} className="h-full w-full" />
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 pointer-events-none">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-gray-500">
          <Rotate3d size={16} />
          <span className="font-body text-sm">
            Arrastra para explorar · toca un punto ámbar para ver el punto de recogida
          </span>
        </div>
      </div>

      <style>{`
        .landing-map-pin {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          cursor: pointer;
        }
        .landing-map-pin-label {
          font-family: Inter, sans-serif;
          font-size: 11px;
          font-weight: 600;
          color: #1f2937;
          background: rgba(255, 255, 255, 0.94);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 999px;
          padding: 3px 9px;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
        }
        .landing-map-pin-dot {
          position: relative;
          width: 14px;
          height: 14px;
          background: #F4B942;
          border: 2px solid #fff;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
        }
        .landing-map-pin-ring {
          position: absolute;
          inset: -9px;
          border-radius: 50%;
          border: 2px solid rgba(244, 185, 66, 0.85);
          animation: landingMapPing 2.2s ease-out infinite;
          pointer-events: none;
        }
        @keyframes landingMapPing {
          0%   { transform: scale(0.4); opacity: 0.9; }
          80%  { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-map-pin-ring { animation: none; opacity: 0; }
        }
      `}</style>
    </section>
  );
};

export default CampusMapSection;
