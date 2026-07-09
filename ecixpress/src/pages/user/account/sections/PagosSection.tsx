import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle,
  Clock,
  CreditCard,
  Loader2,
  PlusCircle,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import AccountSectionHeader from '../AccountSectionHeader';
import WalletPremiumCard from '../../../../components/wallet/WalletPremiumCard';
import { PaymentMethodIcon, getMethodMeta } from '../../../../components/wallet/paymentMethods';
import { useWallet } from '../../../../context/WalletContext';
import { useRefreshOnScrollTop } from '../../../../hooks/useRefreshOnScrollTop';
import {
  buildWalletHistory,
  formatCOP,
  getTopups,
  getWalletTransactions,
  type WalletMovement,
  type WalletMovementStatus,
} from '../../../../services/financialService';

const STATUS_CHIP: Record<WalletMovementStatus, { label: string; className: string } | null> = {
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
  failed: { label: 'Fallida', className: 'bg-red-100 text-red-600' },
  completed: null,
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const MovementIcon: React.FC<{ movement: WalletMovement }> = ({ movement }) => {
  if (movement.kind === 'topup' && movement.paymentMethod) {
    return <PaymentMethodIcon method={movement.paymentMethod} size={40} />;
  }

  if (movement.kind === 'refund') {
    return (
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <RotateCcw size={18} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
      <ArrowUpRight size={18} aria-hidden="true" />
    </span>
  );
};

const PagosSection: React.FC = () => {
  const {
    userId,
    balanceLabel,
    loading: walletLoading,
    defaultMethod,
    openRecharge,
    openHistory,
    openMethodPicker,
  } = useWallet();
  const [movements, setMovements] = useState<WalletMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMovements = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [topups, transactions] = await Promise.all([
        getTopups(userId),
        getWalletTransactions(userId),
      ]);
      setMovements(buildWalletHistory(topups, transactions));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los pagos');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadMovements();
  }, [loadMovements]);

  useRefreshOnScrollTop(loadMovements, { disabled: loading });

  const defaultMethodMeta = defaultMethod ? getMethodMeta(defaultMethod) : null;
  const latestMovements = movements.slice(0, 6);
  const completedPayments = movements.filter((movement) => movement.kind === 'payment' && movement.status === 'completed');
  const totalPaid = completedPayments.reduce((sum, movement) => sum + movement.amount, 0);

  return (
    <>
      <AccountSectionHeader titulo="Pagos">
        <button
          type="button"
          onClick={openRecharge}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-white"
        >
          <PlusCircle size={15} aria-hidden="true" /> Recargar saldo
        </button>
        <button
          type="button"
          onClick={openMethodPicker}
          className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-white/75 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-white"
        >
          <CreditCard size={15} aria-hidden="true" /> Metodo predeterminado
        </button>
      </AccountSectionHeader>

      <section className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <WalletPremiumCard className="mx-auto h-full lg:mx-0" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex min-h-[112px] flex-col justify-center rounded-3xl border border-white/70 bg-white/82 p-5 shadow-lg shadow-gray-200/60 backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Saldo disponible</p>
            <p className="mt-2 text-2xl font-black leading-none text-gray-950">{walletLoading ? 'Cargando...' : balanceLabel}</p>
          </div>
          <div className="flex min-h-[112px] flex-col justify-center rounded-3xl border border-white/70 bg-white/82 p-5 shadow-lg shadow-gray-200/60 backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pagos completados</p>
            <p className="mt-2 text-2xl font-black leading-none text-gray-950">{completedPayments.length}</p>
          </div>
          <div className="flex min-h-[112px] flex-col justify-center rounded-3xl border border-white/70 bg-white/82 p-5 shadow-lg shadow-gray-200/60 backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total pagado</p>
            <p className="mt-2 text-2xl font-black leading-none text-gray-950">{formatCOP(totalPaid)}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-3xl border border-white/70 bg-white/82 p-5 shadow-lg shadow-gray-200/60 backdrop-blur-xl md:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Ultimos pagos y movimientos</h2>
              <p className="mt-1 text-xs text-gray-500">Pagos de pedidos, recargas y reembolsos de tu billetera.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadMovements()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-yellow-300 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
              Actualizar
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-yellow-400" size={28} aria-hidden="true" />
            </div>
          ) : error ? (
            <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          ) : latestMovements.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Clock className="text-gray-300" size={32} aria-hidden="true" />
              <p className="text-sm text-gray-500">Aun no tienes pagos o movimientos en tu billetera.</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {latestMovements.map((movement) => {
                const chip = STATUS_CHIP[movement.status];
                const credit = movement.direction === 'in';
                const amountClass =
                  movement.status === 'failed'
                    ? 'text-gray-400 line-through'
                    : credit
                      ? 'text-emerald-600'
                      : 'text-gray-900';

                return (
                  <li
                    key={movement.id}
                    className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white/80 p-3"
                  >
                    <MovementIcon movement={movement} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-gray-900">
                        {movement.title}
                        {chip && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip.className}`}>
                            {chip.label}
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {movement.subtitle ? `${movement.subtitle} - ` : ''}
                        {formatDate(movement.date)}
                      </p>
                    </div>
                    <span className={`whitespace-nowrap text-sm font-black ${amountClass}`}>
                      {credit ? '+' : '-'} {formatCOP(movement.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            onClick={openHistory}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-gray-950 transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"
          >
            <Clock size={15} aria-hidden="true" /> Ver historial completo
          </button>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/70 bg-white/82 p-5 shadow-lg shadow-gray-200/60 backdrop-blur-xl">
            <h2 className="text-sm font-bold text-gray-900">Metodo de pago</h2>
            <p className="mt-1 text-xs text-gray-500">Se usa como opcion inicial al recargar la billetera.</p>
            <button
              type="button"
              onClick={openMethodPicker}
              className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white/80 p-3 text-left transition hover:border-yellow-200 hover:bg-yellow-50/70 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            >
              {defaultMethod ? (
                <PaymentMethodIcon method={defaultMethod} size={40} />
              ) : (
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <CreditCard size={18} aria-hidden="true" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-gray-900">
                  {defaultMethodMeta?.label ?? 'Sin metodo predeterminado'}
                </span>
                <span className="block truncate text-xs text-gray-400">
                  {defaultMethodMeta?.description ?? 'Elige como quieres completar tus recargas.'}
                </span>
              </span>
            </button>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle size={18} aria-hidden="true" />
              <h2 className="text-sm font-bold">Pagos protegidos</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-emerald-700/80">
              Las recargas se completan con Wompi y los pagos de pedidos quedan registrados en tu historial.
            </p>
          </div>
        </aside>
      </section>
    </>
  );
};

export default PagosSection;
