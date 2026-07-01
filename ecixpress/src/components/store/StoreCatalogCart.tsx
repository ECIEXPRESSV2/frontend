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
  /**
   * Búsqueda controlada por el contenedor. Si se proveen, la barra de búsqueda vive fuera
   * (p. ej. arriba de la página de la tienda) y el catálogo oculta su propio input. Si no,
   * el catálogo gestiona la búsqueda internamente con su input clásico.
   */
  search?: string;
  onSearchChange?: (value: string) => void;
}

/** Cuántas fichas de producto se dibujan como máximo dentro de la canasta del carrito. */
const CART_VISUAL_SLOTS = 12;

/**
 * Umbral por defecto para avisar "últimas unidades" cuando la tienda no configuró un `minStock`
 * propio. Con stock disponible <= este número (o <= minStock si la tienda lo definió) se muestra
 * la etiqueta amarilla "Quedan N unidades".
 */
const LOW_STOCK_THRESHOLD = 5;

/**
 * Control de cantidad con dos formas de uso a la vez: los botones +/- suman/restan de a uno, y
 * el campo del medio es EDITABLE para teclear una cantidad exacta (p. ej. 30) de un solo golpe.
 * El texto se maneja localmente y se confirma al salir del campo o con Enter, para no disparar una
 * llamada de red por cada tecla; `onCommit` recibe el número y el padre lo acota al stock disponible.
 */
