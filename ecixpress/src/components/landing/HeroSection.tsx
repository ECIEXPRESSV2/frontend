import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';

interface HeroProps {
  onGetStartedClick?: () => void;
  onSignInClick?: () => void;
}

const BASE_ORDER_COUNT = 1284;

const HeroSection: React.FC<HeroProps> = ({ onGetStartedClick, onSignInClick }) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const visualRef = useRef<HTMLDivElement | null>(null);
  const phoneImgRef = useRef<HTMLImageElement | null>(null);
  const reducedMotionRef = useRef(false);
  const [orderTarget, setOrderTarget] = useState(BASE_ORDER_COUNT);
  const displayedOrderCount = useCountUp({ target: orderTarget, start: BASE_ORDER_COUNT, duration: 900 });

  // Brillo de cristal (Liquid Glass) que sigue al cursor, acotado a esta sección
  useEffect(() => {
    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotionRef.current) return;

    const onMove = (e: PointerEvent) => {
      const els = sectionRef.current?.querySelectorAll<HTMLElement>('.glass-spotlight');
      els?.forEach((el) => {
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

  // Ticker "pedidos hoy": sube de a poco para transmitir actividad en vivo, sin sobre-notificar
  useEffect(() => {
    if (reducedMotionRef.current) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const delay = 3500 + Math.random() * 3000;
      timeoutId = setTimeout(() => {
        setOrderTarget((t) => t + Math.ceil(Math.random() * 3));
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, []);

  // Inclinación 3D del iPhone al mover el mouse sobre la columna visual
  const handlePhoneMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotionRef.current || !phoneImgRef.current || !visualRef.current) return;
    const r = visualRef.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * 2 - 1;
    const py = ((e.clientY - r.top) / r.height) * 2 - 1;
    const rotateY = px * 5;
    const rotateX = -py * 3;
    phoneImgRef.current.style.transform = `rotate(6deg) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
  };

  const handlePhoneLeave = () => {
    if (!phoneImgRef.current) return;
    phoneImgRef.current.style.transform = 'rotate(6deg) scale(1)';
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen w-full
        bg-[linear-gradient(270deg,#ffffff,#fef3c7,#fde68a,#ffffff)]
        bg-[length:400%_400%]
        animate-gradient
         flex items-center justify-center pt-20 pb-12 px-6 overflow-hidden">
      {/* Fundido al blanco en el borde inferior, para empatar con la siguiente sección sin importar la fase de animate-gradient */}
      <div className="absolute inset-x-0 bottom-0 h-24 sm:h-32 bg-gradient-to-b from-transparent to-white pointer-events-none" aria-hidden="true" />

      <div className="max-w-7xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fade-in-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur-md border border-yellow-200/80 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-primary animate-glow" />
              <span className="font-body text-sm font-semibold text-a11y-yellow-darker">Pide. Llega. Recoge.</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-5">
              <h1
                className="font-display text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-gray-900 leading-tight animate-reveal"
                style={{ animationDelay: '100ms' }}
              >
                Compra en el campus{' '}
                <span className="bg-gradient-to-r from-primary to-amber-600 bg-clip-text text-transparent animate-gradient-shift">
                  sin hacer filas
                </span>
              </h1>
              <p className="font-body text-xl text-gray-600 leading-relaxed max-w-xl animate-slide-up-delay-1">
                Pide comida, papelería y mucho más. Recoge sin esperas. Paga en línea o en sitio.
                La forma inteligente de comprar en la universidad.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 animate-slide-up-delay-2">
              <button
                onClick={onGetStartedClick}
                className="px-8 py-4 rounded-xl font-body font-semibold text-gray-900 bg-gradient-to-r from-primary to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center gap-2 group hover:shadow-amber-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Crear cuenta gratis
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onSignInClick}
                className="glass-spotlight glass-spotlight-soft relative overflow-hidden px-8 py-4 rounded-xl font-body font-semibold text-gray-800 bg-white/40 backdrop-blur-xl border border-white/50 ring-1 ring-white/20 shadow-[0_8px_30px_-8px_rgba(31,38,135,0.25)] hover:bg-white/[0.55] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_rgba(31,38,135,0.35)] active:scale-95 active:translate-y-0 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" aria-hidden="true" />
                <span className="relative z-10">Iniciar sesión</span>
              </button>
            </div>

            {/* Trust Indicators */}

          </div>

          {/* Right Visual - iPhone Mockup */}
          <div
            ref={visualRef}
            onMouseMove={handlePhoneMove}
            onMouseLeave={handlePhoneLeave}
            className="relative h-full min-h-[650px] hidden md:flex items-center justify-center"
          >
            {/* Glow ambiental primario (dorado) */}
            <div className="absolute w-[520px] h-[520px] bg-yellow-300/25 blur-[100px] rounded-full pointer-events-none" aria-hidden="true" />
            {/* Segundo glow ambiental (cian) — aporta profundidad detrás del pedestal */}
            <div className="absolute bottom-8 left-4 w-[320px] h-[320px] bg-secondary/15 blur-[90px] rounded-full pointer-events-none" aria-hidden="true" />

            {/* Pedestal de vidrio — superficie sobre la que "se apoya" el producto */}
            <div className="absolute w-[380px] h-[540px] rotate-[3deg] pointer-events-none" aria-hidden="true">
              <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-white/50 via-yellow-100/30 to-transparent opacity-60 blur-2xl" />
              <div className="glass-spotlight glass-spotlight-soft relative h-full rounded-[2rem] overflow-hidden bg-white/25 backdrop-blur-2xl border border-white/40 ring-1 ring-white/15 shadow-[0_20px_60px_-15px_rgba(31,38,135,0.25)]">
                <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-[#F4B942]/20 via-[#F4B942]/6 to-transparent" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
              </div>
            </div>

            {/* Ticker "pedidos hoy" — actividad en vivo */}
            <div
              className="absolute top-6 left-4 z-20 hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/75 backdrop-blur-md border border-white/50 shadow-md"
              aria-hidden="true"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-glow" />
              <span className="font-body text-xs font-bold text-gray-900 tabular-nums">
                {Math.round(displayedOrderCount).toLocaleString('en-US')}
              </span>
              <span className="font-body text-xs text-gray-600">pedidos hoy</span>
            </div>

            {/* iPhone Mockup — protagonista único del hero */}
            <div className="relative z-10 animate-reveal" style={{ animationDelay: '200ms' }}>
              <div className="animate-float">
                <div className="relative w-full h-[620px] mx-auto [perspective:1200px]">
                  <img
                      ref={phoneImgRef}
                      src="/iPhone 17 Pro.png"
                      alt="Mockup de iPhone mostrando la aplicación ECIXPRESS con código QR para recoger pedidos sin filas en el campus"
                      style={{ transform: 'rotate(6deg) scale(1)' }}
                      className="
                      absolute right-[-500px] top-[50%] -translate-y-1/2
                      w-[940px]
                      max-w-none
                      object-contain
                      drop-shadow-[0_50px_80px_rgba(0,0,0,0.28)]
                      transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                    "
                  />
                  {/* Sombra de apoyo — ancla el producto al suelo visual */}
                  <div className="absolute bottom-[6%] right-[8%] w-[280px] h-[40px] bg-black/20 blur-2xl rounded-full -z-10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
