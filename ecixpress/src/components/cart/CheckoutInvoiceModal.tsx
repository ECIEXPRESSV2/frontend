import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2, ImageOff, Tag, Lock, ShieldCheck, ReceiptText, AlertTriangle, Clock } from 'lucide-react';
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

/** Recorte en zigzag (borde de recibo rasgado) para el pie de la tarjeta de vidrio. */
const ZIGZAG_CLIP_PATH =
  'polygon(0% 0%, 100% 0%, 100% 25%, 97.5% 100%, 95% 25%, 92.5% 100%, 90% 25%, 87.5% 100%, 85% 25%, 82.5% 100%, 80% 25%, 77.5% 100%, 75% 25%, 72.5% 100%, 70% 25%, 67.5% 100%, 65% 25%, 62.5% 100%, 60% 25%, 57.5% 100%, 55% 25%, 52.5% 100%, 50% 25%, 47.5% 100%, 45% 25%, 42.5% 100%, 40% 25%, 37.5% 100%, 35% 25%, 32.5% 100%, 30% 25%, 27.5% 100%, 25% 25%, 22.5% 100%, 20% 25%, 17.5% 100%, 15% 25%, 12.5% 100%, 10% 25%, 7.5% 100%, 5% 25%, 2.5% 100%, 0% 25%)';

