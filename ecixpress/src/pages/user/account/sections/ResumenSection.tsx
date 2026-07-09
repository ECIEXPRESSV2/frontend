import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Calendar,
  CheckCircle,
  CreditCard,
  Edit,
  ImagePlus,
  Lock,
  Mail,
  Phone,
  Save,
  User,
  Wallet as WalletIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useWallet } from '../../../../context/WalletContext';
import WalletPremiumCard from '../../../../components/wallet/WalletPremiumCard';
import TrianglePattern from '../../../../components/home/TrianglePattern';
import { updateMe, uploadAvatar } from '../../../../services/userService';
import { compressImageToWebp } from '../../../../services/storeAssets';

const roleLabel = (role: string) => (
  { ADMIN: 'Administrador', VENDOR: 'Vendedor', BUYER: 'Comprador', ANALYST: 'Analista' } as Record<string, string>
)[role] ?? role;

const InfoRow: React.FC<{ icon: React.ElementType; label: string; children: React.ReactNode }> = ({
  icon: Icon,
  label,
  children,
}) => (
  <div className="flex items-start gap-3 border-b border-gray-100 py-4 last:border-0">
    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
      <Icon size={16} aria-hidden="true" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-gray-400">{label}</p>
      <div className="mt-0.5 text-sm font-medium text-gray-900">{children}</div>
    </div>
  </div>
);

