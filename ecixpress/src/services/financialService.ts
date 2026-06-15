// Cliente del microservicio financial-service (billetera / recargas).
//
// Este servicio NO valida JWT: identifica al usuario por el header `x-user-id`
// (en producción lo inyecta el API Gateway; en desarrollo lo enviamos directo
// con el id del perfil de Identity).

const FINANCIAL_URL = (
  import.meta.env.VITE_FINANCIAL_API_URL || 'http://localhost:3004'
).replace(/\/$/, '');

// ─── Tipos del dominio ────────────────────────────────────────────────────────

export type TopupPaymentMethod =
  | 'NEQUI'
  | 'DAVIPLATA'
  | 'PSE'
  | 'CARD'
  | 'BANCOLOMBIA_TRANSFER'
  | 'BANCOLOMBIA_QR';

export type TopupStatus = 'PENDING' | 'APPROVED' | 'FAILED';

export interface Wallet {
  id: string;
  userId: string;
  /** Saldo disponible en centavos COP. */
  balance: number;
  isActive: boolean;
}

export interface WalletTopup {
  id: string;
  walletId: string;
  /** Monto en centavos COP. */
  amount: number;
  paymentMethod: TopupPaymentMethod;
  status: TopupStatus;
  wompiTransactionId?: string | null;
  wompiResponse?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/** Datos específicos por método que recoge el frontend. */
export interface PaymentData {
  // NEQUI / DAVIPLATA
  phone_number?: string;
  // DAVIPLATA / PSE
  user_legal_id_type?: string;
  user_legal_id?: string;
  // PSE
  user_type?: number;
  financial_institution_code?: string;
  customer_phone?: string;
  customer_full_name?: string;
  // CARD (token generado por Wompi en el navegador)
  token?: string;
  installments?: number;
}

export interface CreateTopupDto {
  /** Monto en centavos COP (mínimo 1000 = $10 COP). */
  amount: number;
  paymentMethod: TopupPaymentMethod;
  paymentData?: PaymentData;
}

export interface CreateTopupResponse {
  topupId: string;
  status: TopupStatus;
  amount: number;
  paymentMethod: TopupPaymentMethod;
  /** URL donde completar el pago (DAVIPLATA, PSE, BANCOLOMBIA_TRANSFER). */
  redirectUrl: string | null;
  /** Respuesta cruda de Wompi (incluye extra.qr_image, async_payment_url, etc.). */
  wompi?: Record<string, any> | null;
}

export interface PseInstitution {
  financial_institution_code: string;
  financial_institution_name: string;
}

export interface TopupDetails {
  topupId: string;
  amount: number;
  paymentMethod: TopupPaymentMethod;
  /** Estado local (lo que mueve el saldo, vía webhook). */
  status: TopupStatus;
  /** Estado en vivo reportado por Wompi (puede adelantarse al webhook). */
  wompiStatus: string | null;
  /** URL para aprobar/completar el pago en sandbox. */
  redirectUrl: string | null;
  /** QR en base64 (BANCOLOMBIA_QR). */
  qrImage: string | null;
}

// ─── Errores ──────────────────────────────────────────────────────────────────

export class FinancialError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** El usuario aún no tiene billetera provisionada (404). */
export const isNoWalletError = (err: unknown): boolean =>
  err instanceof FinancialError && err.status === 404;

// ─── Cliente HTTP ─────────────────────────────────────────────────────────────

async function financialFetch<T>(
  path: string,
  userId: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-id': userId,
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${FINANCIAL_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { message?: unknown }).message;
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : typeof raw === 'string'
        ? raw
        : `Error ${res.status}`;
    throw new FinancialError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export const getWallet = (userId: string) =>
  financialFetch<Wallet>('/wallet', userId);

export const getTopups = (userId: string) =>
  financialFetch<WalletTopup[]>('/wallet/topups', userId);

export const createTopup = (userId: string, dto: CreateTopupDto) =>
  financialFetch<CreateTopupResponse>('/wallet/topups', userId, {
    method: 'POST',
    body: JSON.stringify(dto),
  });

export const getPseInstitutions = (userId: string) =>
  financialFetch<PseInstitution[]>('/wallet/topups/pse-institutions', userId);

/** Estado en vivo de una recarga + URL/QR de aprobación (consulta a Wompi en el backend). */
export const getTopupDetails = (userId: string, topupId: string) =>
  financialFetch<TopupDetails>(`/wallet/topups/${topupId}`, userId);

// ─── Tokenización de tarjeta (Wompi, directo desde el navegador) ───────────────
// La tarjeta NUNCA pasa por nuestro backend: se tokeniza contra Wompi con la
// llave pública y solo enviamos el token resultante en paymentData.token.

const WOMPI_BASE = (
  import.meta.env.VITE_WOMPI_BASE_URL || 'https://sandbox.wompi.co/v1'
).replace(/\/$/, '');
const WOMPI_PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY as
  | string
  | undefined;

export interface CardTokenInput {
  number: string;
  cvc: string;
  exp_month: string; // '08'
  exp_year: string; // '28'
  card_holder: string;
}

export async function tokenizeCard(card: CardTokenInput): Promise<string> {
  if (!WOMPI_PUBLIC_KEY) {
    throw new Error(
      'Falta configurar VITE_WOMPI_PUBLIC_KEY para pagar con tarjeta.',
    );
  }
  const res = await fetch(`${WOMPI_BASE}/tokens/cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${WOMPI_PUBLIC_KEY}`,
    },
    body: JSON.stringify({
      number: card.number.replace(/\s+/g, ''),
      cvc: card.cvc,
      exp_month: card.exp_month,
      exp_year: card.exp_year,
      card_holder: card.card_holder,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.status !== 'CREATED') {
    const detail =
      body?.error?.messages
        ? JSON.stringify(body.error.messages)
        : body?.error?.reason || `Error ${res.status}`;
    throw new Error(`No se pudo validar la tarjeta: ${detail}`);
  }
  return body.data.id as string;
}

// ─── Método de pago por defecto (persistido en localStorage) ───────────────────
// El backend no almacena métodos guardados, así que recordamos la preferencia
// del usuario localmente.

const defaultMethodKey = (userId: string) => `eci.wallet.defaultPayment.${userId}`;

export const getDefaultPaymentMethod = (
  userId: string,
): TopupPaymentMethod | null => {
  const v = localStorage.getItem(defaultMethodKey(userId));
  return (v as TopupPaymentMethod) || null;
};

export const setDefaultPaymentMethod = (
  userId: string,
  method: TopupPaymentMethod,
): void => {
  localStorage.setItem(defaultMethodKey(userId), method);
};

// ─── Utilidades de formato ─────────────────────────────────────────────────────

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Centavos COP → string con formato de moneda colombiana ($ 125.000). */
export const formatCOP = (cents: number): string =>
  copFormatter.format(Math.round(cents) / 100);
