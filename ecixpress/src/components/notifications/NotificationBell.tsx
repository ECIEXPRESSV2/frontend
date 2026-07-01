import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'framer-motion';
import { Bell, Check, CheckCheck, GripVertical, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationsContext';
import type { InboxNotification } from '../../services/notificationsService';

interface NotificationBellProps {
  /** True cuando el sidebar está expandido (muestra la etiqueta junto al icono). */
  expanded?: boolean;
  variant?: 'sidebar' | 'topbar';
  /** Avisa al contenedor (sidebar) cuando el panel se abre/cierra. */
  onOpenChange?: (open: boolean) => void;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  });
}

/** Tiempo que el cursor debe permanecer encima para marcar la notificación como leída. */
const HOVER_READ_DELAY_MS = 600;

const NotificationItem: React.FC<{
  n: InboxNotification;
  onMarkRead: (id: string) => void;
}> = ({ n, onMarkRead }) => {
  const timer = useRef<number | null>(null);

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  // Marca como leída al mantener el cursor encima (no de inmediato, para no marcar
  // todo al pasar el mouse de largo).
  const handleEnter = () => {
    if (n.read) return;
    clear();
    timer.current = window.setTimeout(() => onMarkRead(n.id), HOVER_READ_DELAY_MS);
  };

  useEffect(() => clear, []);

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={clear}
      className={`w-full text-left px-4 py-3 flex gap-3 transition-colors border-b border-gray-50 cursor-default
        ${n.read ? 'opacity-70' : 'bg-yellow-50/40 hover:bg-yellow-50'}`}
    >
      <span
        className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
          n.read ? 'bg-transparent' : 'bg-yellow-400'
        }`}
      />
      <span className="flex-1 min-w-0">
        <span className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm text-gray-900 truncate">
            {n.title}
          </span>
          <span className="text-[11px] text-gray-400 flex-shrink-0">
            {relativeTime(n.createdAt)}
          </span>
        </span>
        <span className="block text-xs text-gray-500 mt-0.5 line-clamp-2">
          {n.body}
        </span>
      </span>
    </div>
  );
};

const NotificationBell: React.FC<NotificationBellProps> = ({
  expanded = false,
  variant = 'sidebar',
  onOpenChange,
}) => {
  const { notifications, unreadCount, loading, markRead, markAllRead, refresh } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  const setPanelOpen = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
    if (next) void refresh();
  };

  // Cerrar al hacer click fuera del botón y del panel (el panel vive en un portal).
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // El panel se renderiza en document.body para escapar del sidebar, que crea un
  // bloque contenedor (por su backdrop-filter) y recorta con overflow-hidden.
  // Es arrastrable tomándolo por su cabecera (drag & drop con framer-motion).
  const panel = (
    <motion.div
      ref={panelRef}
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      // Relieve al pasar el cursor: sobresale un poco y la sombra crece.
      whileHover={{
        scale: 1.02,
        boxShadow: '0 28px 55px -12px rgba(0,0,0,0.38)',
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`fixed ${variant === 'topbar' ? 'right-5 top-16' : 'left-20 top-4'} w-[360px] max-w-[calc(100vw-2rem)] max-h-[70vh] bg-white rounded-2xl border border-gray-100 z-[100] flex flex-col overflow-hidden`}
      style={{
        animation: 'fadeIn .12s ease-out',
        boxShadow: '0 12px 32px -10px rgba(0,0,0,0.22)',
      }}
    >
      {/* Cabecera = asa de arrastre: ícono a un lado + título. */}
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 cursor-move select-none bg-white"
      >
        <img
          src="/eci-icon.png"
          alt="ECIExpress"
          className="w-7 h-7 rounded-md flex-shrink-0"
        />
        <h3 className="font-bold text-gray-900 text-sm flex-1">Notificaciones</h3>
        {unreadCount > 0 && (
          <button
            onClick={() => void markAllRead()}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-xs text-yellow-600 hover:text-yellow-700 font-medium flex items-center gap-1"
          >
            <CheckCheck size={14} />
            Marcar todas
          </button>
        )}
        <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
        <button
          onClick={() => setPanelOpen(false)}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Cerrar"
          className="p-1 rounded-lg text-gray-400 hover:text-yellow-500 hover:scale-125 transition-all duration-150 flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Bell size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No tienes notificaciones</p>
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              n={n}
              onMarkRead={(id) => void markRead(id)}
            />
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 text-center">
          <span className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
            <Check size={12} />
            {unreadCount === 0 ? 'Todo al día' : `${unreadCount} sin leer`}
          </span>
        </div>
      )}
    </motion.div>
  );

  const topbarClass = `relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/55 text-gray-500 backdrop-blur-sm transition hover:border-yellow-200/80 hover:bg-yellow-50/70 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-yellow-300${open ? ' border-yellow-200/80 bg-yellow-50/70 text-amber-700' : ''}`;
  const sidebarClass = `relative w-full h-11 rounded-xl flex items-center transition-all duration-300 ease-in-out group overflow-hidden ${open ? 'bg-yellow-100 text-yellow-600' : 'text-gray-500 hover:bg-yellow-50 hover:text-yellow-600'} ${expanded ? 'px-4' : 'justify-center'}`;

  return (
    <div className={variant === 'topbar' ? 'relative' : 'relative w-full'}>
      <button
        ref={buttonRef}
        onClick={() => setPanelOpen(!open)}
        title="Notificaciones"
        className={variant === 'topbar' ? topbarClass : sidebarClass}
      >
        <span className="relative flex-shrink-0">
          <Bell
            size={variant === 'topbar' ? 21 : 18}
            strokeWidth={variant === 'topbar' ? 2.2 : 2}
            className="transition-transform duration-300 group-hover:scale-110"
          />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        {expanded && (
          <span className="ml-3 font-medium text-sm whitespace-nowrap">
            Notificaciones
          </span>
        )}
      </button>

      {open && createPortal(panel, document.body)}
    </div>
  );
};

export default NotificationBell;
