import React from 'react';
import { ChevronRight, RefreshCcw } from 'lucide-react';
import type { RefundMessageKind } from '../../lib/orders-api';
import { formatDateTime } from '../../lib/format';

const STATUS_LABEL: Record<RefundMessageKind, string> = {
  requested: 'Pendiente de revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

const STATUS_TONE: Record<RefundMessageKind, string> = {
  requested: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

interface RefundCardProps {
  kind: RefundMessageKind;
  requestedAt: string;
  onOpenDetail: () => void;
}

/** Tarjeta de "Solicitud de reembolso" dentro del chat: estado + link al detalle. */
const RefundCard: React.FC<RefundCardProps> = ({ kind, requestedAt, onOpenDetail }) => (
  <button
    onClick={onOpenDetail}
    className="w-full max-w-[85%] rounded-2xl border border-amber-200/70 bg-white/90 backdrop-blur-xl p-3.5 text-left shadow-sm transition-all duration-200 hover:border-amber-300 hover:shadow-md"
  >
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <RefreshCcw size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">Solicitud de reembolso</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[kind]}`}>
            {STATUS_LABEL[kind]}
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-0.5">Solicitado el {formatDateTime(requestedAt)}</p>
      </div>
    </div>
    <div className="mt-2 flex items-center justify-end gap-0.5 text-xs font-semibold text-amber-700">
      Detalle <ChevronRight size={14} />
    </div>
  </button>
);

export default RefundCard;
