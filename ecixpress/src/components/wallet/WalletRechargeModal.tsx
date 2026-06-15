import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import ModalShell from './ModalShell';
import { useWallet } from '../../context/WalletContext';
import {
  PAYMENT_METHODS,
  getMethodMeta,
} from './paymentMethods';
import {
  createTopup,
  getPseInstitutions,
  getTopupDetails,
  tokenizeCard,
  formatCOP,
  type TopupPaymentMethod,
  type PaymentData,
  type PseInstitution,
  type CreateTopupResponse,
  type TopupDetails,
} from '../../services/financialService';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 'form' | 'confirm' | 'result';

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000]; // en pesos COP
const MIN_PESOS = 10;
const DOC_TYPES = ['CC', 'CE', 'TI', 'NIT', 'PP'];

// Valores de prueba para el entorno sandbox de Wompi.
const SANDBOX_DEFAULTS: Record<TopupPaymentMethod, {
  phone?: string;
  docType?: string;
  docNumber?: string;
  userType?: number;
  bankCode?: string;
  customerPhone?: string;
  customerName?: string;
  cardNumber?: string;
  cardHolder?: string;
  cardExpMonth?: string;
  cardExpYear?: string;
  cardCvc?: string;
}> = {
  NEQUI:                { phone: '3991111111' },
  DAVIPLATA:            { phone: '3991111111', docType: 'CC', docNumber: '1234567890' },
  PSE:                  { docType: 'CC', docNumber: '1234567890', bankCode: '1007', customerPhone: '3001234567', customerName: 'Estudiante Prueba', userType: 0 },
  BANCOLOMBIA_TRANSFER: {},
  BANCOLOMBIA_QR:       {},
  CARD:                 { cardNumber: '4242 4242 4242 4242', cardHolder: 'APPROVED', cardExpMonth: '12', cardExpYear: '28', cardCvc: '123' },
};

