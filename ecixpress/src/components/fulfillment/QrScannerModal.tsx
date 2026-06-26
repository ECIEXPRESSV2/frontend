import React, { useCallback, useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import {
  SwitchCamera,
  Zap,
  ZapOff,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import ModalShell from '../wallet/ModalShell';

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  /** Se invoca con el contenido decodificado del QR (el token opaco del código de retiro). */
  onResult: (token: string) => void;
}

type ScannerStatus = 'starting' | 'scanning' | 'detected' | 'error';

/** Traduce los errores técnicos de `getUserMedia`/QrScanner a un mensaje claro en español. */
function messageForError(e: unknown): string {
  const name = (e as { name?: string } | null)?.name ?? '';
  const msg = e instanceof Error ? e.message : String(e ?? '');

  if (name === 'NotAllowedError' || name === 'SecurityError' || /denied|permission/i.test(msg)) {
    return 'Necesitamos tu permiso para usar la cámara. Actívalo en el navegador (icono de la barra de direcciones) e inténtalo de nuevo, o pide el código corto al cliente.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || /no camera|device not found/i.test(msg)) {
    return 'No encontramos una cámara disponible en este dispositivo. Pide al cliente su código corto (formato XXXX-XXXX).';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || /in use|could not start/i.test(msg)) {
    return 'La cámara está siendo usada por otra aplicación. Ciérrala e inténtalo de nuevo.';
  }
  return 'No pudimos iniciar la cámara. Inténtalo de nuevo o usa el código corto del cliente.';
}

/**
 * Escáner de QR en vivo para el vendedor (UC-03 / UC-04). Abre la cámara del dispositivo,
 * pide permisos, decodifica el QR (que contiene el token opaco del código de retiro) y lo
 * devuelve al padre para validarlo/confirmarlo server-side. Permite alternar cámara y, si el
 * hardware lo soporta, encender la linterna. Degrada con elegancia cuando no hay cámara o se
 * niega el permiso: el vendedor siempre puede caer al código corto tecleado.
 */
const QrScannerModal: React.FC<QrScannerModalProps> = ({ open, onClose, onResult }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const handledRef = useRef(false);
  const detectTimerRef = useRef<number | null>(null);

  // Callback en ref para no reiniciar la cámara cuando el padre re-renderiza.
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const [status, setStatus] = useState<ScannerStatus>('starting');
  const [errorMsg, setErrorMsg] = useState('');
  const [cameras, setCameras] = useState<QrScanner.Camera[]>([]);
  const [activeCamera, setActiveCamera] = useState(0);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  // attempt incrementa para forzar un reinicio limpio al pulsar "Reintentar".
  const [attempt, setAttempt] = useState(0);

  const teardown = useCallback(() => {
    const s = scannerRef.current;
    if (s) {
      s.stop();
      s.destroy();
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    handledRef.current = false;

    const init = async () => {
      // getUserMedia solo funciona en contexto seguro (HTTPS o localhost).
      const insecure = !window.isSecureContext;
      if (insecure || !navigator.mediaDevices?.getUserMedia) {
        if (cancelled) return;
        setStatus('error');
        setErrorMsg(
          insecure
            ? 'El escáner de cámara requiere una conexión segura (HTTPS). Mientras tanto, usa el código corto del cliente.'
            : 'Este navegador no permite acceder a la cámara. Usa el código corto del cliente.',
        );
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      // Variable local: solo se publica en `scannerRef` tras un arranque exitoso y vigente.
      // Así el doble montaje de StrictMode (mount → cleanup → mount) no hace que el primer
      // arranque, ya cancelado, destruya el scanner del segundo montaje (cámara en negro).
      const scanner = new QrScanner(
        video,
        (result) => {
          if (handledRef.current) return;
          const token = (typeof result === 'string' ? result : result.data).trim();
          if (!token) return;
          handledRef.current = true;
          setStatus('detected');
          // Breve confirmación visual antes de cerrar y validar.
          detectTimerRef.current = window.setTimeout(() => onResultRef.current(token), 280);
        },
        {
          preferredCamera: 'environment',
          highlightScanRegion: false,
          highlightCodeOutline: false,
          maxScansPerSecond: 8,
          returnDetailedScanResult: true,
        },
      );

      try {
        await scanner.start();
        if (cancelled) {
          scanner.stop();
          scanner.destroy();
          return;
        }
        scannerRef.current = scanner;
        setStatus('scanning');

        const cams = await QrScanner.listCameras(true).catch(() => [] as QrScanner.Camera[]);
        if (!cancelled) setCameras(cams);
        const flash = await scanner.hasFlash().catch(() => false);
        if (!cancelled) setHasFlash(flash);
      } catch (e) {
        scanner.destroy();
        if (cancelled) return;
        setStatus('error');
        setErrorMsg(messageForError(e));
      }
    };

    void init();

    return () => {
      cancelled = true;
      if (detectTimerRef.current !== null) {
        window.clearTimeout(detectTimerRef.current);
        detectTimerRef.current = null;
      }
      teardown();
    };
  }, [open, attempt, teardown]);

  const switchCamera = async () => {
    const scanner = scannerRef.current;
    if (!scanner || cameras.length < 2) return;
    const next = (activeCamera + 1) % cameras.length;
    try {
      await scanner.setCamera(cameras[next].id);
      setActiveCamera(next);
      setFlashOn(false);
      const flash = await scanner.hasFlash().catch(() => false);
      setHasFlash(flash);
    } catch {
      /* el cambio de cámara falló; se mantiene la actual */
    }
  };

  const toggleFlash = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.toggleFlash();
      setFlashOn(scanner.isFlashOn());
    } catch {
      /* la linterna no está disponible */
    }
  };

  // Reinicia el estado (en un manejador, no en el efecto) y vuelve a montar la cámara.
  const retry = () => {
    teardown();
    setStatus('starting');
    setErrorMsg('');
    setFlashOn(false);
    setHasFlash(false);
    setCameras([]);
    setActiveCamera(0);
    setAttempt((n) => n + 1);
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Escanear código QR"
      subtitle="Apunta la cámara al QR del cliente para validar la entrega."
    >
      {/* Animación del haz de escaneo (amarillo de marca). */}
      <style>{`
        @keyframes qrLaser { 0% { top: 6%; } 50% { top: 94%; } 100% { top: 6%; } }
      `}</style>

      <div className="space-y-4">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-900 shadow-inner">
          {/* Feed de la cámara */}
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            autoPlay
            playsInline
          />

          {/* Estado: iniciando */}
          {status === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900 text-gray-300">
              <Loader2 size={32} className="animate-spin text-yellow-400" />
              <p className="text-sm">Iniciando la cámara…</p>
              <p className="max-w-[16rem] text-center text-xs text-gray-500">
                Acepta el permiso de cámara cuando el navegador lo solicite.
              </p>
            </div>
          )}

          {/* Estado: error */}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900 px-6 text-center">
              <AlertTriangle size={32} className="text-yellow-400" />
              <p className="text-sm text-gray-200">{errorMsg}</p>
              <button
                onClick={retry}
                className="mt-1 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 transition"
              >
                <RefreshCw size={15} /> Reintentar
              </button>
            </div>
          )}

          {/* Marco de escaneo + haz (mientras escanea) */}
          {status === 'scanning' && (
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-[0_0_0_9999px_rgba(17,24,39,0.55)]">
                {/* Esquinas */}
                <span className="absolute -left-0.5 -top-0.5 h-7 w-7 rounded-tl-2xl border-l-4 border-t-4 border-yellow-400" />
                <span className="absolute -right-0.5 -top-0.5 h-7 w-7 rounded-tr-2xl border-r-4 border-t-4 border-yellow-400" />
                <span className="absolute -bottom-0.5 -left-0.5 h-7 w-7 rounded-bl-2xl border-b-4 border-l-4 border-yellow-400" />
                <span className="absolute -bottom-0.5 -right-0.5 h-7 w-7 rounded-br-2xl border-b-4 border-r-4 border-yellow-400" />
                {/* Haz */}
                <span
                  className="absolute left-2 right-2 h-0.5 rounded-full bg-yellow-400 shadow-[0_0_12px_2px_rgba(250,204,21,0.8)]"
                  style={{ animation: 'qrLaser 2.4s ease-in-out infinite' }}
                />
              </div>
            </div>
          )}

          {/* Estado: detectado */}
          {status === 'detected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-emerald-500/85 text-white backdrop-blur-sm">
              <CheckCircle2 size={44} />
              <p className="text-sm font-semibold">¡Código detectado!</p>
            </div>
          )}

          {/* Controles (cámara / linterna) */}
          {status === 'scanning' && (
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3">
              {cameras.length > 1 && (
                <button
                  onClick={switchCamera}
                  className="inline-flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-black/60 transition"
                  aria-label="Cambiar de cámara"
                >
                  <SwitchCamera size={16} /> Cambiar cámara
                </button>
              )}
              {hasFlash && (
                <button
                  onClick={toggleFlash}
                  className="inline-flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-black/60 transition"
                  aria-label={flashOn ? 'Apagar linterna' : 'Encender linterna'}
                >
                  {flashOn ? <ZapOff size={16} /> : <Zap size={16} />}
                  {flashOn ? 'Apagar luz' : 'Linterna'}
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500">
          {status === 'scanning'
            ? 'Centra el QR dentro del marco. Lo validaremos automáticamente.'
            : status === 'error'
              ? 'Si la cámara no está disponible, cierra esta ventana y usa el código corto.'
              : 'Tu privacidad: el video se procesa en tu dispositivo, no se sube a ningún servidor.'}
        </p>
      </div>
    </ModalShell>
  );
};

export default QrScannerModal;
