import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, Edit, Save, X, User,
  Wallet, ShoppingBag, Star, Plus, ArrowRight,
  Clock, CheckCircle, XCircle, Store,
} from 'lucide-react';
import { toast } from 'react-toastify';
import Sidebar from '../../components/home/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { updateMe } from '../../services/userService';
import { mockOrderHistory } from '../../mock/userProfile';

// ─── Tipos de pedidos (Order & Communication — futuro microservicio) ──────────
type OrderStatus = 'completed' | 'pending' | 'cancelled';

interface OrderItem {
  productId: number | string;
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
// ─────────────────────────────────────────────────────────────────────────────

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

const glassCard = 'bg-white/52 backdrop-blur-2xl border border-white/72 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.055),0_1px_4px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)]';

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, getToken, refreshProfile } = useAuth();
  const [activeSidebarItem, setActiveSidebarItem] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', avatarUrl: '' });

  const orderHistory = mockOrderHistory;

  useEffect(() => {
    if (userProfile) {
      setForm({
        fullName: userProfile.fullName || '',
        phone: userProfile.phone || '',
        avatarUrl: userProfile.avatarUrl || '',
      });
    }
  }, [userProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      await updateMe(
        {
          fullName: form.fullName || undefined,
          phone: form.phone || undefined,
          avatarUrl: form.avatarUrl || undefined,
        },
        token,
      );
      await refreshProfile();
      toast.success('Perfil actualizado');
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (userProfile) {
      setForm({
        fullName: userProfile.fullName || '',
        phone: userProfile.phone || '',
        avatarUrl: userProfile.avatarUrl || '',
      });
    }
    setEditing(false);
  };

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      ADMIN: 'Administrador',
      VENDOR: 'Vendedor',
      BUYER: 'Comprador',
      ANALYST: 'Analista',
    };
    return map[role] || role;
  };

  const memberSince = userProfile?.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })
    : '—';

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
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.6) 1.2px,transparent 1.2px)',
                  backgroundSize: '20px 20px',
                }}
              />
              <div className="absolute -top-1/3 -left-[10%] w-[60%] h-[180%] bg-gradient-to-r from-transparent via-white/18 to-transparent -skew-x-12 pointer-events-none" />
            </div>

            {/* Body */}
            <div className="px-7 pb-7">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 -mt-11">

                {/* Avatar + name */}
                <div className="flex items-end gap-4">
                  <div className="relative">
                    {userProfile?.avatarUrl ? (
                      <img
                        src={userProfile.avatarUrl}
                        alt="Foto de perfil"
                        className="w-[84px] h-[84px] rounded-full border-4 border-white/92 object-cover shadow-[0_6px_20px_rgba(245,158,11,0.22),0_2px_8px_rgba(0,0,0,0.1)]"
                      />
                    ) : (
                      <div className="w-[84px] h-[84px] rounded-full border-4 border-white/92 bg-gradient-to-br from-yellow-400 to-amber-400 flex items-center justify-center shadow-[0_6px_20px_rgba(245,158,11,0.22)]">
                        <User size={34} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="pb-1">
                    <h1 className="text-[22px] text-gray-900 tracking-tight leading-none">
                      {userProfile?.fullName || '—'}
                    </h1>
                    <p className="text-[11px] text-gray-400 mt-1 tracking-wide">
                      Miembro desde {memberSince}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(userProfile?.roles ?? []).map(r => (
                        <span key={r} className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium">
                          {roleLabel(r)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="self-start md:self-end flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 text-white text-sm shadow-[0_4px_14px_rgba(245,158,11,0.38)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.48)] transition-shadow duration-200"
                  >
                    <Edit size={14} />
                    Editar perfil
                  </button>
                ) : (
                  <div className="self-start md:self-end flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 text-white text-sm disabled:opacity-60 shadow-md"
                    >
                      <Save size={14} />
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      onClick={cancel}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/60 border border-white/80 text-gray-600 text-sm hover:bg-white/80"
                    >
                      <X size={14} />
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {/* Stats strip */}
              <div className="grid grid-cols-3 gap-3 mt-5">
                {[
                  { val: orderHistory.length, label: 'Pedidos' },
                  { val: userProfile?.email?.split('@')[0] ?? '—', label: 'Usuario' },
                  { val: userProfile?.status === 'ACTIVE' ? 'Activa' : userProfile?.status ?? '—', label: 'Cuenta' },
                ].map(({ val, label }) => (
                  <div
                    key={label}
                    className="bg-white/55 border border-white/80 rounded-[18px] py-3.5 px-3 text-center"
                  >
                    <span className="text-[17px] text-gray-900 tracking-tight leading-none block truncate px-1">
                      {val}
                    </span>
                    <p className="text-[10px] text-gray-400 uppercase tracking-[.6px] mt-1">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Información personal + wallet ─────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Información personal */}
            <div className={`${glassCard} p-6 space-y-4`}>
              <div>
                <p className="text-[10px] text-amber-600 tracking-[1.2px] uppercase mb-1">Perfil</p>
                <h2 className="text-sm text-gray-900">Información personal</h2>
              </div>

              <div className="space-y-3">
                {/* Nombre */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100/50 flex items-center justify-center flex-shrink-0">
                    <User size={15} className="text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 mb-0.5">Nombre completo</p>
                    {editing ? (
                      <input
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-yellow-400"
                        value={form.fullName}
                        onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900">{userProfile?.fullName || '—'}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100/50 flex items-center justify-center flex-shrink-0">
                    <Mail size={15} className="text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 mb-0.5">Correo electrónico</p>
                    <p className="text-sm font-medium text-gray-900">{userProfile?.email}</p>
                  </div>
                </div>

                {/* Teléfono */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100/50 flex items-center justify-center flex-shrink-0">
                    <Phone size={15} className="text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-gray-400 mb-0.5">Teléfono</p>
                    {editing ? (
                      <input
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-yellow-400"
                        value={form.phone}
                        placeholder="+57 300 000 0000"
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900">{userProfile?.phone || '—'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet */}
            <div className={`${glassCard} p-6`}>
              <p className="text-[10px] text-amber-600 tracking-[1.2px] uppercase mb-1">
                Wallet
              </p>
              <h2 className="text-sm text-gray-900 mb-5">Mi billetera</h2>

              <div className="flex gap-4">
                <div className="relative w-full aspect-[1.586] rounded-3xl bg-gradient-to-br from-yellow-400 to-orange-400 p-6 overflow-hidden shadow-md">
                  <div className="absolute right-0 top-0 w-40 h-40 bg-orange-300 opacity-40 rounded-full blur-2xl" />
                  <div className="relative flex flex-col items-center justify-center h-full text-center">
                    <p className="text-white text-3xl font-semibold tracking-tight">$0.00</p>
                    <p className="text-white/90 mt-2 text-sm">{userProfile?.fullName || '—'}</p>
                    <p className="text-white/70 text-xs mt-1">{userProfile?.email}</p>
                  </div>
                  <img src="/eciexpress.svg" alt="logo" className="absolute bottom-4 left-4 w-10" />
                </div>
                <div className="w-24 rounded-3xl bg-green-200 flex items-center justify-center shadow-md">
                  <button className="w-14 h-14 rounded-full border-2 border-green-500 flex items-center justify-center hover:scale-110 transition">
                    <Plus className="text-green-600" size={28} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats ─────────────────────────────────────────────────────── */}
          <div className={`${glassCard} p-6`}>
            <p className="text-[10px] text-amber-600 tracking-[1.2px] uppercase mb-1">Cuenta</p>
            <h2 className="text-sm text-gray-900 mb-5">Estadísticas</h2>

            {[
              { icon: ShoppingBag, label: 'Pedidos realizados', val: orderHistory.length },
              { icon: Wallet, label: 'Saldo disponible', val: '$0.00' },
              { icon: Star, label: 'Estado de cuenta', val: userProfile?.status === 'ACTIVE' ? 'Activa' : userProfile?.status ?? '—' },
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

            {orderHistory.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aún no tienes pedidos.</p>
            ) : (
              <div className="max-h-[600px] overflow-y-auto space-y-3 pr-2">
                {orderHistory.map((order) => {
                  const cfg = STATUS_CONFIG[order.status as OrderStatus];
                  const StatusIcon = cfg.icon;

                  return (
                    <div
                      key={order.id}
                      className="relative rounded-2xl bg-white/45 border border-white/68 overflow-hidden hover:bg-white/55 transition-colors duration-200"
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${cfg.accentClass}`} />
                      <div className="pl-5 pr-4 pt-4 pb-4">
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

                        <div className="flex gap-3 overflow-x-auto pb-0.5">
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
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default UserProfile;
