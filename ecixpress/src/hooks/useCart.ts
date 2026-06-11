import { useState, useCallback } from 'react';
import type { CartProduct, CartTotals } from '../types/cart';
import { getCartProducts, updateCartItemQuantity, removeCartItem } from '../mock/cart';

export const useCart = () => {
  const [cartProducts, setCartProducts] = useState<CartProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar productos del carrito
  const loadCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const products = await getCartProducts();
      setCartProducts(products);
    } catch (err) {
      setError('Error al cargar el carrito');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Actualizar cantidad de un producto
  const updateQuantity = useCallback(async (id: number, quantity: number) => {
    setLoading(true);
    setError(null);
    try {
      const updatedProducts = await updateCartItemQuantity(id, quantity);
      setCartProducts(updatedProducts);
    } catch (err) {
      setError('Error al actualizar cantidad');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Eliminar producto del carrito
  const removeItem = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const updatedProducts = await removeCartItem(id);
      setCartProducts(updatedProducts);
    } catch (err) {
      setError('Error al eliminar producto');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calcular totales
  const calculateTotals = useCallback((): CartTotals => {
    const subtotal = cartProducts.reduce((sum, product) => sum + (product.price * product.quantity), 0);
    const discount = 0; // Se puede agregar lógica de descuentos
    const total = subtotal - discount;
    return { subtotal, discount, total };
  }, [cartProducts]);

  // Limpiar el carrito
  const clearCart = useCallback(() => {
    setCartProducts([]);
  }, []);

  return {
    cartProducts,
    loading,
    error,
    loadCart,
    updateQuantity,
    removeItem,
    calculateTotals,
    clearCart
  };
};
