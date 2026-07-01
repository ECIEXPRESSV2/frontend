import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Minus, ShoppingCart, Loader2, ImageOff, X, Tag, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOrdersApi } from '../../hooks/useOrdersApi';
import { productsApi, priceToCents, type Product, type ProductCategory } from '../../lib/products-api';
import type { OrderResponse } from '../../lib/orders-api';
import { formatCOP } from '../../lib/format';

interface StoreCatalogCartProps {
  storeId: string;
  storeName: string;
}

/** Cuántas fichas de producto se dibujan como máximo dentro de la canasta del carrito. */
const CART_VISUAL_SLOTS = 12;

/**
 * Posiciones aleatorias (no un patrón de rejilla) para las fichas dentro de la canasta.
 * Se generan una sola vez al cargar el módulo — fuera del render — así son verdaderamente al
 * azar y a la vez estables: las fichas ya colocadas no saltan cuando se agregan más productos.
 */
const CART_SCATTER = Array.from({ length: CART_VISUAL_SLOTS }, () => ({
  u: Math.random(),
  jy: Math.random(),
  rot: Math.random() * 2 - 1,
}));

/**
 * Catálogo de la tienda + carrito en vivo. El carrito es una orden DRAFT en
 * orders-service; products-service cotiza el precio final (con promociones) de forma
 * asíncrona, por lo que tras cada cambio refrescamos la orden para mostrar el total
 * autoritativo. Mientras llega, mostramos un total provisional con el precio de lista.
 */
