import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Mail, X } from 'lucide-react';

interface Props {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: { subject: string; body: string }) => Promise<void>;
}

const CreatePqrsModal: React.FC<Props> = ({ open, loading = false, onClose, onSubmit }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  if (!open) return null;

  const resetAndClose = () => {
    if (loading) return;
    setSubject('');
    setBody('');
    onClose();
  };

  const canSubmit = subject.trim().length >= 3 && body.trim().length > 0 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit({ subject: subject.trim(), body: body.trim() });
    setSubject('');
    setBody('');
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={resetAndClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-pqrs-title"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/70 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[#F4B942]" />
        <div className="mb-4 flex items-center justify-between">
          <h2 id="create-pqrs-title" className="flex items-center gap-2 text-lg font-bold text-gray-950">
            <Mail size={18} aria-hidden="true" /> Nueva PQRS
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

        <p className="mb-4 text-sm text-gray-500">
          Cuéntanos tu petición, queja, reclamo o sugerencia. Un administrador te responderá por aquí mismo.
        </p>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-gray-500">Asunto</span>
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={150}
              placeholder="Ej: Cobro duplicado en mi pedido"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-gray-500">Mensaje</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={5000}
              rows={5}
              placeholder="Describe con detalle qué pasó..."
              className="mt-1 w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-100"
            />
          </label>
        </div>

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
            Enviar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CreatePqrsModal;
