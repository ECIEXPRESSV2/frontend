import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { History } from 'lucide-react';
import ModalShell from '../wallet/ModalShell';
import { useAuth } from '../../context/AuthContext';
import { inventoryApi, MOVEMENT_TYPE_LABELS, type InventoryMovement } from '../../lib/inventory-api';
import { formatDateTime } from '../../lib/format';

interface InventoryHistoryModalProps {
  open: boolean;
  onClose: () => void;
  productId: string | null;
  productName?: string;
}

/** Signo del movimiento según su tipo, para mostrar la cantidad con +/-. */
const signedQuantity = (m: InventoryMovement): string => {
  const negative = m.type === 'ADJUSTMENT_SUBTRACT' || m.type === 'RESERVATION';
  if (m.type === 'ADJUSTMENT_SET') return String(m.quantity);
  return `${negative ? '-' : '+'}${Math.abs(m.quantity)}`;
};

/** Determina si el movimiento es una ganancia (entrada) o pérdida (salida) de stock. */
const isNegativeMovement = (m: InventoryMovement): boolean =>
  m.type === 'ADJUSTMENT_SUBTRACT' || m.type === 'RESERVATION';

/** Modal de solo lectura: historial de movimientos de inventario de un producto. */
const InventoryHistoryModal: React.FC<InventoryHistoryModalProps> = ({ open, onClose, productId, productName }) => {
  const { getToken } = useAuth();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !productId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const token = await getToken().catch(() => null);
        const data = await inventoryApi.getByProduct(productId, {}, token);
        if (!cancelled) setMovements(data);
      } catch (e) {
        if (!cancelled) toast.error((e as Error).message || 'No se pudo cargar el historial de inventario');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  return (
    <ModalShell open={open} onClose={onClose} title="Historial de inventario" subtitle={productName} maxWidth="max-w-lg">
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : movements.length === 0 ? (
        <div className="py-8 text-center text-gray-400">
          <History className="mx-auto mb-2 text-primary/60" size={28} />
          Sin movimientos registrados para este producto.
        </div>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto">
          {movements.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-3 border-t border-dashed border-gray-200 first:border-t-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{MOVEMENT_TYPE_LABELS[m.type]}</p>
                <p className="text-xs text-gray-500 tabular-nums tracking-wide">{formatDateTime(m.createdAt)}</p>
                {m.notes && <p className="text-xs text-gray-400 truncate mt-0.5">{m.notes}</p>}
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold tabular-nums tracking-wide ${m.type === 'ADJUSTMENT_SET' ? 'text-gray-900' : isNegativeMovement(m) ? 'text-danger' : 'text-secondary'}`}>
                  {signedQuantity(m)}
                </p>
                <p className="text-[11px] text-gray-400 tabular-nums tracking-wide">stock: {m.stockAfter}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
};

export default InventoryHistoryModal;