const ResumenSection: React.FC = () => {
  const navigate = useNavigate();
  const { sidebarExpanded = false } = useOutletContext<{ sidebarExpanded?: boolean }>() ?? {};
  const { userProfile, getToken, refreshProfile } = useAuth();
  const { balanceLabel, loading: walletLoading, openRecharge } = useWallet();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', avatarUrl: '' });
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userProfile) return;
    setForm({
      fullName: userProfile.fullName || '',
      phone: userProfile.phone || '',
      avatarUrl: userProfile.avatarUrl || '',
    });
  }, [userProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      await updateMe({
        fullName: form.fullName || undefined,
        phone: form.phone || undefined,
      }, token);
      await refreshProfile();
      toast.success('Informacion actualizada');
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (userProfile) {
      setForm({
        fullName: userProfile.fullName || '',
        phone: userProfile.phone || '',
        avatarUrl: userProfile.avatarUrl || '',
      });
    }
    setEditing(false);
  };

  const handleAvatarFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona una imagen valida');
      return;
    }

    setAvatarMenuOpen(false);
    setUploadingAvatar(true);
    try {
      const optimized = (await compressImageToWebp(file, 640, 0.82)) ?? file;
      const token = await getToken();
      const { avatarUrl } = await uploadAvatar(optimized, token);
      setForm((current) => ({ ...current, avatarUrl }));
      await refreshProfile();
      toast.success('Foto de perfil actualizada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo subir la foto');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const memberSince = userProfile?.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })
    : '-';
  const memberSinceFull = userProfile?.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-';
  const activeAccount = userProfile?.status === 'ACTIVE';

  return (
    <>
      <header
        className={`admin-hero-banner theme-surface relative overflow-visible rounded-[32px] border border-white/60 bg-[linear-gradient(140deg,rgb(var(--accent-rgb)/0.32)_0%,rgba(255,255,255,0.62)_42%,rgb(var(--accent-rgb)/0.14)_72%,rgb(var(--accent-rgb)/0.36)_100%)] p-5 backdrop-blur-2xl [box-shadow:0_28px_50px_-28px_rgb(var(--accent-rgb)/0.45)] md:p-6 ${
          sidebarExpanded ? 'admin-hero-expanded' : ''
        }`}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
          <div aria-hidden="true" className="theme-surface absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[rgb(var(--accent-rgb)/0.32)] blur-3xl" />
          <div aria-hidden="true" className="theme-surface absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-[rgb(var(--accent-rgb)/0.20)] blur-3xl" />
          <TrianglePattern className={`admin-hero-triangles ${sidebarExpanded ? 'admin-hero-triangles-expanded' : ''}`} />
        </div>
        <div className="relative z-10 flex min-h-[112px] flex-col justify-center gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setAvatarMenuOpen((open) => !open)}
                className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white/80 bg-white/45 text-[var(--accent-600)] shadow-lg transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Opciones de perfil"
                aria-haspopup="menu"
                aria-expanded={avatarMenuOpen}
              >
                {userProfile?.avatarUrl ? (
                  <img src={userProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User size={34} aria-hidden="true" />
                )}
                <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/75 bg-white/85 text-amber-700 shadow-md shadow-gray-900/15 backdrop-blur-sm transition group-hover:scale-105 group-hover:bg-white">
                  {uploadingAvatar ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-200 border-t-amber-700" aria-hidden="true" />
                  ) : (
                    <Edit size={14} aria-hidden="true" />
                  )}
                </span>
              </button>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleAvatarFile(event.target.files?.[0])}
              />

              {avatarMenuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-[70] cursor-default"
                    aria-label="Cerrar opciones de perfil"
                    onClick={() => setAvatarMenuOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute left-0 top-[calc(100%+0.75rem)] z-[80] w-48 overflow-hidden rounded-2xl border border-white/70 bg-white/95 p-1.5 text-gray-700 shadow-xl shadow-gray-900/15 backdrop-blur-xl"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-wait disabled:opacity-60"
                    >
                      <ImagePlus size={16} aria-hidden="true" />
                      Subir foto
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAvatarMenuOpen(false);
                        setEditing(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-amber-50 hover:text-amber-700"
                    >
                      <Edit size={16} aria-hidden="true" />
                      Editar datos
                    </button>
                  </div>
                </>
              )}
            </div>
            <div>
              <nav className="mb-2 inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur" aria-label="Ruta de navegacion">
                Mi cuenta <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-950">Perfil</span>
              </nav>
              <h1 className="font-display text-2xl font-semibold text-gray-900 md:text-3xl">{userProfile?.fullName || '-'}</h1>
              <p className="text-sm font-medium text-gray-600">{userProfile?.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {userProfile?.phone && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    <Phone size={11} aria-hidden="true" />
                    {userProfile.phone}
                  </span>
                )}
                {(userProfile?.roles ?? []).map((role) => (
                  <span key={role} className="rounded-full bg-white/85 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    {roleLabel(role)}
                  </span>
                ))}
                {activeAccount && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle size={12} aria-hidden="true" /> Cuenta activa
                  </span>
                )}
                <span className="text-xs font-medium text-gray-500">Miembro desde {memberSince}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
        <div className="rounded-3xl border border-white/70 bg-white/82 p-5 shadow-lg shadow-gray-200/60 backdrop-blur-xl md:p-6">
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Informacion personal</h2>
              <p className="mt-1 text-xs text-gray-500">Datos principales de tu cuenta ECIxpress.</p>
            </div>
            {editing ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                >
                  <Save size={15} aria-hidden="true" /> {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                >
                  <X size={15} aria-hidden="true" /> Cancelar
                </button>
              </div>
            ) : null}
          </div>

          <InfoRow icon={User} label="Nombre completo">
            {editing ? (
              <input
                aria-label="Nombre completo"
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
            ) : (
              userProfile?.fullName || '-'
            )}
          </InfoRow>
          <InfoRow icon={Mail} label="Correo electronico">
            <span className="flex flex-wrap items-center gap-2">
              {userProfile?.email}
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500"
                title="Correo no editable"
                aria-label="Correo no editable"
              >
                <Lock size={12} aria-hidden="true" />
              </span>
            </span>
          </InfoRow>
          <InfoRow icon={Phone} label="Telefono">
            {editing ? (
              <input
                aria-label="Telefono"
                value={form.phone}
                placeholder="+57 300 000 0000"
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
                <Phone size={14} aria-hidden="true" />
                {userProfile?.phone || '-'}
              </span>
            )}
          </InfoRow>
          <InfoRow icon={Calendar} label="Miembro desde">{memberSinceFull}</InfoRow>
        </div>

        <div className="grid content-start gap-4 lg:grid-cols-[minmax(300px,420px)_1fr] xl:grid-cols-1">
          <WalletPremiumCard className="mx-auto lg:mx-0" />
          <div className="flex min-h-[178px] flex-col justify-center gap-4 rounded-3xl border border-white/70 bg-white/82 p-5 shadow-lg shadow-gray-200/60 backdrop-blur-xl">
            <div>
              <p className="text-sm font-bold text-gray-900">Billetera ECIxpress</p>
              <p className="mt-1 text-xs text-gray-500">Saldo y pagos disponibles para tus compras en campus.</p>
              <p className="mt-3 text-2xl font-black leading-none text-gray-950">{walletLoading ? 'Cargando...' : balanceLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openRecharge}
                className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-gray-950 transition hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"
              >
                <WalletIcon size={15} aria-hidden="true" /> Recargar
              </button>
              <button
                type="button"
                onClick={() => navigate('/profile/pagos')}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-300"
              >
                <CreditCard size={15} aria-hidden="true" /> Gestionar pagos
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ResumenSection;
