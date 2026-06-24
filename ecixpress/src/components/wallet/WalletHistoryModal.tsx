import React, { useEffect, useState } from 'react';
import {
  Loader2,
  Clock,
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'react-toastify';
import ModalShell from './ModalShell';
import { useWallet } from '../../context/WalletContext';
import { useNotifications } from '../../context/NotificationsContext';
import { PaymentMethodIcon } from './paymentMethods';
import {
  getTopups,
  getWalletTransactions,
  getTopupDetails,
  buildWalletHistory,
  formatCOP,
  type WalletMovement,
  type WalletMovementStatus,
} from '../../services/financialService';

interface Props {
  open: boolean;
  onClose: () => void;
}

// Eventos en vivo que cambian el historial: al llegar, recargamos la lista.
const HISTORY_AFFECTING_EVENTS = new Set([
  'wallet.topup_approved',
  'wallet.topup_failed',
  'payment.processed',
  'order.confirmed',
  'refund.issued',
]);

const STATUS_CHIP: Record<WalletMovementStatus, { label: string; cls: string } | null> = {
  pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
  failed: { label: 'Fallida', cls: 'bg-red-100 text-red-600' },
  completed: null, // el color del monto ya comunica el éxito; sin chip.
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Ícono de la izquierda según el tipo de movimiento. */
const MovementIcon: React.FC<{ m: WalletMovement }> = ({ m }) => {
  if (m.kind === 'topup' && m.paymentMethod) {
    return <PaymentMethodIcon method={m.paymentMethod} size={36} />;
  }
  if (m.kind === 'refund') {
    return (
      <span className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
        <RotateCcw size={18} className="text-emerald-600" />
      </span>
    );
  }
  // payment (débito)
  return (
    <span className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
      <ArrowUpRight size={18} className="text-gray-600" />
    </span>
  );
};

const WalletHistoryModal: React.FC<Props> = ({ open, onClose }) => {
  const { userId, refresh } = useWallet();
  const { liveEvent } = useNotifications();
  const [movements, setMovements] = useState<WalletMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<{ id: string; image: string } | null>(null);

  const load = React.useCallback(async () => {
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
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Para una recarga pendiente: consulta la URL/QR de aprobación y la abre/muestra.
  const completePending = async (topupId: string) => {
    if (!userId) return;
    setActingId(topupId);
    setQrFor(null);
    try {
      const d = await getTopupDetails(userId, topupId);
      void refresh();
      if (d.status === 'APPROVED' || d.wompiStatus === 'APPROVED') {
        toast.success('Esta recarga ya fue aprobada.');
        void load();
        return;
      }
      if (d.redirectUrl) {
        window.open(d.redirectUrl, '_blank', 'noopener,noreferrer');
      } else if (d.qrImage) {
        setQrFor({ id: topupId, image: d.qrImage });
      } else {
        toast.info('Aún no hay enlace de aprobación disponible. Intenta de nuevo en unos segundos.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo obtener el pago');
    } finally {
      setActingId(null);
    }
  };

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Si el modal está abierto y llega un evento que cambia el historial, lo recargamos.
  useEffect(() => {
    if (!open || !liveEvent) return;
    if (HISTORY_AFFECTING_EVENTS.has(liveEvent.type ?? '')) {
      void load();
    }
  }, [liveEvent, open, load]);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Historial de la billetera"
      subtitle="Recargas, pagos y reembolsos de tu saldo"
      maxWidth="max-w-lg"
    >
      <div className="flex justify-end mb-3">
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-yellow-600 transition"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-yellow-400" size={28} />
        </div>
      ) : error ? (
        <p className="text-center text-sm text-red-500 py-8">{error}</p>
      ) : movements.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Clock className="text-gray-300" size={32} />
          <p className="text-sm text-gray-500">Aún no tienes movimientos en tu billetera.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {movements.map((m) => {
            const chip = STATUS_CHIP[m.status];
            const isPendingTopup = m.kind === 'topup' && m.status === 'pending';
            const credit = m.direction === 'in';
            const amountCls =
              m.status === 'failed'
                ? 'text-gray-400 line-through'
                : credit
                  ? 'text-emerald-600'
                  : 'text-gray-900';
            return (
              <li
                key={m.id}
                className="flex flex-col gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <MovementIcon m={m} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      {m.title}
                      {chip && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${chip.cls}`}>
                          {chip.label}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {m.subtitle ? `${m.subtitle} · ` : ''}
                      {formatDate(m.date)}
                    </p>
                  </div>
                  <span className={`text-sm font-bold whitespace-nowrap ${amountCls}`}>
                    {credit ? '+' : '−'} {formatCOP(m.amount)}
                  </span>
                </div>

                {isPendingTopup && m.topupId && (
                  <button
                    onClick={() => void completePending(m.topupId!)}
                    disabled={actingId === m.topupId}
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-yellow-400 text-white text-xs font-semibold hover:bg-yellow-500 transition disabled:opacity-50"
                  >
                    {actingId === m.topupId ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ExternalLink size={14} />
                    )}
                    Completar / aprobar pago
                  </button>
                )}

                {qrFor && qrFor.id === m.topupId && (
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <p className="text-xs text-gray-600">Escanea con tu app Bancolombia:</p>
                    <img
                      src={`data:image/svg+xml;base64,${qrFor.image}`}
                      alt="Código QR de pago"
                      className="w-44 h-44 rounded-xl border border-gray-100 bg-white"
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </ModalShell>
  );
};

export default WalletHistoryModal;