const QuantityStepper: React.FC<{
  qty: number;
  max: number;
  disabled: boolean;
  atLimit: boolean;
  onCommit: (next: number) => void;
}> = ({ qty, max, disabled, atLimit, onCommit }) => {
  const [text, setText] = useState(String(qty));
  // Al cambiar la cantidad efectiva (tras acotar por stock, sincronizar con la orden, etc.)
  // reflejamos el valor real en el campo. Se sincroniza EN RENDER (patrón recomendado de React)
  // en vez de un efecto, para no disparar renders en cascada. `qty` solo cambia tras confirmar
  // (blur/Enter/+/-), nunca mientras se teclea, así que no pisa lo que el usuario está escribiendo.
  const [syncedQty, setSyncedQty] = useState(qty);
  if (qty !== syncedQty) {
    setSyncedQty(qty);
    setText(String(qty));
  }

  const commit = (): void => {
    const n = Number.parseInt(text, 10);
    if (Number.isNaN(n) || n < 0) {
      setText(String(qty)); // entrada inválida: se descarta y se restaura el valor actual
      return;
    }
    if (n !== qty) onCommit(n);
    else setText(String(qty));
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        disabled={disabled}
        onClick={() => onCommit(qty - 1)}
        aria-label="Quitar una unidad"
        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50"
      >
        <Minus size={14} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={text}
        disabled={disabled}
        aria-label="Cantidad"
        onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ''))}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        className="w-10 h-7 text-center text-sm font-semibold rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300 disabled:opacity-50"
      />
      {/* El "+" NO se deshabilita al llegar al tope: así, al intentar pasarse, `changeQuantity`
          hace vibrar el recuadro en vez de simplemente quedar inerte. Solo se bloquea si hay una
          mutación en curso (`disabled`). */}
      <button
        disabled={disabled}
        title={atLimit ? `Solo quedan ${max} unidades` : undefined}
        onClick={() => onCommit(qty + 1)}
        aria-label="Agregar una unidad"
        className="w-7 h-7 rounded-full bg-yellow-400 text-white flex items-center justify-center hover:bg-yellow-500 disabled:opacity-50"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};

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
const StoreCatalogCart: React.FC<StoreCatalogCartProps> = ({ storeId, storeName, search: controlledSearch, onSearchChange }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeDraftId = searchParams.get('draft');
  const { getToken } = useAuth();
  const api = useOrdersApi();
  // Búsqueda: controlada por el contenedor si llega por props, o interna en caso contrario.
  const searchControlled = onSearchChange !== undefined;

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  // Categorías aplicadas al filtro (multi-selección). Vacío = sin filtro (se muestran todos los productos).
  const [appliedCategoryIds, setAppliedCategoryIds] = useState<Set<string>>(new Set());
  // Selección en curso dentro del panel, hasta que se confirme con "Ok".
  const [draftCategoryIds, setDraftCategoryIds] = useState<Set<string>>(new Set());
  const [internalSearch, setInternalSearch] = useState('');
  const search = searchControlled ? (controlledSearch ?? '') : internalSearch;
  const setSearch = searchControlled ? (onSearchChange ?? (() => {})) : setInternalSearch;
  const [loading, setLoading] = useState(true);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  // Producto cuyo recuadro está "rechazando" un intento de pedir más de lo disponible: se le
  // aplica la clase de sacudida + borde rojo por un instante (feedback en el sitio, sin toasts).
  const [rejectedProductId, setRejectedProductId] = useState<string | null>(null);
  const rejectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // Escrituras de carrito pendientes de enviar (productId → cantidad ABSOLUTA deseada). Los
  // clics/tecleos actualizan la UI al instante y solo aquí se acumula lo que falta persistir;
  // se envía con un pequeño debounce para que agregar sea FLUIDO (sin una petición por clic ni
  // bloqueo de botones). La validación fuerte de stock ocurre al confirmar el pago, no aquí.
  const pendingWrites = useRef<Map<string, number>>(new Map());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Id del carrito accesible de forma síncrona desde callbacks (checkout/flush) sin depender del
  // `orderId` capturado en el closure del render.
  const orderIdRef = useRef<string | null>(null);
  useEffect(() => { orderIdRef.current = orderId; }, [orderId]);
  // Espejo de `quantities` accesible desde callbacks asíncronos (el poll de cotización) sin
  // recrearlos: así el reconciliador siempre compara la orden contra lo que hay EN PANTALLA ahora.
  const quantitiesRef = useRef<Record<string, number>>({});
  useEffect(() => { quantitiesRef.current = quantities; });
  // Secuencia monótona: cada cambio de carrito invalida los polls de cotización anteriores para
  // que una respuesta de red que llega tarde (out-of-order) NUNCA pise la orden con un total viejo.
  const refreshSeq = useRef(0);

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
        orderIdRef.current = existing.id;
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

  // Stock en (casi) tiempo real: re-sondea el catálogo en segundo plano para reflejar lo que
  // otros compradores van reservando (baja `stock`/sube `reservedStock`) sin recargar la página
  // ni mostrar el spinner. Así, si a un producto se le agotan las unidades mientras lo miras, su
  // etiqueta pasa a "Agotado" y el tope de "+" se ajusta solo.
  useEffect(() => {
    const REFRESH_MS = 10000;
    let active = true;
    const handle = setInterval(async () => {
      if (document.hidden) return; // no gastar red si la pestaña no está visible
      try {
        const token = await getToken().catch(() => null);
        const list = await productsApi.getProducts(storeId, { search: search.trim() || undefined }, token);
        if (active) setProducts(list);
      } catch {
        /* fallo transitorio de red: se reintenta en el siguiente tick */
      }
    }, REFRESH_MS);
    return () => { active = false; clearInterval(handle); };
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

  /**
   * Una línea de la orden está "cotizada en firme" cuando products-service ya devolvió su
   * precio real Y ese precio es coherente con la cantidad actual. orders-service, al cambiar
   * la cantidad de una línea que ya existía, conserva el `unitPrice`/`totalAmount` VIEJOS
   * (calculados para la cantidad anterior) hasta que llega el evento `products.cart.priced`.
   * Por eso no basta con `unitPrice > 0`: exigimos además que `totalAmount === unitPrice * quantity`,
   * lo que descarta esa ventana de datos rancios (evita mostrar un total mal sumado).
   */
  const isItemFreshlyQuoted = (item: OrderResponse['items'][number]): boolean =>
    item.unitPrice > 0 && item.totalAmount === item.unitPrice * item.quantity;

  /** ¿La orden refleja EXACTAMENTE las cantidades en pantalla, con todas sus líneas ya cotizadas en firme? */
  const orderMatchesLocal = (fresh: OrderResponse, local: Record<string, number>): boolean => {
    const ids = Object.keys(local);
    if (fresh.items.length !== ids.length) return false;
    return fresh.items.every((item) => local[item.productId] === item.quantity && isItemFreshlyQuoted(item));
  };

  /** ¿Esta orden ya tiene cotización autoritativa (precio real) para todas sus líneas? */
  const isOrderFullyQuoted = (fresh: OrderResponse): boolean =>
    fresh.items.length > 0 && fresh.items.every(isItemFreshlyQuoted);

  /**
   * Reconcilia la orden con products-service tras un cambio de carrito. products cotiza de
   * forma ASÍNCRONA (evento de ida y vuelta), así que sondeamos la orden hasta que refleje las
   * cantidades actuales con precio en firme, en vez de un único refresco a ciegas que podía
   * quedarse con la cotización vieja. Está protegido por `refreshSeq`: si el usuario vuelve a
   * tocar el carrito, este poll se cancela y no puede sobrescribir la orden con datos rancios.
   */
  const reconcileOrder = (id: string): void => {
    const seq = ++refreshSeq.current;
    let attempts = 0;
    const poll = async (): Promise<void> => {
      if (seq !== refreshSeq.current) return; // lo reemplazó un cambio más nuevo
      const fresh = await api.getOrderById(id).catch(() => null);
      if (seq !== refreshSeq.current) return; // llegó tarde: no pisar el estado actual
      if (fresh) setOrder(fresh);
      attempts += 1;
      const done = fresh && orderMatchesLocal(fresh, quantitiesRef.current);
      if (!done && attempts < 8) setTimeout(() => void poll(), 600);
    };
    setTimeout(() => void poll(), 400);
  };

  /** Crea el carrito DRAFT la primera vez que se agrega un producto. */
  const ensureDraft = async (): Promise<string | null> => {
    if (orderIdRef.current) return orderIdRef.current;
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
      orderIdRef.current = draft.id;
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

  /**
   * Dispara el rechazo visual en el recuadro del producto: vibra y su borde titila en rojo por
   * un momento. Se reinicia la animación en cada intento (quita y vuelve a poner la clase) para
   * que sacuda de nuevo aunque el usuario insista varias veces seguidas.
   */
  const flashRejected = (productId: string): void => {
    if (rejectTimer.current) clearTimeout(rejectTimer.current);
    setRejectedProductId(null);
    // Doble rAF: garantiza que el nodo se re-renderice SIN la clase antes de volver a aplicarla,
    // reiniciando la animación CSS.
    requestAnimationFrame(() => requestAnimationFrame(() => setRejectedProductId(productId)));
    rejectTimer.current = setTimeout(() => setRejectedProductId(null), 500);
  };
  // Limpia temporizadores al desmontar.
  useEffect(() => () => {
    if (rejectTimer.current) clearTimeout(rejectTimer.current);
    if (flushTimer.current) clearTimeout(flushTimer.current);
  }, []);

  /**
   * Envía al backend las cantidades pendientes (acumuladas por `changeQuantity`) en una sola
   * pasada, encadenada tras la mutación anterior para no pisar el array de items en orders. Envía
   * la cantidad ABSOLUTA de cada producto, así que si el usuario tocó "+" varias veces solo viaja
   * el valor final. Devuelve la promesa de la cadena para que el checkout pueda esperarla.
   */
  const flushCart = (): Promise<void> => {
    if (flushTimer.current) { clearTimeout(flushTimer.current); flushTimer.current = null; }
    if (pendingWrites.current.size === 0) return mutationChain.current;
    const writes = Array.from(pendingWrites.current.entries());
    pendingWrites.current.clear();
    mutationChain.current = mutationChain.current
      .then(async () => {
        const id = await ensureDraft();
        if (!id) return;
        for (const [productId, qty] of writes) {
          const product = productById.get(productId);
          await api.setCartItem(id, {
            productId,
            quantity: qty,
            name: product?.name,
            imageUrl: product?.imageUrl ?? undefined,
          });
        }
        // products cotiza de forma asíncrona; sondeamos (a prueba de carreras) hasta que la orden
        // refleje las cantidades actuales con su precio real.
        reconcileOrder(id);
      })
      .catch((e: unknown) => {
        toast.error((e as Error).message || 'No se pudo actualizar el carrito');
      });
    return mutationChain.current;
  };

  const changeQuantity = (product: Product, nextQty: number): void => {
    const available = availableStock(product);
    // Se intentó pedir más de lo disponible: no se permite (se acota) y el recuadro avisa vibrando.
    if (nextQty > available) {
      flashRejected(product.id);
    }
    const qty = Math.max(0, Math.min(nextQty, available));
    // Si tras acotar la cantidad no cambia (p. ej. ya estaba en el tope de stock), no hay nada
    // que hacer salvo el aviso visual.
    const currentQty = quantitiesRef.current[product.id] ?? 0;
    if (qty === currentQty) return;
    // Optimista: refleja el cambio en la UI AL INSTANTE (sin bloquear ni esperar la red).
    const next = { ...quantitiesRef.current };
    if (qty === 0) delete next[product.id];
    else next[product.id] = qty;
    quantitiesRef.current = next; // sync para que clics/tecleos consecutivos partan del valor real
    setQuantities(next);
    // Acumula la escritura y agenda el envío con debounce: agregar es fluido y no dispara una
    // petición por cada clic.
    pendingWrites.current.set(product.id, qty);
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => void flushCart(), 250);
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
          const listUnitPrice = priceToCents(product.price);
          // Consideramos la línea "cotizada en firme" solo cuando products ya devolvió un precio
          // COHERENTE con la cantidad actual (ver isItemFreshlyQuoted). Mientras tanto usamos el
          // precio de lista: así la línea SIEMPRE está internamente cuadrada (total = unidad × cantidad)
          // y el total del carrito nunca muestra una suma rancia ni "salta" de la nada.
          const isLineQuoted =
            !!quoted && quoted.quantity === qty && quoted.unitPrice > 0 && quoted.totalAmount === quoted.unitPrice * qty;
          const lineUnitPrice = isLineQuoted ? quoted.unitPrice : listUnitPrice;
          const lineTotal = isLineQuoted ? quoted.totalAmount : lineUnitPrice * qty;
          const lineListTotal = listUnitPrice * qty;
          return { product, qty, lineUnitPrice, lineTotal, lineListTotal, isLineQuoted };
        })
        .filter(
          (x): x is { product: Product; qty: number; lineUnitPrice: number; lineTotal: number; lineListTotal: number; isLineQuoted: boolean } =>
            x !== null,
        ),
    [quantities, productById, quotedByProductId],
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
  // Los totales se DERIVAN de las líneas del carrito (no del agregado `order.totalAmount`, que
  // orders-service deja rancio hasta que llega la cotización). Al construirlos sumando líneas
  // que siempre están cuadradas (total = unidad × cantidad), el carrito suma bien de forma
  // constante: subtotal a precio de lista, total con el precio en firme cuando ya llegó, y el
  // descuento es la diferencia — nunca negativo, nunca inconsistente.
  const displaySubtotal = useMemo(() => cartLines.reduce((sum, l) => sum + l.lineListTotal, 0), [cartLines]);
  const displayTotal = useMemo(() => cartLines.reduce((sum, l) => sum + l.lineTotal, 0), [cartLines]);
  const displayDiscount = Math.max(0, displaySubtotal - displayTotal);

  const handleCheckout = async () => {
    if (itemCount === 0) return;
    setCheckingOut(true);
    try {
      // Vacía de inmediato cualquier cambio pendiente (el debounce) y espera a que se escriban
      // todos: aquí SÍ hay que esperar la red, porque estamos a punto de cobrar y descontar stock.
      await flushCart();
      await mutationChain.current;
      const id = orderIdRef.current;
      if (!id) {
        toast.error('No se pudo iniciar el carrito');
        return;
      }

      // products-service cotiza el carrito de forma asíncrona (evento de ida y vuelta);
      // reintentamos unas cuantas veces antes de cobrar, en vez de fallar con un 409
      // apenas el usuario agregó algo y la cotización todavía no llegó.
      let fresh = await refreshOrder(id);
      for (let attempt = 0; attempt < 6 && (!fresh || !isOrderFullyQuoted(fresh)); attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        fresh = await refreshOrder(id);
      }
      if (!fresh || !isOrderFullyQuoted(fresh)) {
        toast.error('El carrito todavía se está cotizando, intenta de nuevo en un momento.');
        return;
      }

      await api.checkout(id);
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
        {/* Barra de búsqueda interna: solo cuando NO está controlada desde afuera (en la página
            de tienda vive arriba). */}
        {!searchControlled && (
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto por nombre…"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white border border-gray-100 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-300"
            />
          </div>
        )}

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
              // "Últimas unidades": avisa cuando queda poco stock. Umbral = minStock de la tienda si
              // lo configuró, o LOW_STOCK_THRESHOLD por defecto.
              const lowStockThreshold = product.minStock > 0 ? product.minStock : LOW_STOCK_THRESHOLD;
              const lowStock = !outOfStock && available <= lowStockThreshold;
              // Tope: solo impide PASARSE del stock disponible (se puede pedir hasta la última unidad).
              const atStockLimit = qty >= available;
              return (
                <div
                  key={product.id}
                  /* `isolate` acota los z-index internos (badge "Agotado"/"Quedan N") a la propia
                     tarjeta, para que NO pasen por encima del banner/búsqueda fijos al hacer scroll. */
                  className={`group relative isolate rounded-2xl bg-white border border-gray-100 shadow-sm transition-shadow overflow-hidden flex flex-col ${
                    outOfStock
                      ? 'pointer-events-none select-none' // agotado: no seleccionable
                      : 'hover:shadow-md'
                  } ${rejectedProductId === product.id ? 'animate-stock-reject' : ''}`}
                  aria-disabled={outOfStock}
                >
                  {/* Etiqueta de stock — va FUERA del contenido atenuado para que el rojo de
                      "Agotado" (y el amarillo de "quedan N") se vea nítido y no se apague con el
                      filtro gris/opacidad que se aplica al resto del recuadro cuando está agotado. */}
                  {outOfStock ? (
                    <span className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-red-600 text-[11px] font-semibold text-white shadow-sm">
                      Agotado
                    </span>
                  ) : lowStock ? (
                    <span className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-yellow-400 text-[11px] font-semibold text-yellow-950 shadow-sm">
                      Quedan {available} {available === 1 ? 'unidad' : 'unidades'}
                    </span>
                  ) : null}

                  {/* Contenido del producto: se atenúa (muy opaco + gris) cuando está agotado. */}
                  <div className={`flex flex-1 flex-col ${outOfStock ? 'opacity-40 grayscale' : ''}`}>
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
                      {/* Botón flotante de añadir, anclado al borde inferior de la imagen */}
                      {qty === 0 && (
                        <button
                          disabled={outOfStock}
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
                          <QuantityStepper
                            qty={qty}
                            max={available}
                            disabled={false}
                            atLimit={atStockLimit}
                            onCommit={(next) => changeQuantity(product, next)}
                          />
                        )}
                      </div>
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
