import React, { useRef, useState, useCallback } from 'react';
import { Wifi } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────
interface CreditCardProps {
  balance: string;
  logoSrc?: string;
  width?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Spring easing — matches natural physics without Framer Motion */
const SPRING = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** Noise texture as inline SVG data-uri — adds micro-texture to glass surfaces */
const NOISE_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

// ─── Component ─────────────────────────────────────────────────────────────
const CreditCard: React.FC<CreditCardProps> = ({
  balance,
  logoSrc = '/eciexpress.svg',
  width = 540,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: dy * -12, y: dx * 12 });
    // Move shine to follow mouse
    if (shineRef.current) {
      const nx = ((e.clientX - rect.left) / rect.width) * 100;
      const ny = ((e.clientY - rect.top) / rect.height) * 100;
      shineRef.current.style.background =
        `radial-gradient(circle at ${nx}% ${ny}%, rgba(255,255,255,0.22) 0%, transparent 55%)`;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
    if (shineRef.current) {
      shineRef.current.style.background = 'none';
    }
  }, []);

  return (
    <div className="relative flex items-center justify-center p-6 select-none">
      {/* Ambient glow behind card */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 60%, rgba(251,191,36,0.28) 0%, transparent 75%)',
          filter: 'blur(20px)',
          transition: `opacity 0.4s ${SPRING}`,
          opacity: isHovered ? 1 : 0.6,
        }}
      />

      {/* Shadow layer card — depth illusion */}
      <div
        className="absolute rounded-[26px]"
        style={{
          width,
          aspectRatio: '1.586/1',
          background: 'linear-gradient(135deg, #b45309, #92400e)',
          transform: `perspective(1000px) rotateX(${tilt.x * 0.6}deg) rotateY(${tilt.y * 0.6}deg) translateY(10px) scale(0.96)`,
          filter: 'blur(16px)',
          opacity: 0.45,
          transition: `transform 0.5s ${SPRING}`,
        }}
      />

      {/* Main card */}
      <div
        ref={cardRef}
        className="relative cursor-pointer"
        style={{
          width,
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(0)`,
          transition: isHovered ? `transform 0.1s linear` : `transform 0.6s ${SPRING}`,
          transformStyle: 'preserve-3d',
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
      >
        {/* Card body */}
        <div
          className="relative rounded-[26px] overflow-hidden"
          style={{
            aspectRatio: '1.586/1', // Standard credit card ratio (85.6mm x 53.98mm)
            background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 40%, #F97316 100%)',
            boxShadow: `
              0 2px 0 rgba(255,255,255,0.25) inset,
              0 -1px 0 rgba(0,0,0,0.2) inset,
              1px 0 0 rgba(255,255,255,0.1) inset,
              -1px 0 0 rgba(0,0,0,0.1) inset,
              0 20px 60px rgba(245,158,11,0.4),
              0 8px 24px rgba(0,0,0,0.3)
            `,
            padding: '36px 48px 36px',
          }}
        >
          {/* Noise texture */}
          <div
            className="absolute inset-0 pointer-events-none rounded-[26px]"
            style={{
              backgroundImage: NOISE_BG,
              backgroundSize: '128px 128px',
              opacity: 0.6,
              mixBlendMode: 'overlay',
            }}
          />

          {/* Glass specular layer — top highlight */}
          <div
            className="absolute inset-0 pointer-events-none rounded-[26px]"
            style={{
              background:
                'linear-gradient(160deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.12) 30%, transparent 60%)',
            }}
          />

          {/* Dynamic mouse-follow shine */}
          <div
            ref={shineRef}
            className="absolute inset-0 pointer-events-none rounded-[26px]"
            style={{ transition: 'background 0.05s linear' }}
          />

          {/* Sweep shine — ambient loop */}
          <div
            className="absolute inset-0 pointer-events-none rounded-[26px] overflow-hidden"
          >
            <div
              className="absolute top-0 bottom-0 w-[40%] pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 50%, transparent)',
                animation: 'cardSweep 5s ease-in-out infinite',
                willChange: 'transform',
              }}
            />
          </div>

          {/* Decorative circles */}
          <div
            className="absolute -right-10 -top-10 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: 'rgba(255,255,255,0.12)', filter: 'blur(1px)' }}
          />
          <div
            className="absolute -left-4 -bottom-4 w-28 h-28 rounded-full pointer-events-none"
            style={{ background: 'rgba(180,83,9,0.22)', filter: 'blur(1px)' }}
          />

          {/* Card content */}
          <div className="relative z-10 flex flex-col h-full p-8">
            {/* Top row */}
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                {/* Logo */}
                <img
                  src={logoSrc}
                  alt="ECIExpress"
                  className="h-20 brightness-0 invert"
                />
              </div>
              <Wifi
                className="text-white/80"
                size={44}
                style={{ transform: 'rotate(90deg)' }}
              />
            </div>

            {/* Balance */}
            <div className="mt-auto">
              <p
                className="uppercase tracking-widest mb-3"
                style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)' }}
              >
                Saldo disponible
              </p>
              <p
                className="text-white font-extrabold tracking-tight"
                style={{ fontSize: 64, textShadow: '0 2px 4px rgba(0,0,0,0.15)' }}
              >
                {balance}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Keyframes ─────────────────────────────────────────────────────────────
const cardSweepStyles = `
  @keyframes cardSweep {
    0%   { transform: translateX(-100%) skewX(-8deg); opacity: 0; }
    20%  { opacity: 1; }
    80%  { opacity: 1; }
    100% { transform: translateX(350%) skewX(-8deg); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition-duration: 0.01ms !important; }
  }
`;

const CreditCardWithStyles: React.FC<CreditCardProps> = (props) => (
  <>
    <style>{cardSweepStyles}</style>
    <CreditCard {...props} />
  </>
);

export default CreditCardWithStyles;
