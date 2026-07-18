import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ArrowDownToLine, History, Loader2, PiggyBank } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getPayoutBalance,
  getPayoutHistory,
  withdrawPayout,
  formatCOP,
  type StorePayout,
} from '../../services/financialService';

interface StoreWithdrawSectionProps {
  /** Si la tienda ya configuró su cuenta de desembolso (viene del padre, que ya la cargó). */
  hasPayoutAccount: boolean;
}

const TYPE_LABEL: Record<StorePayout['type'], string> = {
  AUTOMATIC: 'Automático (fin de mes)',
  ON_DEMAND: 'A demanda',
};

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Saldo disponible para retirar + botón de retiro anticipado + historial de giros
 * (automáticos de fin de mes y a demanda) de la tienda.
 */
const StoreWithdrawSection: React.FC<StoreWithdrawSectionProps> = ({ hasPayoutAccount }) => {
  const { userProfile } = useAuth();
  const userId = userProfile?.id ?? '';

  const [balance, setBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<StorePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [b, h] = await Promise.all([getPayoutBalance(userId), getPayoutHistory(userId)]);
      setBalance(b.availableBalance);
      setHistory(h);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar el saldo disponible.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleWithdraw = async () => {
    if (!userId || !balance) return;
    if (!window.confirm(`¿Retirar ${formatCOP(balance)} a tu cuenta configurada?`)) return;
    setWithdrawing(true);
    try {
      await withdrawPayout(userId);
      toast.success('Retiro realizado.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo realizar el retiro.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
        <Loader2 size={16} className="animate-spin" /> Cargando saldo…
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ArrowDownToLine size={16} className="text-yellow-500" />
        <h3 className="font-semibold text-gray-800 text-sm">Retirar dinero</h3>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-green-50 ring-1 ring-green-100">
        <div className="flex items-center gap-1.5 text-green-700">
          <PiggyBank size={14} />
          <div>
            <p className="text-xs font-semibold">Saldo disponible</p>
            <p className="text-xl font-bold text-green-800 tabular-nums">{formatCOP(balance ?? 0)}</p>
          </div>
        </div>

        {!hasPayoutAccount ? (
          <p className="text-xs text-amber-700 font-medium sm:text-right">
            Configura tu cuenta de desembolso arriba para poder retirar.
          </p>
        ) : (
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={withdrawing || !balance}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-black
              bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600
              active:scale-[.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {withdrawing ? <Loader2 size={15} className="animate-spin" /> : <ArrowDownToLine size={15} />}
            {withdrawing ? 'Retirando…' : 'Retirar dinero'}
          </button>
        )}
      </div>

      {history.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <History size={14} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-500">Historial de giros</p>
          </div>
          <div className="space-y-1.5">
            {history.map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-white ring-1 ring-gray-100 text-sm"
              >
                <div>
                  <p className="text-gray-700 font-medium">{formatCOP(payout.amount)}</p>
                  <p className="text-[11px] text-gray-400">
                    {TYPE_LABEL[payout.type]} · {dateFormatter.format(new Date(payout.executedAt))}
                  </p>
                </div>
                <span className="text-[11px] text-gray-400 font-mono">{payout.reference}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreWithdrawSection;
