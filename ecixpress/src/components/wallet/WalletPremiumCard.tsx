import React from 'react';
import { Nfc } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

interface WalletPremiumCardProps {
  className?: string;
}

const WalletPremiumCard: React.FC<WalletPremiumCardProps> = ({ className = '' }) => {
  const { balanceLabel, hasWallet, loading } = useWallet();

  return (
    <div
      className={`relative aspect-[16/10] w-full max-w-md overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#F4B942_0%,#FBBF24_45%,#F59E0B_100%)] p-6 text-white shadow-[0_18px_40px_-12px_rgba(245,158,11,0.55)] ring-1 ring-white/30 ${className}`}
      role="group"
      aria-label="Billetera ECIxpress"
    >
      {/* Brillo especular */}
      <div className="pointer-events-none absolute -top-1/3 -left-[10%] h-[180%] w-[55%] -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      {/* Círculos translúcidos */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 h-36 w-36 rounded-full bg-white/10" />

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <img src="/eciexpress.svg" alt="ECIxpress" className="h-7 brightness-0 invert" />
          <Nfc size={26} className="opacity-90" aria-hidden="true" />
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/80">Saldo disponible</p>
          {loading ? (
            <div className="mt-1 h-9 w-40 motion-safe:animate-pulse rounded-lg bg-white/30" />
          ) : (
            <p className="mt-0.5 text-4xl font-extrabold tracking-tight drop-shadow-sm">
              {hasWallet ? balanceLabel : '$0'}
            </p>
          )}
          {!hasWallet && !loading && (
            <p className="mt-1 text-[11px] text-white/75">Billetera no provisionada</p>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold tracking-wide">Billetera ECIxpress</span>
          <span className="font-mono tracking-[0.2em] text-white/85">•••• 2026</span>
        </div>
      </div>
    </div>
  );
};

export default WalletPremiumCard;
