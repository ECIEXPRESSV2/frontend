import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { productsApi, priceToCents, type Product } from '../../lib/products-api';
import { formatCOP } from '../../lib/format';
import type { Store } from '../../services/storeService';
import type { HomeSection } from './homeSections';
import TrianglePattern from './TrianglePattern';

const HOUR_MS = 3_600_000;
const MAX_PRODUCTS = 5;

/**
 * Tonalidades sutiles para los bordes de las tarjetas, manteniendo el diseño blanco/uniforme.
 */
const CARD_TONES = [
  { border: 'border-amber-200/50', chip: 'bg-white/80 text-gray-600' },
  { border: 'border-sky-200/50', chip: 'bg-white/80 text-gray-600' },
  { border: 'border-emerald-200/50', chip: 'bg-white/80 text-gray-600' },
  { border: 'border-violet-200/50', chip: 'bg-white/80 text-gray-600' },
  { border: 'border-rose-200/50', chip: 'bg-white/80 text-gray-600' },
];

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
      <div className="relative z-10 mx-auto w-full max-w-7xl space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          {/* En Comida se "prueba" (sabores); en Tienda se "compra" (productos). */}
          <h2 className="font-display text-xl font-semibold text-gray-900 md:text-2xl">
            {section.id === 'tienda' ? '¿Y si compras algo nuevo?' : '¿Y si pruebas algo nuevo?'}
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: MAX_PRODUCTS }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : featured ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {featured.products.map((product, index) => {
              const tone = CARD_TONES[index % CARD_TONES.length];
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onTryProduct(featured.store, product)}
                  title={`Probar ${product.name}`}
                  className={`group relative flex flex-col overflow-hidden rounded-xl border bg-white text-left shadow-sm transition-all duration-200 hover:shadow-2xl hover:-translate-y-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] ${tone.border}`}
                >
                  {/* Image — square 1:1 */}
                  <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      />
                    )}
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-sm text-[10px] font-semibold text-gray-600 border border-white/60 shadow-sm">
                      {product.category?.name ?? 'Destacado'}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col p-3 pt-2">
                    <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 text-left">
                      {product.name}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 tracking-tight mt-1 text-left">
                      {formatCOP(priceToCents(product.price))}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500 transition group-hover:gap-2">
                      Pruébalo <ArrowRight size={12} aria-hidden="true" />
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
