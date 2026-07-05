import React, { useEffect } from 'react';
import { X, Loader2, ImageOff, Tag, Lock, ShieldCheck, ReceiptText, AlertTriangle } from 'lucide-react';
import { formatCOP } from '../../lib/format';
import type { CartQuoteResponse } from '../../lib/orders-api';

interface CheckoutInvoiceModalProps {
  open: boolean;
  /** Factura cotizada; null mientras se cotiza. */
  quote: CartQuoteResponse | null;
  /** Cotizando (paso "Confirmar" en curso). */
  loading: boolean;
  /** Pago en curso (checkout). */
  paying: boolean;
  /** Saldo de la billetera en centavos COP. */
  walletBalance: number;
  onClose: () => void;
  onPay: () => void;
  onRecharge: () => void;
}

/** Borde inferior dentado (recibo rasgado), en blanco, para el pie de la tarjeta. */
const ZigzagEdge: React.FC = () => (
  <svg
    viewBox="0 0 100 4"
    preserveAspectRatio="none"
    className="block w-full h-3 text-white"
    aria-hidden="true"
  >
    <polygon
      fill="currentColor"
      points="0,0 100,0 100,1 97.5,4 95,1 92.5,4 90,1 87.5,4 85,1 82.5,4 80,1 77.5,4 75,1 72.5,4 70,1 67.5,4 65,1 62.5,4 60,1 57.5,4 55,1 52.5,4 50,1 47.5,4 45,1 42.5,4 40,1 37.5,4 35,1 32.5,4 30,1 27.5,4 25,1 22.5,4 20,1 17.5,4 15,1 12.5,4 10,1 7.5,4 5,1 2.5,4 0,1"
    />
  </svg>
);

/**
 * Modal de factura del checkout. Muestra la cotización autoritativa (precio con promociones y
 * stock por línea) con apariencia de recibo y cobra contra la billetera (único medio de pago).
 * El precio ya viene resuelto de orders-service (paso "Confirmar"), así que este modal no espera
 * eventos ni sondea.
 */
const CheckoutInvoiceModal: React.FC<CheckoutInvoiceModalProps> = ({
  open,
  quote,
  loading,
  paying,
  walletBalance,
  onClose,
  onPay,
  onRecharge,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !paying) onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, paying]);

  if (!open) return null;

  const now = new Date();
  const insufficient = !!quote && walletBalance < quote.totalAmount;
  const payDisabled =
    paying || loading || !quote || quote.totalAmount <= 0 || quote.hasStockIssues || insufficient;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-3 sm:p-6 bg-gray-900/50 backdrop-blur-sm"
      onClick={() => (paying ? undefined : onClose())}
    >
      <div
        className="mx-auto w-full max-w-lg my-4 sm:my-8"
        role="dialog"
        aria-modal="true"
        aria-label="Factura del pedido"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-white rounded-t-[28px] px-5 sm:px-8 pt-7 pb-6 shadow-2xl">
          <button
            onClick={onClose}
            disabled={paying}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>

          {/* Logo eciexpress */}
          <div className="flex flex-col items-center text-center">
            <img
              src="/logotipoEcixpress.svg"
              alt="eciexpress"
              className="h-12 w-auto"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            {quote && <p className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-400">{quote.storeName}</p>}
          </div>

          <div className="my-5 border-t border-dashed border-gray-200" />

          {loading || !quote ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <Loader2 className="animate-spin text-yellow-400" size={28} />
              <p className="mt-3 text-sm">Cotizando tu pedido…</p>
            </div>
          ) : (
            <>
              {/* Cabecera de factura */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    FACTURA <span className="text-yellow-500">#{quote.orderNumber}</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Fecha: {now.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500">
                    Hora: {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <ReceiptText className="text-yellow-400 shrink-0" size={26} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Resumen de compra</p>
                    <p className="text-xs text-gray-400">Revisa antes de pagar</p>
                  </div>
                </div>
              </div>

              {/* Tabla de líneas */}
              <div className="mt-5 overflow-x-auto">
                <div className="min-w-[22rem]">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 rounded-lg bg-yellow-400 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-yellow-950">
                    <span>Producto</span>
                    <span className="text-right">P. Unit.</span>
                    <span className="text-center">Cant.</span>
                    <span className="text-right">Total</span>
                  </div>
                  <ul>
                    {quote.lines.map((line) => (
                      <li
                        key={line.productId}
                        className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-dashed border-gray-100 px-3 py-3"
                      >
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
                            {line.sku && <p className="text-[11px] text-gray-400">SKU: {line.sku}</p>}
                            {!line.hasStock && (
                              <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1">
                                <AlertTriangle size={11} />
                                {line.available > 0 ? `Solo ${line.available} disp.` : 'Sin stock'}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-right text-sm text-gray-600 tabular-nums">{formatCOP(line.unitPrice)}</span>
                        <span className="mx-auto min-w-[2rem] rounded-md border border-gray-200 px-2 py-0.5 text-center text-sm font-semibold text-gray-700 tabular-nums">
                          {line.quantity}
                        </span>
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
                  <span className="tabular-nums">{formatCOP(quote.subtotalAmount)}</span>
                </div>
                {quote.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-500">
                      DESCUENTO
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-700">
                        <Tag size={11} /> Promoción
                      </span>
                    </span>
                    <span className="font-medium text-yellow-600 tabular-nums">- {formatCOP(quote.discountAmount)}</span>
                  </div>
                )}
              </div>

              <div className="my-4 border-t border-dashed border-gray-200" />

              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold text-gray-900">TOTAL A PAGAR</span>
                <span className="text-2xl font-extrabold text-yellow-500 tabular-nums">{formatCOP(quote.totalAmount)}</span>
              </div>

              {/* Estado de billetera / stock */}
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-500">Saldo billetera</span>
                <span className={`font-semibold tabular-nums ${insufficient ? 'text-red-600' : 'text-gray-700'}`}>{formatCOP(walletBalance)}</span>
              </div>

              {quote.hasStockIssues && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  Algunos productos no tienen stock suficiente. Ajusta las cantidades en el carrito para continuar.
                </p>
              )}
              {insufficient && !quote.hasStockIssues && (
                <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0" /> Saldo insuficiente.
                  </span>
                  <button onClick={onRecharge} className="rounded-md bg-red-600 px-2.5 py-1 text-white font-semibold hover:bg-red-700 transition">
                    Recargar
                  </button>
                </div>
              )}

              {/* Pagar */}
              <button
                onClick={onPay}
                disabled={payDisabled}
                className="mt-5 w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-bold text-sm shadow-md shadow-yellow-300/50 hover:from-yellow-500 hover:to-yellow-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {paying ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}
                {paying ? 'Procesando…' : 'PAGAR AHORA'}
              </button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                <ShieldCheck size={13} className="text-green-500" />
                Pago 100% seguro con tu billetera eciexpress
              </p>
            </>
          )}
        </div>
        <ZigzagEdge />
      </div>
    </div>
  );
};

export default CheckoutInvoiceModal;
