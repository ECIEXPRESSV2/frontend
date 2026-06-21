import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Copy,
  Check,
  QrCode,
  Clock,
  ShieldCheck,
  PackageCheck,
  AlertTriangle,
} from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { useFulfillmentApi } from '../../hooks/useFulfillmentApi';
import { FulfillmentApiError, type FulfillmentStatus, type PickupCodeResponse } from '../../lib/fulfillment-api';
import {
  deliveryMethodLabel,
  failureReasonLabel,
  pickupStatusHint,
  pickupStatusLabel,
  pickupStatusTone,
} from '../../lib/fulfillment-ui';
import { formatDateTime } from '../../lib/format';

interface PickupCodePageProps {
  onBack?: () => void;
}

/** Cuenta regresiva legible hasta `iso`. Devuelve null si ya pasó. */
function useCountdown(iso?: string): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!iso) return null;
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return null;
  const totalMin = Math.floor(diff / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min ${s} s`;
  return `${s} s`;
}

/**
 * Pantalla del comprador: muestra el código de retiro de un pedido (UC-02) y el estado del
 * proceso de retiro (UC-09). El QR se renderiza desde la URL pública del PNG que da el backend.
 */
const PickupCodePage: React.FC<PickupCodePageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { orderId = '' } = useParams<{ orderId: string }>();
  const api = useFulfillmentApi();

  const [code, setCode] = useState<PickupCodeResponse | null>(null);
  const [status, setStatus] = useState<FulfillmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notReady, setNotReady] = useState(false);
  const [copied, setCopied] = useState<'short' | 'token' | null>(null);

  const countdown = useCountdown(code?.expiresAt);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    setNotReady(false);
    try {
      // El estado (UC-09) siempre se puede consultar; el código (UC-02) puede no existir aún.
      const [codeResult, statusResult] = await Promise.allSettled([
        api.getOrderCode(orderId),
        api.getFulfillmentStatus(orderId),
      ]);

      if (statusResult.status === 'fulfilled') setStatus(statusResult.value);

      if (codeResult.status === 'fulfilled') {
        setCode(codeResult.value);
      } else {
        const err = codeResult.reason;
        if (err instanceof FulfillmentApiError && err.status === 404) {
          setCode(null);
          setNotReady(true);
        } else if (statusResult.status === 'rejected') {
          // Ambas fallaron: superficie el error real.
          throw err;
        }
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No pudimos cargar el código de retiro. Inténtalo de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  }, [api, orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = async (value: string, which: 'short' | 'token') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard no disponible */
    }
  };

  const expired = useMemo(
    () => Boolean(code && new Date(code.expiresAt).getTime() <= Date.now()),
    [code],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="orders" />

      <main className="ml-16 p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => (onBack ? onBack() : navigate('/orders'))}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-xl border border-white/40 text-gray-700 font-medium text-sm hover:bg-yellow-50 hover:text-yellow-600 transition-all"
              >
                <ArrowLeft size={16} /> Volver
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Código de retiro</h1>
            </div>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/70 border border-white/50 text-gray-700 font-semibold hover:bg-white transition-all"
            >
              <RefreshCw size={16} /> Actualizar
            </button>
          </div>

          {loading && (
            <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 p-10 text-center text-gray-500">
              Cargando tu código de retiro…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center">
              <AlertTriangle className="mx-auto mb-2 text-red-500" size={28} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!loading && !error && notReady && (
            <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 p-10 text-center">
              <QrCode className="mx-auto mb-3 text-yellow-400" size={40} />
              <p className="font-semibold text-gray-800">Aún no hay un código de retiro para este pedido.</p>
              <p className="text-sm text-gray-500 mt-1">
                El código se genera cuando la tienda confirma tu pedido. Vuelve en un momento.
              </p>
            </div>
          )}

          {!loading && !error && code && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tarjeta del QR */}
              <section className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-sm p-6 flex flex-col items-center text-center">
                <span
                  className={`self-end px-3 py-1 rounded-full text-xs font-semibold ${pickupStatusTone[code.status]}`}
                >
                  {pickupStatusLabel[code.status]}
                </span>

                <div className="mt-2 mb-4 rounded-2xl bg-white p-4 border border-gray-100 shadow-inner">
                  <img
                    src={code.qrCode}
                    alt="Código QR de retiro"
                    width={220}
                    height={220}
                    className={`w-[220px] h-[220px] object-contain ${code.status !== 'ACTIVE' ? 'opacity-30 grayscale' : ''}`}
                  />
                </div>

                {/* Código corto */}
                <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Código corto</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-bold tracking-[0.3em] text-gray-900">{code.shortCode}</span>
                  <button
                    onClick={() => copy(code.shortCode, 'short')}
                    title="Copiar código corto"
                    className="p-2 rounded-lg text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 transition"
                  >
                    {copied === 'short' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  </button>
                </div>

                <p className="text-sm text-gray-500 mt-4 max-w-xs">{pickupStatusHint[code.status]}</p>
              </section>

              {/* Detalle */}
              <section className="space-y-4">
                <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm p-5 space-y-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock size={18} className="text-yellow-500" />
                    <span className="font-semibold">Vigencia</span>
                  </div>
                  {code.status === 'ACTIVE' && !expired ? (
                    <p className="text-sm text-gray-600">
                      Vence en <span className="font-semibold text-gray-900">{countdown ?? 'unos segundos'}</span>
                      <br />
                      <span className="text-gray-400">({formatDateTime(code.expiresAt)})</span>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {code.usedAt
                        ? `Usado el ${formatDateTime(code.usedAt)}.`
                        : `Venció el ${formatDateTime(code.expiresAt)}.`}
                    </p>
                  )}
                </div>

                {/* Token (respaldo) */}
                <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm p-5 space-y-2">
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                    Token del QR (respaldo)
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 truncate">
                      {code.token}
                    </code>
                    <button
                      onClick={() => copy(code.token, 'token')}
                      title="Copiar token"
                      className="p-2 rounded-lg text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 transition"
                    >
                      {copied === 'token' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                {/* Estado del proceso de retiro (UC-09) */}
                {status && <FulfillmentStatusCard status={status} />}
              </section>
            </div>
          )}

          {/* Si no hay código pero sí estado (p. ej. ya entregado y código USED no se mostró) */}
          {!loading && !error && !code && !notReady && status && (
            <FulfillmentStatusCard status={status} />
          )}
        </div>
      </main>
    </div>
  );
};

/** Resumen del proceso de retiro: estado del código, entrega o fallo (UC-09). */
const FulfillmentStatusCard: React.FC<{ status: FulfillmentStatus }> = ({ status }) => (
  <div className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm p-5 space-y-3">
    <div className="flex items-center gap-2 text-gray-700">
      <ShieldCheck size={18} className="text-yellow-500" />
      <span className="font-semibold">Estado del retiro</span>
    </div>

    {status.delivery ? (
      <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
        <PackageCheck size={18} className="mt-0.5 flex-shrink-0" />
        <span>
          Pedido entregado el {formatDateTime(status.delivery.deliveredAt)} (método:{' '}
          {deliveryMethodLabel[status.delivery.method]}).
        </span>
      </div>
    ) : status.failure ? (
      <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
        <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
        <span>
          Entrega fallida: {failureReasonLabel[status.failure.reason]}
          {status.failure.note ? ` — ${status.failure.note}` : ''} ({formatDateTime(status.failure.occurredAt)}).
        </span>
      </div>
    ) : status.code ? (
      <p className="text-sm text-gray-600">
        Código <span className="font-semibold">{pickupStatusLabel[status.code.status]}</span>. Tu pedido aún
        no ha sido entregado.
      </p>
    ) : (
      <p className="text-sm text-gray-500">Todavía no hay información de retiro para este pedido.</p>
    )}
  </div>
);

export default PickupCodePage;
