import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { TrendingUp, Wallet, Percent, Clock, Loader2, PiggyBank } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getStoreEarnings,
  getStoreCommission,
  formatCOP,
  PEAK_DAY_CODES,
  getPeakDayLabel,
  type StoreEarnings,
  type StoreCommissionInfo,
} from '../../services/financialService';

interface StoreFinancePanelProps {
  storeId: string;
}

/** Quita los segundos de un 'HH:mm[:ss]' para mostrarlo compacto. */
const toTimeDisplay = (v: string | null): string => (v ? v.slice(0, 5) : '—');

/**
 * Panel financiero del vendedor por tienda: ganancias del mes (bruto, descuento por uso de
 * la app y neto) y la franja de hora pico vigente. Solo lectura: la hora pico y la comisión
 * las edita un ADMIN desde el centro de analíticas (Ganancias por tienda).
 */
const StoreFinancePanel: React.FC<StoreFinancePanelProps> = ({ storeId }) => {
  const { userProfile } = useAuth();
  const userId = userProfile?.id ?? '';

  const [earnings, setEarnings] = useState<StoreEarnings | null>(null);
  const [commission, setCommission] = useState<StoreCommissionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [e, c] = await Promise.all([
        getStoreEarnings(storeId, userId),
        getStoreCommission(storeId, userId),
      ]);
      setEarnings(e);
      setCommission(c);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la información financiera');
    } finally {
      setLoading(false);
    }
  }, [storeId, userId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm py-6">
        <Loader2 size={16} className="animate-spin" /> Cargando finanzas…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Ganancias del mes ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-yellow-500" />
          <h3 className="font-semibold text-gray-800 text-sm">
            Ganancias del mes {earnings ? `(${earnings.month})` : ''}
          </h3>
        </div>

        {earnings && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-green-50 ring-1 ring-green-100">
                <div className="flex items-center gap-1.5 text-green-700">
                  <PiggyBank size={14} />
                  <span className="text-xs font-semibold">Neto proyectado</span>
                </div>
                <p className="mt-1 text-xl font-bold text-green-800 tabular-nums">{formatCOP(earnings.totals.netAmount)}</p>
                <p className="text-[11px] text-green-700/80 mt-0.5">{earnings.totals.count} pedido(s) este mes</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 ring-1 ring-gray-100">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Wallet size={14} />
                  <span className="text-xs font-semibold">Bruto</span>
                </div>
                <p className="mt-1 text-xl font-bold text-gray-800 tabular-nums">{formatCOP(earnings.totals.grossAmount)}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Valor de los pedidos</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 ring-1 ring-amber-100">
                <div className="flex items-center gap-1.5 text-amber-700">
                  <Percent size={14} />
                  <span className="text-xs font-semibold">Uso de la app</span>
                </div>
                <p className="mt-1 text-xl font-bold text-amber-800 tabular-nums">− {formatCOP(earnings.totals.platformFeeAmount)}</p>
                <p className="text-[11px] text-amber-700/80 mt-0.5">Comisión ECIExpress {earnings.platformFeePercent}%</p>
              </div>
            </div>

            {/* Desglose recibido vs pendiente */}
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white ring-1 ring-gray-100">
                <span className="text-gray-500">Ya recibido</span>
                <span className="font-semibold text-gray-800 tabular-nums">{formatCOP(earnings.received.netAmount)}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white ring-1 ring-gray-100">
                <span className="text-gray-500">Pendiente de entrega</span>
                <span className="font-semibold text-gray-800 tabular-nums">{formatCOP(earnings.pending.netAmount)}</span>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-gray-400">
              El neto es lo que recibes tras descontar la comisión por uso de la app. Lo pendiente se
              libera cuando cada pedido se entrega.
            </p>
          </>
        )}
      </div>

      {/* ── Editor de hora pico ───────────────────────────────────────── */}
      <div className="border-t border-gray-100 pt-5">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={16} className="text-yellow-500" />
          <h3 className="font-semibold text-gray-800 text-sm">Hora pico</h3>
          {commission?.isPeakHour && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold">
              Activa ahora
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Recargo que paga el comprador cuando compra dentro de la franja. La edita un
          administrador de ECIExpress.
        </p>

        {commission && (commission.peakDays?.length ?? 0) > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {PEAK_DAY_CODES.map((code) => {
                const active = (commission.peakDays ?? []).includes(code);
                return (
                  <span
                    key={code}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      active ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {getPeakDayLabel(code)}
                  </span>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-gray-500">Recargo: <b className="text-gray-900">{commission.peakFeePercent}%</b></span>
              <span className="text-gray-500">Franja: <b className="text-gray-900">{toTimeDisplay(commission.peakHoursStart)} – {toTimeDisplay(commission.peakHoursEnd)}</b></span>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Sin hora pico configurada.</p>
        )}
      </div>
    </div>
  );
};

export default StoreFinancePanel;
