import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, AlertTriangle } from 'lucide-react';

interface Props { open: boolean; onClose: () => void; onConfirm: () => void; }

const DeleteAccountModal: React.FC<Props> = ({ open, onClose, onConfirm }) => {
  const [text, setText] = useState('');
  if (!open) return null;
  const handleClose = () => { setText(''); onClose(); };
  const handleConfirm = () => { setText(''); onConfirm(); };
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={handleClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 id="delete-account-title" className="flex items-center gap-2 text-lg font-bold text-red-700"><AlertTriangle size={18} aria-hidden="true" /> Eliminar cuenta</h2>
          <button type="button" onClick={handleClose} aria-label="Cerrar" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"><X size={18} aria-hidden="true" /></button>
        </div>
        <p className="text-sm text-gray-600">Esta acción es permanente y no se puede deshacer. Perderás tu billetera, pedidos y datos. Escribe <span className="font-bold">ELIMINAR</span> para confirmar.</p>
        <input aria-label="Escribe ELIMINAR para confirmar" value={text} onChange={e => setText(e.target.value)} placeholder="ELIMINAR" className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100" />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={handleClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300">Cancelar</button>
          <button type="button" disabled={text !== 'ELIMINAR'} onClick={handleConfirm} className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 size={15} aria-hidden="true" /> Eliminar cuenta</button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default DeleteAccountModal;
