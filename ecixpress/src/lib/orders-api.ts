export type OrderStatus =
  | 'CREATED'
  | 'PENDING_PAYMENT'
  | 'PAYMENT_APPROVED'
  | 'CONFIRMED'
  | 'IN_PREPARATION'
  | 'READY_FOR_PICKUP'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

export interface OrderItemInput {
  productId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  unitPrice: number; // centavos COP
  quantity: number;
}

export interface CreateOrderRequest {
  storeId: string;
  storeName: string;
  items: OrderItemInput[];
  paymentMethod: 'cash' | 'wallet' | 'card' | 'transfer';
  deliveryMethod: 'pickup' | 'delivery';
  currency: string;
  notes?: string;
  source?: 'web' | 'mobile' | 'admin';
  discountAmount?: number;
}

export interface OrderHistoryItem {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorType: string;
  actorId?: string;
  reason?: string;
  occurredAt: string;
}

export interface OrderRating {
  id: string;
  orderId: string;
  customerId: string;
  score: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemResponse {
  id: string;
  productId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  customerId: string;
  storeId: string;
  storeName: string;
  status: OrderStatus;
  paymentMethod: 'cash' | 'wallet' | 'card' | 'transfer';
  deliveryMethod: 'pickup' | 'delivery';
  currency: string;
  source: 'web' | 'mobile' | 'admin';
  notes?: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  items: OrderItemResponse[];
  statusHistory: OrderHistoryItem[];
  rating?: OrderRating;
  pickupExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
}

export type ParticipantRole = 'customer' | 'vendor' | 'support' | 'system';

export interface ConversationParticipant {
  conversationId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: string;
  leftAt?: string;
  lastReadAt?: string;
  unreadCount: number;
  typing: boolean;
}

export interface ConversationResponse {
  id: string;
  orderId: string;
  storeId: string;
  customerId: string;
  vendorId: string;
  status: 'active' | 'archived' | 'closed';
  participants: ConversationParticipant[];
  lastMessageAt?: string;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageReadStatus {
  messageId: string;
  participantId: string;
  readAt: string;
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: ParticipantRole;
  content: string;
  messageType: 'text' | 'system' | 'status-update';
  status: 'sent' | 'delivered' | 'read' | 'deleted';
  readStatuses: MessageReadStatus[];
  createdAt: string;
  updatedAt: string;
}

export interface FrequentProduct {
  productId: string;
  name: string;
  imageUrl?: string;
  totalOrders: number;
}

export interface MessagesResponse {
  items: MessageResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export const ORDERS_API_BASE_URL = import.meta.env.VITE_ORDERS_SERVICE_URL ?? 'http://localhost:3000';

async function requestJson<T>(path: string, token?: string | null, init?: RequestInit): Promise<T> {
  const response = await fetch(`${ORDERS_API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(payload.message)) message = payload.message.join(', ');
      else if (payload.message) message = payload.message;
    } catch {
      /* keep fallback */
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as Promise<T>;
}

/**
 * Cliente REST del microservicio Order & Communication. Cada método recibe el
 * token Firebase (lo inyecta el hook useOrdersApi a partir de useAuth).
 */
export const ordersApi = {
  health: () => requestJson<{ status: string; service: string; timestamp: string }>('/health'),

  createOrder: (payload: CreateOrderRequest, token?: string | null) =>
    requestJson<OrderResponse>('/orders', token, { method: 'POST', body: JSON.stringify(payload) }),

  getOrders: (token?: string | null, params?: { customerId?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.customerId) q.set('customerId', params.customerId);
    if (params?.status) q.set('status', params.status);
    const qs = q.toString();
    return requestJson<OrderResponse[]>(`/orders${qs ? `?${qs}` : ''}`, token);
  },

  getOrderById: (id: string, token?: string | null) => requestJson<OrderResponse>(`/orders/${id}`, token),

  getHistory: (customerId: string | undefined, token?: string | null) => {
    const qs = customerId ? `?customerId=${encodeURIComponent(customerId)}` : '';
    return requestJson<OrderResponse[]>(`/orders/history${qs}`, token);
  },

  getFrequent: (customerId: string | undefined, token?: string | null) => {
    const qs = customerId ? `?customerId=${encodeURIComponent(customerId)}` : '';
    return requestJson<FrequentProduct[]>(`/orders/frequent${qs}`, token);
  },

  updateOrderStatus: (
    id: string,
    payload: { status: OrderStatus; actorType: string; actorId?: string; reason?: string },
    token?: string | null,
  ) => requestJson<OrderResponse>(`/orders/${id}/status`, token, { method: 'PATCH', body: JSON.stringify(payload) }),

  cancelOrder: (id: string, payload: { actorType?: string; reason?: string }, token?: string | null) =>
    requestJson<OrderResponse>(`/orders/${id}/cancel`, token, { method: 'POST', body: JSON.stringify(payload) }),

  rateOrder: (id: string, payload: { score: number; comment?: string }, token?: string | null) =>
    requestJson<OrderResponse>(`/orders/${id}/rating`, token, { method: 'POST', body: JSON.stringify(payload) }),

  getConversations: (token?: string | null, params?: { orderId?: string; customerId?: string }) => {
    const q = new URLSearchParams();
    if (params?.orderId) q.set('orderId', params.orderId);
    if (params?.customerId) q.set('customerId', params.customerId);
    const qs = q.toString();
    return requestJson<ConversationResponse[]>(`/conversations${qs ? `?${qs}` : ''}`, token);
  },

  getConversationById: (id: string, token?: string | null) =>
    requestJson<ConversationResponse>(`/conversations/${id}`, token),

  getMessages: (conversationId: string, token?: string | null) =>
    requestJson<MessagesResponse>(`/messages?conversationId=${encodeURIComponent(conversationId)}`, token),

  sendMessage: (
    payload: { conversationId: string; senderRole: ParticipantRole; content: string },
    token?: string | null,
  ) => requestJson<MessageResponse>('/messages', token, { method: 'POST', body: JSON.stringify(payload) }),

  setTyping: (
    payload: { conversationId: string; role: ParticipantRole; typing: boolean },
    token?: string | null,
  ) => requestJson<void>('/messages/typing', token, { method: 'POST', body: JSON.stringify(payload) }),
};
