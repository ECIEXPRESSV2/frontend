import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, PlusCircle, Shield, Zap, Sparkles, ArrowRight,
} from 'lucide-react';
import CreditCardUI from '../ui/CreditCard';
import { useInViewReveal } from '../../hooks/useInViewReveal';

interface ChipItem {
  icon: React.ElementType;
  title: string;
  description: string;
}

const CHIP_ITEMS: ChipItem[] = [
  {
    icon: PlusCircle,
    title: 'Recarga tu saldo',
    description: 'Tarjeta, efectivo o transferencia',
  },
  {
    icon: CreditCard,
    title: 'Paga en cafeterías',
    description: 'En todo el campus',
  },
  {
    icon: Zap,
    title: 'Paga y listo',
    description: 'Confirma en segundos',
  },
  {
    icon: Shield,
    title: '100% Segura',
    description: 'Encriptación nivel bancario',
  },
];

const CARD_DATA = {
  balance: '$125,000',
  logoSrc: '/ecixpress-mark.svg',
};

/** Spring easing — matches natural physics without Framer Motion */
const SPRING = 'cubic-bezier(0.22, 1, 0.36, 1)';

const revealStyle = (visible: boolean, distance: number, delayMs = 0, durationMs = 800) => ({
  opacity: visible ? 1 : 0,
  transform: visible ? 'translateY(0)' : `translateY(${distance}px)`,
  transition: `opacity ${durationMs}ms ${SPRING} ${delayMs}ms, transform ${durationMs}ms ${SPRING} ${delayMs}ms`,
});

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

/** Compact feature chip */
const FeatureChip: React.FC<{ item: ChipItem }> = ({ item }) => {
  const Icon = item.icon;
  return (
    <div className="group flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-gray-100/80 backdrop-blur-md border border-white shadow-sm group-hover:scale-110 group-hover:bg-white transition">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
      <div className="min-w-0">
        <p className="font-body font-semibold text-sm text-gray-900 truncate">{item.title}</p>
        <p className="font-body text-xs text-gray-500 truncate">{item.description}</p>
      </div>
    </div>
  );
};

const WalletShowcaseSection: React.FC = () => {
  const { ref: sectionRef, isVisible: visible } = useInViewReveal<HTMLDivElement>({ threshold: 0.15 });
  const navigate = useNavigate();

  return (
      <section
          ref={sectionRef}
          className="relative py-20 md:py-28 px-6 overflow-hidden bg-gradient-to-b from-white via-gray-50 to-white"
      >
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

          <div
              className="text-center mb-12"
              style={revealStyle(visible, 32, 0, 900)}
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

          <div
              className="py-8 flex justify-center relative"
              style={revealStyle(visible, 40, 120)}
          >
            <CreditCardUI
              balance={CARD_DATA.balance}
              logoSrc={CARD_DATA.logoSrc}
            />
          </div>

          <div
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8"
              style={revealStyle(visible, 24, 280)}
          >
            {CHIP_ITEMS.map((item) => (
              <FeatureChip key={item.title} item={item} />
            ))}
          </div>

          <div
              className="mt-16 flex flex-col items-center gap-4"
              style={revealStyle(visible, 20, 400)}
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
              Sin comisiones · Activación inmediata
            </p>
          </div>
        </div>
      </section>
  );
};

export default WalletShowcaseSection;
