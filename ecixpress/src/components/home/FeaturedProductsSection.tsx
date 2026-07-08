import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { productsApi, priceToCents, type Product } from '../../lib/products-api';
import { formatCOP } from '../../lib/format';
import type { Store } from '../../services/storeService';
import type { HomeSection } from './homeSections';
import TrianglePattern, { TriangleGlyph } from './TrianglePattern';

const HOUR_MS = 3_600_000;
const MAX_PRODUCTS = 5;

/**
 * Tonalidades rotativas de las tarjetas (como las tarjetas multicolor de la referencia):
 * tintes de acento de distinta intensidad, glass blanco y una tarjeta oscura de contraste.
 */
const CARD_TONES = [
  { card: 'border-white/60 bg-[rgb(var(--accent-rgb)/0.28)] text-gray-900', chip: 'bg-white/70 text-gray-600', price: 'text-gray-950' },
  { card: 'border-white/60 bg-white/65 text-gray-900', chip: 'bg-[rgb(var(--accent-rgb)/0.18)] text-gray-600', price: 'text-[var(--accent-600)]' },
  { card: 'border-white/20 bg-gray-900/85 text-white', chip: 'bg-white/15 text-white', price: 'text-[var(--accent-300)]' },
  { card: 'border-white/60 bg-[rgb(var(--accent-rgb)/0.14)] text-gray-900', chip: 'bg-white/70 text-gray-600', price: 'text-gray-950' },
  { card: 'border-white/60 bg-white/45 text-gray-900', chip: 'bg-[rgb(var(--accent-rgb)/0.18)] text-gray-600', price: 'text-[var(--accent-600)]' },
];

/**
 * Distribución de referencia: primera fila con 3 tarjetas iguales, segunda con 2 más
 * anchas (grilla de 6 columnas). Con menos productos, cada fila reparte el ancho completo.
 */
const SPAN_BY_ROW_COUNT: Record<number, string> = {
  1: 'md:col-span-6',
  2: 'md:col-span-3',
  3: 'md:col-span-2',
};

const spanClass = (index: number, total: number): string => {
  const firstRowCount = Math.min(3, total);
  const rowCount = index < firstRowCount ? firstRowCount : total - firstRowCount;
  return SPAN_BY_ROW_COUNT[rowCount] ?? 'md:col-span-2';
};

interface FeaturedData {
  store: Store;
  products: Product[];
}

interface FeaturedProductsSectionProps {
  section: HomeSection;
  /** Todas las tiendas disponibles; aquí se filtran por la sección activa. */
  stores: Store[];
  /** Clic en un producto: ir a la tienda y agregar una unidad al carrito. */
  onTryProduct: (store: Store, product: Product) => void;
  onOpenStore: (store: Store) => void;
}

/**
 * "¿Y si pruebas algo nuevo?" — destaca los productos de MÁS valor de una tienda de la
 * sección activa. La tienda rota cada hora (elección determinista por franja horaria, así
 * todas las tiendas ganan visibilidad y todos los usuarios ven la misma). Los productos
 * salen del catálogo real (products-service): solo activos y con stock disponible.
 */
