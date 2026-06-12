import { mockStores } from './stores';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  avatar: string;
  balance: number;
  ordersCount: number;
  rating: number;
  memberSince: string;
}

export interface OrderItem {
  productId: number;
  productName: string;
  productImage: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  date: string;
  storeId: number;
  storeName: string;
  storeImage: string;
  items: OrderItem[];
  total: number;
  status: 'completed' | 'pending' | 'cancelled';
}

export const mockUserProfile: UserProfile = {
  id: 1,
  name: 'Juan Pérez',
  email: 'juan.perez@email.com',
  phone: '+57 300 123 4567',
  location: 'Bogotá, Colombia',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop',
  balance: 125.50,
  ordersCount: 24,
  rating: 4.8,
  memberSince: 'Enero 2024',
};

export const mockOrderHistory: Order[] = [
  {
    id: 'ORD-001',
    date: '10 Jun 2026',
    storeId: 1,
    storeName: 'Café Central',
    storeImage: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop',
    items: [
      {
        productId: 1,
        productName: 'Cappuccino Italiano',
        productImage: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&auto=format&fit=crop',
        quantity: 2,
        price: 4.50,
      },
      {
        productId: 2,
        productName: 'Croissant de Almendra',
        productImage: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop',
        quantity: 1,
        price: 3.75,
      },
    ],
    total: 12.75,
    status: 'completed',
  },
  {
    id: 'ORD-002',
    date: '8 Jun 2026',
    storeId: 2,
    storeName: 'Pastelería Dulce',
    storeImage: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop',
    items: [
      {
        productId: 5,
        productName: 'Tarta de Chocolate',
        productImage: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop',
        quantity: 1,
        price: 6.50,
      },
    ],
    total: 6.50,
    status: 'completed',
  },
  {
    id: 'ORD-003',
    date: '5 Jun 2026',
    storeId: 3,
    storeName: 'Sandwich Express',
    storeImage: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop',
    items: [
      {
        productId: 8,
        productName: 'Sandwich Club',
        productImage: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop',
        quantity: 2,
        price: 8.50,
      },
      {
        productId: 9,
        productName: 'Bagel de Salmón',
        productImage: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=400&auto=format&fit=crop',
        quantity: 1,
        price: 9.00,
      },
      {
        productId: 10,
        productName: 'Wrap Mediterráneo',
        productImage: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&auto=format&fit=crop',
        quantity: 2,
        price: 7.75,
      },
    ],
    total: 41.50,
    status: 'pending',
  },
  {
    id: 'ORD-004',
    date: '2 Jun 2026',
    storeId: 4,
    storeName: 'Pizza Hut',
    storeImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop',
    items: [
      {
        productId: 11,
        productName: 'Pizza Pepperoni',
        productImage: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&auto=format&fit=crop',
        quantity: 1,
        price: 12.00,
      },
    ],
    total: 12.00,
    status: 'cancelled',
  },
  {
    id: 'ORD-005',
    date: '28 May 2026',
    storeId: 5,
    storeName: 'Burger King',
    storeImage: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&auto=format&fit=crop',
    items: [
      {
        productId: 14,
        productName: 'Whopper',
        productImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop',
        quantity: 2,
        price: 8.99,
      },
      {
        productId: 16,
        productName: 'Papas Fritas',
        productImage: 'https://images.unsplash.com/photo-1573080496987-a199f8cd75c9?w=400&auto=format&fit=crop',
        quantity: 2,
        price: 2.99,
      },
    ],
    total: 23.96,
    status: 'completed',
  },
];
