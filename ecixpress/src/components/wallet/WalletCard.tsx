import React from 'react';
import { PlusCircle, Clock, CreditCard } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { PaymentMethodIcon, getMethodMeta } from './paymentMethods';

/**
 * Tarjeta de billetera + tira vertical de botones oscuros. Cada botón está
 * colapsado (solo ícono) y se expande al pasar el mouse mostrando su descripción.
 * El botón de método muestra el ícono del método de pago actual.
 */
const WalletCard: React.FC = () => {
  const {
    balanceLabel,
    hasWallet,
    loading,
    defaultMethod,
    openRecharge,
    openHistory,
    openMethodPicker,
  } = useWallet();

  const actions: {
    key: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
  }[] = [
    {
      key: 'recharge',
      label: 'Recargar',
      icon: <PlusCircle size={22} />,
      onClick: openRecharge,
    },
    {
      key: 'history',
      label: 'Historial',
      icon: <Clock size={22} />,
      onClick: openHistory,
    },
    {
      key: 'method',
      label: defaultMethod
        ? `Método: ${getMethodMeta(defaultMethod).label}`
        : 'Elegir método',
      icon: defaultMethod ? (
        <PaymentMethodIcon method={defaultMethod} size={24} />
      ) : (
        <CreditCard size={22} />
      ),
      onClick: openMethodPicker,
    },
  ];

  return (
    <div className="flex items-stretch gap-3">
      {/* Tarjeta de saldo */}
      <div className="relative flex-1 min-w-0 rounded-[26px] bg-gradient-to-br from-yellow-400 to-yellow-500 px-6 py-8 flex flex-col items-center justify-center text-center shadow-lg shadow-yellow-200/50 overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-yellow-300/40 blur-2xl pointer-events-none" />
        <img
          src="/eciexpress.svg"
          alt="ECIExpress"
          className="w-14 mb-3 brightness-0 invert opacity-95"
        />
        <p className="text-yellow-950/70 text-sm font-medium">Saldo disponible</p>
        <p className="text-yellow-950 text-3xl font-extrabold tracking-tight mt-0.5">
          {loading ? '…' : hasWallet ? balanceLabel : '$0'}
        </p>
        {!hasWallet && !loading && (
          <p className="text-yellow-950/60 text-[11px] mt-1">Billetera no provisionada</p>
        )}
      </div>

      {/* Tira de botones: anclados a la derecha; al hover se expanden hacia la
          izquierda (el ícono no se mueve, la descripción se revela a su izquierda). */}
      <div className="flex flex-col items-end justify-center gap-3 py-1">
        {actions.map((a) => (
          <button
            key={a.key}
            onClick={a.onClick}
            title={a.label}
            className="group/wa flex items-center justify-end h-12 w-12 hover:w-56 rounded-2xl bg-gray-900 text-white overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 ease-out"
          >
            <span className="pl-4 whitespace-nowrap text-sm font-medium opacity-0 translate-x-2 group-hover/wa:opacity-100 group-hover/wa:translate-x-0 transition-all duration-300">
              {a.label}
            </span>
            <span className="w-12 h-12 grid place-items-center flex-shrink-0">
              {a.icon}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default WalletCard;
