import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Minus, ShoppingCart, Loader2, ImageOff, X } from 'lucide-react';
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
  // Cuenta las mutaciones de carrito en vuelo (no un booleano: con clics rápidos en
  // distintos productos puede haber varias a la vez, y la primera en resolver no debe
  // "liberar" el carrito mientras otra sigue pendiente).
  const [pendingMutations, setPendingMutations] = useState(0);
  const busy = pendingMutations > 0;
  const [checkingOut, setCheckingOut] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const creatingDraft = useRef(false);
  // Cadena de mutaciones de carrito: cada `changeQuantity` se encola tras la anterior en
  // vez de dispararse en paralelo. orders-service hace lectura-modificación-escritura del
  // array de items sin bloqueo optimista; dos PUT concurrentes pueden pisarse entre sí
  // (lost update) y perder el producto agregado primero. Checkout espera esta cadena
  // antes de cerrar la orden, para no confirmarla con una mutación todavía en vuelo.
  const mutationChain = useRef<Promise<void>>(Promise.resolve());

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
  const refreshOrder = async (id: string): Promise<OrderResponse | null> => {
    try {
      const fresh = await api.getOrderById(id);
      setOrder(fresh);
      return fresh;
    } catch {
      /* el broadcast de products puede tardar; se reintenta en la siguiente acción */
      return null;
    }
  };

  /** ¿Esta orden ya tiene cotización autoritativa (precio real) para todas sus líneas? */
  const isOrderFullyQuoted = (fresh: OrderResponse): boolean =>
    fresh.items.length > 0 && fresh.items.every((item) => item.unitPrice > 0);

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

  /** Unidades disponibles para vender: stock físico menos lo ya reservado por otros carritos. */
  const availableStock = (product: Product): number => Math.max(0, product.stock - product.reservedStock);

  const changeQuantity = (product: Product, nextQty: number): void => {
    const available = availableStock(product);
    if (nextQty > available) {
      toast.error(available > 0 ? `Solo quedan ${available} unidades de ${product.name}` : `${product.name} está agotado`);
    }
    const qty = Math.max(0, Math.min(nextQty, available));
    // Optimista: refleja el cambio en la UI de inmediato; la llamada de red se encola.
    setQuantities((prev) => {
      const copy = { ...prev };
      if (qty === 0) delete copy[product.id];
      else copy[product.id] = qty;
      return copy;
    });
    setPendingMutations((n) => n + 1);
    mutationChain.current = mutationChain.current
      .then(async () => {
        const id = await ensureDraft();
        if (!id) return;
        await api.setCartItem(id, {
          productId: product.id,
          quantity: qty,
          name: product.name,
          imageUrl: product.imageUrl ?? undefined,
        });
        // products cotiza de forma asíncrona; refrescamos para tomar el total real.
        setTimeout(() => void refreshOrder(id), 900);
      })
      .catch((e: unknown) => {
        toast.error((e as Error).message || 'No se pudo actualizar el carrito');
      })
      .finally(() => {
        setPendingMutations((n) => n - 1);
      });
  };

  /** Líneas de la orden ya cotizadas por products-service (unitPrice/totalAmount autoritativos), por productId. */
  const quotedByProductId = useMemo(() => {
    const map = new Map<string, OrderResponse['items'][number]>();
    if (order) for (const item of order.items) map.set(item.productId, item);
    return map;
  }, [order]);

  const cartLines = useMemo(
    () =>
      Object.entries(quantities)
        .map(([productId, qty]) => {
          const product = productById.get(productId);
          if (!product) return null;
          const quoted = quotedByProductId.get(productId);
          // Si ya llegó la cotización para esta línea (misma cantidad y precio ya calculado —
          // products-service lo cotiza de forma asíncrona y puede devolver unitPrice 0 mientras
          // tanto), usamos su precio/total autoritativo (con promociones); si no, mostramos el
          // precio de lista como provisional.
          const isLineQuoted = !!quoted && quoted.quantity === qty && quoted.unitPrice > 0;
          const lineUnitPrice = isLineQuoted ? quoted.unitPrice : priceToCents(product.price);
          const lineTotal = isLineQuoted ? quoted.totalAmount : lineUnitPrice * qty;
          return { product, qty, lineUnitPrice, lineTotal, isLineQuoted };
        })
        .filter((x): x is { product: Product; qty: number; lineUnitPrice: number; lineTotal: number; isLineQuoted: boolean } => x !== null),
    [quantities, productById, quotedByProductId],
  );

  // Subtotal con precio de lista (o cotizado por línea cuando ya llegó).
  const provisionalTotal = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.lineTotal, 0),
    [cartLines],
  );
  const itemCount = useMemo(() => cartLines.reduce((sum, { qty }) => sum + qty, 0), [cartLines]);

  // Todas las líneas cotizadas y el conteo de la orden coincide con el carrito local.
  const isQuoted = !!order && order.items.length === cartLines.length && cartLines.every((l) => l.isLineQuoted);
  // Subtotal y total autoritativos solo cuando todo el carrito ya fue cotizado; mientras tanto, provisional.
  const displaySubtotal = isQuoted ? order!.subtotalAmount : provisionalTotal;
  const displayDiscount = isQuoted ? order!.discountAmount : 0;
  const displayTotal = isQuoted ? order!.totalAmount : provisionalTotal;

  const handleCheckout = async () => {
    if (!orderId || itemCount === 0) return;
    setCheckingOut(true);
    try {
      // Espera a que termine de procesarse toda mutación de carrito en vuelo (ej. el
      // usuario agregó un producto justo antes de pagar) para no confirmar sin ese ítem.
      await mutationChain.current;

      // products-service cotiza el carrito de forma asíncrona (evento de ida y vuelta);
      // reintentamos unas cuantas veces antes de cobrar, en vez de fallar con un 409
      // apenas el usuario agregó algo y la cotización todavía no llegó.
      let fresh = await refreshOrder(orderId);
      for (let attempt = 0; attempt < 6 && (!fresh || !isOrderFullyQuoted(fresh)); attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        fresh = await refreshOrder(orderId);
      }
      if (!fresh || !isOrderFullyQuoted(fresh)) {
        toast.error('El carrito todavía se está cotizando, intenta de nuevo en un momento.');
        return;
      }

      await api.checkout(orderId);
      toast.success('Pedido confirmado. Se cobrará de tu billetera.');
      setMobileCartOpen(false);
      navigate('/orders');
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo confirmar el pedido');
    } finally {
      setCheckingOut(false);
    }
  };

  // Resumen de carrito reutilizado por el panel lateral (desktop) y el drawer móvil.
  const cartSummary = (
    <>
      {cartLines.length === 0 ? (
        <div className="py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-3 text-yellow-400">
            <ShoppingCart size={20} />
          </div>
          <p className="text-sm text-gray-400">Añade productos del menú para empezar.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-4 max-h-80 overflow-auto pr-1">
            {cartLines.map(({ product, qty, lineUnitPrice, lineTotal }) => (
              <li key={product.id} className="flex items-center gap-3 text-sm">
                <div className="w-12 h-12 rounded-xl bg-yellow-50 overflow-hidden flex-shrink-0 flex items-center justify-center text-yellow-300">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <ImageOff size={16} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 font-medium truncate">{product.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{qty} × {formatCOP(lineUnitPrice)}</p>
                </div>
                <span className="text-gray-900 font-semibold whitespace-nowrap">{formatCOP(lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="border-t border-gray-100 pt-3.5 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{formatCOP(displaySubtotal)}</span>
            </div>
            {displayDiscount > 0 && (
              <div className="flex justify-between text-sm font-medium text-green-600">
                <span>Descuento (promos)</span>
                <span>-{formatCOP(displayDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-1">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-lg font-bold text-gray-900">{formatCOP(displayTotal)}</span>
            </div>
            <p className="text-[11px] text-gray-400">
              {isQuoted ? 'Precio final con promociones aplicadas.' : 'Calculando precio final…'}
            </p>
          </div>

          <button
            onClick={handleCheckout}
            disabled={checkingOut || itemCount === 0}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold text-sm shadow-md shadow-yellow-300/50 hover:from-yellow-500 hover:to-yellow-600 hover:shadow-yellow-300/70 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {checkingOut ? <Loader2 size={16} className="animate-spin" /> : null}
            Confirmar y pagar
          </button>
        </>
      )}
    </>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Catálogo */}
      <div className="lg:col-span-2 space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto por nombre…"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white border border-gray-100 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300"
          />
        </div>

        {/* Filtro por categoría */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-thin">
            <button
              onClick={() => setCategoryId('')}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition ${categoryId === '' ? 'bg-yellow-400 text-white shadow-sm shadow-yellow-300/50' : 'bg-white text-gray-600 border border-gray-100 hover:bg-yellow-50'}`}
            >
              Todas
            </button>
            {categories.filter((c) => c.isActive).map((c) => (
              <button
                key={c.id}
                onClick={() => { setCategoryId(c.id); setSearch(''); }}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition ${categoryId === c.id ? 'bg-yellow-400 text-white shadow-sm shadow-yellow-300/50' : 'bg-white text-gray-600 border border-gray-100 hover:bg-yellow-50'}`}
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
              const available = availableStock(product);
              const outOfStock = available <= 0;
              const lowStock = !outOfStock && available <= product.minStock && product.minStock > 0;
              const atStockLimit = qty >= available;
              return (
                <div
                  key={product.id}
                  className={`group rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col ${outOfStock ? 'opacity-60' : ''}`}
                >
                  {/* Imagen con badges superpuestos */}
                  <div className="relative h-32 bg-gradient-to-br from-yellow-50 to-yellow-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-yellow-300">
                        <ShoppingCart size={28} />
                      </div>
                    )}
                    {product.category?.name && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-gray-700 shadow-sm">
                        {product.category.name}
                      </span>
                    )}
                    {outOfStock ? (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-gray-800/90 text-[11px] font-semibold text-white shadow-sm">
                        Agotado
                      </span>
                    ) : lowStock ? (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-red-500/90 text-[11px] font-semibold text-white shadow-sm">
                        Quedan {available}
                      </span>
                    ) : null}
                    {/* Botón flotante de añadir, anclado al borde inferior de la imagen */}
                    {qty === 0 && (
                      <button
                        disabled={busy || outOfStock}
                        onClick={() => changeQuantity(product, 1)}
                        className="absolute -bottom-4 right-3 w-9 h-9 rounded-full bg-yellow-400 text-white flex items-center justify-center shadow-lg shadow-yellow-400/50 hover:bg-yellow-500 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <Plus size={18} />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col p-3.5 pt-4">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h4>
                    {product.description ? (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 flex-1">{product.description}</p>
                    ) : (
                      <div className="flex-1" />
                    )}
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">{formatCOP(priceToCents(product.price))}</span>
                      {qty > 0 && (
                        <div className="flex items-center gap-2">
                          <button disabled={busy} onClick={() => changeQuantity(product, qty - 1)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50">
                            <Minus size={14} />
                          </button>
                          <span className="w-5 text-center text-sm font-semibold">{qty}</span>
                          <button
                            disabled={busy || atStockLimit}
                            title={atStockLimit ? `Solo quedan ${available} unidades` : undefined}
                            onClick={() => changeQuantity(product, qty + 1)}
                            className="w-7 h-7 rounded-full bg-yellow-400 text-white flex items-center justify-center hover:bg-yellow-500 disabled:opacity-50"
                          >
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

      {/* Carrito — panel lateral en desktop */}
      <aside className="hidden lg:block lg:col-span-1">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 sticky top-6 space-y-5">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-yellow-500" />
            <h3 className="font-bold text-gray-900">Tu carrito</h3>
            {itemCount > 0 && <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">{itemCount}</span>}
          </div>
          {cartSummary}
        </div>
      </aside>

      {/* Carrito — barra flotante + drawer en mobile/tablet */}
      {itemCount > 0 && (
        <button
          onClick={() => setMobileCartOpen(true)}
          className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-xl shadow-yellow-400/40 max-w-[calc(100%-2rem)]"
        >
          <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/25">
            <ShoppingCart size={17} />
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-[11px] font-bold flex items-center justify-center text-yellow-600 shadow-sm">{itemCount}</span>
          </span>
          <span className="text-sm font-semibold truncate">Ver carrito</span>
          <span className="text-sm font-bold whitespace-nowrap ml-auto">{formatCOP(displayTotal)}</span>
        </button>
      )}

      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileCartOpen(false)} />
          <div className="relative bg-white rounded-t-3xl p-5 pb-6 max-h-[85vh] overflow-auto space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-yellow-500" />
              <h3 className="font-bold text-gray-900">Tu carrito</h3>
              {itemCount > 0 && <span className="ml-auto text-xs bg-yellow-100 text-yellow-700 font-semibold px-2 py-0.5 rounded-full">{itemCount}</span>}
              <button onClick={() => setMobileCartOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                <X size={16} />
              </button>
            </div>
            {cartSummary}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreCatalogCart;
