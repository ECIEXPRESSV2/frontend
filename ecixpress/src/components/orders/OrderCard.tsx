import React from 'react';
import { Store, Eye, RefreshCw } from 'lucide-react';
import type { Order } from '../../mock/userProfile';
import { getOrderStatusMeta } from './orderStatus';

interface OrderCardProps {
  order: Order;
  onDetail?: () => void;
  onReorder?: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onDetail, onReorder }) => {
  const meta = getOrderStatusMeta(order.status);
  const StatusIcon = meta.icon;

  return (
    <article aria-label={`Pedido ${order.id} de ${order.storeName}`} className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/82 shadow-sm backdrop-blur-xl transition hover:shadow-md">
      <div className="absolute inset-y-0 left-0 w-1 bg-yellow-400" aria-hidden="true" />
      <div className="py-4 pl-5 pr-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200/40 bg-gradient-to-br from-amber-100/70 to-yellow-50/50">
              <Store size={17} className="text-amber-700" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{order.storeName}</p>
              <p className="text-xs text-gray-400">Pedido {order.id} · {order.date}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.pillClass}`}>
            <StatusIcon size={13} aria-hidden="true" />
            {meta.label}
          </span>
        </div>

        <div className="grid gap-4 border-t border-amber-100/40 pt-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {order.items.map(item => (
              <div key={item.productId} className="w-[88px] flex-shrink-0">
                <img src={item.productImage} alt={item.productName} className="h-[88px] w-[88px] rounded-xl border border-white/60 object-cover" />
                <p className="mt-1.5 truncate text-[11px] text-gray-500">{item.productName}</p>
                <p className="text-[11px] text-gray-400">x{item.quantity}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 md:min-w-[240px] md:justify-end md:text-right">
            <div>
              <p className="text-xs text-gray-400">{order.items.length} producto{order.items.length !== 1 ? 's' : ''}</p>
              <span className="block text-lg font-bold tracking-tight text-gray-900">${order.total.toFixed(2)}</span>
            </div>
            {(onDetail || onReorder) && (
              <div className="flex flex-wrap gap-2 md:justify-end">
            {onDetail && (
              <button type="button" onClick={onDetail} className="inline-flex items-center gap-1.5 rounded-xl bg-yellow-400 px-4 py-2 text-xs font-semibold text-white transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                <Eye size={13} aria-hidden="true" /> Ver detalle
              </button>
            )}
            {onReorder && (
              <button type="button" onClick={onReorder} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition hover:border-yellow-300 hover:bg-yellow-50 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-yellow-300">
                <RefreshCw size={13} aria-hidden="true" /> Volver a pedir
              </button>
            )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default OrderCard;