const ZigzagEdge: React.FC = () => (
  <motion.div
    aria-hidden="true"
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.22, duration: 0.3, ease: 'easeOut' }}
    style={{ clipPath: ZIGZAG_CLIP_PATH, transformOrigin: 'top' }}
    className="h-4 w-full bg-white/80 backdrop-blur-2xl backdrop-saturate-150"
  />
);

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 32 } },
};

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

  const now = new Date();
  const insufficient = !!quote && walletBalance < quote.totalAmount;
  const payDisabled =
    paying || loading || !quote || quote.totalAmount <= 0 || quote.hasStockIssues || insufficient;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-3 sm:p-6 bg-white/60 backdrop-blur-xl"
          onClick={() => (paying ? undefined : onClose())}
        >
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 36, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.9 }}
            className="mx-auto w-full max-w-lg my-4 sm:my-8"
            role="dialog"
            aria-modal="true"
            aria-label="Factura del pedido"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden rounded-t-[32px] bg-white/85 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-black/[0.06] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.25)] px-5 sm:px-8 pt-7 pb-6">
              <motion.button
                onClick={onClose}
                disabled={paying}
                whileHover={{ rotate: 90, backgroundColor: 'rgba(0,0,0,0.08)' }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/[0.04] ring-1 ring-black/[0.06] flex items-center justify-center text-gray-600 disabled:opacity-50"
                aria-label="Cerrar"
              >
                <X size={18} />
              </motion.button>

              {/* Logo eciexpress */}
              <div className="relative flex flex-col items-center text-center">
                <img
                  src="/ecixpress-logo.svg"
                  alt="eciexpress"
                  className="h-12 w-auto"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {quote && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 20 }}
                    className="mt-3 inline-flex items-center rounded-full bg-black/[0.04] ring-1 ring-black/[0.06] px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-600"
                  >
                    {quote.storeName}
                  </motion.span>
                )}
              </div>

              <div className="relative my-5 border-t border-dashed border-gray-300" />

              {loading || !quote ? (
                <div className="relative flex flex-col items-center justify-center py-14 text-gray-400">
                  <Loader2 className="animate-spin" size={26} />
                  <p className="mt-3 text-sm">Cotizando tu pedido…</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Cabecera de factura */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        FACTURA <span className="font-normal text-gray-500">#{quote.orderNumber}</span>
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {now.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-right shrink-0">
                      <ReceiptText className="text-gray-400 shrink-0" size={24} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Resumen</p>
                        <p className="text-xs text-gray-500">Revisa antes de pagar</p>
                      </div>
                    </div>
                  </div>

                  {/* Líneas de producto */}
                  <div className="mt-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Productos</p>
                    <motion.ul variants={listVariants} initial="hidden" animate="show" className="mt-2">
                      {quote.lines.map((line) => (
                        <motion.li
                          key={line.productId}
                          variants={itemVariants}
                          className="flex items-center gap-3 py-3 border-b border-gray-200 last:border-0"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-black/[0.04] ring-1 ring-black/[0.06] overflow-hidden flex-shrink-0 flex items-center justify-center text-gray-400">
                            {line.imageUrl ? (
                              <img src={line.imageUrl} alt={line.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <ImageOff size={14} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{line.name}</p>
                            <p className="text-[11px] text-gray-500 tabular-nums">
                              {line.quantity} × {formatCOP(line.unitPrice)}
                              {line.sku && <span className="text-gray-400"> · {line.sku}</span>}
                            </p>
                            {!line.hasStock && (
                              <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1 mt-0.5">
                                <AlertTriangle size={11} />
                                {line.available > 0 ? `Solo ${line.available} disp.` : 'Sin stock'}
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                            {formatCOP(line.totalAmount)}
                          </span>
                        </motion.li>
                      ))}
                    </motion.ul>
                  </div>

                  <div className="my-4 border-t border-dashed border-gray-300" />

                  {/* Totales */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{formatCOP(quote.subtotalAmount)}</span>
                    </div>
                    {quote.discountAmount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-500">
                          Descuento
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.25, type: 'spring', stiffness: 420, damping: 14 }}
                            className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] ring-1 ring-black/[0.06] px-2 py-0.5 text-[11px] font-medium text-gray-700"
                          >
                            <Tag size={11} /> Promoción
                          </motion.span>
                        </span>
                        <span className="font-medium text-gray-700 tabular-nums">- {formatCOP(quote.discountAmount)}</span>
                      </div>
                    )}
                    {quote.peakFeeAmount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-500">
                          Comisión hora pico
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.25, type: 'spring', stiffness: 420, damping: 14 }}
                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 ring-1 ring-amber-200/70 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                          >
                            <Clock size={11} /> Hora pico
                          </motion.span>
                        </span>
                        <span className="font-medium text-gray-700 tabular-nums">+ {formatCOP(quote.peakFeeAmount)}</span>
                      </div>
                    )}
                  </div>

                  <div className="my-4 border-t border-dashed border-gray-300" />

                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-semibold text-gray-900">Total a pagar</span>
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={quote.totalAmount}
                        initial={{ opacity: 0, y: -6, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.92 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                        className="text-3xl font-semibold text-gray-900 tracking-tight tabular-nums"
                      >
                        {formatCOP(quote.totalAmount)}
                      </motion.span>
                    </AnimatePresence>
                  </div>

                  {/* Estado de billetera / stock */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Saldo billetera</span>
                    <span className={`font-semibold tabular-nums ${insufficient ? 'text-red-600' : 'text-gray-700'}`}>{formatCOP(walletBalance)}</span>
                  </div>

                  {quote.hasStockIssues && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 rounded-xl bg-red-50/80 backdrop-blur-sm ring-1 ring-red-200/60 px-3 py-2 text-xs font-medium text-red-600 flex items-center gap-2"
                    >
                      <AlertTriangle size={14} className="shrink-0" />
                      Algunos productos no tienen stock suficiente. Ajusta las cantidades en el carrito para continuar.
                    </motion.p>
                  )}
                  {insufficient && !quote.hasStockIssues && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 rounded-xl bg-red-50/80 backdrop-blur-sm ring-1 ring-red-200/60 px-3 py-2 text-xs font-medium text-red-600 flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-2">
                        <AlertTriangle size={14} className="shrink-0" /> Saldo insuficiente.
                      </span>
                      <motion.button
                        onClick={onRecharge}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        className="rounded-lg bg-red-600 px-2.5 py-1 text-white font-semibold shrink-0"
                      >
                        Recargar
                      </motion.button>
                    </motion.div>
                  )}

                  {/* Pagar */}
                  <motion.button
                    onClick={onPay}
                    disabled={payDisabled}
                    whileHover={payDisabled ? undefined : { scale: 1.015 }}
                    whileTap={payDisabled ? undefined : { scale: 0.98 }}
                    className="relative overflow-hidden mt-5 w-full py-3.5 rounded-2xl bg-gradient-to-b from-gray-800 to-gray-950 text-white font-semibold text-sm shadow-lg shadow-black/25 ring-1 ring-white/10 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {!payDisabled && (
                      <motion.span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                        animate={{ x: ['-120%', '320%'] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 0.6 }}
                      />
                    )}
                    <span className="relative flex items-center justify-center gap-2">
                      {paying ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}
                      {paying ? 'Procesando…' : 'Pagar ahora'}
                    </span>
                  </motion.button>

                  <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                    <ShieldCheck size={13} className="text-emerald-500" />
                    Pago 100% seguro con tu billetera eciexpress
                  </p>
                </div>
              )}
            </div>
            <ZigzagEdge />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CheckoutInvoiceModal;
