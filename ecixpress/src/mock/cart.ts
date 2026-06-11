import type { CartProduct } from '../types/cart';

export const mockCartProducts: CartProduct[] = [
  {
    id: 1,
    name: 'Combo Hamburguesa',
    description: 'Hamburguesa con papas y gaseosa',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&auto=format&fit=crop',
    price: 15000,
    quantity: 1
  },
  {
    id: 2,
    name: 'Té Hatsu',
    description: 'Té verde con limón',
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=200&auto=format&fit=crop',
    price: 5000,
    quantity: 2
  },
  {
    id: 3,
    name: 'Chicles Trident',
    description: 'Paquete de chicles menta',
    imageUrl: 'https://images.unsplash.com/photo-1589496933738-9c4f9b6c5a6a?w=200&auto=format&fit=crop',
    price: 2500,
    quantity: 1
  }
];

// Función para obtener productos del carrito (mock)
// En producción, esto sería una llamada a la API
export const getCartProducts = async (): Promise<CartProduct[]> => {
  // Simular delay de red
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockCartProducts;
};

// Función para actualizar cantidad (mock)
export const updateCartItemQuantity = async (id: number, quantity: number): Promise<CartProduct[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockCartProducts.map(product =>
    product.id === id ? { ...product, quantity } : product
  );
};

// Función para eliminar item del carrito (mock)
export const removeCartItem = async (id: number): Promise<CartProduct[]> => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockCartProducts.filter(product => product.id !== id);
};
