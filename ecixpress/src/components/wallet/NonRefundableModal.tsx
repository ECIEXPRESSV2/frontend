import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  /** Único modo de cerrar: confirmar que se entendió. */
  onAccept: () => void;
}

/**
 * Aviso bloqueante de que la recarga no es reembolsable. Aparece por encima del modal
 * de confirmación y no se puede cerrar (ni con backdrop, ni Escape, ni X): la única
 * salida es el botón "Entendido". Matices de rojo para máxima visibilidad.
 */
const NonRefundableModal: React.FC<Props> = ({ open, onAccept }) => {
  // Bloquea el cierre con Escape mientras esté abierto (debe usarse el botón).
  useEffect(() => {
    if (!open) return;
    const stop = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', stop, true);
    return () => window.removeEventListener('keydown', stop, true);
  }, [open]);

  if (!open) return null;

  return (
    // z mayor que el ModalShell (z-[100]) para quedar por encima. El backdrop NO cierra.
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border-2 border-red-500 overflow-hidden animate-[fadeIn_.15s_ease-out]">
        <div className="bg-red-600 px-6 py-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="text-white" size={24} />
          </div>
          <h2 className="text-white font-bold text-lg leading-tight">
            Esta recarga no es reembolsable
          </h2>
        </div>

        <div className="px-6 py-6 space-y-4">
          <p className="text-sm text-red-600/90 text-justify">
            El saldo que cargues a tu billetera ECIExpress{' '}
            <strong className="text-red-700">no se puede devolver a dinero real</strong> bajo ninguna
            circunstancia. Solo podrás usarlo dentro de la plataforma para tus
            compras.
          </p>

          <button
            type="button"
            onClick={onAccept}
            className="w-full py-3 rounded-xl bg-red-600 text-white font-bold shadow-md shadow-red-200 hover:bg-red-700 transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default NonRefundableModal;
