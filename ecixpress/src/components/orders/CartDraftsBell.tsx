import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ChevronRight, ImageOff, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ordersApi, type OrderResponse } from '../../lib/orders-api';
import { formatCOP } from '../../lib/format';

interface CartDraftsBellProps {
  /** Avisa al contenedor (topbar) cuando el panel se abre/cierra, para no colapsar la cápsula. */
  onOpenChange?: (open: boolean) => void;
  /** Avisa si hay o no carritos pendientes, para que la cápsula reserve espacio para el ícono. */
  onHasDraftsChange?: (has: boolean) => void;
}

/**
 * Atajo del topbar que aparece SOLO cuando el usuario tiene al menos un pedido en estado
 * carrito (DRAFT). Al abrirlo muestra esos carritos como tarjetas; al elegir uno, lleva de
 * vuelta a la tienda con `?draft=<id>` para continuar el pedido.
 */
const CartDraftsBell: React.FC<CartDraftsBellProps> = ({ onOpenChange, onHasDraftsChange }) => {
  const navigate = useNavigate();
  const { userProfile, getToken } = useAuth();
  const [drafts, setDrafts] = useState<OrderResponse[]>([]);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    if (!userProfile?.id) return;
    try {
      const token = await getToken().catch(() => null);
      const data = await ordersApi.getOrders(token, { customerId: userProfile.id, status: 'DRAFT' });
      const list = data.filter((o) => o.status === 'DRAFT' && o.items.length > 0);
      setDrafts(list);
      onHasDraftsChange?.(list.length > 0);
    } catch {
      /* sin conexión: no mostramos el atajo */
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      if (!userProfile?.id) return;
      try {
        const token = await getToken().catch(() => null);
        const data = await ordersApi.getOrders(token, { customerId: userProfile.id, status: 'DRAFT' });
        const list = data.filter((o) => o.status === 'DRAFT' && o.items.length > 0);
        if (active) {
          setDrafts(list);
          onHasDraftsChange?.(list.length > 0);
        }
      } catch {
        /* sin conexión: no mostramos el atajo */
      }
    })();
    // Al volver a la pestaña puede haber cambiado el carrito (se pagó, se agregó algo).
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => { active = false; window.removeEventListener('focus', onFocus); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id]);

  // Cerrar al hacer click fuera del botón y del panel (el panel vive en un portal).
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setPanelOpen = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
    if (next) void refresh();
  };

  const selectDraft = (order: OrderResponse) => {
    setPanelOpen(false);
    navigate(`/store/${order.storeId}?draft=${order.id}`);
  };

  // El atajo solo existe si hay carritos pendientes.
  if (drafts.length === 0) return null;

  const panel = (
    <div
      ref={panelRef}
      className="fixed right-5 top-16 z-[100] flex max-h-[70vh] w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white"
      style={{ animation: 'fadeIn .12s ease-out', boxShadow: '0 12px 32px -10px rgba(0,0,0,0.22)' }}
    >
      <div className="flex items-center gap-2 border-b border-gray-100 bg-white px-4 py-3">
        <ShoppingCart size={16} className="text-yellow-500" />
        <h3 className="flex-1 text-sm font-bold text-gray-900">Carritos pendientes</h3>
        <button
          onClick={() => setPanelOpen(false)}
          aria-label="Cerrar"
          className="rounded-lg p-1 text-gray-400 transition hover:text-yellow-500"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {drafts.map((order) => {
          const first = order.items[0];
          const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
          const total = order.totalAmount || order.subtotalAmount;
          return (
            <button
              key={order.id}
              onClick={() => selectDraft(order)}
              className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left transition hover:bg-yellow-50"
            >
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-yellow-50 text-yellow-300">
                {first?.imageUrl ? (
                  <img src={first.imageUrl} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <ImageOff size={16} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-gray-900">{order.storeName}</span>
                <span className="block text-xs text-gray-500">
                  {itemCount} producto{itemCount === 1 ? '' : 's'} · {formatCOP(total)}
                </span>
              </span>
              <ChevronRight size={16} className="flex-shrink-0 text-gray-300" />
            </button>
          );
        })}
      </div>

      <div className="border-t border-gray-100 px-4 py-2 text-center">
        <span className="text-[11px] text-gray-400">Elige un carrito para continuar el pedido</span>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setPanelOpen(!open)}
        title="Carritos pendientes"
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/55 text-gray-500 backdrop-blur-sm transition hover:border-yellow-200/80 hover:bg-yellow-50/70 hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-yellow-300${open ? ' border-yellow-200/80 bg-yellow-50/70 text-amber-700' : ''}`}
      >
        <ShoppingCart size={21} strokeWidth={2.2} />
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {drafts.length > 9 ? '9+' : drafts.length}
        </span>
      </button>

      {open && createPortal(panel, document.body)}
    </div>
  );
};

export default CartDraftsBell;
