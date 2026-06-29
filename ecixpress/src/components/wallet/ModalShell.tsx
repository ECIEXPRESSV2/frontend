import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
  /** Header full-bleed personalizado; reemplaza el encabezado blanco por defecto. */
  header?: React.ReactNode;
  /** Clases del contenedor del cuerpo (por defecto `px-6 py-5`). */
  bodyClassName?: string;
}

/** Overlay + tarjeta centrada, con el estilo glass/amarillo de la app. */
const ModalShell: React.FC<ModalShellProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-md',
  header,
  bodyClassName = 'px-6 py-5',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Muestra la barra de scroll mientras se hace scroll y la desvanece al detenerse.
  useEffect(() => {
    const el = scrollRef.current;
    if (!open || !el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      el.classList.add('is-scrolling');
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('is-scrolling'), 700);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (timer) clearTimeout(timer);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-3 bg-gray-900/40 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        className={`mx-auto w-full ${maxWidth} max-h-[min(90vh,900px)] flex flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl border border-white/60`}
        onClick={(e) => e.stopPropagation()}
      >
        {header ? (
          <div className="relative shrink-0">
            {header}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/80 hover:bg-white/20 hover:text-white transition"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <div className="shrink-0 flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-6 pb-4 pt-6">
            <div>
              <h2 className="text-lg font-bold text-gray-800">{title}</h2>
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 -mt-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-auto-hide">
          <div className={bodyClassName}>{children}</div>
        </div>
      </div>
    </div>
  );
};

export default ModalShell;