const FeaturedProductsSection: React.FC<FeaturedProductsSectionProps> = ({
  section,
  stores,
  onTryProduct,
  onOpenStore,
}) => {
  const { getToken } = useAuth();
  const [featured, setFeatured] = useState<FeaturedData | null>(null);
  const [loading, setLoading] = useState(true);

  // Franja horaria actual; se re-evalúa cada minuto para captar el cambio de hora sin recargar.
  const [hourSlot, setHourSlot] = useState(() => Math.floor(Date.now() / HOUR_MS));
  useEffect(() => {
    const timer = setInterval(() => setHourSlot(Math.floor(Date.now() / HOUR_MS)), 60_000);
    return () => clearInterval(timer);
  }, []);

  const eligibleStores = useMemo(
    () => stores.filter((s) => section.types.includes(s.type)),
    [stores, section],
  );

  useEffect(() => {
    if (eligibleStores.length === 0) {
      setFeatured(null);
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const token = await getToken().catch(() => null);
        // La tienda de la hora es hourSlot % n; si no tiene productos vendibles se prueba
        // con la siguiente, para que la sección nunca quede vacía por una tienda sin catálogo.
        for (let attempt = 0; attempt < eligibleStores.length; attempt++) {
          const store = eligibleStores[(hourSlot + attempt) % eligibleStores.length];
          try {
            const list = await productsApi.getProducts(String(store.id), {}, token);
            const top = list
              .filter((p) => p.isActive && p.stock - p.reservedStock > 0)
              .sort((a, b) => Number(b.price) - Number(a.price))
              .slice(0, MAX_PRODUCTS);
            if (top.length > 0) {
              if (active) setFeatured({ store, products: top });
              return;
            }
          } catch {
            /* catálogo inaccesible: probar la siguiente tienda */
          }
          if (!active) return;
        }
        if (active) setFeatured(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [eligibleStores, hourSlot, getToken]);

  // Sin tiendas con productos vendibles no hay nada que destacar: la sección no se muestra.
  if (!loading && !featured) return null;

  return (
    <section className="theme-surface relative overflow-hidden rounded-[32px] border border-white/60 bg-white/40 px-4 py-6 shadow-[0_18px_40px_-24px_rgb(var(--accent-rgb)/0.35)] backdrop-blur-xl md:px-8">
      <TrianglePattern className="opacity-60" />

      {/* Bloque centrado: mismo ancho visual que ocupan los círculos de "Nuestras tiendas",
          con aire a los lados en vez de tarjetas de borde a borde. */}
      <div className="relative z-10 mx-auto w-full max-w-4xl space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-gray-900 md:text-2xl">
            ¿Y si pruebas algo nuevo?
          </h2>

          {featured && (
            <button
              type="button"
              onClick={() => onOpenStore(featured.store)}
              className="theme-surface inline-flex min-h-10 items-center gap-2 rounded-full border border-white/60 bg-white/70 py-1 pl-1.5 pr-4 text-sm font-bold text-gray-800 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
            >
              {featured.store.imageUrl ? (
                <img src={featured.store.imageUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <span className="theme-surface flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-400)] text-xs font-black text-gray-950">
                  {featured.store.name.trim()[0]?.toUpperCase()}
                </span>
              )}
              {featured.store.name}
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-6 md:gap-4">
            {Array.from({ length: MAX_PRODUCTS }).map((_, i) => (
              <div key={i} className={`h-44 animate-pulse rounded-3xl border border-white/60 bg-white/50 ${spanClass(i, MAX_PRODUCTS)}`} />
            ))}
          </div>
        ) : featured ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-6 md:gap-4">
            {featured.products.map((product, index) => {
              const tone = CARD_TONES[index % CARD_TONES.length];
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onTryProduct(featured.store, product)}
                  title={`Probar ${product.name}`}
                  className={`theme-surface group relative flex min-h-[176px] flex-col overflow-hidden rounded-3xl border text-left shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] ${tone.card} ${spanClass(index, featured.products.length)}`}
                >
                  {/* Con imagen en el catálogo: la foto llena toda la parte superior de la
                      tarjeta y abajo se conserva la franja de color con nombre/precio. */}
                  {product.imageUrl && (
                    <div className="relative h-28 w-full shrink-0 overflow-hidden">
                      <img
                        src={product.imageUrl}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute left-3 top-3 inline-flex max-w-[calc(100%-1.5rem)] truncate rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-700 backdrop-blur">
                        {product.category?.name ?? 'Destacado'}
                      </span>
                    </div>
                  )}

                  <div className="relative flex flex-1 flex-col justify-between p-4">
                    {/* Marca de agua con el triángulo del logo */}
                    <TriangleGlyph size={104} rotate={18} className="absolute -bottom-4 -right-5 text-current opacity-10" />

                    {!product.imageUrl && (
                      <span className={`inline-flex max-w-full self-start truncate rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tone.chip}`}>
                        {product.category?.name ?? 'Destacado'}
                      </span>
                    )}

                    <div className={`relative ${product.imageUrl ? '' : 'mt-3'}`}>
                      {!product.imageUrl && (
                        <div className="theme-surface flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--accent-300),var(--accent-400))] text-sm font-black text-gray-950 shadow-sm">
                          {product.name.trim()[0]?.toUpperCase()}
                        </div>
                      )}
                      <p className={`line-clamp-2 text-sm font-black leading-snug ${product.imageUrl ? '' : 'mt-2'}`}>{product.name}</p>
                      <p className={`mt-1 text-lg font-black ${tone.price}`}>{formatCOP(priceToCents(product.price))}</p>
                    </div>

                    <span className="relative mt-2 inline-flex items-center gap-1 text-xs font-bold opacity-60 transition group-hover:opacity-100">
                      Pruébalo <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default FeaturedProductsSection;
