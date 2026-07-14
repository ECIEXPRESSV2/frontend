import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Minus, ShoppingCart, Loader2, ImageOff, X, Tag, Check, Trash2, Box, ChevronDown, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { useOrdersApi } from '../../hooks/useOrdersApi';
import { productsApi, priceToCents, type Product, type ProductCategory } from '../../lib/products-api';
import type { OrderResponse, CartQuoteResponse } from '../../lib/orders-api';
import type { StoreSchedule } from '../../services/storeService';
import { formatCOP } from '../../lib/format';
import Product3DViewerModal from './Product3DViewerModal';
import CheckoutInvoiceModal from '../cart/CheckoutInvoiceModal';
import { storeClosedMessage } from '../../services/storeService';

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
  /** La tienda está cerrada/fuera de horario: se bloquean las acciones de pedido. */
  closed?: boolean;
  /** Etiqueta a mostrar cuando `closed` (p. ej. "Fuera de horario", "Cerrado"). */
  closedLabel?: string;
  /** Horarios de la tienda para calcular ventana de programación. */
  schedules?: StoreSchedule[];
}

/**
 * Umbral por defecto para avisar "últimas unidades" cuando la tienda no configuró un `minStock`
 * propio. Con stock disponible <= este número (o <= minStock si la tienda lo definió) se muestra
 * la etiqueta amarilla "Quedan N unidades".
 */
const LOW_STOCK_THRESHOLD = 5;

/**
 * Catálogo de la tienda + carrito en vivo. El carrito es una orden DRAFT en
 * orders-service; products-service cotiza el precio final (con promociones) de forma
 * asíncrona, por lo que tras cada cambio refrescamos la orden para mostrar el total
 * autoritativo. Mientras llega, mostramos un total provisional con el precio de lista.
 */
