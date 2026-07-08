import React, { useMemo, useState } from 'react';
import { TriangleGlyph } from './TrianglePattern';

/**
 * Imagen esperada (la aporta el equipo): estudiante mostrando un código QR desde su
 * celular. Especificaciones: PNG o WebP con fondo TRANSPARENTE, ~800×640 px, sujeto
 * alineado a la derecha, colocada en `public/hero-student-qr.png`. Mientras el archivo
 * no exista se renderiza el fallback decorativo de abajo (celular glass con QR), que
 * se recolorea solo con el tema activo.
 */
const HERO_IMAGE_SRC = '/hero-student-qr.png';

const QR_SIZE = 13;

/** Patrón QR decorativo y determinista (no escaneable): finders + módulos pseudo-aleatorios. */
const useQrCells = () =>
  useMemo(() => {
    const cells: Array<[number, number]> = [];
    for (let y = 0; y < QR_SIZE; y++) {
      for (let x = 0; x < QR_SIZE; x++) {
        const inFinder =
          (x < 4 && y < 4) || (x > QR_SIZE - 5 && y < 4) || (x < 4 && y > QR_SIZE - 5);
        if (inFinder) continue;
        if ((x * 11 + y * 17 + x * y) % 5 < 2) cells.push([x, y]);
      }
    }
    return cells;
  }, []);

const Finder: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g>
    <rect x={x} y={y} width={3.4} height={3.4} rx={0.7} fill="none" stroke="currentColor" strokeWidth={0.7} />
    <rect x={x + 1.1} y={y + 1.1} width={1.2} height={1.2} rx={0.3} className="fill-[var(--accent-500)]" />
  </g>
);

const QrPattern: React.FC = () => {
  const cells = useQrCells();
  return (
    <svg viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`} className="w-full text-gray-900" aria-hidden="true">
      <Finder x={0.3} y={0.3} />
      <Finder x={QR_SIZE - 3.7} y={0.3} />
      <Finder x={0.3} y={QR_SIZE - 3.7} />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + 0.1} y={y + 0.1} width={0.8} height={0.8} rx={0.18} fill="currentColor" />
      ))}
    </svg>
  );
};

/** Visual del banner principal: la foto del estudiante con QR, o el fallback en código. */
const HeroVisual: React.FC = () => {
  const [imageAvailable, setImageAvailable] = useState(true);

  if (imageAvailable) {
    return (
      <div className="relative hidden items-center justify-center sm:flex" aria-hidden="true">
        {/* Triángulo grande de fondo: da contraste a la imagen, como el círculo del ejemplo */}
        <TriangleGlyph size={280} rotate={-10} className="theme-surface absolute text-[rgb(var(--accent-rgb))] opacity-25" />
        <img
          src={HERO_IMAGE_SRC}
          alt=""
          loading="eager"
          decoding="async"
          onError={() => setImageAvailable(false)}
          className="pointer-events-none relative max-h-[280px] w-auto object-contain drop-shadow-2xl"
        />
      </div>
    );
  }

  return (
    <div className="relative hidden items-center justify-center py-2 sm:flex" aria-hidden="true">
      {/* Triángulo grande de fondo: da contraste al celular con el QR */}
      <TriangleGlyph size={290} rotate={-10} className="theme-surface absolute text-[rgb(var(--accent-rgb))] opacity-25" />

      {/* Celular glass mostrando el QR del pedido */}
      <div className="animate-float relative w-40 rotate-6 rounded-[2.1rem] border border-white/70 bg-white/60 p-2.5 shadow-2xl backdrop-blur-xl md:w-44">
        <div className="rounded-[1.6rem] bg-white px-4 py-4 shadow-inner">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-600)]">Tu pedido</p>
          <div className="mt-2">
            <QrPattern />
          </div>
          <p className="mt-2.5 text-center text-[10px] font-medium text-gray-500">Muéstralo al recoger</p>
        </div>
      </div>
    </div>
  );
};

export default HeroVisual;
