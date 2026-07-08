import React from 'react';

interface TriangleGlyphProps {
  /** Alto en px (el ancho se calcula; una pareja es ~1.5× más ancha). */
  size: number;
  rotate?: number;
  /** true = dos triángulos solapados como el "»" del logo. */
  pair?: boolean;
  className?: string;
}

/**
 * Triángulo(s) de esquinas redondeadas, misma forma que las flechas del logo ECI.
 * Todo se dibuja OPACO dentro de un solo SVG y la transparencia se aplica al SVG completo
 * (clase opacity-*), así el solape de la pareja queda plano, sin efecto de "doble fondo".
 */
export const TriangleGlyph: React.FC<TriangleGlyphProps> = ({
  size,
  rotate = 0,
  pair = false,
  className = '',
}) => {
  const offsets = pair ? [0, 15] : [0];
  const w = pair ? 43 : 28;

  return (
    <svg
      viewBox={`0 0 ${w} 28`}
      width={(size * w) / 28}
      height={size}
      className={className}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      {offsets.map((o) => (
        <path
          key={o}
          transform={`translate(${o} 0)`}
          d="M8 6 L22 14 L8 22 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={7}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
};

interface TrianglePatternProps {
  /** Clases extra sobre la capa; p. ej. "opacity-60" para atenuar todo el patrón. */
  className?: string;
}

/**
 * Capa decorativa de fondo para los contenedores del Home: triángulos del logo ECI,
 * grandes y muy sutiles — sueltos o en pareja, siempre lisos. Va como primer hijo de
 * un contenedor `relative`; nunca captura el puntero.
 */
const TrianglePattern: React.FC<TrianglePatternProps> = ({ className = '' }) => (
  <div
    aria-hidden="true"
    className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] text-[rgb(var(--accent-rgb))] ${className}`}
  >
    <TriangleGlyph size={170} rotate={-12} pair className="absolute left-[2%] top-[6%] opacity-10" />
    <TriangleGlyph size={240} rotate={18} className="absolute right-[12%] -top-10 opacity-[0.08]" />
    <TriangleGlyph size={120} rotate={-28} className="absolute left-[38%] bottom-[4%] opacity-[0.07]" />
    <TriangleGlyph size={150} rotate={8} pair className="absolute right-[3%] bottom-[8%] opacity-10" />
    <TriangleGlyph size={110} rotate={-42} className="absolute left-[12%] -bottom-6 opacity-[0.09]" />
    <TriangleGlyph size={130} rotate={30} className="absolute left-[56%] top-[14%] opacity-[0.07]" />
  </div>
);

export default TrianglePattern;
