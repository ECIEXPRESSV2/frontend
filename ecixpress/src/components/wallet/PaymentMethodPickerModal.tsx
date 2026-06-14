import React from 'react';
import { Check } from 'lucide-react';
import { toast } from 'react-toastify';
import ModalShell from './ModalShell';
import { useWallet } from '../../context/WalletContext';
import { PAYMENT_METHODS } from './paymentMethods';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PaymentMethodPickerModal: React.FC<Props> = ({ open, onClose }) => {
  const { defaultMethod, chooseDefaultMethod } = useWallet();

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Método de pago por defecto"
      subtitle="Se preseleccionará al recargar tu billetera"
    >
      <ul className="space-y-2">
        {PAYMENT_METHODS.map((m) => {
          const active = m.key === defaultMethod;
          return (
            <li key={m.key}>
              <button
                type="button"
                onClick={() => {
                  chooseDefaultMethod(m.key);
                  toast.success(`Método por defecto: ${m.label}`);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition ${
                  active
                    ? 'border-yellow-400 bg-yellow-50 ring-1 ring-yellow-300'
                    : 'border-gray-200 bg-white hover:border-yellow-200'
                }`}
              >
                <m.Icon size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{m.label}</p>
                  <p className="text-xs text-gray-500 truncate">{m.description}</p>
                </div>
                {active && (
                  <span className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                    <Check size={14} className="text-white" />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </ModalShell>
  );
};

export default PaymentMethodPickerModal;
