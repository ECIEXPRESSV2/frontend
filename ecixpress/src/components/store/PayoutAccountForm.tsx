import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Landmark, Loader2, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  updatePayoutAccount,
  type PayoutType,
  type StorePayoutAccountInfo,
} from '../../services/financialService';

interface PayoutAccountFormProps {
  /** Cuenta ya cargada por el padre (evita otra llamada duplicada al backend). */
  account: StorePayoutAccountInfo | null;
  onSaved: (account: StorePayoutAccountInfo) => void;
}

const PHONE_REGEX = /^3\d{9}$/;

/**
 * Formulario de la cuenta donde la tienda recibe sus giros (Nequi/Daviplata/cuenta
 * bancaria). Usa el endpoint `PATCH /stores/payout-account`, que ya existía en el
 * backend pero no tenía UI.
 */
const PayoutAccountForm: React.FC<PayoutAccountFormProps> = ({ account, onSaved }) => {
  const { userProfile } = useAuth();
  const userId = userProfile?.id ?? '';

  const [type, setType] = useState<PayoutType>('NEQUI');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [holderName, setHolderName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!account?.payoutType) return;
    setType(account.payoutType);
    setAccountNumber(account.payoutAccountNumber ?? '');
    setBankCode(account.payoutBankCode ?? '');
    setHolderName(account.payoutHolderName ?? '');
  }, [account]);

  const isBank = type === 'BANK_ACCOUNT';
  const accountLabel = isBank ? 'Número de cuenta' : 'Número de celular';

  const validate = useCallback((): string | null => {
    if (!accountNumber.trim()) return `Ingresa el ${accountLabel.toLowerCase()}.`;
    if (!isBank && !PHONE_REGEX.test(accountNumber.trim())) {
      return 'Ingresa un número de celular colombiano válido (10 dígitos, empieza en 3).';
    }
    if (isBank && !bankCode.trim()) return 'Ingresa el código del banco.';
    if (!holderName.trim()) return 'Ingresa el nombre del titular.';
    return null;
  }, [accountLabel, accountNumber, bankCode, holderName, isBank]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      const updated = await updatePayoutAccount(userId, {
        type,
        accountNumber: accountNumber.trim(),
        bankCode: isBank ? bankCode.trim() : undefined,
        holderName: holderName.trim(),
      });
      toast.success('Cuenta de desembolso guardada.');
      onSaved(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la cuenta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Landmark size={16} className="text-yellow-500" />
        <h3 className="font-semibold text-gray-800 text-sm">Cuenta de desembolso</h3>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        A esta cuenta se transfiere el dinero cuando retiras o al liquidarse tu saldo a fin de mes.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de cuenta</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PayoutType)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
          >
            <option value="NEQUI">Nequi</option>
            <option value="DAVIPLATA">Daviplata</option>
            <option value="BANK_ACCOUNT">Cuenta bancaria</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{accountLabel}</label>
            <input
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              placeholder={isBank ? '1234567890' : '3001234567'}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
            />
          </div>
          {isBank && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Código del banco</label>
              <input
                type="text"
                inputMode="numeric"
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value.replace(/\D/g, ''))}
                placeholder="1007"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del titular</label>
          <input
            type="text"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            placeholder="Cafetería Central SAS"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-black
            bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600
            active:scale-[.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Guardando…' : 'Guardar cuenta'}
        </button>
      </form>
    </div>
  );
};

export default PayoutAccountForm;
