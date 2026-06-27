import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { User, Mail, Phone, Calendar, Lock, Edit, Save, X } from 'lucide-react';
import AccountSectionHeader from '../AccountSectionHeader';
import { useAuth } from '../../../../context/AuthContext';
import { updateMe } from '../../../../services/userService';

const Row: React.FC<{ icon: React.ElementType; label: string; children: React.ReactNode }> = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3 border-b border-gray-100 py-4 last:border-0">
    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Icon size={16} aria-hidden="true" /></span>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-gray-400">{label}</p>
      <div className="mt-0.5 text-sm font-medium text-gray-900">{children}</div>
    </div>
  </div>
);

const InformacionSection: React.FC = () => {
  const { userProfile, getToken, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', avatarUrl: '' });

  useEffect(() => {
    if (userProfile) setForm({
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
        avatarUrl: form.avatarUrl || undefined,
      }, token);
      await refreshProfile();
      toast.success('Información actualizada');
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (userProfile) setForm({
      fullName: userProfile.fullName || '',
      phone: userProfile.phone || '',
      avatarUrl: userProfile.avatarUrl || '',
    });
    setEditing(false);
  };

  const memberSince = userProfile?.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <>
      <AccountSectionHeader titulo="Información personal">
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-white">
            <Edit size={15} aria-hidden="true" /> Editar información
          </button>
        ) : (
          <>
            <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white">
              <Save size={15} aria-hidden="true" /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" onClick={cancel} className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white">
              <X size={15} aria-hidden="true" /> Cancelar
            </button>
          </>
        )}
      </AccountSectionHeader>

      <div className="rounded-3xl border border-white/70 bg-white/82 p-5 shadow-lg shadow-gray-200/60 backdrop-blur-xl md:p-6">
        <Row icon={User} label="Nombre completo">
          {editing
            ? <input aria-label="Nombre completo" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-300" />
            : (userProfile?.fullName || '—')}
        </Row>
        <Row icon={Mail} label="Correo electrónico">
          <span className="flex items-center gap-2">
            {userProfile?.email}
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500"><Lock size={10} aria-hidden="true" /> No editable</span>
          </span>
          {editing && <p className="mt-1 text-[11px] text-gray-400">El correo institucional no puede modificarse desde esta sección.</p>}
        </Row>
        <Row icon={Phone} label="Teléfono">
          {editing
            ? <input aria-label="Teléfono" value={form.phone} placeholder="+57 300 000 0000" onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-300" />
            : (userProfile?.phone || '—')}
        </Row>
        <Row icon={Calendar} label="Miembro desde">{memberSince}</Row>
      </div>
    </>
  );
};

export default InformacionSection;
