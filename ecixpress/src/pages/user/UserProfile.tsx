import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, MapPin, Edit, Camera, Lock,
  Wallet, ShoppingBag, Star, Plus, ArrowRight,
  Clock, CheckCircle, XCircle, Store,
} from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import { mockUserProfile, mockOrderHistory } from '../../mock/userProfile';

// ─── Tipos ── reemplazar con tipos del backend ─────────────────────────────
type OrderStatus = 'completed' | 'pending' | 'cancelled';

interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
}

interface Order {
  id: string;
  storeName: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
}
// ──────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, {
  icon: React.ElementType;
  pillClass: string;
  accentClass: string;
  label: string;
}> = {
  completed: {
    icon: CheckCircle,
    pillClass: 'bg-emerald-100 text-emerald-800 border-emerald-200/60',
    accentClass: 'bg-gradient-to-b from-emerald-400 to-emerald-300',
    label: 'Completado',
  },
  pending: {
    icon: Clock,
    pillClass: 'bg-amber-100 text-amber-800 border-amber-200/60',
    accentClass: 'bg-gradient-to-b from-amber-400 to-yellow-300',
    label: 'En camino',
  },
  cancelled: {
    icon: XCircle,
    pillClass: 'bg-red-100 text-red-800 border-red-200/60',
    accentClass: 'bg-gradient-to-b from-red-400 to-red-300',
    label: 'Cancelado',
  },
};

