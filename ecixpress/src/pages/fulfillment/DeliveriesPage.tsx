import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  ScanLine,
  CheckCircle2,
  XCircle,
  PackageCheck,
  ClipboardX,
  Search,
  ChevronLeft,
  ChevronRight,
  Store,
  AlertTriangle,
  Camera,
} from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import ModalShell from '../../components/wallet/ModalShell';
import QrScannerModal from '../../components/fulfillment/QrScannerModal';
import FormInput from '../../components/ui/FormInput';
import { useAuth } from '../../context/AuthContext';
import { useFulfillmentApi } from '../../hooks/useFulfillmentApi';
import {
  FulfillmentApiError,
  type DeliveryFailureReason,
  type PaginatedDeliveries,
  type ValidatedOrder,
} from '../../lib/fulfillment-api';
import {
  deliveryMethodLabel,
  FAILURE_REASONS,
  failureReasonLabel,
  validationErrorLabel,
} from '../../lib/fulfillment-ui';
import { formatDateTime } from '../../lib/format';
import { getStoreById } from '../../services/storeService';

interface DeliveriesPageProps {
  onBack?: () => void;
}

type ValidationState =
  | { kind: 'idle' }
  | { kind: 'valid'; order: ValidatedOrder }
  | { kind: 'invalid'; message: string };

const PAGE_SIZE = 10;

/**
 * Centro de entregas del vendedor. Reúne los casos de uso operativos de Fulfillment:
 * validar (UC-03) y confirmar (UC-04) por código, entrega manual (UC-05) y fallida (UC-06)
 * por pedido, e historial paginado por tienda (UC-10).
 */