const StoreCatalogCart: React.FC<StoreCatalogCartProps> = ({ storeId, storeName }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeDraftId = searchParams.get('draft');
  const { getToken } = useAuth();
  const api = useOrdersApi();

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  // Categorías aplicadas al filtro (multi-selección). Vacío = sin filtro (se muestran todos los productos).
  const [appliedCategoryIds, setAppliedCategoryIds] = useState<Set<string>>(new Set());
  // Selección en curso dentro del panel, hasta que se confirme con "Ok".
  const [draftCategoryIds, setDraftCategoryIds] = useState<Set<string>>(new Set());
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
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  // Las categorías ya llegan completas del backend (no pagina); el "scroll infinito" del
  // popup es una paginación del lado del cliente para no montar de una vez cientos de
  // botones cuando la tienda tiene muchas categorías.
  const CATEGORY_PAGE_SIZE = 20;
  const [visibleCategoryCount, setVisibleCategoryCount] = useState(CATEGORY_PAGE_SIZE);
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

  const activeCategories = useMemo(() => categories.filter((c) => c.isActive), [categories]);
  const filteredCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    return q ? activeCategories.filter((c) => c.name.toLowerCase().includes(q)) : activeCategories;
  }, [activeCategories, categoryQuery]);
  const visibleCategories = filteredCategories.slice(0, visibleCategoryCount);
  // Sin filtro aplicado o con todas las categorías activas seleccionadas equivale a "Todas".
  const allActiveSelected = activeCategories.length > 0 && activeCategories.every((c) => appliedCategoryIds.has(c.id));
  const categoryFilterLabel = useMemo(() => {
    if (appliedCategoryIds.size === 0 || allActiveSelected) return 'Todas';
    if (appliedCategoryIds.size === 1) {
      const only = activeCategories.find((c) => appliedCategoryIds.has(c.id));
      return only?.name ?? 'Todas';
    }
    return `${appliedCategoryIds.size} categorías`;
  }, [appliedCategoryIds, allActiveSelected, activeCategories]);

  const openCategoryModal = (): void => {
    setCategoryQuery('');
    setVisibleCategoryCount(CATEGORY_PAGE_SIZE);
    setDraftCategoryIds(new Set(appliedCategoryIds));
    setCategoryModalOpen(true);
  };

  const handleCategoryQueryChange = (value: string): void => {
    setCategoryQuery(value);
    setVisibleCategoryCount(CATEGORY_PAGE_SIZE);
  };

  const handleCategoryListScroll = (e: React.UIEvent<HTMLDivElement>): void => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      setVisibleCategoryCount((n) => Math.min(n + CATEGORY_PAGE_SIZE, filteredCategories.length));
    }
  };

  const draftAllSelected = activeCategories.length > 0 && activeCategories.every((c) => draftCategoryIds.has(c.id));

  const toggleCategory = (id: string): void => {
    setDraftCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllCategories = (): void => {
    setDraftCategoryIds(draftAllSelected ? new Set() : new Set(activeCategories.map((c) => c.id)));
  };

  const clearCategorySelection = (): void => setDraftCategoryIds(new Set());

  const confirmCategorySelection = (): void => {
    setAppliedCategoryIds(new Set(draftCategoryIds));
    setSearch('');
    setCategoryModalOpen(false);
  };

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

  // Reanudar un carrito (orden DRAFT) existente al llegar con ?draft=<id> desde "Mis pedidos"
  // o el atajo de carritos del topbar: hidrata el carrito local con sus líneas. El ref evita
  // volver a hidratar (y pisar los cambios del usuario) si el efecto se re-ejecuta.
  const hydratedDraftRef = useRef<string | null>(null);
  useEffect(() => {
    if (!resumeDraftId || hydratedDraftRef.current === resumeDraftId) return;
    let active = true;
    (async () => {
      try {
        const existing = await api.getOrderById(resumeDraftId);
        if (!active || existing.status !== 'DRAFT' || existing.storeId !== storeId) return;
        hydratedDraftRef.current = resumeDraftId;
        setOrderId(existing.id);
        setOrder(existing);
        setQuantities(Object.fromEntries(existing.items.map((it) => [it.productId, it.quantity])));
      } catch {
        /* el draft ya no existe o no es accesible: se empieza uno nuevo */
      }
    })();
    return () => { active = false; };
  }, [resumeDraftId, storeId, api]);

  // Cargar productos según búsqueda. El filtro por categoría (multi-selección) se aplica
  // del lado del cliente porque el backend solo admite una categoría a la vez.
  useEffect(() => {
    let active = true;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const token = await getToken().catch(() => null);
        const list = await productsApi.getProducts(storeId, { search: search.trim() || undefined }, token);
        if (active) setProducts(list);
      } catch {
        if (active) setProducts([]);
        toast.error('No se pudieron cargar los productos');
      } finally {
        if (active) setLoading(false);
      }
    }, search ? 300 : 0); // pequeño debounce para la búsqueda por nombre
    return () => { active = false; clearTimeout(handle); };
  }, [storeId, search, getToken]);

  const displayProducts = useMemo(
    () => (appliedCategoryIds.size === 0 ? products : products.filter((p) => appliedCategoryIds.has(p.categoryId))),
    [products, appliedCategoryIds],
  );

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

  // Una "ficha" por unidad en el carrito (con imagen del producto) para llenar visualmente la
  // canasta del carrito. Se limita para no montar cientos de nodos con carritos grandes.
  const cartSlots = useMemo(() => {
    const slots: Product[] = [];
    for (const { product, qty } of cartLines) {
      for (let i = 0; i < qty && slots.length < CART_VISUAL_SLOTS; i++) slots.push(product);
      if (slots.length >= CART_VISUAL_SLOTS) break;
    }
    return slots;
  }, [cartLines]);

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

  // Carrito ilustrado que se llena con la imagen de cada producto añadido. Se dibuja por capas:
  // los productos van AL FONDO y el carrito ENCIMA (más cerca de la pantalla), de modo que la
  // rejilla "enjaula" a los productos y se perciben dentro de la canasta.
  //
  // TODO (pendiente): en vez de la imagen del producto, mostrar aquí una previsualización del
  // modelo 3D del producto dentro de la canasta (p. ej. un <canvas>/three.js o <model-viewer>
  // por cada ficha). Las "fichas" seguirían apilándose al azar, pero cada una renderizaría el
  // modelo 3D en miniatura en lugar de <img>. Requiere que products-service exponga la URL del
  // modelo (glTF/GLB) por producto y una estrategia de rendimiento (instanciar pocos, o un
  // sprite/thumbnail 3D pre-renderizado) para no montar muchos canvas a la vez.
  const cartVisual = (
    <div className="relative w-full max-w-[15rem] mx-auto aspect-[6/5] select-none">
      {/* Capa trasera: fichas de producto tiradas al azar dentro del trapecio de la canasta,
          recortadas a su forma exacta como red de seguridad para que nunca sobresalgan.
          TODO (pendiente): reemplazar el <img> de cada ficha por la previsualización del modelo
          3D del producto (ver nota de arriba). */}
      <div
        className="absolute inset-0"
        style={{ clipPath: 'polygon(16.67% 38%, 86.67% 26%, 75.83% 66%, 25% 66%)' }}
      >
        {cartSlots.map((p, i) => {
          const s = CART_SCATTER[i] ?? { u: 0.5, jy: 0.5, rot: 0 };
          const perRow = 4;
          const row = Math.floor(i / perRow);
          // Se llena de abajo hacia arriba; cada fila sube ~9 unidades, con algo de ruido.
          const cy = Math.min(61, Math.max(36, 60 - row * 9 + (s.jy - 0.5) * 5));
          // Bordes de la canasta a esa altura (izq: A→D, der: B→C), con margen para el tamaño de la ficha.
          const inset = 7;
          const xLeft = 30 - 10 * ((66 - cy) / 28) + inset;
          const xRight = 91 + 13 * ((66 - cy) / 40) - inset;
          const cx = xLeft + s.u * Math.max(0, xRight - xLeft);
          return (
            <div
              key={`${p.id}-${i}`}
              className="absolute w-6 h-6 rounded-md overflow-hidden bg-yellow-100 ring-1 ring-white shadow-md flex items-center justify-center text-yellow-400"
              style={{ left: `${(cx / 120) * 100}%`, top: `${cy}%`, transform: `translate(-50%, -50%) rotate(${s.rot * 22}deg)`, zIndex: i }}
            >
              {p.imageUrl ? (
                <img src={p.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <ImageOff size={12} />
              )}
            </div>
          );
        })}
      </div>

      {/* Capa frontal: el carrito, con degradado vertical (relieve) y sombra para que "salga" de la pantalla. */}
      <svg viewBox="0 0 120 100" fill="none" className="absolute inset-0 w-full h-full" style={{ filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.28))' }}>
        <defs>
          <linearGradient id="cartRelief" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a4a4a" />
            <stop offset="0.5" stopColor="#232323" />
            <stop offset="1" stopColor="#0b0b0b" />
          </linearGradient>
        </defs>
        <g stroke="url(#cartRelief)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          {/* Canasta */}
          <path d="M20 38 L104 26 L91 66 L30 66 Z" />
          {/* Rejilla vertical */}
          <path d="M36.8 35.6 L42.2 66 M53.6 33.2 L54.4 66 M70.4 30.8 L66.6 66 M87.2 28.4 L78.8 66" strokeWidth="2.6" />
          {/* Rejilla horizontal */}
          <path d="M23.3 47.2 L99.7 39.2 M26.6 56.5 L95.4 52.4" strokeWidth="2.6" />
          {/* Mango */}
          <path d="M104 26 L113 15" />
          {/* Base: patas de la canasta a la barra inferior + frente limpio (sin curvatura sobrante) */}
          <path d="M30 66 L40 76 L88 76 L91 66" />
          <path d="M40 76 L22 76" />
          {/* Ejes de las ruedas */}
          <path d="M44 76 L44 80 M80 76 L80 80" />
        </g>
        {/* Mango (agarradera) y ruedas, rellenos con el mismo relieve */}
        <circle cx="114" cy="12" r="5" fill="url(#cartRelief)" />
        <circle cx="44" cy="86" r="6.5" fill="url(#cartRelief)" />
        <circle cx="80" cy="86" r="6.5" fill="url(#cartRelief)" />
      </svg>
    </div>
  );

  // Resumen de carrito reutilizado por el panel lateral (desktop) y el drawer móvil.
  const cartSummary = cartLines.length === 0 ? (
    <div className="py-2 text-center">
      {cartVisual}
      <p className="text-sm text-gray-400 mt-3">Añade productos del menú para empezar.</p>
    </div>
  ) : (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      {/* Columna izquierda: el carrito que se llena + totales + botón de confirmar y pagar */}
      <div className="space-y-4 rounded-2xl bg-white p-5 shadow-[0_0_22px_rgba(250,204,21,0.28)]">
        <div className="lg:pt-2">{cartVisual}</div>

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
        </div>

        <button
          onClick={handleCheckout}
          disabled={checkingOut || itemCount === 0 || !isQuoted}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold text-sm shadow-md shadow-yellow-300/50 hover:from-yellow-500 hover:to-yellow-600 hover:shadow-yellow-300/70 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {checkingOut ? <Loader2 size={16} className="animate-spin" /> : null}
          Confirmar y pagar
        </button>
      </div>

      {/* Columna derecha: lista de productos (nombre y precio pegados) con scroll */}
      <div className="rounded-2xl bg-white p-5 shadow-[0_0_22px_rgba(250,204,21,0.28)]">
        <ul className="space-y-3 max-h-[26rem] overflow-y-auto pr-1">
          {cartLines.map(({ product, qty, lineUnitPrice, lineTotal }) => (
            <li key={product.id} className="flex items-center gap-3 text-sm">
              <div className="w-12 h-12 rounded-xl bg-yellow-50 overflow-hidden flex-shrink-0 flex items-center justify-center text-yellow-300">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <ImageOff size={16} />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate">
                  <span className="text-gray-800 font-medium">{product.name}</span>{' '}
                  <span className="text-gray-900 font-semibold">{formatCOP(lineTotal)}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{qty} × {formatCOP(lineUnitPrice)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Catálogo: más angosto, una sola columna de productos */}
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

        {/* Filtro por categoría: botón que despliega un panel anclado con búsqueda, multi-selección y scroll infinito */}
        {activeCategories.length > 0 && (
          <div className="relative inline-block">
            <button
              onClick={() => (categoryModalOpen ? setCategoryModalOpen(false) : openCategoryModal())}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-100 shadow-sm text-sm font-medium text-gray-700 hover:bg-yellow-50 transition"
            >
              <Tag size={16} className="text-yellow-500" />
              Categorías
              <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                {categoryFilterLabel}
              </span>
            </button>

            {categoryModalOpen && (
              <>
                {/* Capa invisible para cerrar el panel al hacer clic fuera, sin oscurecer la pantalla (cancela sin aplicar). */}
                <div className="fixed inset-0 z-40" onClick={() => setCategoryModalOpen(false)} />
                <div className="absolute left-0 top-full mt-2 z-50 w-72 max-h-[26rem] flex flex-col rounded-2xl bg-white p-4 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.35),0_2px_6px_rgba(0,0,0,0.08)] ring-1 ring-black/5 border border-white">
                  {/* Realce sutil en el borde superior para el efecto de relieve */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-8 rounded-t-2xl bg-gradient-to-b from-white to-transparent" />

                  <div className="flex items-center gap-2 mb-3">
                    <Tag size={16} className="text-yellow-500" />
                    <h3 className="font-semibold text-gray-900 text-sm">Categorías</h3>
                    <button onClick={() => setCategoryModalOpen(false)} className="ml-auto w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                      <X size={14} />
                    </button>
                  </div>

                  <div className="relative mb-2">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={categoryQuery}
                      onChange={(e) => handleCategoryQueryChange(e.target.value)}
                      placeholder="Buscar categoría…"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300"
                    />
                  </div>

                  <button
                    onClick={toggleAllCategories}
                    className="w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-sm font-semibold text-gray-800 hover:bg-gray-50 transition mb-1.5 pb-2.5 border-b border-gray-100"
                  >
                    <span className={`flex-shrink-0 w-4 h-4 rounded-md border flex items-center justify-center transition ${draftAllSelected ? 'bg-yellow-400 border-yellow-400 text-white' : 'border-gray-300 bg-white'}`}>
                      {draftAllSelected && <Check size={12} strokeWidth={3} />}
                    </span>
                    Todas
                  </button>

                  <div onScroll={handleCategoryListScroll} className="flex-1 overflow-auto space-y-1 pr-1">
                    {visibleCategories.map((c) => {
                      const checked = draftCategoryIds.has(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleCategory(c.id)}
                          className={`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-sm font-medium transition ${checked ? 'bg-yellow-50 text-yellow-700' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          <span className={`flex-shrink-0 w-4 h-4 rounded-md border flex items-center justify-center transition ${checked ? 'bg-yellow-400 border-yellow-400 text-white' : 'border-gray-300 bg-white'}`}>
                            {checked && <Check size={12} strokeWidth={3} />}
                          </span>
                          <span className="truncate">{c.name}</span>
                        </button>
                      );
                    })}
                    {filteredCategories.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-6">No se encontraron categorías.</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 mt-2 border-t border-gray-100">
                    <button
                      onClick={clearCategorySelection}
                      className="flex-1 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                    >
                      Limpiar
                    </button>
                    <button
                      onClick={confirmCategorySelection}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-yellow-400 hover:bg-yellow-500 shadow-sm shadow-yellow-300/50 transition"
                    >
                      Ok
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-yellow-400" />
          </div>
        ) : displayProducts.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">No hay productos para mostrar.</p>
        ) : (
          // TODO (pendiente): permitir agregar productos al carrito por drag & drop, además del
          // botón "+". Mientras se arrastra un producto:
          //   - atenuar/difuminar toda la pantalla (overlay gris o backdrop-blur sobre el resto
          //     de la UI) EXCEPTO el carrito ilustrado, para enfocar la atención;
          //   - resaltar el carrito (cartVisual) en amarillo y con un realce (borde/glow) para
          //     dejar claro que ESE es el destino válido del drop, haciéndolo intuitivo;
          //   - al soltar sobre el carrito, llamar a changeQuantity(product, qty + 1) (misma
          //     lógica que el botón "+", respetando availableStock/atStockLimit).
          // Implementación sugerida: draggable en cada tarjeta (onDragStart guarda el productId),
          // un estado `draggingProductId` que active el overlay/atenuado global, y onDragOver/
          // onDrop en el contenedor del cartVisual como zona de drop. Cuidar accesibilidad
          // (teclado) y touch (los eventos HTML5 drag no funcionan en móvil → usar pointer events).
          <div className="grid grid-cols-1 gap-4">
            {displayProducts.map((product) => {
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

      {/* Carrito — panel lateral en desktop, más grande y prominente */}
      <aside className="hidden lg:block lg:col-span-3">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8 sticky top-6 space-y-6">
          <div className="flex items-center gap-2">
            <ShoppingCart size={22} className="text-yellow-500" />
            <h3 className="font-bold text-gray-900 text-lg">Tu carrito</h3>
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
