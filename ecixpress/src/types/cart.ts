export interface CartProduct {
  id: number;
  name: string;
  description?: string;
  imageUrl: string;
  price: number;
  quantity: number;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  total: number;
}

export interface CartItem extends CartProduct {
  // Puedes agregar propiedades adicionales específicas del item de carrito
}