// Shared glass card base
const glassCard = 'bg-white/52 backdrop-blur-2xl border border-white/72 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.055),0_1px_4px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)]';

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const [activeSidebarItem, setActiveSidebarItem] = useState('profile');
  const userData = mockUserProfile;
  const orderHistory: Order[] = mockOrderHistory;

  return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50/40 to-yellow-100 relative overflow-hidden">

        {/* Ambient glow blobs */}
        <div className="pointer-events-none absolute -top-24 -left-16 w-[420px] h-[420px] rounded-full bg-amber-300/22 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 w-[340px] h-[340px] rounded-full bg-amber-400/16 blur-3xl" />
        <div className="pointer-events-none absolute top-[42%] left-[52%] w-[260px] h-[260px] rounded-full bg-yellow-300/12 blur-3xl" />

        <Sidebar activeItem={activeSidebarItem} onItemClick={setActiveSidebarItem} />

        <main className="ml-16 p-7 md:p-10 relative z-10">
          <div className="max-w-5xl mx-auto space-y-4">

            {/* Back */}
            <button
                onClick={() => navigate('/home')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/58 backdrop-blur-xl border border-white/75 text-sm text-gray-500 hover:bg-white/75 hover:text-gray-800 transition-colors duration-200"
            >
              <ArrowLeft size={15} />
              Volver
            </button>

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <div className={`${glassCard} overflow-hidden`}>

              {/* Banner */}
              <div className="relative h-[118px] bg-gradient-to-r from-amber-400 via-yellow-400 to-yellow-300 overflow-hidden">
                {/* dot texture */}
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.6) 1.2px,transparent 1.2px)',
                      backgroundSize: '20px 20px',
                    }}
                />
                {/* diagonal shine */}
                <div className="absolute -top-1/3 -left-[10%] w-[60%] h-[180%] bg-gradient-to-r from-transparent via-white/18 to-transparent -skew-x-12 pointer-events-none" />
                <button
                    aria-label="Cambiar foto de portada"
                    className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-white/28 backdrop-blur-md border border-white/45 flex items-center justify-center text-white hover:bg-white/38 transition-colors duration-200"
                >
                  <Camera size={17} />
                </button>
              </div>

              {/* Body */}
              <div className="px-7 pb-7">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 -mt-11">

                  {/* Avatar + name */}
                  <div className="flex items-end gap-4">
                    <div className="relative">
                      <img
                          src={userData.avatar}
                          alt="Foto de perfil"
                          className="w-[84px] h-[84px] rounded-full border-4 border-white/92 object-cover shadow-[0_6px_20px_rgba(245,158,11,0.22),0_2px_8px_rgba(0,0,0,0.1)]"
                      />
                      <button
                          aria-label="Cambiar foto de perfil"
                          className="absolute bottom-0.5 right-0.5 w-[26px] h-[26px] rounded-full bg-gradient-to-br from-amber-400 to-yellow-300 border-[2.5px] border-white flex items-center justify-center shadow-[0_2px_6px_rgba(245,158,11,0.38)]"
                      >
                        <Edit size={10} className="text-white" />
                      </button>
                    </div>
                    <div className="pb-1">
                      <h1 className="text-[22px] text-gray-900 tracking-tight leading-none">
                        {userData.name}
                      </h1>
                      <p className="text-[11px] text-gray-400 mt-1 tracking-wide">
                        Miembro desde {userData.memberSince}
                      </p>
                    </div>
                  </div>

                  <button className="self-start md:self-end px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 text-white text-sm shadow-[0_4px_14px_rgba(245,158,11,0.38)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.48)] transition-shadow duration-200">
                    Editar perfil
                  </button>
                </div>

                {/* Stats strip */}
                <div className="grid grid-cols-3 gap-3 mt-5">
                  {[
                    { val: userData.ordersCount, label: 'Pedidos' },
                    { val: `$${Math.round(userData.balance)}`, label: 'Saldo' },
                    { val: userData.rating, label: 'Rating', star: true },
                  ].map(({ val, label, star }) => (
                      <div
                          key={label}
                          className="bg-white/55 border border-white/80 rounded-[18px] py-3.5 px-3 text-center"
                      >
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          {star && <Star size={13} className="text-amber-400 fill-amber-400" />}
                          <span className="text-[22px] text-gray-900 tracking-tight leading-none">
                        {val}
                      </span>
                        </div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-[.6px] mt-1">
                          {label}
                        </p>
                      </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Info + Stats ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className={`${glassCard} p-6`}>
                <p className="text-[10px] text-amber-600 tracking-[1.2px] uppercase mb-1">
                  Wallet
                </p>
                <h2 className="text-sm text-gray-900 mb-5">Mi billetera</h2>

                <div className="flex gap-4">
                  {/* TARJETA PRINCIPAL */}
                  <div className="relative w-full aspect-[1.586] rounded-3xl bg-gradient-to-br from-yellow-400 to-orange-400 p-6 overflow-hidden shadow-md">

                    {/* Forma decorativa */}
                    <div className="absolute right-0 top-0 w-40 h-40 bg-orange-300 opacity-40 rounded-full blur-2xl" />

                    <div className="relative flex flex-col items-center justify-center h-full text-center">

                      <p className="text-white text-3xl font-semibold tracking-tight">
                        ${userData.balance.toLocaleString()}
                      </p>

                      <p className="text-white/90 mt-2 text-sm">
                        Katerine Silva Granados
                      </p>

                      <p className="text-white/70 text-xs mt-1">
                        100010012083
                      </p>
                    </div>

                    {/* Logo abajo izquierda */}
                    <img
                        src="/eciexpress.svg"
                        alt="logo"
                        className="absolute bottom-4 left-4 w-10"
                    />
                  </div>

                  {/* BOTÓN VERDE SEPARADO */}
                  <div className="w-24 rounded-3xl bg-green-200 flex items-center justify-center shadow-md">
                    <button className="w-14 h-14 rounded-full border-2 border-green-500 flex items-center justify-center hover:scale-110 transition">
                      <Plus className="text-green-600" size={28} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className={`${glassCard} p-6`}>
                <p className="text-[10px] text-amber-600 tracking-[1.2px] uppercase mb-1">Cuenta</p>
                <h2 className="text-sm text-gray-900 mb-5">Estadísticas</h2>

                {[
                  { icon: ShoppingBag, label: 'Pedidos realizados', val: userData.ordersCount },
                  { icon: Wallet, label: 'Saldo disponible', val: `$${userData.balance.toFixed(2)}` },
                  { icon: Star, label: 'Calificación', val: userData.rating },
                ].map(({ icon: Icon, label, val }) => (
                    <div
                        key={label}
                        className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50/75 border border-amber-100/50 mb-2 last:mb-0"
                    >
                      <div className="flex items-center gap-2.5 text-[12.5px] text-gray-600">
                        <Icon size={15} className="text-amber-500" />
                        {label}
                      </div>
                      <span className="text-[19px] text-gray-900 tracking-tight">{val}</span>
                    </div>
                ))}
              </div>
            </div>

            {/* ── Quick actions ─────────────────────────────────────────────── */}
            <div className={`${glassCard} p-6`}>
              <p className="text-[10px] text-amber-600 tracking-[1.2px] uppercase mb-1">Configuración</p>
              <h2 className="text-sm text-gray-900 mb-5">Acciones rápidas</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Edit, label: 'Editar información' },
                  { icon: MapPin, label: 'Mis direcciones' },
                  { icon: Lock, label: 'Contraseña' },
                ].map(({ icon: Icon, label }) => (
                    <button
                        key={label}
                        className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white/48 border border-white/72 hover:bg-amber-50/60 hover:border-amber-100/60 transition-colors duration-200"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100/70 to-yellow-50/50 border border-amber-200/30 flex items-center justify-center">
                        <Icon size={17} className="text-amber-700" />
                      </div>
                      <span className="text-[11px] text-gray-600 text-center leading-snug">{label}</span>
                    </button>
                ))}

                {/* CTA dorado — wallet */}
                <button className="relative flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-400 border border-amber-300/40 overflow-hidden hover:from-amber-500 hover:to-yellow-500 transition-colors duration-200">
                  <div className="absolute top-0 left-0 right-0 h-px bg-white/40" />
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/30 flex items-center justify-center">
                    <Plus size={9} className="text-white" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/28 border border-white/35 flex items-center justify-center">
                    <Wallet size={17} className="text-white" />
                  </div>
                  <span className="text-[11px] text-white text-center leading-snug">Recargar wallet</span>
                </button>
              </div>
            </div>

            {/* ── Order history ─────────────────────────────────────────────── */}
            <div className={`${glassCard} p-6`}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] text-amber-600 tracking-[1.2px] uppercase mb-1">Historial</p>
                  <h2 className="text-sm text-gray-900">Últimos movimientos</h2>
                </div>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/50 border border-white/72 text-[12px] text-gray-500 hover:bg-white/70 hover:text-gray-700 transition-colors duration-200">
                  Ver todos <ArrowRight size={13} />
                </button>
              </div>

              <div className="max-h-[600px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-amber-300 scrollbar-track-transparent">
                {orderHistory.map((order) => {
                  const cfg = STATUS_CONFIG[order.status as OrderStatus];
                  const StatusIcon = cfg.icon;

                  return (
                      <div
                          key={order.id}
                          className="relative rounded-2xl bg-white/45 border border-white/68 overflow-hidden hover:bg-white/55 transition-colors duration-200"
                      >
                        {/* Accent bar — firma de ticket */}
                        <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${cfg.accentClass}`} />

                        <div className="pl-5 pr-4 pt-4 pb-4">
                          {/* Top row */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex-shrink-0 bg-gradient-to-br from-amber-100/70 to-yellow-50/50 border border-amber-200/30 flex items-center justify-center">
                                <Store size={16} className="text-amber-700" />
                              </div>
                              <div>
                                <p className="text-[13.5px] text-gray-900 leading-none">{order.storeName}</p>
                                <p className="text-[11px] text-gray-400 mt-1">{order.id} · {order.date}</p>
                              </div>
                            </div>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] ${cfg.pillClass}`}>
                              <StatusIcon size={13} />
                              {cfg.label}
                            </div>
                          </div>

                          {/* Product images */}
                          <div className="flex gap-3 overflow-x-auto pb-0.5 scrollbar-hide">
                            {order.items.map((item) => (
                                <div key={item.productId} className="flex-shrink-0 w-[100px]">
                                  <img
                                      src={item.productImage}
                                      alt={item.productName}
                                      className="w-[100px] h-[100px] rounded-xl object-cover border border-white/60"
                                  />
                                  <p className="text-[11px] text-gray-500 mt-1.5 truncate">{item.productName}</p>
                                  <p className="text-[11px] text-gray-400">x{item.quantity}</p>
                                </div>
                            ))}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-amber-100/40">
                            <p className="text-[11px] text-gray-400">{order.items.length} productos</p>
                            <p className="text-[19px] text-gray-900 tracking-tight">
                              ${order.total.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                  );
                })}
              </div>
            </div>

          </div>
        </main>
      </div>
  );
};

export default UserProfile;