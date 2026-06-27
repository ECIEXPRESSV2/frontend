import React from 'react';
import { createPortal } from 'react-dom';
import { LogOut, X } from 'lucide-react';

interface Props { open: boolean; onClose: () => void; onConfirm: () => void; }

const CloseSessionsModal: React.FC<Props> = ({ open, onClose, onConfirm }) => {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="close-sessions-title" className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 id="close-sessions-title" className="text-lg font-bold text-gray-900">Cerrar otras sesiones</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-300"><X size={18} aria-hidden="true" /></button>
        </div>
        <p className="text-sm text-gray-600">Se cerrará tu sesión en todos los demás dispositivos. Tendrás que volver a iniciar sesión allí.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300">Cancelar</button>
          <button type="button" onClick={onConfirm} className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-white hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300"><LogOut size={15} aria-hidden="true" /> Cerrar otras sesiones</button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CloseSessionsModal;
