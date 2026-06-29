import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  PackageCheck,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useFulfillmentApi } from '../../hooks/useFulfillmentApi';
import {
  FulfillmentApiError,
  type FulfillmentStatus,
  type PickupCodeResponse,
} from '../../lib/fulfillment-api';
import {
  deliveryMethodLabel,
  failureReasonLabel,
  pickupStatusHint,
  pickupStatusLabel,
  pickupStatusTone,
} from '../../lib/fulfillment-ui';
import type { OrderResponse } from '../../lib/orders-api';
import { formatDateTime } from '../../lib/format';
import { hasPickupCode } from '../../lib/orders-ui';

function useCountdown(iso?: string): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!iso) return null;
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return null;
  const totalMin = Math.floor(diff / 60000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  const seconds = Math.floor((diff % 60000) / 1000);
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${seconds} s`;
  return `${seconds} s`;
}

export const OrderFulfillmentPanel: React.FC<{ order: OrderResponse }> = ({ order }) => {
  const api = useFulfillmentApi();
  const [code, setCode] = useState<PickupCodeResponse | null>(null);
  const [status, setStatus] = useState<FulfillmentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notReady, setNotReady] = useState(false);
  const [copied, setCopied] = useState<'short' | 'token' | null>(null);

  const countdown = useCountdown(code?.expiresAt);
  const expired = useMemo(
    () => Boolean(code && new Date(code.expiresAt).getTime() <= Date.now()),
    [code],
  );

  const load = useCallback(async () => {
    if (!hasPickupCode(order.status)) {
      setCode(null);
      setStatus(null);
      setNotReady(true);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setNotReady(false);
    try {
      const [statusResult, codeResult] = await Promise.allSettled([
        api.getFulfillmentStatus(order.id),
        order.status === 'DELIVERED'
          ? Promise.resolve(null)
          : api.getOrderCode(order.id),
      ]);

      if (statusResult.status === 'fulfilled') setStatus(statusResult.value);
      else setStatus(null);

      if (codeResult.status === 'fulfilled') {
        setCode(codeResult.value);
      } else {
        const err = codeResult.reason;
        if (err instanceof FulfillmentApiError && err.status === 404) {
          setCode(null);
          setNotReady(true);
        } else if (statusResult.status === 'rejected') {
          throw err;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar el estado de retiro.');
    } finally {
      setLoading(false);
    }
  }, [api, order.id, order.status]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = async (value: string, which: 'short' | 'token') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!hasPickupCode(order.status)) {
    return (
      <section className="rounded-3xl border border-amber-100 bg-amber-50/40 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="mt-0.5 text-amber-600" />
          <div>
            <h3 className="font-black text-gray-950">Codigo de retiro</h3>
            <p className="mt-1 text-sm text-gray-500">
              El QR se activa cuando la tienda confirma el pedido.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-bold text-gray-500">
          <RefreshCw size={16} className="animate-spin text-amber-500" />
          Cargando informacion de retiro...
        </div>
      </section>
    );
  }

  if (status?.delivery || order.status === 'DELIVERED') {
    return (
      <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
            <PackageCheck size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-black text-emerald-900">Pedido entregado</h3>
            <p className="mt-1 text-sm text-emerald-700">
              {status?.delivery
                ? `Entregado el ${formatDateTime(status.delivery.deliveredAt)} por ${deliveryMethodLabel[status.delivery.method]}.`
                : `Finalizado el ${formatDateTime(order.updatedAt)}.`}
            </p>
            <p className="mt-2 text-xs font-semibold text-emerald-700">
              El QR ya no esta disponible porque la entrega fue confirmada.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (status?.failure) {
    return (
      <section className="rounded-3xl border border-red-100 bg-red-50 p-5">
        <div className="flex items-start gap-3 text-red-700">
          <AlertTriangle size={22} className="mt-0.5" />
          <div>
            <h3 className="font-black text-red-900">Entrega fallida</h3>
            <p className="mt-1 text-sm">
              {failureReasonLabel[status.failure.reason]}
              {status.failure.note ? `: ${status.failure.note}` : ''}.
            </p>
            <p className="mt-1 text-xs">{formatDateTime(status.failure.occurredAt)}</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-100 bg-red-50 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 text-red-700">
            <AlertTriangle size={20} className="mt-0.5" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-full bg-white px-3 py-1 text-xs font-bold text-red-600"
          >
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  if (notReady || !code) {
    return (
      <section className="rounded-3xl border border-amber-100 bg-amber-50/50 p-5">
        <div className="flex items-start gap-3">
          <QrCode size={22} className="mt-0.5 text-amber-600" />
          <div>
            <h3 className="font-black text-gray-950">QR pendiente</h3>
            <p className="mt-1 text-sm text-gray-500">
              La tienda aun no ha generado el codigo. Cuando el pedido este confirmado, aparecera aqui.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-yellow-200 bg-[linear-gradient(135deg,#fff7d6_0%,#ffffff_54%,#fffbeb_100%)] p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <div className="flex flex-col items-center rounded-3xl border border-white bg-white/90 p-4 text-center shadow-sm">
          <span className={`self-end rounded-full px-3 py-1 text-xs font-bold ${pickupStatusTone[code.status]}`}>
            {pickupStatusLabel[code.status]}
          </span>
          <div className="my-3 rounded-3xl border border-gray-100 bg-white p-3 shadow-inner">
            <img
              src={code.qrCode}
              alt="Codigo QR de retiro"
              width={190}
              height={190}
              className={`h-[190px] w-[190px] object-contain ${code.status !== 'ACTIVE' ? 'opacity-30 grayscale' : ''}`}
            />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Codigo corto</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-black tracking-[0.24em] text-gray-950">{code.shortCode}</span>
            <button
              type="button"
              onClick={() => copy(code.shortCode, 'short')}
              className="rounded-xl p-2 text-gray-400 transition hover:bg-yellow-50 hover:text-amber-600"
              title="Copiar codigo"
            >
              {copied === 'short' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">Retiro en tienda</p>
            <h3 className="text-xl font-black text-gray-950">Muestra este QR al recibir tu pedido</h3>
            <p className="mt-1 max-w-xl text-sm text-gray-500">{pickupStatusHint[code.status]}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-100 bg-white/80 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-gray-900">
                <Clock size={16} className="text-amber-600" />
                Vigencia
              </div>
              {code.status === 'ACTIVE' && !expired ? (
                <p className="mt-2 text-sm text-gray-600">
                  Vence en <span className="font-black text-gray-950">{countdown ?? 'unos segundos'}</span>
                  <br />
                  <span className="text-xs text-gray-400">{formatDateTime(code.expiresAt)}</span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-gray-600">
                  {code.usedAt ? `Usado el ${formatDateTime(code.usedAt)}.` : `Vencio el ${formatDateTime(code.expiresAt)}.`}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-amber-100 bg-white/80 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">Token respaldo</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500">
                  {code.token}
                </code>
                <button
                  type="button"
                  onClick={() => copy(code.token, 'token')}
                  className="rounded-xl p-2 text-gray-400 transition hover:bg-yellow-50 hover:text-amber-600"
                  title="Copiar token"
                >
                  {copied === 'token' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
