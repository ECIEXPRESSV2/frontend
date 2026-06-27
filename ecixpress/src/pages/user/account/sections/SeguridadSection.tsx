import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { KeyRound, LogOut, Mail, Clock, ChevronRight, Trash2 } from 'lucide-react';
import AccountSectionHeader from '../AccountSectionHeader';
import { useAuth } from '../../../../context/AuthContext';
import CloseSessionsModal from '../modals/CloseSessionsModal';
import DeleteAccountModal from '../modals/DeleteAccountModal';

const SeguridadSection: React.FC = () => {
  const { userProfile } = useAuth();
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const memberSince = userProfile?.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'No disponible';

  const items = [
    { icon: KeyRound, title: 'Cambiar contraseña', desc: 'Actualiza tu contraseña de acceso.', onClick: () => toast.info('Próximamente') },
    { icon: LogOut, title: 'Cerrar otras sesiones', desc: 'Cierra tu sesión en otros dispositivos.', onClick: () => setSessionsOpen(true) },
    { icon: Mail, title: 'Verificación de correo', desc: userProfile?.email ?? '', onClick: () => toast.info('Próximamente') },
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

      <CloseSessionsModal open={sessionsOpen} onClose={() => setSessionsOpen(false)} onConfirm={() => { setSessionsOpen(false); toast.success('Se cerraron las demás sesiones (demo)'); }} />
      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={() => { setDeleteOpen(false); toast.info('Eliminación de cuenta no disponible aún'); }} />
    </>
  );
};

export default SeguridadSection;
