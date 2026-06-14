import React, { useEffect, useState } from 'react';
import { Loader2, Clock, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import ModalShell from './ModalShell';
import { useWallet } from '../../context/WalletContext';
import { PaymentMethodIcon, getMethodMeta } from './paymentMethods';
import {
  getTopups,
  getTopupDetails,
  formatCOP,
  type WalletTopup,
  type TopupStatus,
} from '../../services/financialService';

interface Props {
  open: boolean;
  onClose: () => void;
}

const STATUS_STYLE: Record<TopupStatus, { label: string; cls: string }> = {
  PENDING: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Aprobada', cls: 'bg-emerald-100 text-emerald-700' },
  FAILED: { label: 'Fallida', cls: 'bg-red-100 text-red-600' },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const WalletHistoryModal: React.FC<Props> = ({ open, onClose }) => {
  const { userId, refresh } = useWallet();
  const [topups, setTopups] = useState<WalletTopup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<{ id: string; image: string } | null>(null);

  const load = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      setTopups(await getTopups(userId));
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

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Historial de recargas"
      subtitle="Tus últimas recargas de saldo"
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
      ) : topups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Clock className="text-gray-300" size={32} />
          <p className="text-sm text-gray-500">Aún no has hecho recargas.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {topups.map((t) => {
            const st = STATUS_STYLE[t.status];
            const isPending = t.status === 'PENDING';
            return (
              <li
                key={t.id}
                className="flex flex-col gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <PaymentMethodIcon method={t.paymentMethod} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCOP(t.amount)}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {getMethodMeta(t.paymentMethod).label} · {formatDate(t.createdAt)}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.cls}`}>
                    {st.label}
                  </span>
                </div>

                {isPending && (
                  <button
                    onClick={() => void completePending(t.id)}
                    disabled={actingId === t.id}
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-yellow-400 text-white text-xs font-semibold hover:bg-yellow-500 transition disabled:opacity-50"
                  >
                    {actingId === t.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ExternalLink size={14} />
                    )}
                    Completar / aprobar pago
                  </button>
                )}

                {qrFor?.id === t.id && (
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
