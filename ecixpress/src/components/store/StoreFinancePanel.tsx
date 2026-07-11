import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { TrendingUp, Wallet, Percent, Clock, Save, Loader2, PiggyBank } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getStoreEarnings,
  getStoreCommission,
  updatePeakConfig,
  formatCOP,
  PEAK_DAY_CODES,
  getPeakDayLabel,
  type StoreEarnings,
  type StoreCommissionInfo,
} from '../../services/financialService';

interface StoreFinancePanelProps {
  storeId: string;
}

/** Quita los segundos de un 'HH:mm[:ss]' para poblar un <input type="time">. */
const toTimeInput = (v: string | null): string => (v ? v.slice(0, 5) : '');

/**
 * Panel financiero del vendedor por tienda: ganancias del mes (bruto, descuento por uso de
 * la app y neto) y edición de la franja de hora pico (recargo que paga el comprador), al
 * mismo nivel que el vendedor gestiona su galería y su horario.
 */
const StoreFinancePanel: React.FC<StoreFinancePanelProps> = ({ storeId }) => {
  const { userProfile } = useAuth();
  const userId = userProfile?.id ?? '';

  const [earnings, setEarnings] = useState<StoreEarnings | null>(null);
  const [commission, setCommission] = useState<StoreCommissionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estado editable del formulario de hora pico.
  const [feePercent, setFeePercent] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [days, setDays] = useState<string[]>([]);

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
      setFeePercent(String(c.peakFeePercent ?? 0));
      setStart(toTimeInput(c.peakHoursStart));
      setEnd(toTimeInput(c.peakHoursEnd));
      setDays(c.peakDays ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la información financiera');
    } finally {
      setLoading(false);
    }
  }, [storeId, userId]);

  useEffect(() => { load(); }, [load]);

  const toggleDay = (code: string) =>
    setDays((prev) => (prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]));

  const save = async () => {
    const fee = Number(feePercent);
    if (!Number.isFinite(fee) || fee < 0 || fee > 100) {
      toast.error('El recargo de hora pico debe estar entre 0 y 100.');
      return;
    }
    if ((start && !end) || (!start && end)) {
      toast.error('Indica hora de inicio y fin de la franja pico.');
      return;
    }
    setSaving(true);
    try {
      await updatePeakConfig(storeId, userId, {
        peakFeePercent: fee,
        peakHoursStart: start || undefined,
        peakHoursEnd: end || undefined,
        peakDays: days,
      });
      toast.success('Hora pico actualizada.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la hora pico');
    } finally {
      setSaving(false);
    }
  };

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
          Recargo que paga el comprador cuando compra dentro de la franja. Muévela como tu horario.
        </p>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PEAK_DAY_CODES.map((code) => {
              const active = days.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleDay(code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    active ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {getPeakDayLabel(code)}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-gray-500">Recargo (%)</span>
              <input
                type="number" min={0} max={100} step={0.5}
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-gray-500">Inicio</span>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-gray-500">Fin</span>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400 text-white text-sm font-semibold hover:bg-yellow-500 disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Guardar hora pico
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreFinancePanel;
