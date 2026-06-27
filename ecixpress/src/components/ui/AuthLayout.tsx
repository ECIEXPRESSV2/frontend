import React, { useEffect } from 'react';
import FoodCarousel from './FoodCarousel';

interface AuthLayoutProps {
  children: React.ReactNode;
  /** Mantenido por compatibilidad; el mosaico ahora es fondo completo. */
  carouselPosition?: 'left' | 'right';
  /** Formularios altos (registro): centrado compacto y simétrico para que quepa sin recorte. */
  dense?: boolean;
}

/**
 * Actualiza las variables --mx/--my de cada elemento .glass-spotlight para que
 * el brillo de cristal siga al puntero. Listener global: cubre también la
 * tarjeta, los botones internos y el botón "Volver" (que vive fuera del layout).
 */
const usePointerGlow = () => {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const els = document.querySelectorAll<HTMLElement>('.glass-spotlight');
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        el.style.setProperty('--mx', `${x}%`);
        el.style.setProperty('--my', `${y}%`);
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
};

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, dense = false }) => {
  usePointerGlow();

  // Login: centrado con realce óptico hacia arriba.
  // Registro (dense): alineado a la parte superior (a la altura del botón "Volver"),
  // así el formulario alto no se recorta.
  const mainAlign = dense ? 'items-start justify-center' : 'items-center justify-center';
  const mainPadding = dense
    ? 'px-4 sm:px-6 pt-6 pb-6'
    : 'px-4 sm:px-6 pt-3 pb-20 sm:pt-4 sm:pb-24';
  const contentSpacing = dense ? 'space-y-3' : 'space-y-4 sm:space-y-5';
  const contentMaxH = dense
    ? 'max-h-[calc(100vh-5rem)]'
    : 'max-h-[calc(100vh-11rem)]';

  return (
    <div className="relative h-screen w-full overflow-hidden font-body bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      {/* ── Fondo: mosaico institucional a pantalla completa ── */}
      <div
        className="absolute inset-0 z-0 scale-110 opacity-[0.45] blur-[2px]
                   motion-safe:[mask-image:radial-gradient(125%_125%_at_50%_50%,#000_60%,transparent_100%)]"
        aria-hidden="true"
      >
        <FoodCarousel />
      </div>

      {/* ── Capa de legibilidad: tinte translúcido + blur suave ── */}
      <div
        className="absolute inset-0 z-10 backdrop-blur-[1.5px]
                   bg-gradient-to-br from-yellow-50/45 via-white/35 to-yellow-100/45"
        aria-hidden="true"
      />

      {/* ── Panel de autenticación, centrado (con leve realce óptico hacia arriba) ── */}
      <main className={`relative z-20 flex h-screen w-full overflow-hidden ${mainAlign} ${mainPadding}`}>
        <div className="group relative w-full max-w-sm">
          {/* Halo difuso para reforzar el efecto Liquid Glass */}
          <div
            className="pointer-events-none absolute -inset-1 rounded-[2rem]
                       bg-gradient-to-br from-white/50 via-yellow-100/30 to-transparent
                       opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-90"
            aria-hidden="true"
          />

          {/* Tarjeta Liquid Glass — borde neutro y suave (estilo referencia) */}
          <div
            className="glass-spotlight glass-spotlight-soft relative overflow-hidden rounded-3xl p-6 sm:p-7
                       bg-white/40 backdrop-blur-2xl
                       border border-white/50
                       ring-1 ring-white/20
                       shadow-[0_20px_60px_-15px_rgba(31,38,135,0.25)]
                       transition-all duration-300 ease-out
                       hover:-translate-y-0.5 hover:bg-white/[0.46]
                       hover:shadow-[0_28px_80px_-18px_rgba(31,38,135,0.35)]"
          >
            {/* Difuminado amarillo muy sutil en la parte superior (estética de la referencia) */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-2/5
                         bg-gradient-to-b from-[#F4B942]/25 via-[#F4B942]/8 to-transparent"
              aria-hidden="true"
            />

            {/* Brillo superior sutil (reflejo de cristal) */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px
                         bg-gradient-to-r from-transparent via-white/80 to-transparent"
              aria-hidden="true"
            />
            {/* Contenido por encima del brillo del puntero; cap de altura para que
                el registro nunca desborde la página (scroll interno oculto si hace falta) */}
            <div
              className={`relative z-10 ${contentSpacing} ${contentMaxH} overflow-y-auto
                         [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
            >
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
