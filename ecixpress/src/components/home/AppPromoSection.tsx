import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import TrianglePattern, { TriangleGlyph } from './TrianglePattern';

/**
 * Renders reales del equipo (guardar en `public/` con estos nombres):
 *  - `/app-phone-home.png`   → celular 3D mostrando el Home de la app.
 *  - `/app-phone-order.png`  → celular 3D mostrando el resumen del pedido.
 * PNG con fondo transparente. Mientras no existan, se muestran los mockups en código.
 */
const PHONE_IMAGES = {
  home: '/app-phone-home.png',
  order: '/app-phone-order.png',
} as const;

/** Marca de Apple (silueta), monocroma, para el badge decorativo de App Store. */
const AppleMark: React.FC = () => (
  <svg viewBox="0 0 384 512" className="h-5 w-5 fill-current" aria-hidden="true">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

/** Triángulo de Google Play, monocromo. */
const PlayMark: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
    <path d="M4 2.6v18.8c0 .5.55.8.98.55l16.2-9.4a.63.63 0 0 0 0-1.1L4.98 2.05A.63.63 0 0 0 4 2.6z" />
  </svg>
);

const StoreBadge: React.FC<{ mark: React.ReactNode; storeName: string }> = ({ mark, storeName }) => (
  <div
    aria-hidden="true"
    className="inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-3.5 py-1.5 text-gray-900 shadow-sm backdrop-blur-xl"
  >
    {mark}
    <span className="text-left leading-tight">
      <span className="block text-[9px] font-medium uppercase tracking-wide text-gray-500">Próximamente en</span>
      <span className="block text-sm font-bold">{storeName}</span>
    </span>
  </div>
);

const MOCK_ITEMS = [
  { name: 'Cappuccino', price: '$4.500' },
  { name: 'Croissant', price: '$3.800' },
  { name: 'Sandwich Club', price: '$8.200' },
];

/** Tiendas de la pestaña "Tiendas" del mockup (colores fijos: son logos de marcas). */
const MOCK_STORES = [
  { name: 'Cafe Leyenda', color: '#b45309' },
  { name: 'Dicaffe', color: '#be185d' },
  { name: 'Reggio', color: '#166534' },
  { name: 'Wake Up', color: '#57534e' },
];

interface AppPhoneMockupProps {
  /** Pestaña de la app que muestra la pantalla. */
  variant: 'menu' | 'stores';
  className?: string;
}

