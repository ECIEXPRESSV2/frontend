import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, PlusCircle, Shield, Zap, Sparkles, ArrowRight,
} from 'lucide-react';
import FloatingShape from './FloatingShapes';
import CreditCardUI from '../ui/CreditCard';

// ─── Types ─────────────────────────────────────────────────────────────────
interface ShowcaseItem {
  icon: React.ElementType;
  title: string;
  description: string;
  accentFrom: string;
  accentTo: string;
  image: string;
}

// ─── Mock data — swap with backend/CMS props ────────────────────────────────
const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    icon: PlusCircle,
    title: 'Recarga tu saldo',
    description: 'Añade dinero a tu wallet desde tarjeta, efectivo o transferencia',
    accentFrom: '#FBBF24',
    accentTo: '#F97316',
    image: 'https://images.unsplash.com/photo-1771587529573-7f514f51f2a4?w=900&q=85',
  },
  {
    icon: CreditCard,
    title: 'Paga en cafeterías',
    description: 'Usa tu wallet en todas las cafeterías del campus',
    accentFrom: '#22D3EE',
    accentTo: '#3B82F6',
    image: 'https://plus.unsplash.com/premium_photo-1661757317932-b7c322e41630?w=900&q=85',
  },
  {
    icon: Zap,
    title: 'Sin filas',
    description: 'Paga en segundos, recoge tu pedido y sigue con tu día',
    accentFrom: '#34D399',
    accentTo: '#059669',
    image: 'https://plus.unsplash.com/premium_photo-1743893719437-e6fc670a6c54?w=900&q=85',
  },
  {
    icon: Shield,
    title: '100% Segura',
    description: 'Tu saldo protegido con encriptación de nivel bancario',
    accentFrom: '#A855F7',
    accentTo: '#EC4899',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=85',
  },
];

// ─── Mock card data — swap with userData from backend ──────────────────────
const CARD_DATA = {
  balance: '$125,000',
  logoSrc: '/eciexpress.svg',
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
      <Sparkles className="w-3.5 h-3.5 text-yellow-600" />
      <span className="text-yellow-700 text-sm font-medium tracking-wide">{children}</span>
    </div>
);

