import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Edit, Phone, Settings, User, Wallet as WalletIcon } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import WalletPremiumCard from '../../../../components/wallet/WalletPremiumCard';
import OrderCard from '../../../../components/orders/OrderCard';
import { mockOrderHistory } from '../../../../mock/userProfile';

const roleLabel = (role: string) => (
  { ADMIN: 'Administrador', VENDOR: 'Vendedor', BUYER: 'Comprador', ANALYST: 'Analista' } as Record<string, string>
)[role] ?? role;

const ResumenSection: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orders = mockOrderHistory;

  const memberSince = userProfile?.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })
    : '-';
  const estadoActiva = userProfile?.status === 'ACTIVE';

  return (
    <>
      <header className="relative overflow-hidden rounded-[28px] border border-yellow-200/70 bg-[linear-gradient(135deg,#F4B942_0%,#FBBF24_48%,#FDE68A_100%)] p-5 shadow-lg shadow-yellow-200/60 md:p-6">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-white/22 blur-3xl" />
        <div className="pointer-events-none absolute right-[-90px] top-[-110px] h-72 w-72 rounded-full bg-[#FB923C]/22 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white/80 bg-white/30 text-white shadow-lg">
              {userProfile?.avatarUrl
                ? <img src={userProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
                : <User size={30} aria-hidden="true" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white md:text-3xl">{userProfile?.fullName || '-'}</h1>
              <p className="text-sm text-white/85">{userProfile?.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {userProfile?.phone && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    <Phone size={11} aria-hidden="true" />
                    {userProfile.phone}
                  </span>
                )}
                {(userProfile?.roles ?? []).map(r => (
                  <span key={r} className="rounded-full bg-white/85 px-2.5 py-0.5 text-xs font-semibold text-amber-800">{roleLabel(r)}</span>
                ))}
                {estadoActiva && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle size={12} aria-hidden="true" /> Cuenta activa
                  </span>
                )}
                <span className="text-xs text-white/75">Miembro desde {memberSince}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/profile/informacion')} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-white">
              <Edit size={15} aria-hidden="true" /> Editar perfil
            </button>
            <button type="button" onClick={() => navigate('/profile/seguridad')} className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white">
              <Settings size={15} aria-hidden="true" /> Configuración
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
        <WalletPremiumCard />
        <div className="flex flex-col justify-center gap-2 rounded-3xl border border-white/70 bg-white/82 p-5 shadow-lg shadow-gray-200/60 backdrop-blur-xl">
          <p className="text-sm font-bold text-gray-900">Tu billetera ECIxpress</p>
          <p className="text-xs text-gray-500">Recarga saldo y paga tus pedidos sin filas.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/profile/billetera')} className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300">
              <WalletIcon size={15} aria-hidden="true" /> Ir a mi billetera
            </button>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Últimos pedidos</h2>
          <button type="button" onClick={() => navigate('/orders')} className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-amber-700 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-yellow-300">
            Ver todos <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-3">
          {orders.slice(0, 3).map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onDetail={() => navigate('/orders')}
            />
          ))}
        </div>
      </section>
    </>
  );
};

export default ResumenSection;
