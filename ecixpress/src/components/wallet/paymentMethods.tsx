import React from 'react';
import { CreditCard, QrCode } from 'lucide-react';
import type { TopupPaymentMethod } from '../../services/financialService';

// Íconos estilizados de cada método (aproximaciones de marca con sus colores;
// no son los logotipos oficiales). Se renderizan como una insignia redondeada.

interface BadgeProps {
  size?: number;
  className?: string;
}

const Badge: React.FC<
  BadgeProps & { bg: string; fg: string; children: React.ReactNode; rounded?: string }
> = ({ size = 28, bg, fg, children, className = '', rounded = 'rounded-lg' }) => (
  <span
    className={`inline-flex items-center justify-center font-bold leading-none flex-shrink-0 ${rounded} ${className}`}
    style={{
      width: size,
      height: size,
      background: bg,
      color: fg,
      fontSize: size * 0.42,
    }}
  >
    {children}
  </span>
);

export const NequiIcon: React.FC<BadgeProps> = ({ size = 28, className = '' }) => (
  <span
    className={`inline-flex items-center justify-center rounded-xl bg-white flex-shrink-0 ${className}`}
    style={{ width: size, height: size }}
  >
    <svg viewBox="0 0 100 100" width={size * 0.82} height={size * 0.82}>
      <rect x="20" y="18" width="46" height="46" rx="14" fill="#13E2D0" transform="rotate(16 43 41)" />
      <rect x="36" y="38" width="46" height="46" rx="14" fill="#FF1E8C" transform="rotate(16 59 61)" />
      <rect x="28" y="28" width="44" height="44" rx="14" fill="#2B0A4A" transform="rotate(16 50 50)" />
    </svg>
  </span>
);

export const DaviplataIcon: React.FC<BadgeProps> = ({ size = 28, className = '' }) => (
  <span
    className={`inline-flex items-center justify-center rounded-xl flex-shrink-0 ${className}`}
    style={{ width: size, height: size, background: '#E52320' }}
  >
    <svg viewBox="0 0 100 100" width={size} height={size}>
      {/* Casita (silueta de la marca Daviplata) */}
      <path
        d="M50 14 L83 41 Q85 43 85 47 L85 78 Q85 85 78 85 L22 85 Q15 85 15 78 L15 47 Q15 43 17 41 Z"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <text
        x="50" y="60" textAnchor="middle" fontFamily="'Arial Black', Arial, sans-serif"
        fontWeight="900" fontSize="22" letterSpacing="-1.2" fill="#FFFFFF"
      >
        DAVI
      </text>
      <text
        x="52" y="78" textAnchor="middle" fontFamily="Arial, sans-serif"
        fontWeight="700" fontStyle="italic" fontSize="17" fill="#FFFFFF"
      >
        plata
      </text>
    </svg>
  </span>
);

export const PseIcon: React.FC<BadgeProps> = (p) => (
  <Badge {...p} bg="#173C8B" fg="#FFFFFF" rounded="rounded-full">
    pse
  </Badge>
);

/** Marca de Bancolombia: tres barras redondeadas escalonadas. */
const BancolombiaBars: React.FC<BadgeProps> = ({ size = 28, className = '' }) => (
  <span
    className={`inline-flex items-center justify-center rounded-lg bg-white flex-shrink-0 ${className}`}
    style={{ width: size, height: size }}
  >
    <svg viewBox="0 0 100 100" width={size * 0.74} height={size * 0.74}>
      <g fill="#2B2A28" transform="rotate(-6 50 50)">
        <rect x="34" y="25" width="40" height="12" rx="6" />
        <rect x="23" y="44" width="54" height="12" rx="6" />
        <rect x="38" y="63" width="34" height="12" rx="6" />
      </g>
    </svg>
  </span>
);

export const BancolombiaTransferIcon: React.FC<BadgeProps> = (p) => (
  <BancolombiaBars {...p} />
);

export const BancolombiaQrIcon: React.FC<BadgeProps> = ({ size = 28, className = '' }) => (
  <span
    className={`inline-flex items-center justify-center rounded-lg flex-shrink-0 ${className}`}
    style={{ width: size, height: size, background: '#FDDA24', color: '#26221E' }}
  >
    <QrCode size={size * 0.6} />
  </span>
);

// Tarjeta: solo el ícono, sin fondo (hereda el color del contexto).
export const CardIcon: React.FC<BadgeProps> = ({ size = 28, className = '' }) => (
  <CreditCard size={size} className={`flex-shrink-0 ${className}`} />
);

// ─── Tipos de campos del formulario por método ────────────────────────────────

export type FieldKey =
  | 'phone_number'
  | 'doc'
  | 'pse'
  | 'card';

export interface PaymentMethodMeta {
  key: TopupPaymentMethod;
  label: string;
  /** Texto corto bajo el ícono. */
  short: string;
  description: string;
  Icon: React.FC<BadgeProps>;
  /** Campos a renderizar en el formulario de recarga. */
  fields: FieldKey[];
}

export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  {
    key: 'NEQUI',
    label: 'Nequi',
    short: 'Nequi',
    description: 'Pago con notificación push a tu app Nequi.',
    Icon: NequiIcon,
    fields: ['phone_number'],
  },
  {
    key: 'DAVIPLATA',
    label: 'Daviplata',
    short: 'Daviplata',
    description: 'Confirmas el pago en la app Daviplata.',
    Icon: DaviplataIcon,
    fields: ['phone_number', 'doc'],
  },
  {
    key: 'PSE',
    label: 'PSE',
    short: 'PSE',
    description: 'Débito desde tu banco vía PSE.',
    Icon: PseIcon,
    fields: ['pse'],
  },
  {
    key: 'CARD',
    label: 'Tarjeta',
    short: 'Tarjeta',
    description: 'Crédito o débito (Visa, Mastercard).',
    Icon: CardIcon,
    fields: ['card'],
  },
  {
    key: 'BANCOLOMBIA_TRANSFER',
    label: 'Bancolombia',
    short: 'Bancolombia',
    description: 'Botón de pagos Bancolombia.',
    Icon: BancolombiaTransferIcon,
    fields: [],
  },
  {
    key: 'BANCOLOMBIA_QR',
    label: 'Bancolombia QR',
    short: 'QR',
    description: 'Escaneas un código QR para pagar.',
    Icon: BancolombiaQrIcon,
    fields: [],
  },
];

export const getMethodMeta = (key: TopupPaymentMethod): PaymentMethodMeta =>
  PAYMENT_METHODS.find((m) => m.key === key) ?? PAYMENT_METHODS[0];

export const PaymentMethodIcon: React.FC<{
  method: TopupPaymentMethod;
  size?: number;
  className?: string;
}> = ({ method, size, className }) => {
  const { Icon } = getMethodMeta(method);
  return <Icon size={size} className={className} />;
};