const DeliveriesPage: React.FC<DeliveriesPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const api = useFulfillmentApi();

  // ── Validar / confirmar ──────────────────────────────────────
  const [code, setCode] = useState('');
  const [validation, setValidation] = useState<ValidationState>({ kind: 'idle' });
  const [validating, setValidating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [storeName, setStoreName] = useState<string | null>(null);

  // ── Gestión manual por pedido ────────────────────────────────
  const [orderId, setOrderId] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [failureOpen, setFailureOpen] = useState(false);

  // ── Historial por tienda ─────────────────────────────────────
  const [storeId, setStoreId] = useState('');
  const [methodFilter, setMethodFilter] = useState<'' | 'QR' | 'MANUAL'>('');
  const [orderDir, setOrderDir] = useState<'DESC' | 'ASC'>('DESC');
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState<PaginatedDeliveries | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const resetValidation = () => {
    setValidation({ kind: 'idle' });
    setStoreName(null);
  };

  const handleValidate = async (override?: string) => {
    const trimmed = (override ?? code).trim();
    if (!trimmed) return;
    setValidating(true);
    setValidation({ kind: 'idle' });
    try {
      const result = await api.validateCode(trimmed);
      if (result.valid && result.order) {
        setValidation({ kind: 'valid', order: result.order });
        setOrderId(result.order.orderId); // prefill para gestión manual
        // Resuelve el nombre de la tienda (endpoint público de identity) para no mostrar el UUID.
        setStoreName(null);
        void getStoreById(result.order.storeId, null)
          .then((s) => setStoreName(s.name))
          .catch(() => setStoreName(null));
      } else {
        const reason = result.validationError;
        setValidation({
          kind: 'invalid',
          message: reason ? validationErrorLabel[reason] : 'El código no es válido.',
        });
      }
    } catch (e) {
      setValidation({
        kind: 'invalid',
        message: e instanceof Error ? e.message : 'No pudimos validar el código.',
      });
    } finally {
      setValidating(false);
    }
  };

  // Resultado del escáner de cámara (UC-03): el QR trae el token; lo dejamos en el input y
  // validamos automáticamente para que el vendedor confirme en un solo paso.
  const handleScanResult = useCallback((token: string) => {
    setScannerOpen(false);
    setCode(token);
    void handleValidate(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setConfirming(true);
    try {
      const delivery = await api.confirmCode(trimmed);
      if (delivery.alreadyDelivered) {
        toast.warning(`Este pedido ya había sido entregado.`);
      } else {
        toast.success(`Entrega confirmada para el pedido ${delivery.orderId}.`);
      }
      setCode('');
      resetValidation();
      setConfirmOpen(false);
      if (storeId) void loadHistory(1);
    } catch (e) {
      const msg =
        e instanceof FulfillmentApiError ? e.message : 'No pudimos confirmar la entrega.';
      toast.error(msg);
      setConfirmOpen(false);
    } finally {
      setConfirming(false);
    }
  };

  const loadHistory = useCallback(
    async (toPage: number) => {
      const store = storeId.trim();
      if (!store) {
        setHistoryError('Ingresa el ID de la tienda para ver su historial.');
        return;
      }
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const result = await api.getStoreDeliveries(store, {
          page: toPage,
          limit: PAGE_SIZE,
          order: orderDir,
          method: methodFilter || undefined,
        });
        setHistory(result);
        setPage(toPage);
      } catch (e) {
        setHistory(null);
        setHistoryError(
          e instanceof Error ? e.message : 'No pudimos cargar el historial de entregas.',
        );
      } finally {
        setHistoryLoading(false);
      }
    },
    [api, storeId, orderDir, methodFilter],
  );

  // Prefill del store del vendedor si el perfil lo trae (mejor recognition que recall).
  useEffect(() => {
    const profileStore = (userProfile as { storeId?: string } | null)?.storeId;
    if (profileStore && !storeId) setStoreId(profileStore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  const totalPages = history ? Math.max(1, Math.ceil(history.total / history.limit)) : 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="deliveries" />

      <main className="app-shift px-6 pb-6 pt-20 md:px-8 md:pb-8">
        <div className="w-full space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => (onBack ? onBack() : navigate('/home'))}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-xl border border-white/40 text-gray-700 font-medium text-sm hover:bg-yellow-50 hover:text-yellow-600 transition-all"
            >
              <ArrowLeft size={16} /> Volver
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Centro de entregas</h1>
              <p className="text-sm text-gray-500">Valida códigos, confirma entregas y revisa el historial de tu tienda.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* ── Columna izquierda: operación ── */}
            <div className="space-y-6">
              {/* Validar / confirmar (UC-03 / UC-04) */}
              <section className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <ScanLine size={20} className="text-yellow-500" />
                  <h2 className="text-lg font-bold text-gray-900">Validar código de retiro</h2>
                </div>
                <p className="text-sm text-gray-500">
                  Escanea el QR con la cámara o pide al cliente su código corto (formato <code className="text-gray-700">XXXX-XXXX</code>).
                  Validar no confirma la entrega.
                </p>

                {/* Camino principal: escanear con la cámara real del dispositivo */}
                <button
                  onClick={() => setScannerOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold shadow-md shadow-yellow-200/60 hover:from-yellow-500 hover:to-yellow-600 transition-all"
                >
                  <Camera size={18} /> Escanear QR con la cámara
                </button>

                {/* Separador hacia el ingreso manual */}
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="h-px flex-1 bg-gray-200" />
                  o escribe el código a mano
                  <span className="h-px flex-1 bg-gray-200" />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      if (validation.kind !== 'idle') resetValidation();
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                    placeholder="Token del QR o A7K9-P2MX"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/60 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                  />
                  <button
                    onClick={() => handleValidate()}
                    disabled={validating || !code.trim()}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-yellow-50 hover:text-yellow-600 transition-all disabled:opacity-50"
                  >
                    <Search size={16} /> {validating ? 'Validando…' : 'Validar'}
                  </button>
                </div>

                {/* Resultado de la validación */}
                {validation.kind === 'valid' && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                      <CheckCircle2 size={18} /> Código válido
                    </div>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div>
                        <dt className="text-gray-400">Tienda</dt>
                        <dd className="font-medium text-gray-800 break-all">
                          {storeName ?? `${validation.order.storeId.slice(0, 8)}…`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-400">Vence</dt>
                        <dd className="font-medium text-gray-800">{formatDateTime(validation.order.expiresAt)}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-gray-400">Pedido</dt>
                        <dd className="font-medium text-gray-800 break-all">{validation.order.orderId}</dd>
                      </div>
                    </dl>
                    {/* Con un código válido, la única acción es confirmar por QR/código (UC-04).
                        La entrega manual y la fallida viven abajo, para el caso SIN código. */}
                    <button
                      onClick={() => setConfirmOpen(true)}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all"
                    >
                      <PackageCheck size={18} /> Confirmar entrega
                    </button>
                  </div>
                )}

                {validation.kind === 'invalid' && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-2 text-sm text-red-700">
                    <XCircle size={18} className="mt-0.5 flex-shrink-0" />
                    <span>{validation.message}</span>
                  </div>
                )}
              </section>

              {/* Gestión manual por pedido (UC-05 / UC-06) */}
              <section className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <ClipboardX size={20} className="text-yellow-500" />
                  <h2 className="text-lg font-bold text-gray-900">Entrega sin código</h2>
                </div>
                <p className="text-sm text-gray-500">
                  Úsala cuando <strong>no hay un código que validar</strong>: el comprador no puede mostrar el QR
                  (cámara falla, código vencido) o no se presentó. Solo necesitas el ID del pedido. Requiere
                  acceso a la tienda del pedido.
                </p>
                <FormInput label="ID del pedido" value={orderId} onChange={setOrderId} placeholder="ord_123" />
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setManualOpen(true)}
                    disabled={!orderId.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-yellow-50 hover:text-yellow-600 transition-all disabled:opacity-50"
                  >
                    <PackageCheck size={16} /> Entrega manual
                  </button>
                  <button
                    onClick={() => setFailureOpen(true)}
                    disabled={!orderId.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-all disabled:opacity-50"
                  >
                    <XCircle size={16} /> Marcar fallida
                  </button>
                </div>
              </section>
            </div>

            {/* ── Columna derecha: historial (UC-10) ── */}
            <section className="rounded-2xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Store size={20} className="text-yellow-500" />
                <h2 className="text-lg font-bold text-gray-900">Historial de entregas</h2>
              </div>

              <div className="space-y-3">
                <FormInput label="ID de la tienda" value={storeId} onChange={setStoreId} placeholder="str_9" />
                <div className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Método</label>
                    <select
                      value={methodFilter}
                      onChange={(e) => setMethodFilter(e.target.value as typeof methodFilter)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/60 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    >
                      <option value="">Todos (incluye fallidas)</option>
                      <option value="QR">Código QR</option>
                      <option value="MANUAL">Manual</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Orden</label>
                    <select
                      value={orderDir}
                      onChange={(e) => setOrderDir(e.target.value as typeof orderDir)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/60 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    >
                      <option value="DESC">Más recientes primero</option>
                      <option value="ASC">Más antiguas primero</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => loadHistory(1)}
                  disabled={historyLoading || !storeId.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-yellow-400 text-white font-semibold shadow-md shadow-yellow-200/60 hover:bg-yellow-500 transition-all disabled:opacity-50"
                >
                  <Search size={16} /> {historyLoading ? 'Buscando…' : 'Buscar entregas'}
                </button>
              </div>

              {historyError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2 text-sm text-red-700">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{historyError}</span>
                </div>
              )}

              {history && (
                <div className="space-y-3">
                  {history.data.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">
                      No hay entregas que coincidan con el filtro.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {history.data.map((d) => (
                        <div key={d.id} className="rounded-xl bg-white/70 border border-white/60 p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-gray-800 break-all">{d.orderId}</span>
                            {d.method ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                {deliveryMethodLabel[d.method]}
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                {d.failureReason ? failureReasonLabel[d.failureReason] : 'Fallida'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDateTime(d.deliveredAt)} · por {d.confirmedByUserId}
                          </p>
                          {d.note && <p className="text-xs text-gray-600 mt-1 italic">“{d.note}”</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Paginación */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-500">
                      Página {history.page} de {totalPages} · {history.total} entrega(s)
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadHistory(page - 1)}
                        disabled={page <= 1 || historyLoading}
                        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-yellow-50 disabled:opacity-40 transition"
                        aria-label="Página anterior"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => loadHistory(page + 1)}
                        disabled={page >= totalPages || historyLoading}
                        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-yellow-50 disabled:opacity-40 transition"
                        aria-label="Página siguiente"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Escáner de QR con la cámara (UC-03). Se monta solo al abrir para arrancar con
          estado limpio y liberar la cámara al cerrar. */}
      {scannerOpen && (
        <QrScannerModal
          open
          onClose={() => setScannerOpen(false)}
          onResult={handleScanResult}
        />
      )}

      {/* Confirmar entrega (error prevention: acción irreversible) */}
      <ModalShell
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar entrega"
        subtitle="Esta acción marca el código como usado y no se puede deshacer."
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Vas a confirmar la entrega del pedido{' '}
            <span className="font-semibold">
              {validation.kind === 'valid' ? validation.order.orderId : ''}
            </span>
            . El comprador será notificado y se liberará el pago a la tienda.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmOpen(false)}
              className="flex-1 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all disabled:opacity-50"
            >
              {confirming ? 'Confirmando…' : 'Sí, confirmar'}
            </button>
          </div>
        </div>
      </ModalShell>

      {/* Entrega manual (UC-05) */}
      <ManualDeliveryModal
        open={manualOpen}
        orderId={orderId}
        onClose={() => setManualOpen(false)}
        onDone={() => {
          setManualOpen(false);
          if (storeId) void loadHistory(1);
        }}
      />

      {/* Entrega fallida (UC-06) */}
      <DeliveryFailureModal
        open={failureOpen}
        orderId={orderId}
        onClose={() => setFailureOpen(false)}
        onDone={() => {
          setFailureOpen(false);
          if (storeId) void loadHistory(1);
        }}
      />
    </div>
  );
};

/** Modal de entrega manual (UC-05): motivo obligatorio + nota opcional. */
const ManualDeliveryModal: React.FC<{
  open: boolean;
  orderId: string;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, orderId, onClose, onDone }) => {
  const api = useFulfillmentApi();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setNote('');
    }
  }, [open]);

  const submit = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    try {
      const result = await api.manualDelivery(orderId, {
        reason: reason.trim(),
        note: note.trim() || undefined,
      });
      if (result.alreadyDelivered) {
        toast.warning(`Este pedido ya había sido entregado.`);
      } else {
        toast.success(`Entrega manual registrada para ${orderId}.`);
      }
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos registrar la entrega manual.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Entrega manual" subtitle={`Pedido ${orderId}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Motivo <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Ej.: La cámara del vendedor no escaneaba el QR."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/60 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Nota (opcional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Detalle adicional, ej.: el comprador mostró su cédula."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/60 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
          />
        </div>
        <button
          onClick={submit}
          disabled={saving || !reason.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all disabled:opacity-50"
        >
          {saving ? 'Registrando…' : 'Registrar entrega manual'}
        </button>
      </div>
    </ModalShell>
  );
};

/** Modal de entrega fallida (UC-06): motivo tipificado; OTHER exige nota. */
const DeliveryFailureModal: React.FC<{
  open: boolean;
  orderId: string;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, orderId, onClose, onDone }) => {
  const api = useFulfillmentApi();
  const [reason, setReason] = useState<DeliveryFailureReason>('CUSTOMER_NO_SHOW');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('CUSTOMER_NO_SHOW');
      setNote('');
    }
  }, [open]);

  const noteRequired = reason === 'OTHER';
  const canSubmit = !noteRequired || note.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await api.deliveryFailure(orderId, { reason, note: note.trim() || undefined });
      toast.success(`Entrega fallida registrada para ${orderId}.`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos registrar la entrega fallida.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Registrar entrega fallida" subtitle={`Pedido ${orderId}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Motivo</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as DeliveryFailureReason)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/60 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
          >
            {FAILURE_REASONS.map((r) => (
              <option key={r} value={r}>
                {failureReasonLabel[r]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nota {noteRequired && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={noteRequired ? 'Describe qué pasó (obligatorio).' : 'Detalle opcional.'}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/60 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
          />
          {noteRequired && (
            <p className="text-xs text-gray-400 mt-1">Cuando el motivo es “Otro”, la nota es obligatoria.</p>
          )}
        </div>
        <button
          onClick={submit}
          disabled={saving || !canSubmit}
          className="w-full py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
        >
          {saving ? 'Registrando…' : 'Registrar fallo'}
        </button>
      </div>
    </ModalShell>
  );
};

export default DeliveriesPage;
