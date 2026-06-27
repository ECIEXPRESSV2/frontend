import {
  Clock, CheckCircle2, ChefHat, PackageCheck, CheckCircle, XCircle, AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

export type OrderStatus =
  | 'pending' | 'confirmed' | 'preparing' | 'ready'
  | 'delivered' | 'cancelled' | 'issue' | 'completed';

interface StatusMeta {
  icon: LucideIcon;
  label: string;
  pillClass: string;   // badge
  accentClass: string; // barra lateral
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusMeta> = {
  pending:   { icon: Clock,        label: 'Pendiente',         pillClass: 'bg-amber-100 text-amber-800 border-amber-200',   accentClass: 'bg-amber-400' },
  confirmed: { icon: CheckCircle2, label: 'Confirmado',        pillClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',       accentClass: 'bg-cyan-400' },
  preparing: { icon: ChefHat,      label: 'En preparación',    pillClass: 'bg-amber-100 text-amber-800 border-amber-200',   accentClass: 'bg-amber-400' },
  ready:     { icon: PackageCheck, label: 'Listo para recoger', pillClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',      accentClass: 'bg-cyan-400' },
  delivered: { icon: CheckCircle,  label: 'Entregado',         pillClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', accentClass: 'bg-emerald-400' },
  completed: { icon: CheckCircle,  label: 'Completado',        pillClass: 'bg-emerald-100 text-emerald-800 border-emerald-200', accentClass: 'bg-emerald-400' },
  cancelled: { icon: XCircle,      label: 'Cancelado',         pillClass: 'bg-red-100 text-red-800 border-red-200',         accentClass: 'bg-red-400' },
  issue:     { icon: AlertTriangle,label: 'Con inconveniente', pillClass: 'bg-red-100 text-red-800 border-red-200',         accentClass: 'bg-red-400' },
};

export const getOrderStatusMeta = (status: string): StatusMeta =>
  ORDER_STATUS_CONFIG[(status as OrderStatus)] ?? ORDER_STATUS_CONFIG.pending;
