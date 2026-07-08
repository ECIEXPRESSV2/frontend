import React from 'react';
import { Plus } from 'lucide-react';
import HeroVisual from './HeroVisual';
import TrianglePattern from './TrianglePattern';

interface HeroBannerProps {
  userName: string;
  onNewOrder: () => void;
  /** Toggle Comida/Tienda para móviles: en <md no cabe en la franja fija superior
      (la ocupa la cápsula del avatar), así que se muestra dentro del hero. */
  sectionToggle?: React.ReactNode;
}

/**
 * Banner principal único (sin carrusel): panel glass redondeado, del mismo ancho que el
 * resto de contenedores del Home. El <main> reserva con su padding-top el espacio de los
 * controles fijos (toggle, buscador y cápsula del avatar).
 */
const HeroBanner: React.FC<HeroBannerProps> = ({ userName, onNewOrder, sectionToggle }) => {
  return (
    <section className="theme-surface relative overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(140deg,rgb(var(--accent-rgb)/0.32)_0%,rgba(255,255,255,0.60)_42%,rgb(var(--accent-rgb)/0.14)_72%,rgb(var(--accent-rgb)/0.36)_100%)] backdrop-blur-2xl [box-shadow:0_28px_50px_-28px_rgb(var(--accent-rgb)/0.45)]">
      {/* Fondos decorativos de acento */}
      <div aria-hidden="true" className="theme-surface absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[rgb(var(--accent-rgb)/0.32)] blur-3xl" />
      <div aria-hidden="true" className="theme-surface absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-[rgb(var(--accent-rgb)/0.20)] blur-3xl" />
      <TrianglePattern />

      <div className="relative z-10 grid min-h-[clamp(170px,24vh,280px)] items-center gap-6 px-5 py-6 md:grid-cols-[1.15fr_0.85fr] md:px-10 md:py-8">
        <div className="animate-fade-in-up space-y-4">
          {sectionToggle && <div className="md:hidden">{sectionToggle}</div>}
          <h1 className="font-display text-2xl font-semibold leading-tight text-gray-900 md:text-[clamp(1.6rem,2.6vw,2.4rem)]">
            Bienvenido {userName}, a <span className="text-[var(--accent-600)]">ECIEXPRESS</span>
          </h1>

          <p className="max-w-md text-sm text-gray-600 md:text-base">
            Pide desde cualquier lugar del campus de forma rápida, sencilla y sin filas.
          </p>

          <button
            type="button"
            onClick={onNewOrder}
            className="theme-surface inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--accent-400),var(--accent-500))] px-6 text-sm font-bold text-gray-950 shadow-[0_10px_24px_rgb(var(--accent-rgb)/0.40)] transition-all duration-300 hover:shadow-[0_14px_30px_rgb(var(--accent-rgb)/0.50)] hover:brightness-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          >
            <Plus size={18} aria-hidden="true" />
            Nuevo pedido
          </button>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
};

export default HeroBanner;