const StoreCatalogCart: React.FC<StoreCatalogCartProps> = ({ storeId, storeName, search: controlledSearch, onSearchChange, closed = false, closedLabel = 'Fuera de horario', schedules }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeDraftId = searchParams.get('draft');
  const { getToken } = useAuth();
  const { wallet, refresh: refreshWallet, openRecharge } = useWallet();
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
  const [checkingOut, setCheckingOut] = useState(false); // pago (checkout) en curso
  // Factura del checkout: se abre al "Confirmar" y cotiza de forma síncrona (precio + stock).
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [quote, setQuote] = useState<CartQuoteResponse | null>(null);
  // Producto cuyo recuadro está "rechazando" un intento de pedir más de lo disponible: se le
  // aplica la clase de sacudida + borde rojo por un instante (feedback en el sitio, sin toasts).
  const [rejectedProductId, setRejectedProductId] = useState<string | null>(null);
  // Cantidad seleccionada en el selector desplegable (antes de agregar al carrito).
  const [selectedAddQty, setSelectedAddQty] = useState<Record<string, number>>({});
  // Producto con el dropdown de cantidad abierto (null = ninguno).
  const [qtyDropdownOpenId, setQtyDropdownOpenId] = useState<string | null>(null);
  // Producto donde se está ingresando una cantidad personalizada ("Otra cantidad").
  const [customQtyOpenId, setCustomQtyOpenId] = useState<string | null>(null);
  const [customQtyValue, setCustomQtyValue] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState('');
  const [scheduledPickupAt, setScheduledPickupAt] = useState<string>('');
  // Valor del input de cantidad mientras el usuario está escribiendo (permite string vacío).
  const [editingQty, setEditingQty] = useState<Record<string, string>>({});
  const todayCloseTime = useMemo(() => {
    const today = new Date().getDay();
    const s = schedules?.find((s) => s.isActive && s.dayOfWeek === today);
    return s ? s.closeTime.slice(0, 5) : '23:59';
  }, [schedules]);
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
        const hydratedQuantities = Object.fromEntries(existing.items.map((it) => [it.productId, it.quantity]));
        quantitiesRef.current = hydratedQuantities; // sync: el reconciliador compara contra estas cantidades
        setQuantities(hydratedQuantities);
        // Un draft pudo guardarse antes de que products cotizara (unitPrice=0) o con precio rancio; en
        // ese caso NADA lo volvería a cotizar hasta tocar el carrito, y "Confirmar y pagar" quedaría
        // gris al reanudar. Re-cotizamos una vez aquí para que el botón pueda habilitarse solo.
        if (!isOrderFullyQuoted(existing)) reconcileOrder(existing.id);
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
   * forma ASÍNCRONA (evento de ida y vuelta por el bus), así que sondeamos la orden hasta que
   * refleje las cantidades actuales con precio en firme, en vez de un único refresco a ciegas que
   * podía quedarse con la cotización vieja. Está protegido por `refreshSeq`: si el usuario vuelve
   * a tocar el carrito, este poll se cancela y no puede sobrescribir la orden con datos rancios.
   *
   * Ventana AMPLIA con backoff progresivo (~30s): la cotización viaja orders→products→orders y,
   * bajo carga/escalado, puede llegar bastante más tarde que unos cientos de ms. Antes nos
   * rendíamos a ~4,6s, así que si el precio llegaba tarde el botón "Confirmar y pagar" se quedaba
   * bloqueado aunque la orden ya estuviera cotizada en el backend. Sondeamos rápido al principio
   * (caso común) y luego más espaciado, hasta agotar el presupuesto.
   */
  const reconcileOrder = (id: string): void => {
    const seq = ++refreshSeq.current;
    const startedAt = Date.now();
    const RECONCILE_BUDGET_MS = 30000;
    const nextDelay = (elapsed: number): number =>
      elapsed < 3000 ? 500 : elapsed < 10000 ? 1200 : 2500;
    const poll = async (): Promise<void> => {
      if (seq !== refreshSeq.current) return; // lo reemplazó un cambio más nuevo
      const fresh = await api.getOrderById(id).catch(() => null);
      if (seq !== refreshSeq.current) return; // llegó tarde: no pisar el estado actual
      if (fresh) setOrder(fresh);
      const done = fresh && orderMatchesLocal(fresh, quantitiesRef.current);
      const elapsed = Date.now() - startedAt;
      if (!done && elapsed < RECONCILE_BUDGET_MS) setTimeout(() => void poll(), nextDelay(elapsed));
    };
    setTimeout(() => void poll(), 300);
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
      toast.error(storeClosedMessage((e as Error).message) || 'No se pudo iniciar el carrito');
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
    // Tienda cerrada / fuera de horario: no se permite agregar ni modificar el carrito.
    if (closed) {
      toast.info(`${storeName} está ${closedLabel.toLowerCase()}. No puedes hacer pedidos ahora.`);
      return;
    }
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

  // Llegada desde "¿Y si pruebas algo nuevo?" del Home con ?addProduct=<id>: al cargar el
  // catálogo se agrega UNA unidad de ese producto al carrito (el draft se crea solo con el
  // primer flush). El ref garantiza que ocurra una única vez aunque el catálogo se re-sondee.
  const autoAddProductId = searchParams.get('addProduct');
  const autoAddedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoAddProductId || autoAddedRef.current === autoAddProductId || loading) return;
    const product = productById.get(autoAddProductId);
    if (!product) return; // el catálogo aún no lo trae (o ya no existe)
    autoAddedRef.current = autoAddProductId;
    if ((quantitiesRef.current[product.id] ?? 0) === 0) changeQuantity(product, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAddProductId, loading, productById]);

  /** Líneas de la orden ya cotizadas por products-service (unitPrice/totalAmount autoritativos), por productId. */
  const quotedByProductId = useMemo(() => {
    const map = new Map<string, OrderResponse['items'][number]>();
    if (order) for (const item of order.items) map.set(item.productId, item);
    return map;
  }, [order]);

  const cartLines = useMemo(
    () =>
      Object.entries(quantities).map(([productId, qty]) => {
        const product = productById.get(productId);
        const quoted = quotedByProductId.get(productId);
        // Metadatos de la línea: preferimos el catálogo cargado, pero si el producto NO está en él
        // (filtro de búsqueda activo, producto desactivado, o catálogo aún cargando) caemos a lo que
        // guardó la propia orden. Así una línea del carrito NUNCA desaparece por el estado del catálogo
        // visible — era la causa de "reanudar pedido sin productos" y del botón que quedaba bloqueado.
        const name = product?.name ?? quoted?.name ?? 'Producto';
        const imageUrl = product?.imageUrl ?? quoted?.imageUrl ?? null;
        // Precio de lista: solo el catálogo lo conoce. Sin catálogo usamos el precio que cotizó la
        // orden como mejor referencia (o 0 si tampoco hay), de modo que la línea siga cuadrada.
        const listUnitPrice = product ? priceToCents(product.price) : (quoted?.unitPrice ?? 0);
        // Consideramos la línea "cotizada en firme" solo cuando products ya devolvió un precio
        // COHERENTE con la cantidad actual (ver isItemFreshlyQuoted). Mientras tanto usamos el
        // precio de lista: así la línea SIEMPRE está internamente cuadrada (total = unidad × cantidad)
        // y el total del carrito nunca muestra una suma rancia ni "salta" de la nada.
        const isLineQuoted =
          !!quoted && quoted.quantity === qty && quoted.unitPrice > 0 && quoted.totalAmount === quoted.unitPrice * qty;
        const lineUnitPrice = isLineQuoted ? quoted.unitPrice : listUnitPrice;
        const lineTotal = isLineQuoted ? quoted.totalAmount : lineUnitPrice * qty;
        const lineListTotal = listUnitPrice * qty;
        return { id: productId, name, imageUrl, qty, lineUnitPrice, lineTotal, lineListTotal, isLineQuoted };
      }),
    [quantities, productById, quotedByProductId],
  );

  const itemCount = useMemo(() => cartLines.reduce((sum, { qty }) => sum + qty, 0), [cartLines]);

  // Los totales se DERIVAN de las líneas del carrito (no del agregado `order.totalAmount`, que
  // orders-service deja rancio hasta que llega la cotización). Al construirlos sumando líneas
  // que siempre están cuadradas (total = unidad × cantidad), el carrito suma bien de forma
  // constante: subtotal a precio de lista, total con el precio en firme cuando ya llegó, y el
  // descuento es la diferencia — nunca negativo, nunca inconsistente.
  const displaySubtotal = useMemo(() => cartLines.reduce((sum, l) => sum + l.lineListTotal, 0), [cartLines]);
  const displayTotal = useMemo(() => cartLines.reduce((sum, l) => sum + l.lineTotal, 0), [cartLines]);
  const displayDiscount = Math.max(0, displaySubtotal - displayTotal);

  /**
   * "Confirmar": persiste lo pendiente y cotiza el carrito de forma SÍNCRONA (precio autoritativo
   * con promociones + chequeo de stock por línea) vía orders-service, y abre la factura. Ya NO
   * depende de la cotización asíncrona por eventos, así que no se queda esperando.
   */
  const handleConfirm = async () => {
    if (itemCount === 0) return;
    setInvoiceOpen(true);
    setQuote(null);
    setQuoting(true);
    try {
      // Vacía de inmediato cualquier cambio pendiente (el debounce) y espera a que se escriban todos.
      await flushCart();
      await mutationChain.current;
      const id = orderIdRef.current;
      if (!id) {
        toast.error('No se pudo iniciar el carrito');
        setInvoiceOpen(false);
        return;
      }
      // Enviamos las cantidades AUTORITATIVAS del carrito (lo que el usuario ve). El backend fija
      // `order.items` a exactamente esto antes de cotizar, así el modal siempre coincide con el
      // carrito aunque una escritura incremental previa se hubiera perdido/desordenado.
      const items = cartLines.map((l) => ({
        productId: l.id,
        quantity: l.qty,
        name: l.name,
        imageUrl: l.imageUrl ?? undefined,
      }));
      const q = await api.quoteCart(id, items);
      setQuote(q);
      // Refresca el saldo por si cambió, para que la factura muestre si alcanza.
      void refreshWallet();
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo cotizar el pedido');
      setInvoiceOpen(false);
    } finally {
      setQuoting(false);
    }
  };

  /**
   * "Pagar ahora" desde la factura: confirma el carrito y dispara el cobro contra la billetera.
   * El cobro real y la reserva atómica de stock ocurren en el backend; el resultado llega en vivo
   * a "Mis pedidos" (WebSocket order:status-updated).
   */
  const handlePay = async () => {
    const id = orderIdRef.current;
    if (!id) return;
    setCheckingOut(true);
    try {
      await api.checkout(id, { scheduledPickupAt: scheduledPickupAt || undefined });
      toast.success('Pedido recibido. Validando disponibilidad de stock…');
      setInvoiceOpen(false);
      setMobileCartOpen(false);
      navigate('/orders');
    } catch (e) {
      toast.error(storeClosedMessage((e as Error).message) || 'No se pudo confirmar el pedido');
    } finally {
      setCheckingOut(false);
    }
  };

  // Resumen de carrito — limpio, sin ilustración
  const cartSummary = cartLines.length === 0 ? (
    <div className="py-8 text-center">
      <ShoppingCart size={32} className="mx-auto text-gray-200" />
      <p className="text-sm text-gray-400 mt-3">Añade productos del menú para empezar.</p>
    </div>
  ) : (
    <div className="space-y-4">
      {/* Lista de productos */}
      <ul className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {cartLines.map(({ id, name, imageUrl, qty, lineUnitPrice, lineTotal }) => {
          const cartProduct = productById.get(id);
          return (
            <li key={id} className="flex items-center gap-2.5 py-2 border-b border-gray-100 last:border-0">
              <div className="w-11 h-11 rounded-lg bg-gray-50 overflow-hidden shrink-0 flex items-center justify-center text-gray-300 border border-gray-100">
                {imageUrl ? (
                  <img src={imageUrl} alt={name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <ImageOff size={14} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5 bg-gray-50 rounded-md border border-gray-100/80">
                    <button
                      onClick={() => cartProduct && changeQuantity(cartProduct, qty - 1)}
                      disabled={!cartProduct}
                      className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-l-md transition-all disabled:opacity-30"
                    >
                      <Minus size={12} />
                    </button>
          <input
                            type="number"
                            value={editingQty[id] ?? qty}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (!cartProduct) return;
                              if (raw === '') {
                                setEditingQty((prev) => ({ ...prev, [id]: '' }));
                                return;
                              }
                              const parsed = parseInt(raw);
                              if (!isNaN(parsed) && parsed >= 0) {
                                setEditingQty((prev) => ({ ...prev, [id]: String(parsed) }));
                                changeQuantity(cartProduct, parsed);
                              }
                            }}
                            onFocus={() => setEditingQty((prev) => ({ ...prev, [id]: String(qty) }))}
                            onBlur={() => {
                              setEditingQty((prev) => {
                                const next = { ...prev };
                                delete next[id];
                                return next;
                              });
                            }}
                            min={1}
                            className="w-10 text-center text-xs font-semibold text-gray-900 bg-transparent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                    <button
                      onClick={() => cartProduct && changeQuantity(cartProduct, qty + 1)}
                      disabled={!cartProduct}
                      className="w-7 h-7 flex items-center justify-center text-amber-500 hover:text-white hover:bg-amber-400 rounded-r-md transition-all disabled:opacity-30"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => cartProduct && changeQuantity(cartProduct, 0)}
                    disabled={!cartProduct}
                    className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all disabled:opacity-30"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900">{formatCOP(lineTotal)}</p>
                <p className="text-[10px] text-gray-400">{formatCOP(lineUnitPrice)} c/u</p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Totales */}
      <div className="border-t border-gray-100 pt-3 space-y-1.5">
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
          <span className="text-base font-bold text-gray-900">Total</span>
          <span className="text-lg font-bold text-gray-900">{formatCOP(displayTotal)}</span>
        </div>
      </div>

      {/* Aviso de tienda cerrada / fuera de horario */}
      {closed && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 ring-1 ring-red-200 px-3 py-2 text-xs font-medium text-red-700">
          <Clock size={14} className="shrink-0" />
          La tienda está {closedLabel.toLowerCase()}. No puedes hacer pedidos en este momento.
        </div>
      )}

      {/* Botón confirmar */}
      <button
        onClick={handleConfirm}
        disabled={closed || quoting || checkingOut || itemCount === 0}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold text-sm shadow-md shadow-yellow-300/50 hover:from-yellow-500 hover:to-yellow-600 hover:shadow-yellow-300/70 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {quoting ? <Loader2 size={16} className="animate-spin" /> : null}
        Confirmar
      </button>
    </div>
  );

  const dropdownProduct = qtyDropdownOpenId ? productById.get(qtyDropdownOpenId) ?? null : null;
  const dropdownAvailable = dropdownProduct ? availableStock(dropdownProduct) : 0;

  return (
    <>
    <div className="space-y-4">
      {/* Catálogo: ancho completo con rejilla de productos */}
      <div className="space-y-4">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {displayProducts.map((product) => {
              const qty = quantities[product.id] ?? 0;
              const available = availableStock(product);
              const outOfStock = available <= 0;
              const lowStockThreshold = product.minStock > 0 ? product.minStock : LOW_STOCK_THRESHOLD;
              const lowStock = !outOfStock && available <= lowStockThreshold;
              const atStockLimit = qty >= available;
              return (
                <div
                  key={product.id}
                  className={`group relative isolate rounded-xl bg-white border border-gray-100/80 shadow-sm transition-all duration-200 overflow-hidden flex flex-col ${
                    !outOfStock ? 'hover:shadow-2xl hover:-translate-y-1.5 hover:border-gray-200' : ''
                  } ${rejectedProductId === product.id ? 'animate-stock-reject' : ''}`}
                >
                  {/* Image — square 1:1, ~65-70% of card */}
                  <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                    {product.frontImageUrl ?? product.imageUrl ? (
                      <img
                        src={product.frontImageUrl ?? product.imageUrl ?? ''}
                        alt={product.name}
                        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] ${
                          outOfStock ? 'opacity-50 saturate-0' : ''
                        }`}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                        <ShoppingCart size={28} />
                      </div>
                    )}

                    {/* Category badge — chip moderno */}
                    {product.category?.name && (
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-sm text-[10px] font-semibold text-gray-600 border border-white/60 shadow-sm">
                        {product.category.name}
                      </span>
                    )}

                    {/* OutOfStock / LowStock badge */}
                    {outOfStock ? (
                      <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-red-500/90 text-[10px] font-semibold text-white backdrop-blur-sm shadow-sm">
                        Agotado
                      </span>
                    ) : lowStock ? (
                      <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-amber-400/90 text-[10px] font-semibold text-amber-950 backdrop-blur-sm shadow-sm">
                        {available}
                      </span>
                    ) : null}

                    {/* 3D button — overlay */}
                    {product.model3dUrl && product.modelGenerationStatus === 'READY' && !outOfStock ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setViewerTitle(product.name);
                          setViewerSrc(productsApi.getModel3dUrl(product.id));
                          setViewerOpen(true);
                        }}
                        className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-900/80 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm hover:bg-gray-900 hover:shadow-md hover:scale-105 active:scale-95 transition-all"
                      >
                        <Box size={12} />
                        3D
                      </button>
                    ) : product.modelGenerationStatus === 'FAILED' ? (
                      <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-400/60 text-[10px] font-medium text-white/70 cursor-default backdrop-blur-sm">
                        <Box size={12} />
                        3D
                      </span>
                    ) : null}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col p-3 pt-2">
                    <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                      {product.name}
                    </h3>

                    <p className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                      {formatCOP(priceToCents(product.price))}
                    </p>

                    {/* Action area — full-width */}
                    <div className="mt-2">
                      {outOfStock ? (
                        <button
                          disabled
                          className="w-full py-2 rounded-lg bg-gray-100 text-gray-400 text-xs font-semibold cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          🚫 No disponible
                        </button>
                      ) : qty === 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {/* Selector de cantidad desplegable */}
                          <div className="relative">
                            <button
                              onClick={() => {
                                setQtyDropdownOpenId(qtyDropdownOpenId === product.id ? null : product.id);
                                setCustomQtyOpenId(null);
                                setCustomQtyValue('');
                              }}
                              className="w-full py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-all duration-200 flex items-center justify-center gap-1"
                            >
                              <span>Cantidad {selectedAddQty[product.id] ?? 1}</span>
                              <span className="text-[10px] text-gray-400">(+{available} disponibles)</span>
                              <ChevronDown size={12} className={`transition-transform ${qtyDropdownOpenId === product.id ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                          <button
                            onClick={() => changeQuantity(product, selectedAddQty[product.id] ?? 1)}
                            className="w-full px-3 py-2 rounded-lg bg-amber-400 text-white text-sm font-semibold shadow-sm hover:bg-amber-500 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            <ShoppingCart size={16} />
                            Agregar al carrito
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-amber-400 rounded-lg overflow-hidden shadow-sm">
                          <button
                            onClick={() => changeQuantity(product, qty - 1)}
                            className="flex-1 py-2 text-white/90 hover:text-white hover:bg-amber-500 transition-colors flex items-center justify-center text-sm font-medium"
                          >
                            <Minus size={16} />
                          </button>
                          <input
                            type="number"
                            value={editingQty[product.id] ?? qty}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                setEditingQty((prev) => ({ ...prev, [product.id]: '' }));
                                return;
                              }
                              const parsed = parseInt(raw);
                              if (!isNaN(parsed) && parsed >= 0) {
                                setEditingQty((prev) => ({ ...prev, [product.id]: String(parsed) }));
                                changeQuantity(product, parsed);
                              }
                            }}
                            onFocus={() => setEditingQty((prev) => ({ ...prev, [product.id]: String(qty) }))}
                            onBlur={() => {
                              setEditingQty((prev) => {
                                const next = { ...prev };
                                delete next[product.id];
                                return next;
                              });
                            }}
                            min={1}
                            max={available}
                            className="w-12 text-center text-sm font-bold text-white bg-transparent border-x border-amber-300/40 py-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => changeQuantity(product, qty + 1)}
                            disabled={atStockLimit}
                            className="flex-1 py-2 text-white/90 hover:text-white hover:bg-amber-500 disabled:text-amber-300 disabled:hover:bg-transparent transition-colors flex items-center justify-center text-sm font-medium disabled:cursor-not-allowed"
                          >
                            <Plus size={16} />
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

      {/* Popup selector de cantidad — fuera del map para evitar bugs con hover en otras tarjetas */}
      {dropdownProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setQtyDropdownOpenId(null); setCustomQtyOpenId(null); setCustomQtyValue(''); }} />
          <div className="relative bg-white rounded-2xl p-5 w-full max-w-xs shadow-2xl">
            <h4 className="text-sm font-bold text-gray-900 mb-3 text-center">
              Cantidad <span className="text-gray-400 font-normal">({dropdownAvailable} disponibles)</span>
            </h4>
            {customQtyOpenId === dropdownProduct.id ? (
              <div>
                <input
                  type="number"
                  value={customQtyValue}
                  onChange={(e) => setCustomQtyValue(e.target.value)}
                  min={1}
                  max={dropdownAvailable}
                  placeholder={`Máx ${dropdownAvailable}`}
                  className="w-full px-3 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const n = parseInt(customQtyValue);
                      if (n > 0 && n <= dropdownAvailable) {
                        setSelectedAddQty((prev) => ({ ...prev, [dropdownProduct.id]: n }));
                        setQtyDropdownOpenId(null);
                        setCustomQtyOpenId(null);
                        setCustomQtyValue('');
                      }
                    }
                  }}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      const n = parseInt(customQtyValue);
                      if (n > 0 && n <= dropdownAvailable) {
                        setSelectedAddQty((prev) => ({ ...prev, [dropdownProduct.id]: n }));
                        setQtyDropdownOpenId(null);
                        setCustomQtyOpenId(null);
                        setCustomQtyValue('');
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-amber-400 text-white"
                  >
                    Ok
                  </button>
                  <button
                    onClick={() => { setCustomQtyOpenId(null); setCustomQtyValue(''); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex gap-3 justify-center mb-3">
                  {Array.from({ length: Math.min(3, dropdownAvailable) }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setSelectedAddQty((prev) => ({ ...prev, [dropdownProduct.id]: n }));
                        setQtyDropdownOpenId(null);
                      }}
                      className={`w-14 h-14 rounded-xl text-lg font-bold transition-colors ${(selectedAddQty[dropdownProduct.id] ?? 1) === n ? 'bg-amber-400 text-white shadow-lg shadow-amber-300/40' : 'bg-gray-100 text-gray-700 hover:bg-amber-50 hover:text-amber-700'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCustomQtyOpenId(dropdownProduct.id)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 border border-gray-200 transition"
                >
                  Otra cantidad...
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Carrito — botón flotante + drawer (todas las pantallas) */}
      {itemCount > 0 && (
        <>
          <button
            onClick={() => setMobileCartOpen(true)}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[65] flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-xl shadow-yellow-400/40 hover:from-yellow-500 hover:to-yellow-600 hover:shadow-yellow-400/60 transition-all md:bottom-5"
          >
            <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/25">
              <ShoppingCart size={17} />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-[11px] font-bold flex items-center justify-center text-yellow-600 shadow-sm">{itemCount}</span>
            </span>
            <span className="text-sm font-bold whitespace-nowrap">{formatCOP(displayTotal)}</span>
          </button>

          {mobileCartOpen && (
            <div className="fixed inset-0 z-[65] flex flex-col justify-end">
              <div className="absolute inset-0 bg-black/40" onClick={() => setMobileCartOpen(false)} />
              <div className="relative bg-white rounded-t-3xl p-5 pb-24 max-h-[85vh] overflow-auto space-y-4 md:pb-6 md:ml-[var(--sidebar-w)]">
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
        </>
      )}

      <Product3DViewerModal
        open={viewerOpen}
        title={viewerTitle}
        src={viewerSrc}
        onClose={() => setViewerOpen(false)}
      />

      <CheckoutInvoiceModal
        open={invoiceOpen}
        quote={quote}
        loading={quoting}
        paying={checkingOut}
        walletBalance={wallet?.balance ?? 0}
        scheduledPickupAt={scheduledPickupAt}
        onScheduleChange={setScheduledPickupAt}
        todayCloseTime={todayCloseTime}
        onClose={() => setInvoiceOpen(false)}
        onPay={handlePay}
        onRecharge={openRecharge}
      />

    </div>
    </>
  );
};

export default StoreCatalogCart;
