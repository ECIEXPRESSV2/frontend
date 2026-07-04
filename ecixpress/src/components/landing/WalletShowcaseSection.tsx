import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, PlusCircle, Shield, Zap, Sparkles, ArrowRight,
} from 'lucide-react';
import CreditCardUI from '../ui/CreditCard';

// ─── Types ─────────────────────────────────────────────────────────────────
interface ChipItem {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
}

// ─── Mock data — swap with backend/CMS props ────────────────────────────────
const CHIP_ITEMS: ChipItem[] = [
  {
    icon: PlusCircle,
    title: 'Recarga tu saldo',
    description: 'Tarjeta, efectivo o transferencia',
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    icon: CreditCard,
    title: 'Paga en cafeterías',
    description: 'En todo el campus',
    gradient: 'from-secondary to-blue-600',
  },
  {
    icon: Zap,
    title: 'Paga y listo',
    description: 'Confirma en segundos',
    gradient: 'from-emerald-400 to-emerald-600',
  },
  {
    icon: Shield,
    title: '100% Segura',
    description: 'Encriptación nivel bancario',
    gradient: 'from-slate-600 to-slate-800',
  },
];

// ─── Mock card data — swap with userData from backend ──────────────────────
const CARD_DATA = {
  balance: '$125,000',
  logoSrc: '/ecixpress-mark.svg',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Spring easing — matches natural physics without Framer Motion */
const SPRING = 'cubic-bezier(0.22, 1, 0.36, 1)';

// ─── Sub-components ─────────────────────────────────────────────────────────

/** Glass pill badge */
const EyebrowBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-400/30 mb-6"
         style={{
           background: 'rgba(251,191,36,0.1)',
           backdropFilter: 'blur(12px)',
           boxShadow: 'inset 0 1px 0 rgba(251,191,36,0.2), 0 1px 16px rgba(251,191,36,0.1)',
         }}
    >
      <Sparkles className="w-3.5 h-3.5 text-a11y-yellow-dark" />
      <span className="font-body text-a11y-yellow-darker text-sm font-medium tracking-wide">{children}</span>
    </div>
);

/** Compact feature chip — reemplaza las cards fotográficas grandes que competían con la tarjeta */
const FeatureChip: React.FC<{ item: ChipItem }> = ({ item }) => {
  const Icon = item.icon;
  return (
    <div className="group flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-gradient-to-r ${item.gradient} group-hover:scale-110 transition`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="font-body font-semibold text-sm text-gray-900 truncate">{item.title}</p>
        <p className="font-body text-xs text-gray-500 truncate">{item.description}</p>
      </div>
    </div>
  );
};

// ─── Main component ─────────────────────────────────────────────────────────
const WalletShowcaseSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setVisible(true); },
        { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
      <section
          ref={sectionRef}
          className="relative py-20 md:py-28 px-6 overflow-hidden bg-gradient-to-b from-white via-gray-50 to-white"
      >
        {/* Un solo glow ambiental, centrado detrás de la tarjeta */}
        <div
            className="absolute pointer-events-none"
            style={{
              top: '20%', left: '50%',
              width: 700, height: 700,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(251,191,36,0.16) 0%, transparent 65%)',
              filter: 'blur(90px)',
              transform: 'translate(-50%, -20%)',
            }}
        />

        <div className="relative max-w-5xl mx-auto">

          {/* ── Header ───────────────────────────────────────────────── */}
          <div
              className="text-center mb-12"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(32px)',
                transition: `opacity 0.9s ${SPRING}, transform 0.9s ${SPRING}`,
              }}
          >
            <EyebrowBadge>Nueva generación</EyebrowBadge>
            <h2 className="font-display text-4xl md:text-5xl font-semibold text-gray-900 leading-tight mb-5">
              Tu Wallet{' '}
              <span className="bg-gradient-to-r from-primary to-amber-600 bg-clip-text text-transparent animate-gradient-shift">
                Digital
              </span>
            </h2>
            <p className="font-body text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Recarga saldo, paga en cafeterías y recoge tu pedido sin filas.
              Tu wallet universitaria en una sola app.
            </p>
          </div>

          {/* ── Credit Card — protagonista visual de la sección ─────────── */}
          <div
              className="py-8 flex justify-center relative"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(40px)',
                transition: `opacity 0.8s ${SPRING} 120ms, transform 0.8s ${SPRING} 120ms`,
              }}
          >
            <CreditCardUI
              balance={CARD_DATA.balance}
              logoSrc={CARD_DATA.logoSrc}
            />
          </div>

          {/* ── Chips de apoyo — compactos, sin competir con la tarjeta ──── */}
          <div
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.8s ${SPRING} 280ms, transform 0.8s ${SPRING} 280ms`,
              }}
          >
            {CHIP_ITEMS.map((item) => (
              <FeatureChip key={item.title} item={item} />
            ))}
          </div>

          {/* ── CTA ──────────────────────────────────────────────────── */}
          <div
              className="mt-16 flex flex-col items-center gap-4"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.8s ${SPRING} 400ms, transform 0.8s ${SPRING} 400ms`,
              }}
          >
            <button
                onClick={() => navigate('/signup')}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-body font-semibold text-gray-900 bg-gradient-to-r from-primary to-amber-500 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span className="text-base font-semibold tracking-tight">
                Activar mi wallet
              </span>
              <ArrowRight size={20} />
            </button>
            <p className="font-body text-gray-500 text-xs tracking-wide">
              Sin comisiones · Activación inmediata · Cancela cuando quieras
            </p>
          </div>
        </div>
      </section>
  );
};

export default WalletShowcaseSection;
