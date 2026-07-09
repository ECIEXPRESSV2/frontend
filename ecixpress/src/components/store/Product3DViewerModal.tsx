import React, { useEffect, useRef, useState } from 'react';
import '@google/model-viewer';
import { Box } from 'lucide-react';
import ModalShell from '../wallet/ModalShell';

interface Product3DViewerModalProps {
  open: boolean;
  title: string;
  src: string | null;
  onClose: () => void;
}

const Product3DViewerModal: React.FC<Product3DViewerModalProps> = ({ open, title, src, onClose }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const viewerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoaded(false);
    setFailed(false);
  }, [open, src]);

  useEffect(() => {
    const el = viewerRef.current;
    if (!el || !src) return;

    const onLoad = () => setLoaded(true);
    const onError = () => setFailed(true);

    el.addEventListener('load', onLoad);
    el.addEventListener('error', onError);

    return () => {
      el.removeEventListener('load', onLoad);
      el.removeEventListener('error', onError);
    };
  }, [src]);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Vista 3D interactiva del producto"
      maxWidth="max-w-5xl"
      bodyClassName="p-0"
    >
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-white/90">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
              <Box size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-xs text-white/60">Arrastra para rotar, rueda para zoom</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Cerrar
          </button>
        </div>

        <div className="relative min-h-[68vh] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_42%)]">
          {!src ? (
            <div className="flex min-h-[68vh] items-center justify-center px-6 text-center text-white/70">
              <div>
                <p className="text-base font-semibold text-white">No hay modelo 3D disponible</p>
                <p className="mt-1 text-sm text-white/60">El producto todavía no tiene una URL válida para el visor.</p>
              </div>
            </div>
          ) : (
            <>
              {!loaded && !failed && (
                <div className="absolute inset-0 z-10 flex items-center justify-center text-white/80">
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm shadow-lg backdrop-blur">
                    Cargando modelo 3D...
                  </div>
                </div>
              )}

              {failed ? (
                <div className="flex min-h-[68vh] items-center justify-center px-6 text-center text-white/70">
                  <div>
                    <p className="text-base font-semibold text-white">No se pudo cargar el modelo 3D</p>
                    <p className="mt-1 text-sm text-white/60">Revisa que la URL sea pública y que el archivo GLB responda con 200.</p>
                  </div>
                </div>
              ) : (
                <model-viewer
                  ref={viewerRef}
                  src={src}
                  alt={title}
                  className="h-[68vh] w-full"
                  camera-controls
                  auto-rotate
                  shadow-intensity="1"
                  exposure="1.05"
                  environment-image="neutral"
                  interaction-prompt="auto"
                  crossOrigin="anonymous"
                />
              )}
            </>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

export default Product3DViewerModal;