/** Glass overlay card used inside image cards */
const GlassOverlay: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  accentFrom: string;
  accentTo: string;
  large?: boolean;
}> = ({ icon: Icon, title, description }) => (
    <div className="relative z-10 p-6 space-y-4 text-white">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-md border border-white/30 group-hover:scale-110 transition">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-bold text-lg">
        {title}
      </h3>
      <p className="text-sm text-white/80">
        {description}
      </p>
    </div>
);

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
          className="relative py-32 px-6 overflow-hidden bg-gradient-to-b from-white via-gray-50 to-white"
      >
        {/* ── Background layer ─────────────────────────────────────── */}
        {/* Ambient orbs — GPU-friendly, no JS */}
        <div
            className="absolute pointer-events-none"
            style={{
              top: '10%', left: '15%',
              width: 600, height: 600,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 65%)',
              filter: 'blur(80px)',
              animation: 'orbFloat 14s ease-in-out infinite',
              willChange: 'transform',
            }}
        />
        <div
            className="absolute pointer-events-none"
            style={{
              bottom: '15%', right: '10%',
              width: 500, height: 500,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 65%)',
              filter: 'blur(80px)',
              animation: 'orbFloat 18s ease-in-out infinite reverse',
              willChange: 'transform',
            }}
        />
        <div
            className="absolute pointer-events-none"
            style={{
              top: '45%', left: '45%',
              width: 700, height: 700,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 65%)',
              filter: 'blur(100px)',
              transform: 'translate(-50%, -50%)',
            }}
        />

        <div className="relative max-w-7xl mx-auto">

          {/* ── Header ───────────────────────────────────────────────── */}
          <div
              className="text-center mb-20"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(32px)',
                transition: `opacity 0.9s ${SPRING}, transform 0.9s ${SPRING}`,
              }}
          >
            <EyebrowBadge>Nueva generación</EyebrowBadge>
            <h2
                className="text-gray-900 leading-tight mb-5"
                style={{
                  fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                  lineHeight: 1.08,
                }}
            >
              Tu Wallet{' '}
              <span
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #FBBF24, #FB923C, #FBBF24)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'gradientShift 4s linear infinite',
                  }}
              >
              Digital
            </span>
            </h2>
            <p
                className="text-gray-600 max-w-2xl mx-auto leading-relaxed"
                style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)' }}
            >
              Recarga saldo, paga en cafeterías y recoge tu pedido sin filas.
              Tu wallet universitaria en una sola app.
            </p>
          </div>

          {/* ── Grid ─────────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Featured card — full width */}
            <div
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(40px)',
                  transition: `opacity 0.8s ${SPRING} 80ms, transform 0.8s ${SPRING} 80ms`,
                }}
            >
              <ImageCard item={SHOWCASE_ITEMS[0]} height={300} />
            </div>

            {/* Medium row */}
            <div className="grid md:grid-cols-2 gap-5">
              {SHOWCASE_ITEMS.slice(1, 3).map((item, i) => (
                  <div
                      key={item.title}
                      style={{
                        opacity: visible ? 1 : 0,
                        transform: visible ? 'translateY(0)' : 'translateY(40px)',
                        transition: `opacity 0.8s ${SPRING} ${160 + i * 80}ms, transform 0.8s ${SPRING} ${160 + i * 80}ms`,
                      }}
                  >
                    <ImageCard item={item} height={200} />
                  </div>
              ))}
            </div>

            {/* Security card */}
            <div
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(40px)',
                  transition: `opacity 0.8s ${SPRING} 320ms, transform 0.8s ${SPRING} 320ms`,
                }}
            >
              <ImageCard item={SHOWCASE_ITEMS[3]} height={180} />
            </div>
          </div>

          {/* ── Credit Card Section ─────────────────────────────────────── */}
          <div
              className="py-16 flex justify-center relative"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(40px)',
                transition: `opacity 0.8s ${SPRING} 400ms, transform 0.8s ${SPRING} 400ms`,
              }}
          >
            {/* Modern floating elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <FloatingShape
                  type="circle"
                  size={80}
                  color="rgba(251, 191, 36, 0.2)"
                  blur={20}
                  position="top-left"
                  animation="pulse"
                  animationDuration="3s"
              />
              <FloatingShape
                  type="circle"
                  size={64}
                  color="rgba(249, 115, 22, 0.2)"
                  blur={20}
                  position="bottom-right"
                  animation="pulse"
                  animationDuration="4s"
                  animationDelay="1s"
              />
              <FloatingShape
                  type="circle"
                  size={48}
                  color="rgba(34, 211, 238, 0.2)"
                  blur={20}
                  position="center-left"
                  animation="pulse"
                  animationDuration="5s"
                  animationDelay="2s"
              />
              <FloatingShape
                  type="diamond"
                  size={32}
                  color="rgba(251, 191, 36, 0.3)"
                  position="top-right"
                  animation="spin"
                  animationDuration="10s"
              />
              <FloatingShape
                  type="diamond"
                  size={24}
                  color="rgba(249, 115, 22, 0.3)"
                  position="bottom-left"
                  animation="spin"
                  animationDuration="8s"
              />
            </div>

            <CreditCardUI
              balance={CARD_DATA.balance}
              logoSrc={CARD_DATA.logoSrc}
            />
          </div>

          {/* ── CTA ──────────────────────────────────────────────────── */}
          <div
              className="mt-16 flex flex-col items-center gap-4"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.8s ${SPRING} 600ms, transform 0.8s ${SPRING} 600ms`,
              }}
          >
            <button
                onClick={() => navigate('/signin')}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-gray-900 bg-gradient-to-r from-yellow-400 to-yellow-500 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2"
            >
              <span className="text-base font-bold tracking-tight">
                Comenzar a usar tu wallet
              </span>
              <ArrowRight size={20} />
            </button>
            <p className="text-gray-500 text-xs tracking-wide">
              Sin comisiones · Activación inmediata · Cancela cuando quieras
            </p>
          </div>
        </div>

        {/* ── Keyframes ────────────────────────────────────────────────── */}
        <style>{`
        @keyframes cardSweep {
          0%   { transform: translateX(-100%) skewX(-8deg); opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateX(350%) skewX(-8deg); opacity: 0; }
        }
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-24px) scale(1.04); }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
      </section>
  );
};

// ─── ImageCard ──────────────────────────────────────────────────────────────
const ImageCard: React.FC<{
  item: ShowcaseItem;
  large?: boolean;
  height?: number;
}> = ({ item, large, height }) => {
  const [hovered, setHovered] = useState(false);

  return (
      <div
          className="relative rounded-3xl overflow-hidden group cursor-pointer"
          style={{
            height: large ? 'clamp(320px, 35vw, 440px)' : height ?? 280,
            boxShadow: hovered
                ? `0 24px 64px rgba(0,0,0,0.55), 0 2px 0 rgba(255,255,255,0.06) inset`
                : `0 8px 32px rgba(0,0,0,0.4), 0 2px 0 rgba(255,255,255,0.04) inset`,
            border: '1px solid rgba(255,255,255,0.07)',
            transition: `box-shadow 0.4s ${SPRING}`,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
      >
        {/* Image */}
        <img
            src={item.image}
            alt={`${item.title}: ${item.description}`}
            className="absolute inset-0 w-full h-full object-cover scale-110 group-hover:scale-125 transition duration-700"
            loading="lazy"
        />

        {/* Overlay for contrast */}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition" />

        {/* Content */}
        <GlassOverlay
            icon={item.icon}
            title={item.title}
            description={item.description}
            accentFrom={item.accentFrom}
            accentTo={item.accentTo}
            large={large}
        />
      </div>
  );
};

export default WalletShowcaseSection;