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
  productId: number;
  name: string;
  description?: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
}

export interface CreateOrderRequest {
  customerId: string;
  storeId: number;
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
  productId: number;
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
  storeId: number;
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
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
}

export interface ConversationParticipant {
  conversationId: string;
  userId: string;
  role: 'customer' | 'vendor' | 'support' | 'system';
  joinedAt: string;
  leftAt?: string;
  lastReadAt?: string;
  unreadCount: number;
  typing: boolean;
}

export interface ConversationResponse {
  id: string;
  orderId: string;
  storeId: number;
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
  senderRole: 'customer' | 'vendor' | 'support' | 'system';
  content: string;
  messageType: 'text' | 'system' | 'status-update';
  status: 'sent' | 'delivered' | 'read' | 'deleted';
  readStatuses: MessageReadStatus[];
  createdAt: string;
  updatedAt: string;
}

export interface FrequentProduct {
  productId: number;
  name: string;
  imageUrl?: string;
  totalOrders: number;
}

export interface OrdersHistoryResponse {
  items: OrderResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MessagesResponse {
  items: MessageResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export const ORDERS_API_BASE_URL = import.meta.env.VITE_ORDERS_SERVICE_URL ?? 'http://localhost:3000';

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${ORDERS_API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const fallbackMessage = `Request failed with status ${response.status}`;
    let message = fallbackMessage;

    try {
      const payload = await response.json() as { message?: string | string[] };
      if (Array.isArray(payload.message)) {
        message = payload.message.join(', ');
      } else if (payload.message) {
        message = payload.message;
      }
    } catch {
      try {
        const text = await response.text();
        if (text) {
          message = text;
        }
      } catch {
        // keep fallback
      }
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const ordersApi = {
  health: async () => requestJson<{ status: string; service: string; timestamp: string }>('/health'),
  createOrder: async (payload: CreateOrderRequest) => requestJson<OrderResponse>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getOrders: async () => requestJson<OrderResponse[]>('/orders'),
  getOrderById: async (id: string) => requestJson<OrderResponse>(`/orders/${id}`),
  updateOrderStatus: async (id: string, payload: { status: OrderStatus; actorType: string; actorId?: string; reason?: string }) =>
    requestJson<OrderResponse>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  cancelOrder: async (id: string, payload: { actorType: string; actorId?: string; reason?: string }) =>
    requestJson<OrderResponse>(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  rateOrder: async (id: string, payload: { customerId: string; score: number; comment?: string }) =>
    requestJson<OrderResponse>(`/orders/${id}/rating`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getHistory: async (customerId?: string) => {
    const query = customerId ? `?customerId=${encodeURIComponent(customerId)}` : '';
    return requestJson<OrderResponse[]>(`/orders/history${query}`);
  },
  getFrequent: async (customerId?: string) => {
    const query = customerId ? `?customerId=${encodeURIComponent(customerId)}` : '';
    return requestJson<FrequentProduct[]>(`/orders/frequent${query}`);
  },
  getConversations: async (customerId?: string) => {
    const query = customerId ? `?customerId=${encodeURIComponent(customerId)}` : '';
    return requestJson<ConversationResponse[]>(`/conversations${query}`);
  },
  getConversationById: async (id: string) => requestJson<ConversationResponse>(`/conversations/${id}`),
  getMessages: async (conversationId: string) => {
    const query = `?conversationId=${encodeURIComponent(conversationId)}`;
    return requestJson<MessagesResponse>(`/messages${query}`);
  },
  sendMessage: async (payload: { conversationId: string; senderId: string; senderRole: 'customer' | 'vendor' | 'support' | 'system'; content: string }) =>
    requestJson<MessageResponse>('/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  markMessageRead: async (payload: { conversationId: string; messageId: string; participantId: string }) =>
    requestJson<MessageResponse>('/messages/read', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  setTyping: async (payload: { conversationId: string; userId: string; role: 'customer' | 'vendor' | 'support' | 'system'; typing: boolean }) =>
    requestJson<void>('/messages/typing', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};