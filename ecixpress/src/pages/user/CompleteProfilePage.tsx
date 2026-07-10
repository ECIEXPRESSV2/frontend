import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Loader2, Lock, Mail, Phone, Save, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateMyPhone } from '../../services/userService';

const hasPhone = (phone?: string | null) => Boolean(phone?.trim());

const CompleteProfilePage: React.FC = () => {
  const { firebaseUser, userProfile, loading, getToken, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const nextPath = useMemo(() => (from && from !== '/complete-profile' ? from : '/home'), [from]);
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile?.phone) setPhone(userProfile.phone);
  }, [userProfile?.phone]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 px-4 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (!firebaseUser) return <Navigate to="/signin" replace />;
  if (hasPhone(userProfile?.phone)) return <Navigate to={nextPath} replace />;

  const error = touched && !phone.trim() ? 'El telefono es obligatorio.' : '';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    const trimmed = phone.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      const token = await getToken();
      await updateMyPhone(trimmed, token);
      const refreshed = await refreshProfile();
      if (!refreshed) {
        toast.error('Telefono guardado, pero no se pudo actualizar tu sesion. Intenta de nuevo.');
        return;
      }
      toast.success('Telefono actualizado.');
      navigate(nextPath, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el telefono.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 px-4 py-8 text-gray-900">
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center justify-center">
        <section className="w-full rounded-[28px] border border-white/70 bg-white/86 p-5 shadow-2xl shadow-yellow-200/40 backdrop-blur-xl md:p-7">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-sm">
              <User size={24} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">Completa tu perfil</p>
              <h1 className="mt-1 text-2xl font-black text-gray-950">Agrega tu numero de telefono</h1>
              <p className="mt-1 max-w-xl text-sm leading-6 text-gray-500">
                Necesitamos este dato antes de continuar usando ECIxpress.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="rounded-3xl border border-white/70 bg-white/82 p-5 shadow-lg shadow-gray-200/60 md:p-6">
            <div className="flex items-start gap-3 border-b border-gray-100 pb-4">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Mail size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-400">Correo electronico</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                  <span className="break-all">{userProfile?.email}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                    <Lock size={10} aria-hidden="true" /> No editable
                  </span>
                </div>
              </div>
            </div>

            <label className="mt-4 flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Phone size={16} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-gray-400">
                  Telefono <span className="text-red-500" aria-hidden="true">*</span>
                </span>
                <input
                  type="tel"
                  required
                  aria-required="true"
                  maxLength={20}
                  value={phone}
                  onBlur={() => setTouched(true)}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+57 300 123 4567"
                  className={`mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 ${
                    error
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100'
                  }`}
                />
                {error && <span className="mt-1.5 block text-xs text-red-500">{error}</span>}
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
              {saving ? 'Guardando...' : 'Guardar y continuar'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default CompleteProfilePage;
