import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
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

const MOVEMENTS_PAGE_SIZE = 6;

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
    defaultMethod,
    openRecharge,
    openMethodPicker,
  } = useWallet();
  const [movements, setMovements] = useState<WalletMovement[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
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
      setCurrentPage(1);
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
  const totalPages = Math.max(1, Math.ceil(movements.length / MOVEMENTS_PAGE_SIZE));
  const pageStart = (currentPage - 1) * MOVEMENTS_PAGE_SIZE;
  const paginatedMovements = movements.slice(pageStart, pageStart + MOVEMENTS_PAGE_SIZE);

  return (
    <>
      <AccountSectionHeader titulo="Pagos" />

      <section className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <WalletPremiumCard className="mx-auto h-full lg:mx-0" />
        <div className="flex flex-col justify-center rounded-3xl border border-white/70 bg-white/82 p-5 shadow-lg shadow-gray-200/60 backdrop-blur-xl md:p-6">
          <div>
            <h2 className="text-lg font-black text-gray-950">Accesos rápidos</h2>
          </div>

          <div className="mt-5 grid flex-1 grid-cols-2 gap-4">
            <button
              type="button"
              onClick={openRecharge}
              className="group flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-yellow-100 bg-gradient-to-br from-yellow-50 to-white px-4 py-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-yellow-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-yellow-300"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-100 text-amber-700 shadow-sm transition group-hover:bg-yellow-200">
                <PlusCircle size={22} aria-hidden="true" />
              </span>
              <span className="mt-2.5 text-sm font-bold text-gray-900">Recargar</span>
            </button>

            <button
              type="button"
              onClick={openMethodPicker}
              className="group flex min-h-[132px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-4 py-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-yellow-200 hover:bg-yellow-50/60 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-yellow-300"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm ring-1 ring-gray-100 transition group-hover:ring-yellow-200">
                {defaultMethod ? (
                  <PaymentMethodIcon method={defaultMethod} size={28} />
                ) : (
                  <CreditCard size={22} aria-hidden="true" />
                )}
              </span>
              <span className="mt-2.5 text-sm font-bold text-gray-900">Método de recarga</span>
              <span className="mt-0.5 max-w-full truncate text-xs text-gray-400">
                {defaultMethodMeta?.label ?? 'Elegir predeterminado'}
              </span>
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="rounded-3xl border border-white/70 bg-white/82 p-5 shadow-lg shadow-gray-200/60 backdrop-blur-xl md:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Historial de movimientos</h2>
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
          ) : paginatedMovements.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Clock className="text-gray-300" size={32} aria-hidden="true" />
              <p className="text-sm text-gray-500">Aún no tienes pagos o movimientos en tu billetera.</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {paginatedMovements.map((movement) => {
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

          {!loading && !error && movements.length > MOVEMENTS_PAGE_SIZE && (
            <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-gray-400">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  aria-label="Página anterior"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-yellow-300 hover:bg-yellow-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <span className="min-w-8 text-center text-xs font-bold text-gray-400">
                  {currentPage}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Página siguiente"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-amber-800 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default PagosSection;
