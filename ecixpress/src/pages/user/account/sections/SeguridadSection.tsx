import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { KeyRound, Clock, ChevronRight, Trash2 } from 'lucide-react';
import AccountSectionHeader from '../AccountSectionHeader';
import { useAuth } from '../../../../context/AuthContext';
import DeleteAccountModal from '../modals/DeleteAccountModal';
import ChangePasswordModal from '../modals/ChangePasswordModal';
import { changePassword, deleteOwnAccount } from '../../../../services/userService';

const SeguridadSection: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, getToken, signOut } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const memberSince = userProfile?.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'No disponible';

  const handlePasswordChange = async (payload: { currentPassword: string; newPassword: string }) => {
    setChangingPassword(true);
    try {
      const token = await getToken();
      await changePassword(payload, token);
      setPasswordOpen(false);
      toast.success('Contraseña actualizada.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const token = await getToken();
      await deleteOwnAccount(token);
      setDeleteOpen(false);
      await signOut();
      toast.success('Tu cuenta fue marcada como inactiva.');
      navigate('/signin', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la cuenta.');
    }
  };

  const items = [
    { icon: KeyRound, title: 'Cambiar contraseña', desc: 'Actualiza tu contraseña de acceso.', onClick: () => setPasswordOpen(true) },
    { icon: Clock, title: 'Cuenta creada', desc: memberSince, onClick: undefined },
  ];

  return (
    <>
      <AccountSectionHeader titulo="Seguridad" />

      <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/82 shadow-lg shadow-gray-200/60 backdrop-blur-xl">
        {items.map(({ icon: Icon, title, desc, onClick }) => {
          const Comp = onClick ? 'button' : 'div';
          return (
            <Comp key={title} onClick={onClick} className={`flex w-full items-center gap-3 border-b border-gray-100 px-5 py-4 text-left last:border-0 ${onClick ? 'transition hover:bg-yellow-50/50 focus:outline-none focus:ring-2 focus:ring-yellow-300' : ''}`}>
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Icon size={16} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900">{title}</span>
                <span className="block truncate text-xs text-gray-400">{desc}</span>
              </span>
              {onClick && <ChevronRight size={16} className="text-gray-300" aria-hidden="true" />}
            </Comp>
          );
        })}
      </div>

      {/* Zona de riesgo */}
      <div className="rounded-3xl border border-red-200 bg-red-50/60 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-red-700">Zona de riesgo</h2>
        <p className="mt-1 text-xs text-red-600/80">Estas acciones son permanentes. Procede con cuidado.</p>
        <button type="button" onClick={() => setDeleteOpen(true)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200">
          <Trash2 size={15} aria-hidden="true" /> Eliminar mi cuenta
        </button>
      </div>

      <ChangePasswordModal
        open={passwordOpen}
        loading={changingPassword}
        onClose={() => setPasswordOpen(false)}
        onConfirm={handlePasswordChange}
      />
      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDeleteAccount} />
    </>
  );
};

export default SeguridadSection;
