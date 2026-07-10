import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, Loader2, X } from 'lucide-react';

interface Props {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (payload: { currentPassword: string; newPassword: string }) => Promise<void>;
}

const ChangePasswordModal: React.FC<Props> = ({ open, loading = false, onClose, onConfirm }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!open) return null;

  const resetAndClose = () => {
    if (loading) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  const canSubmit =
    currentPassword.trim().length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onConfirm({ currentPassword, newPassword });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={resetAndClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[#F4B942]" />
        <div className="mb-4 flex items-center justify-between">
          <h2 id="change-password-title" className="flex items-center gap-2 text-lg font-bold text-gray-950">
            <KeyRound size={18} aria-hidden="true" /> Cambiar contraseña
          </h2>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-yellow-300"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-gray-500">Contraseña actual</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-100"
              autoComplete="current-password"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-gray-500">Nueva contraseña</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-100"
              autoComplete="new-password"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-gray-500">Confirmar nueva contraseña</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-100"
              autoComplete="new-password"
            />
          </label>
        </div>

        {newPassword && newPassword.length < 8 && (
          <p className="mt-3 text-xs text-red-500">La nueva contraseña debe tener al menos 8 caracteres.</p>
        )}
        {confirmPassword && newPassword !== confirmPassword && (
          <p className="mt-3 text-xs text-red-500">Las contraseñas no coinciden.</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            Guardar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ChangePasswordModal;
