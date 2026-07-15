import React, { useEffect, useState } from 'react';
import { Check, ImageOff, Loader2, X } from 'lucide-react';
import ModalShell from '../wallet/ModalShell';
import { formatCOP, formatDateTime } from '../../lib/format';
import { useOrdersApi } from '../../hooks/useOrdersApi';
import type { MessageResponse, OrderResponse, RefundMessagePayload } from '../../lib/orders-api';

const PAYMENT_LABEL: Record<string, string> = {
  wallet: 'Billetera',
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
};

interface RefundDetailModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  message: MessageResponse;
  payload: RefundMessagePayload;
  requesterName?: string;
  requesterAvatar?: string;
  /** true si quien mira es staff de la tienda del pedido (habilita Aceptar/Rechazar). */
  canResolve: boolean;
  onResolved: (updated: MessageResponse) => void;
}

/** Detalle de una solicitud de reembolso: monto, motivo, evidencia, productos y (vendedor) acciones. */
const RefundDetailModal: React.FC<RefundDetailModalProps> = ({
  open,
  onClose,
  orderId,
  message,
  payload,
  requesterName,
  requesterAvatar,
  canResolve,
  onResolved,
}) => {
  const api = useOrdersApi();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    api.getOrderById(orderId).then(setOrder).catch(() => setOrder(null));
  }, [open, orderId]);

  useEffect(() => {
    if (!open || !payload.refundId) {
      setEvidence([]);
      return;
    }
    setLoadingEvidence(true);
    api
      .getReturnEvidence(orderId, payload.refundId)
      .then((res) => setEvidence(res.urls))
      .catch(() => setEvidence([]))
      .finally(() => setLoadingEvidence(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId, payload.refundId]);

  useEffect(() => {
    if (!open) {
      setShowRejectReason(false);
      setRejectReason('');
      setError(null);
    }
  }, [open]);

  const handleApprove = async () => {
    setError(null);
    setResolving(true);
    try {
      await api.approveReturn(orderId);
      onResolved({ ...message, content: JSON.stringify({ ...payload, kind: 'approved' }) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo aprobar el reembolso');
    } finally {
      setResolving(false);
    }
  };

  const handleReject = async () => {
    setError(null);
    setResolving(true);
    try {
      await api.rejectReturn(orderId, { reason: rejectReason.trim() || undefined });
      onResolved({ ...message, content: JSON.stringify({ ...payload, kind: 'rejected', reason: rejectReason.trim() || payload.reason }) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo rechazar el reembolso');
    } finally {
      setResolving(false);
    }
  };

  const showActions = canResolve && payload.kind === 'requested';

  return (
    <ModalShell open={open} onClose={onClose} title="Detalle del reembolso" maxWidth="max-w-lg">
      <div className="space-y-5">
        <dl className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">Pedido</dt>
            <dd className="font-semibold text-gray-900">#{(order?.orderNumber ?? orderId).slice(-4)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">Monto a reembolsar</dt>
            <dd className="font-bold text-amber-600 tabular-nums">{formatCOP(payload.amount)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">Tipo</dt>
            <dd className="font-medium text-gray-800">{payload.full ? 'Devolución total' : 'Devolución parcial'}</dd>
          </div>
          {order?.paymentMethod && (
            <div className="flex items-center justify-between">
              <dt className="text-gray-500">Método de pago</dt>
              <dd className="font-medium text-gray-800">{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</dd>
            </div>
          )}
          <div className="flex items-center justify-between">
            <dt className="text-gray-500">Fecha de solicitud</dt>
            <dd className="font-medium text-gray-800">{formatDateTime(message.createdAt)}</dd>
          </div>
        </dl>

        {payload.reason && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
              {payload.kind === 'rejected' ? 'Motivo del rechazo' : 'Motivo'}
            </p>
            <p className="text-sm text-gray-700 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">{payload.reason}</p>
          </div>
        )}

        {(payload.refundId || loadingEvidence) && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Evidencia</p>
            {loadingEvidence ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 size={16} className="animate-spin" /> Cargando fotos…
              </div>
            ) : evidence.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {evidence.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-xl border border-gray-200">
                    <img src={url} alt={`Evidencia ${i + 1}`} className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-sm text-gray-400"><ImageOff size={15} /> Sin fotos adjuntas</p>
            )}
          </div>
        )}

        {payload.items && payload.items.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Productos</p>
            <div className="space-y-2">
              {payload.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-200" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-400">x{item.quantity}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-gray-700 tabular-nums">{formatCOP(item.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {requesterName && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Solicitado por</p>
            <div className="flex items-center gap-2.5">
              {requesterAvatar ? (
                <img src={requesterAvatar} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-100 via-white to-yellow-100" />
              )}
              <p className="text-sm font-medium text-gray-800">{requesterName}</p>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {showActions && (
          <div className="space-y-2 border-t border-gray-100 pt-4">
            {!showRejectReason ? (
              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={resolving}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  {resolving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Aceptar
                </button>
                <button
                  onClick={() => setShowRejectReason(true)}
                  disabled={resolving}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
                >
                  <X size={16} /> Rechazar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Motivo del rechazo (opcional)"
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    disabled={resolving}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 disabled:opacity-50"
                  >
                    {resolving ? <Loader2 size={16} className="animate-spin" /> : null} Confirmar rechazo
                  </button>
                  <button
                    onClick={() => setShowRejectReason(false)}
                    disabled={resolving}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
};

export default RefundDetailModal;
