import { useEffect, useRef } from 'react';

/**
 * Refresca (por REST) cuando la pestaña/app recupera foco o visibilidad. El WebSocket de
 * tiempo real se puede quedar "colgado" (sin desconectarse limpio) cuando el navegador
 * suspende la pestaña en segundo plano -- pantalla bloqueada, cambio de app en el celular,
 * minimizar la ventana. Si eso pasa justo cuando cambia el estado de un pedido (pago
 * aprobado, entregado...), el evento en vivo nunca llega y la UI queda desactualizada
 * hasta un refresh manual. Este hook hace ese refresh automáticamente, sin que el usuario
 * tenga que arrastrar para refrescar (mismo problema que soluciona `useRefreshOnScrollTop`,
 * pero disparado por recuperar foco en vez de por gesto).
 */
export function useRefreshOnFocus(onRefresh: () => void | Promise<void>, disabled = false) {
  const refreshRef = useRef(onRefresh);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (disabled) return undefined;

    const handleVisible = () => {
      if (document.visibilityState === 'visible') void refreshRef.current();
    };
    const handleFocus = () => void refreshRef.current();

    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', handleFocus);
    };
  }, [disabled]);
}