/** Mockup de celular con la app de ECIEXPRESS, dibujado en código (sin assets). */
const AppPhoneMockup: React.FC<AppPhoneMockupProps> = ({ variant, className = '' }) => (
  <div
    aria-hidden="true"
    className={`theme-surface w-36 overflow-hidden rounded-[1.9rem] border-[5px] border-gray-900 bg-white shadow-2xl ${className}`}
  >
    {/* Cabecera de la app con el logo */}
    <div className="theme-surface bg-[linear-gradient(135deg,var(--accent-400),var(--accent-500))] px-3 pb-2.5 pt-4">
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-900/70" />
      <img src="/ecixpress-logo.svg" alt="" className="mx-auto h-4 brightness-0 invert" />
    </div>

    {variant === 'menu' ? (
      /* Pestaña menú: lista de productos + CTA */
      <div className="space-y-1.5 px-2.5 py-2.5">
        {MOCK_ITEMS.map((item) => (
          <div key={item.name} className="theme-surface flex items-center justify-between gap-1 rounded-lg border border-gray-100 bg-[var(--accent-50)] px-2 py-1.5">
            <span className="text-[9px] font-semibold text-gray-800">{item.name}</span>
            <span className="text-[9px] font-bold text-[var(--accent-700)]">{item.price}</span>
          </div>
        ))}
        <div className="theme-surface mt-1.5 flex items-center justify-center gap-1 rounded-lg bg-[var(--accent-400)] py-1.5 text-[9px] font-bold text-gray-950">
          <Plus size={9} aria-hidden="true" /> Nuevo pedido
        </div>
      </div>
    ) : (
      /* Pestaña tiendas: buscador + cuadrícula de tiendas */
      <div className="space-y-1.5 px-2.5 py-2.5">
        <div className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[8px] text-gray-400">
          <Search size={8} aria-hidden="true" /> Buscar una tienda…
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {MOCK_STORES.map((store) => (
            <div key={store.name} className="theme-surface flex flex-col items-center gap-1 rounded-lg border border-gray-100 bg-[var(--accent-50)] px-1 py-1.5">
              <div
                className="flex h-5 w-5 items-center justify-center rounded-full text-[7px] font-bold text-white"
                style={{ backgroundColor: store.color }}
              >
                {store.name[0]}
              </div>
              <span className="max-w-full truncate text-[7px] font-semibold text-gray-700">{store.name}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

/** Foto de celular con fallback al mockup en código mientras no exista el asset. */
const PhoneShot: React.FC<{ src: string; fallback: AppPhoneMockupProps['variant']; className?: string; fallbackClassName?: string }> = ({
  src,
  fallback,
  className = '',
  fallbackClassName = '',
}) => {
  const [imageAvailable, setImageAvailable] = useState(true);
  if (!imageAvailable) return <AppPhoneMockup variant={fallback} className={fallbackClassName} />;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setImageAvailable(false)}
      className={`pointer-events-none w-auto object-contain drop-shadow-2xl ${className}`}
    />
  );
};

/**
 * Sección compacta de la futura app móvil: dos celulares 3D superpuestos que SOBRESALEN
 * del contenedor por arriba y por abajo (margen negativo en la columna), centrados en la
 * mitad izquierda; texto centrado en la derecha. Ojo: la sección NO recorta (sin
 * overflow-hidden); los fondos decorativos se recortan en su propia capa.
 */
const AppPromoSection: React.FC = () => {
  return (
    <section className="theme-surface relative rounded-[32px] border border-white/60 bg-[linear-gradient(135deg,rgb(var(--accent-rgb)/0.34)_0%,rgb(var(--accent-rgb)/0.14)_45%,rgb(var(--accent-rgb)/0.38)_100%)] px-6 py-5 backdrop-blur-2xl [box-shadow:0_20px_45px_-24px_rgb(var(--accent-rgb)/0.45)] md:px-10 md:py-6">
      {/* Blobs de acento, recortados al contorno redondeado del panel */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <div className="theme-surface absolute -right-20 -top-16 h-64 w-64 rounded-full bg-[rgb(var(--accent-rgb)/0.30)] blur-3xl" />
        <div className="theme-surface absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[rgb(var(--accent-rgb)/0.18)] blur-3xl" />
      </div>
      <TrianglePattern />

      <div className="relative z-10 grid items-center gap-6 md:grid-cols-2">
        {/* Mitad izquierda: dúo de celulares. En móvil, versión compacta y sin desbordar
            (cabe dentro del panel); desde md crece al tamaño original que sí sobresale
            arriba y abajo del panel. */}
        <div className="relative flex items-center justify-center py-2 md:-my-16 md:py-0" aria-hidden="true">
          <TriangleGlyph size={190} rotate={8} className="theme-surface absolute text-[rgb(var(--accent-rgb))] opacity-30 md:hidden" />
          <TriangleGlyph size={300} rotate={8} className="theme-surface absolute hidden text-[rgb(var(--accent-rgb))] opacity-30 md:block" />
          <PhoneShot
            src={PHONE_IMAGES.order}
            fallback="stores"
            className="relative -mt-4 h-[170px] -rotate-2 md:-mt-8 md:h-[330px] lg:h-[370px]"
            fallbackClassName="relative -rotate-6"
          />
          <PhoneShot
            src={PHONE_IMAGES.home}
            fallback="menu"
            className="relative z-10 -ml-10 mt-6 h-[180px] rotate-2 md:-ml-24 md:mt-10 md:h-[350px] lg:h-[390px]"
            fallbackClassName="relative z-10 -ml-8 mt-6 rotate-6 md:-ml-12 md:mt-10"
          />
        </div>

        {/* Mitad derecha: bloque de texto centrado */}
        <div className="flex justify-center">
          <div className="max-w-md space-y-3 text-center md:text-left">
            <h2 className="font-display text-xl font-semibold leading-tight text-gray-900 md:text-2xl">
              Muy pronto, ECIEXPRESS en tu bolsillo
            </h2>
            <p className="text-sm text-gray-600">
              Próximamente estaremos disponibles en App Store y Google Play. Pide, paga y recoge
              tus pedidos desde tu celular, en cualquier lugar del campus.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <StoreBadge mark={<AppleMark />} storeName="App Store" />
              <StoreBadge mark={<PlayMark />} storeName="Google Play" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppPromoSection;
