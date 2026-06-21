import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ordersApi,
  type CreateDraftRequest,
  type CreateOrderRequest,
  type OrderStatus,
  type ParticipantRole,
  type RequestReturnRequest,
  type UpsertCartItemRequest,
} from '../lib/orders-api';

/**
 * Envuelve ordersApi inyectando el token Firebase del usuario autenticado en
 * cada petición. Las pantallas usan este hook en vez de ordersApi directo.
 */
export function useOrdersApi() {
  const { getToken } = useAuth();

  return useMemo(() => ({
    getOrders: async (params?: { customerId?: string; status?: string }) =>
      ordersApi.getOrders(await getToken(), params),
    getOrderById: async (id: string) => ordersApi.getOrderById(id, await getToken()),
    getHistory: async (customerId?: string) => ordersApi.getHistory(customerId, await getToken()),
    getFrequent: async (customerId?: string) => ordersApi.getFrequent(customerId, await getToken()),
    createOrder: async (payload: CreateOrderRequest) => ordersApi.createOrder(payload, await getToken()),
    createDraft: async (payload: CreateDraftRequest) => ordersApi.createDraft(payload, await getToken()),
    setCartItem: async (orderId: string, payload: UpsertCartItemRequest) =>
      ordersApi.setCartItem(orderId, payload, await getToken()),
    checkout: async (orderId: string) => ordersApi.checkout(orderId, await getToken()),
    requestReturn: async (orderId: string, payload: RequestReturnRequest) =>
      ordersApi.requestReturn(orderId, payload, await getToken()),
    cancelOrder: async (id: string, payload: { actorType?: string; reason?: string }) =>
      ordersApi.cancelOrder(id, payload, await getToken()),
    updateOrderStatus: async (
      id: string,
      payload: { status: OrderStatus; actorType: string; actorId?: string; reason?: string },
    ) => ordersApi.updateOrderStatus(id, payload, await getToken()),
    rateOrder: async (id: string, payload: { score: number; comment?: string }) =>
      ordersApi.rateOrder(id, payload, await getToken()),
    getConversations: async (params?: { orderId?: string; customerId?: string }) =>
      ordersApi.getConversations(await getToken(), params),
    getConversationById: async (id: string) => ordersApi.getConversationById(id, await getToken()),
    getMessages: async (conversationId: string) => ordersApi.getMessages(conversationId, await getToken()),
    sendMessage: async (payload: { conversationId: string; senderRole: ParticipantRole; content: string }) =>
      ordersApi.sendMessage(payload, await getToken()),
    setTyping: async (payload: { conversationId: string; role: ParticipantRole; typing: boolean }) =>
      ordersApi.setTyping(payload, await getToken()),
  }), [getToken]);
}
