import React, { useEffect, useState } from 'react';
import { X, Loader2, ImageOff, Tag, ReceiptText, Wallet } from 'lucide-react';
import { formatCOP } from '../../lib/format';
import { useOrdersApi } from '../../hooks/useOrdersApi';
import type { OrderResponse } from '../../lib/orders-api';

interface OrderDetailModalProps {
  open: boolean;
  /** Pedido a mostrar; null mientras no hay uno seleccionado. */
  orderId: string | null;
  onClose: () => void;
}

/** Borde inferior dentado (recibo rasgado), igual que la factura del checkout. */
const ZigzagEdge: React.FC = () => (
  <svg viewBox="0 0 100 4" preserveAspectRatio="none" className="block w-full h-3 text-white" aria-hidden="true">
    <polygon
      fill="currentColor"
      points="0,0 100,0 100,1 97.5,4 95,1 92.5,4 90,1 87.5,4 85,1 82.5,4 80,1 77.5,4 75,1 72.5,4 70,1 67.5,4 65,1 62.5,4 60,1 57.5,4 55,1 52.5,4 50,1 47.5,4 45,1 42.5,4 40,1 37.5,4 35,1 32.5,4 30,1 27.5,4 25,1 22.5,4 20,1 17.5,4 15,1 12.5,4 10,1 7.5,4 5,1 2.5,4 0,1"
    />
  </svg>
);

const PAYMENT_LABEL: Record<string, string> = {
  wallet: 'Billetera',
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
};

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'Confirmado',
  IN_PREPARATION: 'En preparación',
  READY_FOR_PICKUP: 'Listo para recoger',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

/**
 * Detalle del pedido en modo SOLO LECTURA, con apariencia de recibo (reusa el look de la
 * factura del checkout). Se abre desde la bandeja de mensajes para saber de qué pedido se
 * está hablando: productos, cantidades, subtotal, descuento y total pagado.
 */
const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ open, orderId, onClose }) => {
  const api = useOrdersApi();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !orderId) return;
    let active = true;
    // Reset del estado al abrir/cambiar de pedido antes de la carga asíncrona.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    setOrder(null);
    api.getOrderById(orderId)
      .then((o) => { if (active) setOrder(o); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : 'No se pudo cargar el pedido'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto p-3 sm:p-6 bg-gray-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="mx-auto w-full max-w-lg my-4 sm:my-8" role="dialog" aria-modal="true" aria-label="Detalle del pedido" onClick={(e) => e.stopPropagation()}>
        <div className="relative bg-white rounded-t-[28px] px-5 sm:px-8 pt-7 pb-6 shadow-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col items-center text-center">
            <img src="/ecixpress-logo.svg" alt="eciexpress" className="h-12 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            {order && <p className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-400">{order.storeName}</p>}
          </div>

          <div className="my-5 border-t border-dashed border-gray-200" />

          {loading ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <Loader2 className="animate-spin text-yellow-400" size={28} />
              <p className="mt-3 text-sm">Cargando el pedido…</p>
            </div>
          ) : error ? (
            <div className="py-10 text-center text-sm text-red-600">{error}</div>
          ) : order ? (
            <>
              {/* Cabecera */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    PEDIDO <span className="text-yellow-500">#{order.orderNumber}</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {STATUS_LABEL[order.status] && (
                    <span className="mt-1 inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-700">
                      {STATUS_LABEL[order.status]}
                    </span>
                  )}
                </div>
                <ReceiptText className="text-yellow-400 shrink-0" size={26} />
              </div>

              {/* Líneas */}
              <div className="mt-5 overflow-x-auto">
                <div className="min-w-[22rem]">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 rounded-lg bg-yellow-400 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-yellow-950">
                    <span>Producto</span>
                    <span className="text-right">P. Unit.</span>
                    <span className="text-center">Cant.</span>
                    <span className="text-right">Total</span>
                  </div>
                  <ul>
                    {order.items.map((line) => (
                      <li key={line.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-dashed border-gray-100 px-3 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-yellow-50 overflow-hidden flex-shrink-0 flex items-center justify-center text-yellow-300">
                            {line.imageUrl ? (
                              <img src={line.imageUrl} alt={line.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <ImageOff size={14} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{line.name}</p>
                            {line.notes && <p className="text-[11px] text-gray-400 truncate">{line.notes}</p>}
                          </div>
                        </div>
                        <span className="text-right text-sm text-gray-600 tabular-nums">{formatCOP(line.unitPrice)}</span>
                        <span className="mx-auto min-w-[2rem] rounded-md border border-gray-200 px-2 py-0.5 text-center text-sm font-semibold text-gray-700 tabular-nums">{line.quantity}</span>
                        <span className="text-right text-sm font-bold text-gray-900 tabular-nums">{formatCOP(line.totalAmount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="my-4 border-t border-dashed border-gray-200" />

              {/* Totales */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>SUBTOTAL</span>
                  <span className="tabular-nums">{formatCOP(order.subtotalAmount)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-500">
                      DESCUENTO
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-700">
                        <Tag size={11} /> Promoción
                      </span>
                    </span>
                    <span className="font-medium text-yellow-600 tabular-nums">- {formatCOP(order.discountAmount)}</span>
                  </div>
                )}
              </div>

              <div className="my-4 border-t border-dashed border-gray-200" />

              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold text-gray-900">TOTAL PAGADO</span>
                <span className="text-2xl font-extrabold text-yellow-500 tabular-nums">{formatCOP(order.totalAmount)}</span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><Wallet size={13} className="text-gray-400" /> Método de pago</span>
                <span className="font-semibold text-gray-700">{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</span>
              </div>
            </>
          ) : null}
        </div>
        <ZigzagEdge />
      </div>
    </div>
  );
};

export default OrderDetailModal;
