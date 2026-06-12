import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Edit, Save, X } from 'lucide-react';
import { toast } from 'react-toastify';
import Sidebar from '../../components/home/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { updateMe } from '../../services/userService';

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, getToken, refreshProfile } = useAuth();
  const [activeSidebarItem, setActiveSidebarItem] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ fullName: '', phone: '', avatarUrl: '' });

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
        token
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem={activeSidebarItem} onItemClick={setActiveSidebarItem} />

      <main className="ml-16 p-6 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-xl border border-white/40 text-gray-700 font-medium text-sm hover:bg-yellow-50 hover:text-yellow-600 transition-all duration-300"
          >
            <ArrowLeft size={16} />
            Volver
          </button>

          {/* Header */}
          <div className="rounded-2xl bg-white/60 backdrop-blur-xl shadow-sm overflow-hidden">
            <div className="h-28 bg-gradient-to-r from-yellow-400 to-yellow-500" />
            <div className="px-6 pb-6">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-4 -mt-10">
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-gradient-to-r from-yellow-400 to-yellow-500 flex items-center justify-center flex-shrink-0">
                  {userProfile?.avatarUrl ? (
                    <img src={userProfile.avatarUrl} alt="avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User size={32} className="text-white" />
                  )}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-xl font-bold text-gray-900">{userProfile?.fullName}</h1>
                  <p className="text-sm text-gray-500">{userProfile?.email}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(userProfile?.roles ?? []).map(r => (
                      <span key={r} className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                        {roleLabel(r)}
                      </span>
                    ))}
                  </div>
                </div>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-medium text-sm hover:from-yellow-500 hover:to-yellow-600 transition-all shadow-md"
                  >
                    <Edit size={15} />
                    Editar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="rounded-2xl bg-white/60 backdrop-blur-xl shadow-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-gray-900">Información Personal</h2>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Nombre completo</p>
                  {editing ? (
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-400"
                      value={form.fullName}
                      onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900">{userProfile?.fullName || '—'}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <Mail size={16} className="text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Correo electrónico</p>
                  <p className="text-sm font-medium text-gray-900">{userProfile?.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <Phone size={16} className="text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">Teléfono</p>
                  {editing ? (
                    <input
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-yellow-400"
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

            {editing && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-medium text-sm disabled:opacity-60"
                >
                  <Save size={15} />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={cancel}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200"
                >
                  <X size={15} />
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Estado de cuenta */}
          <div className="rounded-2xl bg-white/60 backdrop-blur-xl shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-3">Estado de la cuenta</h2>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                userProfile?.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                userProfile?.status === 'SUSPENDED' ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'
              }`}>
                {userProfile?.status === 'ACTIVE' ? 'Activa' :
                 userProfile?.status === 'SUSPENDED' ? 'Suspendida' : 'Inactiva'}
              </span>
              <span className="text-xs text-gray-400">
                Miembro desde {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' }) : '—'}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
