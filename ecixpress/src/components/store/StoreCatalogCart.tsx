import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Minus, ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOrdersApi } from '../../hooks/useOrdersApi';
import { productsApi, priceToCents, type Product, type ProductCategory } from '../../lib/products-api';
import type { OrderResponse } from '../../lib/orders-api';
import { formatCOP } from '../../lib/format';

interface StoreCatalogCartProps {
  storeId: string;
  storeName: string;
}

/**
 * Catálogo de la tienda + carrito en vivo. El carrito es una orden DRAFT en
 * orders-service; products-service cotiza el precio final (con promociones) de forma
 * asíncrona, por lo que tras cada cambio refrescamos la orden para mostrar el total
 * autoritativo. Mientras llega, mostramos un total provisional con el precio de lista.
 */
const StoreCatalogCart: React.FC<StoreCatalogCartProps> = ({ storeId, storeName }) => {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const api = useOrdersApi();

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const creatingDraft = useRef(false);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  // Cargar categorías una vez.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await getToken().catch(() => null);
        const cats = await productsApi.getCategories(storeId, token);
        if (active) setCategories(cats);
      } catch {
        /* sin categorías: el filtro simplemente no aparece */
      }
    })();
    return () => { active = false; };
  }, [storeId, getToken]);

  // Cargar productos según filtros (categoría / búsqueda).
  useEffect(() => {
    let active = true;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const token = await getToken().catch(() => null);
        const list = await productsApi.getProducts(storeId, { categoryId: categoryId || undefined, search: search.trim() || undefined }, token);
        if (active) setProducts(list);
      } catch {
        if (active) setProducts([]);
        toast.error('No se pudieron cargar los productos');
      } finally {
        if (active) setLoading(false);
      }
    }, search ? 300 : 0); // pequeño debounce para la búsqueda por nombre
    return () => { active = false; clearTimeout(handle); };
  }, [storeId, categoryId, search, getToken]);

  /** Refresca la orden para tomar el total autoritativo que cotizó products. */
  const refreshOrder = async (id: string) => {
    try {
      const fresh = await api.getOrderById(id);
      setOrder(fresh);
    } catch {
      /* el broadcast de products puede tardar; se reintenta en la siguiente acción */
    }
  };

  /** Crea el carrito DRAFT la primera vez que se agrega un producto. */
  const ensureDraft = async (): Promise<string | null> => {
    if (orderId) return orderId;
    if (creatingDraft.current) return null;
    creatingDraft.current = true;
    try {
      const draft = await api.createDraft({
        storeId,
        storeName,
        paymentMethod: 'wallet',
        deliveryMethod: 'pickup',
        currency: 'COP',
      });
      setOrderId(draft.id);
      setOrder(draft);
      return draft.id;
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo iniciar el carrito');
      return null;
    } finally {
      creatingDraft.current = false;
    }
  };

  const changeQuantity = async (product: Product, nextQty: number) => {
    const qty = Math.max(0, nextQty);
    setBusy(true);
    try {
      const id = await ensureDraft();
      if (!id) return;
      setQuantities((prev) => {
        const copy = { ...prev };
        if (qty === 0) delete copy[product.id];
        else copy[product.id] = qty;
        return copy;
      });
      await api.setCartItem(id, {
        productId: product.id,
        quantity: qty,
        name: product.name,
        imageUrl: product.imageUrl ?? undefined,
      });
      // products cotiza de forma asíncrona; refrescamos para tomar el total real.
      setTimeout(() => void refreshOrder(id), 900);
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo actualizar el carrito');
    } finally {
      setBusy(false);
    }
  };

  const cartLines = useMemo(
    () =>
      Object.entries(quantities)
        .map(([productId, qty]) => {
          const product = productById.get(productId);
          return product ? { product, qty } : null;
        })
        .filter((x): x is { product: Product; qty: number } => x !== null),
    [quantities, productById],
  );

  // Total provisional con precio de lista (mientras products cotiza con promociones).
  const provisionalTotal = useMemo(
    () => cartLines.reduce((sum, { product, qty }) => sum + priceToCents(product.price) * qty, 0),
    [cartLines],
  );
  const itemCount = useMemo(() => cartLines.reduce((sum, { qty }) => sum + qty, 0), [cartLines]);

  // Total autoritativo si ya fue cotizado; si no, el provisional.
  const displayTotal = order && order.totalAmount > 0 ? order.totalAmount : provisionalTotal;
  const isQuoted = !!order && order.totalAmount > 0 && order.items.length === cartLines.length;

  const handleCheckout = async () => {
    if (!orderId || itemCount === 0) return;
    setCheckingOut(true);
    try {
      // Garantiza el total cotizado antes de cobrar.
      await refreshOrder(orderId);
      await api.checkout(orderId);
      toast.success('Pedido confirmado. Se cobrará de tu billetera.');
      navigate('/orders');
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo confirmar el pedido');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Catálogo */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto por nombre…"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/70 border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
          </div>
        </div>

        {/* Filtro por categoría */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryId('')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${categoryId === '' ? 'bg-yellow-400 text-white' : 'bg-white/60 text-gray-600 hover:bg-yellow-50'}`}
            >
              Todas
            </button>
            {categories.filter((c) => c.isActive).map((c) => (
              <button
                key={c.id}
                onClick={() => { setCategoryId(c.id); setSearch(''); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${categoryId === c.id ? 'bg-yellow-400 text-white' : 'bg-white/60 text-gray-600 hover:bg-yellow-50'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-yellow-400" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">No hay productos para mostrar.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map((product) => {
              const qty = quantities[product.id] ?? 0;
              return (
                <div key={product.id} className="flex gap-3 p-3 rounded-2xl bg-white/70 border border-white/40">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-xl object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-400">
                      <ShoppingCart size={20} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h4>
                    {product.description && <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">{formatCOP(priceToCents(product.price))}</span>
                      {qty === 0 ? (
                        <button
                          disabled={busy}
                          onClick={() => changeQuantity(product, 1)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-400 text-white text-sm font-medium hover:bg-yellow-500 disabled:opacity-50"
                        >
                          <Plus size={14} /> Añadir
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button disabled={busy} onClick={() => changeQuantity(product, qty - 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50">
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                          <button disabled={busy} onClick={() => changeQuantity(product, qty + 1)} className="w-7 h-7 rounded-lg bg-yellow-400 text-white flex items-center justify-center hover:bg-yellow-500 disabled:opacity-50">
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Carrito */}
      <aside className="lg:col-span-1">
        <div className="rounded-2xl bg-white/80 border border-white/40 p-5 sticky top-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-yellow-500" />
            <h3 className="font-bold text-gray-900">Tu carrito</h3>
            {itemCount > 0 && <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{itemCount}</span>}
          </div>

          {cartLines.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">Añade productos del menú para empezar.</p>
          ) : (
            <>
              <ul className="space-y-2 max-h-72 overflow-auto">
                {cartLines.map(({ product, qty }) => (
                  <li key={product.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate mr-2">{qty}× {product.name}</span>
                    <span className="text-gray-900 font-medium whitespace-nowrap">{formatCOP(priceToCents(product.price) * qty)}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-gray-100 pt-3 space-y-1">
                {order && order.discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Descuento (promos)</span>
                    <span>-{formatCOP(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatCOP(displayTotal)}</span>
                </div>
                <p className="text-[11px] text-gray-400">
                  {isQuoted ? 'Precio final con promociones aplicadas.' : 'Calculando precio final…'}
                </p>
              </div>

              <button
                onClick={handleCheckout}
                disabled={checkingOut || itemCount === 0}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold text-sm hover:from-yellow-500 hover:to-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checkingOut ? <Loader2 size={16} className="animate-spin" /> : null}
                Confirmar y pagar
              </button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
};

export default StoreCatalogCart;
