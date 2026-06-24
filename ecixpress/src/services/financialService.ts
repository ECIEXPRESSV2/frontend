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

export type OrderTransactionStatus =
  | 'PENDING'
  | 'HELD'
  | 'RELEASED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'FAILED';

/**
 * Pago de una orden contra la billetera del comprador (endpoint `/wallet/transactions`).
 * Todos los montos en centavos COP. El débito ocurre al pasar a HELD; `refundedAmount`
 * acumula lo reintegrado en devoluciones totales/parciales.
 */
export interface OrderTransaction {
  id: string;
  orderId: string;
  walletId: string;
  storeId: string;
  orderAmount: number;
  peakFeeAmount: number;
  /** Total debitado del wallet = orderAmount + peakFeeAmount. */
  totalCharged: number;
  status: OrderTransactionStatus;
  /** Monto ya reembolsado al comprador (0 si no hubo devolución). */
  refundedAmount: number;
  isPeakHour: boolean;
  failureReason?: string | null;
  heldAt?: string | null;
  releasedAt?: string | null;
  refundedAt?: string | null;
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

/** Pagos de órdenes (débitos) de la billetera, con su info de reembolsos. */
export const getWalletTransactions = (userId: string) =>
  financialFetch<OrderTransaction[]>('/wallet/transactions', userId);

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

// ─── Historial unificado de la billetera ──────────────────────────────────────
// El backend no expone un timeline único: combinamos las recargas (`/wallet/topups`)
// con los pagos de órdenes (`/wallet/transactions`) y derivamos de estos últimos
// tanto el débito como, si lo hubo, el reembolso. Todo se normaliza a `WalletMovement`
// para pintarlo en una sola lista ordenada por fecha.

export type WalletMovementKind = 'topup' | 'payment' | 'refund';
export type WalletMovementStatus = 'pending' | 'completed' | 'failed';

export interface WalletMovement {
  /** Clave única estable para el render. */
  id: string;
  kind: WalletMovementKind;
  /** 'in' acredita saldo (recarga/reembolso); 'out' lo debita (pago). */
  direction: 'in' | 'out';
  /** Monto en centavos COP (siempre positivo; el signo lo da `direction`). */
  amount: number;
  status: WalletMovementStatus;
  /** ISO de cuando ocurrió el movimiento. */
  date: string;
  title: string;
  subtitle?: string;
  /** Solo en recargas: método y id, para poder completar una recarga pendiente. */
  paymentMethod?: TopupPaymentMethod;
  topupId?: string;
  orderId?: string;
}

const shortId = (id: string) => id.slice(0, 8);

const TOPUP_STATUS: Record<TopupStatus, WalletMovementStatus> = {
  PENDING: 'pending',
  APPROVED: 'completed',
  FAILED: 'failed',
};

function topupToMovement(t: WalletTopup): WalletMovement {
  return {
    id: `topup:${t.id}`,
    kind: 'topup',
    direction: 'in',
    amount: t.amount,
    status: TOPUP_STATUS[t.status],
    date: t.createdAt,
    title: 'Recarga de saldo',
    paymentMethod: t.paymentMethod,
    topupId: t.id,
  };
}

/** Un pago de orden genera el débito y, si hubo devolución, también el reembolso. */
function transactionToMovements(tx: OrderTransaction): WalletMovement[] {
  const order = `Pedido #${shortId(tx.orderId)}`;
  const movements: WalletMovement[] = [];

  if (tx.status === 'FAILED') {
    movements.push({
      id: `pay:${tx.id}`,
      kind: 'payment',
      direction: 'out',
      amount: tx.orderAmount,
      status: 'failed',
      date: tx.createdAt,
      title: 'Pago de pedido',
      subtitle: order,
      orderId: tx.orderId,
    });
    return movements;
  }

  // El débito se realizó al retener (HELD); usamos esa fecha si está.
  movements.push({
    id: `pay:${tx.id}`,
    kind: 'payment',
    direction: 'out',
    amount: tx.totalCharged,
    status: 'completed',
    date: tx.heldAt ?? tx.createdAt,
    title: 'Pago de pedido',
    subtitle: tx.isPeakHour ? `${order} · hora pico` : order,
    orderId: tx.orderId,
  });

  if (tx.refundedAmount > 0) {
    const full = tx.status === 'REFUNDED';
    movements.push({
      id: `refund:${tx.id}`,
      kind: 'refund',
      direction: 'in',
      amount: tx.refundedAmount,
      status: 'completed',
      date: tx.refundedAt ?? tx.updatedAt,
      title: full ? 'Reembolso' : 'Reembolso parcial',
      subtitle: order,
      orderId: tx.orderId,
    });
  }

  return movements;
}

/** Fusiona recargas y pagos en un único historial ordenado (más reciente primero). */
export function buildWalletHistory(
  topups: WalletTopup[],
  transactions: OrderTransaction[],
): WalletMovement[] {
  return [
    ...topups.map(topupToMovement),
    ...transactions.flatMap(transactionToMovements),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ─── Utilidades de formato ─────────────────────────────────────────────────────

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Centavos COP → string con formato de moneda colombiana ($ 125.000). */
export const formatCOP = (cents: number): string =>
  copFormatter.format(Math.round(cents) / 100);