const WalletRechargeModal: React.FC<Props> = ({ open, onClose }) => {
  const { userId, defaultMethod, refresh } = useWallet();

  const [step, setStep] = useState<Step>('form');
  const [amountPesos, setAmountPesos] = useState<string>('');
  const [method, setMethod] = useState<TopupPaymentMethod>('NEQUI');

  // Campos del formulario (todos opcionales según el método).
  const [phone, setPhone] = useState('');
  const [docType, setDocType] = useState('CC');
  const [docNumber, setDocNumber] = useState('');
  const [userType, setUserType] = useState(0); // PSE: 0 natural, 1 jurídica
  const [bankCode, setBankCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  // CARD
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpMonth, setCardExpMonth] = useState('');
  const [cardExpYear, setCardExpYear] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [installments, setInstallments] = useState(1);

  const [banks, setBanks] = useState<PseInstitution[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateTopupResponse | null>(null);
  const [details, setDetails] = useState<TopupDetails | null>(null);
  const [checking, setChecking] = useState(false);

  const meta = getMethodMeta(method);
  const amountCents = Math.round((Number(amountPesos) || 0) * 100);
  const sd = SANDBOX_DEFAULTS[method];

  // Reset al abrir; precarga el método por defecto.
  useEffect(() => {
    if (open) {
      setStep('form');
      setMethod(defaultMethod ?? 'NEQUI');
      setResult(null);
      setDetails(null);
      setSubmitting(false);
    }
  }, [open, defaultMethod]);

  // Cargar bancos PSE la primera vez que se selecciona PSE.
  useEffect(() => {
    if (open && method === 'PSE' && banks.length === 0 && userId) {
      getPseInstitutions(userId)
        .then(setBanks)
        .catch(() => {/* opcional; el usuario puede reintentar */});
    }
  }, [open, method, banks.length, userId]);

  const fieldsError = useMemo(() => {
    if (amountCents < MIN_PESOS * 100) return `El mínimo es ${formatCOP(MIN_PESOS * 100)}.`;
    if (meta.fields.includes('phone_number') && !/^\d{10}$/.test(phone))
      return 'El teléfono debe tener 10 dígitos.';
    if (meta.fields.includes('doc') && !docNumber.trim())
      return 'Ingresa tu número de documento.';
    if (meta.fields.includes('pse')) {
      if (!bankCode) return 'Selecciona tu banco.';
      if (!docNumber.trim()) return 'Ingresa tu número de documento.';
      if (!customerName.trim()) return 'Ingresa el nombre del titular.';
      if (!/^\d{10}$/.test(customerPhone)) return 'El teléfono debe tener 10 dígitos.';
    }
    if (meta.fields.includes('card')) {
      if (cardNumber.replace(/\s+/g, '').length < 13) return 'Número de tarjeta inválido.';
      if (!cardHolder.trim()) return 'Ingresa el nombre en la tarjeta.';
      if (!/^\d{2}$/.test(cardExpMonth)) return 'Mes de vencimiento inválido (MM).';
      if (!/^\d{2}$/.test(cardExpYear)) return 'Año de vencimiento inválido (AA).';
      if (!/^\d{3,4}$/.test(cardCvc)) return 'CVC inválido.';
    }
    return null;
  }, [
    amountCents, meta, phone, docNumber, bankCode, customerName, customerPhone,
    cardNumber, cardHolder, cardExpMonth, cardExpYear, cardCvc,
  ]);

  const buildPaymentData = async (): Promise<PaymentData | undefined> => {
    switch (method) {
      case 'NEQUI':
        return { phone_number: phone };
      case 'DAVIPLATA':
        return {
          phone_number: phone,
          user_legal_id_type: docType,
          user_legal_id: docNumber,
        };
      case 'PSE':
        return {
          user_type: userType,
          user_legal_id_type: docType,
          user_legal_id: docNumber,
          financial_institution_code: bankCode,
          customer_phone: customerPhone,
          customer_full_name: customerName,
        };
      case 'CARD': {
        const token = await tokenizeCard({
          number: cardNumber,
          cvc: cardCvc,
          exp_month: cardExpMonth,
          exp_year: cardExpYear,
          card_holder: cardHolder,
        });
        return { token, installments };
      }
      default:
        return undefined; // BANCOLOMBIA_TRANSFER / BANCOLOMBIA_QR
    }
  };

  const loadDetails = async (topupId: string) => {
    if (!userId) return;
    setChecking(true);
    try {
      const d = await getTopupDetails(userId, topupId);
      setDetails(d);
      void refresh();
    } catch {
      /* la URL/QR puede no estar lista todavía; el usuario puede reintentar */
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!userId) return;
    setSubmitting(true);
    try {
      const paymentData = await buildPaymentData();
      const res = await createTopup(userId, {
        amount: amountCents,
        paymentMethod: method,
        ...(paymentData ? { paymentData } : {}),
      });
      setResult(res);
      setStep('result');
      // La URL/QR de aprobación se obtiene consultando la transacción en el backend
      // (requiere la llave privada, que no vive en el frontend).
      void loadDetails(res.topupId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo iniciar la recarga');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    void refresh();
  };

  // ─── Render por paso ──────────────────────────────────────────────────────

  const input =
    'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';

  const renderForm = () => (
    <div className="space-y-5">
      {/* Monto */}
      <div>
        <label className={labelCls}>Monto a recargar</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
          <input
            type="text"
            inputMode="numeric"
            value={amountPesos ? Number(amountPesos).toLocaleString('es-CO') : ''}
            onChange={(e) => setAmountPesos(e.target.value.replace(/\D/g, ''))}
            placeholder="0"
            className={`${input} pl-7 text-lg font-semibold`}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2.5">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmountPesos(String(a))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                Number(amountPesos) === a
                  ? 'bg-yellow-400 border-yellow-400 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-yellow-300'
              }`}
            >
              {formatCOP(a * 100)}
            </button>
          ))}
        </div>
      </div>

      {/* Método */}
      <div>
        <label className={labelCls}>Método de pago</label>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((m) => {
            const active = m.key === method;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMethod(m.key)}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition ${
                  active
                    ? 'border-yellow-400 bg-yellow-50 ring-1 ring-yellow-300'
                    : 'border-gray-200 bg-white hover:border-yellow-200'
                }`}
              >
                <m.Icon size={30} />
                <span className="text-[11px] font-medium text-gray-700 leading-tight">{m.short}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2">{meta.description}</p>
      </div>

      {/* Campos dinámicos */}
      {meta.fields.includes('phone_number') && (
        <div>
          <label className={labelCls}>Número de celular ({meta.label})</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder={sd.phone ?? '3001234567'}
            className={input}
          />
        </div>
      )}

      {(meta.fields.includes('doc') || meta.fields.includes('pse')) && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelCls}>Tipo doc.</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className={input}>
              {DOC_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Número de documento</label>
            <input
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value.replace(/\D/g, ''))}
              placeholder={sd.docNumber ?? '1234567890'}
              className={input}
            />
          </div>
        </div>
      )}

      {meta.fields.includes('pse') && (
        <>
          <div>
            <label className={labelCls}>Tipo de persona</label>
            <select
              value={userType}
              onChange={(e) => setUserType(Number(e.target.value))}
              className={input}
            >
              <option value={0}>Natural</option>
              <option value={1}>Jurídica</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Banco</label>
            <select value={bankCode} onChange={(e) => setBankCode(e.target.value)} className={input}>
              <option value="">{banks.length ? 'Selecciona tu banco' : 'Cargando bancos…'}</option>
              {banks.map((b) => (
                <option key={b.financial_institution_code} value={b.financial_institution_code}>
                  {b.financial_institution_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Nombre del titular</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={sd.customerName ?? 'Juan Pérez'} className={input} />
          </div>
          <div>
            <label className={labelCls}>Celular del titular</label>
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder={sd.customerPhone ?? '3001234567'}
              className={input}
            />
          </div>
        </>
      )}

      {meta.fields.includes('card') && (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Número de tarjeta</label>
            <input
              value={cardNumber}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                setCardNumber(digits.replace(/(.{4})/g, '$1 ').trim());
              }}
              placeholder={sd.cardNumber ?? '4242 4242 4242 4242'}
              className={input}
            />
          </div>
          <div>
            <label className={labelCls}>Nombre en la tarjeta</label>
            <input value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} placeholder={sd.cardHolder ?? 'JUAN PEREZ'} className={input} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>Mes (MM)</label>
              <input value={cardExpMonth} onChange={(e) => setCardExpMonth(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder={sd.cardExpMonth ?? '08'} className={input} />
            </div>
            <div>
              <label className={labelCls}>Año (AA)</label>
              <input value={cardExpYear} onChange={(e) => setCardExpYear(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder={sd.cardExpYear ?? '28'} className={input} />
            </div>
            <div>
              <label className={labelCls}>CVC</label>
              <input value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder={sd.cardCvc ?? '123'} className={input} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Cuotas</label>
            <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))} className={input}>
              {[1, 3, 6, 12, 24, 36].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      )}

      {fieldsError && <p className="text-xs text-red-500">{fieldsError}</p>}

      <button
        type="button"
        disabled={!!fieldsError}
        onClick={() => setStep('confirm')}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold shadow-md shadow-yellow-200/60 hover:from-yellow-500 hover:to-yellow-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continuar
      </button>
    </div>
  );

  const renderConfirm = () => (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
        <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={22} />
        <div className="text-sm text-red-700">
          <p className="font-semibold mb-1">Esta recarga no es reembolsable</p>
          <p className="text-red-600/90">
            El saldo cargado a tu billetera ECIExpress <strong>no se puede devolver a
            dinero real</strong>. Solo podrás usarlo dentro de la plataforma.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Monto</span>
          <span className="font-semibold text-gray-900">{formatCOP(amountCents)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Método</span>
          <span className="flex items-center gap-2 font-medium text-gray-900">
            <meta.Icon size={20} /> {meta.label}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-600 text-center">¿Seguro que deseas continuar?</p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setStep('form')}
          className="flex items-center justify-center gap-1.5 flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition"
        >
          <ArrowLeft size={16} /> Volver
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="flex items-center justify-center gap-2 flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold shadow-md hover:from-yellow-500 hover:to-yellow-600 transition disabled:opacity-50"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? 'Procesando…' : 'Sí, recargar'}
        </button>
      </div>
    </div>
  );

  const renderResult = () => {
    // Preferimos los datos consultados a Wompi por el backend (traen la URL/QR de
    // aprobación); si aún no llegan, caemos a lo que vino en la respuesta de creación.
    const createExtra = (result?.wompi?.payment_method as Record<string, any> | undefined)?.extra;
    const qrImage = details?.qrImage ?? (createExtra?.qr_image as string | undefined) ?? null;
    const approveUrl =
      details?.redirectUrl ??
      result?.redirectUrl ??
      (createExtra?.async_payment_url as string | undefined) ??
      null;
    const liveStatus = details?.wompiStatus ?? details?.status ?? null;
    const approved = liveStatus === 'APPROVED' || details?.status === 'APPROVED';
    const declined = liveStatus === 'DECLINED' || liveStatus === 'ERROR' || liveStatus === 'VOIDED' || details?.status === 'FAILED';

    return (
      <div className="space-y-5 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${approved ? 'bg-emerald-100' : declined ? 'bg-red-100' : 'bg-yellow-100'}`}>
            {approved ? (
              <CheckCircle2 className="text-emerald-500" size={32} />
            ) : declined ? (
              <AlertTriangle className="text-red-500" size={30} />
            ) : (
              <Loader2 className={`text-yellow-500 ${checking ? 'animate-spin' : ''}`} size={30} />
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">
              {approved ? '¡Recarga aprobada!' : declined ? 'Pago no completado' : 'Recarga iniciada'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {formatCOP(result?.amount ?? amountCents)} · {meta.label}
            </p>
          </div>
        </div>

        {!approved && !declined && (
          <>
            {qrImage ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-gray-600">Escanea este código con tu app Bancolombia:</p>
                <img
                  src={`data:image/svg+xml;base64,${qrImage}`}
                  alt="Código QR de pago"
                  className="w-48 h-48 rounded-xl border border-gray-100"
                />
              </div>
            ) : approveUrl ? (
              <a
                href={approveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold shadow-md hover:from-yellow-500 hover:to-yellow-600 transition"
              >
                Completar / aprobar el pago <ExternalLink size={16} />
              </a>
            ) : method === 'NEQUI' ? (
              <p className="text-sm text-gray-600">
                Te enviamos una notificación a tu app <strong>Nequi</strong>. Aprueba el pago
                desde el celular para acreditar el saldo.
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                {checking ? 'Obteniendo datos del pago…' : 'Aún no hay un enlace de aprobación disponible. Intenta actualizar el estado.'}
              </p>
            )}

            <p className="text-xs text-gray-400">
              El saldo se acredita cuando la pasarela confirma el pago. Tras aprobar, pulsa
              «Verificar estado».
            </p>
          </>
        )}

        {declined && (
          <p className="text-sm text-red-600">
            La transacción fue rechazada o cancelada. Puedes intentar una nueva recarga.
          </p>
        )}

        <div className="flex gap-3">
          {!approved && (
            <button
              type="button"
              disabled={checking}
              onClick={() => result && void loadDetails(result.topupId)}
              className="flex items-center justify-center gap-2 flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
            >
              {checking && <Loader2 size={16} className="animate-spin" />}
              Verificar estado
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition"
          >
            {approved ? 'Listo' : 'Cerrar'}
          </button>
        </div>
      </div>
    );
  };

  const titles: Record<Step, { t: string; s?: string }> = {
    form: { t: 'Recargar billetera', s: 'Agrega saldo a tu billetera ECIExpress' },
    confirm: { t: 'Confirmar recarga', s: 'Revisa antes de continuar' },
    result: { t: 'Recarga', s: undefined },
  };

  return (
    <ModalShell open={open} onClose={handleClose} title={titles[step].t} subtitle={titles[step].s}>
      {step === 'form' && renderForm()}
      {step === 'confirm' && renderConfirm()}
      {step === 'result' && renderResult()}
    </ModalShell>
  );
};

export default WalletRechargeModal;
