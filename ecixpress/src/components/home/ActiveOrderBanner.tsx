import React from 'react';
import { MessageCircle, PackageCheck, Store as StoreIcon } from 'lucide-react';
import { OrderProgressTimeline } from '../orders/OrderProgressTimeline';
import type { OrderResponse } from '../../lib/orders-api';
import { formatCOP } from '../../lib/format';
import { statusLabel, statusTone } from '../../lib/orders-ui';

interface ActiveOrderBannerProps {
  order: OrderResponse;
  onOpen: () => void;
  onChat: () => void;
}

/**
 * Banner del pedido activo: se muestra inmediatamente debajo de "Nuestras tiendas".
 * Versión compacta y tokenizada del antiguo ActiveOrderCard que vivía dentro de Home.tsx.
 */
const ActiveOrderBanner: React.FC<ActiveOrderBannerProps> = ({ order, onOpen, onChat }) => {
  const firstItem = order.items[0];
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section className="theme-surface rounded-[28px] border border-[color-mix(in_srgb,var(--accent-200)_80%,transparent)] bg-[linear-gradient(135deg,var(--accent-50)_0%,#ffffff_55%,var(--accent-50)_100%)] p-4 shadow-[0_12px_30px_rgb(var(--accent-rgb)/0.18)] md:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-stretch">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="theme-surface flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-400)] text-gray-950 shadow-sm">
                <PackageCheck size={20} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-600)]">Pedido activo</p>
                <h2 className="text-lg font-black text-gray-950 md:text-xl">{order.storeName}</h2>
                <p className="mt-0.5 text-sm text-gray-500">Pedido #{order.orderNumber.slice(-4)} · {itemCount} producto{itemCount === 1 ? '' : 's'}</p>
              </div>
            </div>
            <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${statusTone[order.status]}`}>
              {statusLabel[order.status]}
            </span>
          </div>

          <OrderProgressTimeline order={order} variant="compact" />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="theme-surface inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent-400)] px-4 py-2 text-sm font-black text-gray-950 transition hover:bg-[var(--accent-500)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
            >
              Ver resumen
            </button>
            <button
              type="button"
              onClick={onChat}
              className="theme-surface inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--accent-200)] bg-white px-4 py-2 text-sm font-black text-[var(--accent-700)] transition hover:bg-[var(--accent-50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
            >
              <MessageCircle size={16} aria-hidden="true" /> Chat
            </button>
          </div>
        </div>

        {/* Resumen del primer producto: solo en pantallas grandes (presupuesto de altura
            del primer pantallazo en laptops). */}
        <aside className="hidden rounded-3xl border border-white bg-white/85 p-4 shadow-sm lg:block">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-gray-950">
            <StoreIcon size={16} className="text-[var(--accent-600)]" aria-hidden="true" />
            En preparación
          </div>
          <div className="flex items-center gap-3">
            {firstItem?.imageUrl ? (
              <img src={firstItem.imageUrl} alt={firstItem.name} className="h-16 w-16 rounded-2xl object-contain" />
            ) : (
              <div className="theme-surface flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-50)] text-xl font-black text-[var(--accent-700)]">
                {firstItem?.name.trim()[0]?.toUpperCase() ?? 'P'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-gray-950">{firstItem?.name ?? 'Pedido ECIExpress'}</p>
              <p className="text-sm text-gray-500">
                {firstItem ? `x${firstItem.quantity}` : `${itemCount} productos`}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-lg font-black text-gray-950">{formatCOP(order.totalAmount)}</span>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default ActiveOrderBanner;
