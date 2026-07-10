import React from 'react';
import { CircleDot, Nfc } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

interface WalletPremiumCardProps {
  className?: string;
}

const WalletPremiumCard: React.FC<WalletPremiumCardProps> = ({ className = '' }) => {
  const { balanceLabel, hasWallet, loading } = useWallet();

  return (
    <div
      className={`relative aspect-[16/10] min-h-[218px] w-full max-w-[420px] overflow-hidden rounded-[26px] bg-[linear-gradient(135deg,#E9B44A_0%,#F5C94A_42%,#F7E2AA_100%)] p-5 text-white shadow-[0_18px_40px_-12px_rgba(245,158,11,0.42)] ring-1 ring-white/30 sm:p-6 ${className}`}
      role="group"
      aria-label="Billetera ECIEXPRESS"
    >
      <div className="pointer-events-none absolute -left-[10%] -top-1/3 h-[180%] w-[55%] -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/16 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 h-36 w-36 rounded-full bg-white/12 blur-2xl" />

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/75">Tarjeta virtual</p>
            <img src="/ecixpress-logo.svg" alt="ECIEXPRESS" className="mt-2 h-9 max-w-[150px] brightness-0 invert" />
          </div>
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/16 backdrop-blur-sm">
            <Nfc size={25} className="opacity-90" aria-hidden="true" />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-white/82">Saldo disponible</p>
          {loading ? (
            <div className="mt-2 h-9 w-36 motion-safe:animate-pulse rounded-lg bg-white/30" />
          ) : (
            <p className="mt-1 text-4xl font-black leading-none tracking-normal drop-shadow-sm sm:text-[2.6rem]">
              {hasWallet ? balanceLabel : '$0'}
            </p>
          )}
          {!hasWallet && !loading && (
            <p className="mt-1 text-[11px] text-white/75">Billetera no provisionada</p>
          )}
        </div>

        <div className="flex items-end justify-between gap-3 text-sm">
          <div className="min-w-0 space-y-1">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75">
              <CircleDot size={12} aria-hidden="true" />
              Cuenta ECIEXPRESS
            </span>
            <span className="block truncate text-sm font-semibold tracking-wide text-white">Billetera digital</span>
          </div>
          <span className="flex-shrink-0 font-mono text-xs tracking-[0.18em] text-white/85">.... 2026</span>
        </div>
      </div>
    </div>
  );
};

export default WalletPremiumCard;
