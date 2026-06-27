import React from 'react';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Package,
  PackageCheck,
  QrCode,
  ShoppingBag,
  Store,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { OrderResponse, OrderStatus } from '../../lib/orders-api';
import { ORDER_FLOW, statusLabel } from '../../lib/orders-ui';
import { formatDateTime } from '../../lib/format';

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'CREATED',
  'PENDING_PAYMENT',
  'PAYMENT_APPROVED',
  'CONFIRMED',
  'IN_PREPARATION',
  'READY_FOR_PICKUP',
];

export const isActiveOrder = (status: OrderStatus): boolean =>
  ACTIVE_ORDER_STATUSES.includes(status);

type TimelineVariant = 'horizontal' | 'vertical' | 'compact';

interface TimelineStep {
  status: OrderStatus;
  title: string;
  description: string;
  icon: LucideIcon;
}

const TRACKING_STEPS: TimelineStep[] = [
  {
    status: 'CREATED',
    title: 'Pedido creado',
    description: 'Recibimos tu pedido',
    icon: ShoppingBag,
  },
  {
    status: 'PENDING_PAYMENT',
    title: 'Pago',
    description: 'Validando el pago',
    icon: CreditCard,
  },
  {
    status: 'CONFIRMED',
    title: 'Confirmado',
    description: 'La tienda lo acepto',
    icon: Store,
  },
  {
    status: 'IN_PREPARATION',
    title: 'Preparacion',
    description: 'Tu pedido esta en cocina',
    icon: Package,
  },
  {
    status: 'READY_FOR_PICKUP',
    title: 'Retiro',
    description: 'Muestra el codigo QR',
    icon: QrCode,
  },
  {
    status: 'DELIVERED',
    title: 'Entregado',
    description: 'Pedido finalizado',
    icon: PackageCheck,
  },
];

function flowIndex(status: OrderStatus): number {
  if (status === 'PAYMENT_APPROVED') return ORDER_FLOW.indexOf('PAYMENT_APPROVED');
  return ORDER_FLOW.indexOf(status);
}

function stepFlowIndex(status: OrderStatus): number {
  if (status === 'CONFIRMED') return ORDER_FLOW.indexOf('CONFIRMED');
  return flowIndex(status);
}

function progressIndex(order: OrderResponse): number {
  const byCurrentStatus = flowIndex(order.status);
  if (byCurrentStatus >= 0) return byCurrentStatus;
  return Math.max(
    -1,
    ...order.statusHistory
      .map((entry) => flowIndex(entry.toStatus))
      .filter((idx) => idx >= 0),
  );
}

function stepDate(order: OrderResponse, status: OrderStatus): string | undefined {
  return [...order.statusHistory]
    .reverse()
    .find((entry) => entry.toStatus === status)?.occurredAt;
}

function currentStepTitle(order: OrderResponse): string {
  if (order.status === 'PAYMENT_APPROVED') return 'Pago aprobado';
  return statusLabel[order.status] ?? 'Pedido activo';
}

const badStatus = (status: OrderStatus) => status === 'CANCELLED' || status === 'FAILED';

export const OrderProgressTimeline: React.FC<{
  order: OrderResponse;
  variant?: TimelineVariant;
  showDates?: boolean;
}> = ({ order, variant = 'horizontal', showDates = false }) => {
  const terminalBad = badStatus(order.status);
  const doneUntil = progressIndex(order);

  if (terminalBad) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        <div className="flex items-center gap-2 font-bold">
          <XCircle size={16} />
          Pedido {statusLabel[order.status].toLowerCase()}
        </div>
        {order.statusHistory.at(-1)?.reason && (
          <p className="mt-1 text-xs text-red-600">{order.statusHistory.at(-1)?.reason}</p>
        )}
      </div>
    );
  }

  if (variant === 'vertical') {
    return (
      <div className="rounded-3xl border border-amber-100 bg-amber-50/40 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">Seguimiento</p>
            <h3 className="text-lg font-black text-gray-950">{currentStepTitle(order)}</h3>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-500 shadow-sm">
            #{order.orderNumber.slice(-4)}
          </span>
        </div>
        <div className="space-y-0">
          {TRACKING_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const stepIdx = stepFlowIndex(step.status);
            const done = doneUntil >= stepIdx;
            const current = order.status === step.status || (order.status === 'PAYMENT_APPROVED' && step.status === 'PENDING_PAYMENT');
            const date = stepDate(order, step.status);
            return (
              <div key={step.status} className="grid grid-cols-[44px_1fr] gap-3">
                <div className="relative flex justify-center">
                  {idx < TRACKING_STEPS.length - 1 && (
                    <span
                      className={`absolute top-11 h-full w-1 rounded-full ${doneUntil > stepIdx ? 'bg-yellow-400' : 'bg-gray-200'}`}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-4 ${
                      done
                        ? 'border-yellow-100 bg-yellow-400 text-gray-950 shadow-sm'
                        : current
                          ? 'border-yellow-100 bg-white text-amber-600 shadow-sm'
                          : 'border-gray-100 bg-white text-gray-300'
                    }`}
                  >
                    {done && !current ? <CheckCircle2 size={19} /> : <Icon size={19} />}
                  </span>
                </div>
                <div className="pb-7">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-black ${done || current ? 'text-gray-950' : 'text-gray-400'}`}>{step.title}</p>
                      <p className={`text-xs ${done || current ? 'text-gray-500' : 'text-gray-400'}`}>{step.description}</p>
                    </div>
                    {showDates && date && <span className="text-xs font-semibold text-gray-400">{formatDateTime(date)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const compact = variant === 'compact';

  return (
    <div className={`rounded-3xl border border-amber-100 bg-amber-50/50 ${compact ? 'p-3' : 'p-4'}`}>
      <div className={`grid gap-2 ${compact ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-2 md:grid-cols-6'}`}>
        {TRACKING_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const stepIdx = stepFlowIndex(step.status);
          const done = doneUntil >= stepIdx;
          const current = order.status === step.status || (order.status === 'PAYMENT_APPROVED' && step.status === 'PENDING_PAYMENT');
          return (
            <div key={step.status} className="relative min-w-0">
              {idx > 0 && (
                <span
                  className={`absolute left-[-50%] top-5 hidden h-0.5 w-full md:block ${done ? 'bg-yellow-400' : 'bg-gray-200'}`}
                  aria-hidden="true"
                />
              )}
              <div className="relative z-10 flex flex-col items-center text-center">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-4 ${
                    done
                      ? 'border-yellow-100 bg-yellow-400 text-gray-950'
                      : current
                        ? 'border-yellow-100 bg-white text-amber-600'
                        : 'border-gray-100 bg-white text-gray-300'
                  }`}
                >
                  {done && !current ? <CheckCircle2 size={17} /> : current ? <Icon size={17} /> : <Clock size={16} />}
                </span>
                <span className={`mt-1 text-[11px] font-bold leading-tight ${done || current ? 'text-gray-800' : 'text-gray-400'}`}>
                  {compact ? step.title.split(' ')[0] : step.title}
                </span>
                {!compact && (
                  <span className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-gray-400">
                    {step.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
