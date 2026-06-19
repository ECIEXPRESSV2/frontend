import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fulfillmentApi,
  type DeliveryFailureReason,
  type FulfillmentIdentity,
  type StoreDeliveriesQuery,
} from '../lib/fulfillment-api';

/**
 * Envuelve `fulfillmentApi` inyectando la identidad del usuario autenticado como los headers
 * `x-user-*` que Fulfillment espera del gateway. El rol se deriva del perfil:
 * ADMIN > VENDOR > CUSTOMER. Las pantallas usan este hook, no `fulfillmentApi` directo.
 */
export function useFulfillmentApi() {
  const { userProfile, isAdmin, isVendor } = useAuth();

  return useMemo(() => {
    const identity = (): FulfillmentIdentity => ({
      userId: userProfile?.id ?? '',
      role: isAdmin() ? 'ADMIN' : isVendor() ? 'VENDOR' : 'CUSTOMER',
    });

    return {
      /** Identidad actual (útil para comparar contra buyerId, etc.). */
      identity,
      getOrderCode: (orderId: string) => fulfillmentApi.getOrderCode(orderId, identity()),
      validateCode: (code: string) => fulfillmentApi.validateCode(code, identity()),
      confirmCode: (code: string) => fulfillmentApi.confirmCode(code, identity()),
      manualDelivery: (orderId: string, body: { reason: string; note?: string }) =>
        fulfillmentApi.manualDelivery(orderId, body, identity()),
      deliveryFailure: (orderId: string, body: { reason: DeliveryFailureReason; note?: string }) =>
        fulfillmentApi.deliveryFailure(orderId, body, identity()),
      getFulfillmentStatus: (orderId: string) =>
        fulfillmentApi.getFulfillmentStatus(orderId, identity()),
      getStoreDeliveries: (storeId: string, query: StoreDeliveriesQuery) =>
        fulfillmentApi.getStoreDeliveries(storeId, query, identity()),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id, userProfile?.roles]);
}
