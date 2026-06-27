import React from 'react';
import { Clock, CreditCard, PlusCircle } from 'lucide-react';
import AccountSectionHeader from '../AccountSectionHeader';
import WalletPremiumCard from '../../../../components/wallet/WalletPremiumCard';
import { useWallet } from '../../../../context/WalletContext';

const BilleteraSection: React.FC = () => {
  const { openRecharge, openHistory, openMethodPicker } = useWallet();

  const acciones = [
    { icon: PlusCircle, label: 'Recargar saldo', description: 'Agrega dinero a tu billetera', onClick: openRecharge },
    { icon: Clock, label: 'Ver movimientos', description: 'Consulta pagos y recargas', onClick: openHistory },
    { icon: CreditCard, label: 'Métodos de pago', description: 'Elige tu método predeterminado', onClick: openMethodPicker },
  ];

  return (
    <>
      <AccountSectionHeader titulo="Billetera" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
        <WalletPremiumCard />
        <div className="rounded-3xl border border-white/70 bg-white/82 p-5 shadow-lg shadow-gray-200/60 backdrop-blur-xl">
          <div className="mb-4">
            <p className="text-sm font-bold text-gray-900">Acciones rápidas</p>
            <p className="mt-1 text-xs text-gray-500">Administra saldo, movimientos y pagos desde un solo lugar.</p>
          </div>

          <div className="grid gap-2">
            {acciones.map(({ icon: Icon, label, description, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className="group flex min-h-14 items-center gap-3 rounded-2xl border border-gray-100 bg-white/80 px-3.5 py-3 text-left text-gray-700 transition hover:border-yellow-200 hover:bg-yellow-50/80 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-yellow-300"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 group-hover:bg-white">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-tight">{label}</span>
                  <span className="mt-0.5 block text-xs text-gray-400">{description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default BilleteraSection;
