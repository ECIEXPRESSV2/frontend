import React from 'react';
import {
  CheckCircle2,
  CreditCard,
  PackageCheck,
  QrCode,
  ShoppingBag,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { OrderResponse, OrderStatus } from '../../lib/orders-api';
import { ORDER_FLOW, statusLabel } from '../../lib/orders-ui';

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

type TimelineVariant = 'horizontal' | 'compact';

interface TimelineStep {
  status: OrderStatus;
  title: string;
  icon: LucideIcon;
}

const TRACKING_STEPS: TimelineStep[] = [
  {
    status: 'CREATED',
    title: 'Pedido creado',
    icon: ShoppingBag,
  },
  {
    status: 'PENDING_PAYMENT',
    title: 'Pago',
    icon: CreditCard,
  },
  {
    status: 'CONFIRMED',
    title: 'Confirmado',
    icon: CheckCircle2,
  },
  {
    status: 'READY_FOR_PICKUP',
    title: 'Listo para retirar',
    icon: PackageCheck,
  },
  {
    status: 'DELIVERED',
    title: 'Entregado',
    icon: QrCode,
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

const badStatus = (status: OrderStatus) => status === 'CANCELLED' || status === 'FAILED';

export const OrderProgressTimeline: React.FC<{
  order: OrderResponse;
  variant?: TimelineVariant;
}> = ({ order, variant = 'horizontal' }) => {
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

  const compact = variant === 'compact';

  return (
    <div className={`rounded-3xl border border-amber-100 bg-amber-50/50 ${compact ? 'p-3' : 'p-4'}`}>
      {!compact && (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">Seguimiento</p>
        </div>
      )}
      <div className="grid grid-cols-5 gap-2">
        {TRACKING_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const stepIdx = stepFlowIndex(step.status);
          const done = doneUntil >= stepIdx;
          const current = order.status === step.status
            || (order.status === 'PAYMENT_APPROVED' && step.status === 'PENDING_PAYMENT')
            || (order.status === 'IN_PREPARATION' && step.status === 'READY_FOR_PICKUP');
          return (
            <div key={step.status} className="relative min-w-0">
              {idx > 0 && (
                <span
                  className={`absolute left-[-50%] top-5 hidden h-0.5 w-full md:block ${done || current ? 'bg-yellow-400' : 'bg-gray-200'}`}
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
                  <Icon size={18} />
                </span>
                <span className={`mt-1 text-[11px] font-bold leading-tight ${done || current ? 'text-gray-800' : 'text-gray-400'}`}>
                  {step.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
