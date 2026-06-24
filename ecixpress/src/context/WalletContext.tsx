import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationsContext';
import {
  getWallet,
  getDefaultPaymentMethod,
  setDefaultPaymentMethod as persistDefaultMethod,
  isNoWalletError,
  formatCOP,
  type Wallet,
  type TopupPaymentMethod,
} from '../services/financialService';
import WalletRechargeModal from '../components/wallet/WalletRechargeModal';
import WalletHistoryModal from '../components/wallet/WalletHistoryModal';
import PaymentMethodPickerModal from '../components/wallet/PaymentMethodPickerModal';

type ActiveModal = 'recharge' | 'history' | 'method' | null;

interface WalletContextValue {
  userId: string | null;
  wallet: Wallet | null;
  hasWallet: boolean;
  loading: boolean;
  error: string | null;
  balanceLabel: string;
  defaultMethod: TopupPaymentMethod | null;
  chooseDefaultMethod: (m: TopupPaymentMethod) => void;
  refresh: () => Promise<void>;
  openRecharge: () => void;
  openHistory: () => void;
  openMethodPicker: () => void;
  closeModal: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

/**
 * Tipos de notificación en vivo que cambian el saldo de la billetera. Al recibir
 * cualquiera de ellos por el socket, refrescamos el saldo para reflejarlo al instante
 * sin que el usuario tenga que abrir un modal o cambiar de método.
 */
const BALANCE_AFFECTING_EVENTS = new Set([
  'wallet.topup_approved', // recarga acreditada (+)
  'payment.processed', // pago de un pedido debitado (−)
  'order.confirmed', // pedido pagado y confirmado (−)
  'refund.issued', // reembolso reintegrado (+)
]);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { userProfile } = useAuth();
  const { liveEvent } = useNotifications();
  const userId = userProfile?.id ?? null;

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [hasWallet, setHasWallet] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultMethod, setDefaultMethod] = useState<TopupPaymentMethod | null>(
    null,
  );
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getWallet(userId);
      setWallet(data);
      setHasWallet(true);
    } catch (err) {
      if (isNoWalletError(err)) {
        setHasWallet(false);
        setWallet(null);
      } else {
        setError(
          err instanceof Error ? err.message : 'No se pudo cargar la billetera',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Cargar saldo y método por defecto cuando hay usuario.
  useEffect(() => {
    if (!userId) {
      setWallet(null);
      setDefaultMethod(null);
      return;
    }
    setDefaultMethod(getDefaultPaymentMethod(userId));
    void refresh();
  }, [userId, refresh]);

  // Refrescar el saldo en cuanto llega una notificación en vivo que lo cambia (recarga
  // aprobada, débito por pago de un pedido, reembolso). Así el saldo se actualiza solo,
  // junto con la notificación, sin que el usuario tenga que abrir un modal.
  useEffect(() => {
    if (!liveEvent || !userId) return;
    if (BALANCE_AFFECTING_EVENTS.has(liveEvent.type ?? '')) {
      void refresh();
    }
  }, [liveEvent, userId, refresh]);

  const chooseDefaultMethod = useCallback(
    (m: TopupPaymentMethod) => {
      if (!userId) return;
      persistDefaultMethod(userId, m);
      setDefaultMethod(m);
    },
    [userId],
  );

  // Abrir/cerrar refresca el saldo, para reflejar recargas recién acreditadas.
  const closeModal = useCallback(() => {
    setActiveModal(null);
    void refresh();
  }, [refresh]);

  const openRecharge = useCallback(() => {
    setActiveModal('recharge');
    void refresh();
  }, [refresh]);

  const openHistory = useCallback(() => {
    setActiveModal('history');
    void refresh();
  }, [refresh]);

  const openMethodPicker = useCallback(() => setActiveModal('method'), []);

  const value: WalletContextValue = {
    userId,
    wallet,
    hasWallet,
    loading,
    error,
    balanceLabel: formatCOP(wallet?.balance ?? 0),
    defaultMethod,
    chooseDefaultMethod,
    refresh,
    openRecharge,
    openHistory,
    openMethodPicker,
    closeModal,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
      <WalletRechargeModal open={activeModal === 'recharge'} onClose={closeModal} />
      <WalletHistoryModal open={activeModal === 'history'} onClose={closeModal} />
      <PaymentMethodPickerModal
        open={activeModal === 'method'}
        onClose={closeModal}
      />
    </WalletContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWallet = (): WalletContextValue => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
};
