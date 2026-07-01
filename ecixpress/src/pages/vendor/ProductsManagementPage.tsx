import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Plus,
  Minus,
  Package,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  RefreshCw,
  Boxes,
  BadgePercent,
  History,
  AlertTriangle,
  LayoutGrid,
} from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import ModalShell from '../../components/wallet/ModalShell';
import FormInput from '../../components/ui/FormInput';
import CategoryManager from '../../components/vendor/CategoryManager';
import InventoryHistoryModal from '../../components/vendor/InventoryHistoryModal';
import { useAuth } from '../../context/AuthContext';
import { getStoreById, type Store } from '../../services/storeService';
import {
  productsApi,
  slugify,
  priceToCents,
  type Product,
  type ProductCategory,
} from '../../lib/products-api';
import { formatCOP } from '../../lib/format';

const emptyForm = {
  open: false,
  editingId: null as string | null,
  name: '',
  categoryId: '',
  price: '',
  stock: '0',
  minStock: '0',
  description: '',
  imageUrl: '',
  sku: '',
};

/** Estado visual de inventario derivado de stock vs. minStock — alimenta el color del anillo y el badge. */
type StockHealth = 'out' | 'low' | 'ok';

const stockHealth = (stock: number, minStock: number): StockHealth => {
  if (stock <= 0) return 'out';
  if (stock <= minStock) return 'low';
  return 'ok';
};

const HEALTH_COLOR: Record<StockHealth, string> = {
  out: '#E2725B',
  low: '#F4B942',
  ok: '#5EC0D9',
};

/** Anillo de inventario: progreso circular puro CSS, sin librerías. Codifica stock real, no decora. */
const StockRing: React.FC<{ stock: number; minStock: number }> = ({ stock, minStock }) => {
  const health = stockHealth(stock, minStock);
  const ceiling = Math.max(minStock * 3, 6);
  const percent = Math.max(0, Math.min(1, stock / ceiling));
  const color = HEALTH_COLOR[health];
  return (
    <div
      className="relative w-12 h-12 rounded-full shrink-0"
      style={{ background: `conic-gradient(${color} ${percent * 360}deg, #E5E7EB 0deg)` }}
    >
      <div className="absolute inset-[3px] rounded-full bg-surface flex items-center justify-center">
        <span className="text-[12px] font-bold tabular-nums text-gray-800">{stock}</span>
      </div>
    </div>
  );
};

const ProductsManagementPage: React.FC = () => {
  const { storeId = '' } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockIds, setLowStockIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [form, setForm] = useState(emptyForm);
  const [stockModal, setStockModal] = useState<{ open: boolean; product: Product | null; value: string }>({ open: false, product: null, value: '' });
  const [historyModal, setHistoryModal] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [categories]);

  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) counts[p.categoryId] = (counts[p.categoryId] ?? 0) + 1;
    return counts;
  }, [products]);

  const visibleProducts = useMemo(
    () => (categoryFilter ? products.filter((p) => p.categoryId === categoryFilter) : products),
    [products, categoryFilter],
  );

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const token = await getToken().catch(() => null);
      const [storeData, cats, prods, lowStock] = await Promise.all([
        getStoreById(storeId, token).catch(() => null),
        productsApi.getCategories(storeId, token).catch(() => []),
        productsApi.getProducts(storeId, { includeInactive: true }, token).catch(() => []),
        productsApi.getLowStock(storeId, token).catch(() => []),
      ]);
      setStore(storeData);
      setCategories(cats);
      setProducts(prods);
      setLowStockIds(new Set(lowStock.map((p) => p.id)));
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo cargar el catálogo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storeId]);

  const openCreate = () => {
    if (categories.length === 0) {
      toast.info('Crea primero una categoría');
      return;
    }
    setForm({ ...emptyForm, open: true, categoryId: categoryFilter || categories[0].id });
  };

  const openEdit = (p: Product) => {
    setForm({
      open: true,
      editingId: p.id,
      name: p.name,
      categoryId: p.categoryId,
      price: String(parseFloat(p.price)),
      stock: String(p.stock),
      minStock: String(p.minStock ?? 0),
      description: p.description ?? '',
      imageUrl: p.imageUrl ?? '',
      sku: '',
    });
  };

  const submitForm = async () => {
    const price = Number(form.price);
    if (!form.name.trim() || !form.categoryId || !(price >= 0) || Number.isNaN(price)) {
      toast.error('Completa nombre, categoría y precio válido');
      return;
    }
    try {
      const token = await getToken();
      const base = {
        name: form.name.trim(),
        categoryId: form.categoryId,
        price,
        minStock: Number(form.minStock) || 0,
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
      };
      if (form.editingId) {
        const updated = await productsApi.updateProduct(form.editingId, base, token);
        setProducts((list) => list.map((p) => (p.id === updated.id ? updated : p)));
        toast.success('Producto actualizado');
      } else {
        const created = await productsApi.createProduct(
          { storeId, slug: slugify(form.name), stock: Number(form.stock) || 0, sku: form.sku.trim() || undefined, ...base },
          token,
        );
        setProducts((list) => [created, ...list]);
        toast.success('Producto creado');
      }
      setForm(emptyForm);
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo guardar el producto');
    }
  };

  const quickStock = async (p: Product, delta: number) => {
    try {
      const token = await getToken();
      const updated = await productsApi.adjustStock(
        p.id,
        { operation: delta > 0 ? 'add' : 'subtract', quantity: Math.abs(delta) },
        token,
      );
      setProducts((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo ajustar el stock');
    }
  };

  const submitSetStock = async () => {
    if (!stockModal.product) return;
    const quantity = Number(stockModal.value);
    if (Number.isNaN(quantity) || quantity < 0) { toast.error('Cantidad inválida'); return; }
    try {
      const token = await getToken();
      const updated = await productsApi.adjustStock(stockModal.product.id, { operation: 'set', quantity }, token);
      setProducts((list) => list.map((x) => (x.id === updated.id ? updated : x)));
      setStockModal({ open: false, product: null, value: '' });
      toast.success('Stock actualizado');
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo actualizar el stock');
    }
  };

  const toggleActive = async (p: Product) => {
    try {
      const token = await getToken();
      const updated = await productsApi.setActive(p.id, !p.isActive, token);
      setProducts((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo cambiar el estado');
    }
  };

  const removeProduct = async (p: Product) => {
    if (!window.confirm(`¿Eliminar "${p.name}"?`)) return;
    try {
      const token = await getToken();
      await productsApi.deleteProduct(p.id, token);
      setProducts((list) => list.filter((x) => x.id !== p.id));
      toast.success('Producto eliminado');
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo eliminar');
    }
  };

  const activeCount = products.filter((p) => p.isActive).length;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeItem="vendor-stores" />
      <main className="app-shift px-4 pb-6 pt-20 md:px-8 md:pb-8 lg:px-10">
        <div className="relative mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-gray-200 text-gray-700 font-medium text-sm hover:bg-primary/10">
                <ArrowLeft size={16} /> Volver
              </button>
              <div>
                <h1 className="text-2xl font-display font-semibold text-gray-900">Productos</h1>
                <p className="text-sm text-gray-500">{store?.name ?? 'Tienda'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">
                <RefreshCw size={16} /> Actualizar
              </button>
              <button onClick={() => navigate(`/vendor/stores/${storeId}/promotions`)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">
                <BadgePercent size={16} /> Promociones
              </button>
              <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90">
                <Plus size={16} /> Nuevo producto
              </button>
            </div>
          </div>

          {/* Resumen rápido */}
          {!loading && products.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-surface border border-gray-100 p-4">
                <p className="text-2xl font-display font-semibold text-gray-900 tabular-nums">{activeCount}</p>
                <p className="text-xs text-gray-500">Productos activos</p>
              </div>
              <div className="rounded-2xl bg-surface border border-gray-100 p-4">
                <p className="text-2xl font-display font-semibold text-gray-900 tabular-nums">{categories.length}</p>
                <p className="text-xs text-gray-500">Categorías</p>
              </div>
              <div className={`rounded-2xl border p-4 ${lowStockIds.size > 0 ? 'bg-danger/5 border-danger/20' : 'bg-surface border-gray-100'}`}>
                <p className={`text-2xl font-display font-semibold tabular-nums ${lowStockIds.size > 0 ? 'text-danger' : 'text-gray-900'}`}>{lowStockIds.size}</p>
                <p className={`text-xs ${lowStockIds.size > 0 ? 'text-danger/80' : 'text-gray-500'}`}>Con stock bajo</p>
              </div>
            </div>
          )}

          {/* Categorías */}
          <CategoryManager storeId={storeId} categories={categories} onCategoriesChange={setCategories} productCounts={productCounts} />

          {/* Filtro por categoría */}
          {categories.length > 0 && products.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setCategoryFilter('')}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${categoryFilter === '' ? 'bg-gray-900 text-white' : 'bg-surface border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <LayoutGrid size={13} /> Todas
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${categoryFilter === c.id ? 'bg-gray-900 text-white' : 'bg-surface border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Productos */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-40 rounded-2xl bg-white border border-gray-100" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl bg-surface border border-gray-100 shadow-card p-10 text-center text-gray-500">
              <Package className="mx-auto mb-2 text-primary" />
              No hay productos en esta tienda. Crea el primero con "Nuevo producto".
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="rounded-2xl bg-surface border border-gray-100 shadow-card p-10 text-center text-gray-500">
              Esta categoría todavía no tiene productos.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleProducts.map((p) => (
                <div key={p.id} className={`relative overflow-hidden rounded-2xl bg-surface border border-gray-100 shadow-card transition-shadow hover:shadow-lg ${!p.isActive ? 'opacity-60' : ''}`}>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-xl object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"><Package size={18} /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 leading-tight truncate">{p.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{categoryName(p.categoryId)}</p>
                      </div>
                      <StockRing stock={p.stock} minStock={p.minStock} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-display font-semibold text-gray-900 tabular-nums">{formatCOP(priceToCents(p.price))}</span>
                      <div className="flex items-center gap-1.5">
                        {!p.isActive && <span className="text-[10px] uppercase font-bold text-gray-400">inactivo</span>}
                        {lowStockIds.has(p.id) && (
                          <span title="Stock bajo" className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-danger">
                            <AlertTriangle size={11} /> stock bajo
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-200">
                      <div className="flex items-center gap-1">
                        <button onClick={() => quickStock(p, -1)} disabled={p.stock <= 0} className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40"><Minus size={13} /></button>
                        <button onClick={() => setStockModal({ open: true, product: p, value: String(p.stock) })} title="Fijar stock exacto" className="px-2 py-1 rounded-lg bg-gray-100 text-xs font-semibold text-gray-700 tabular-nums hover:bg-gray-200">
                          <span className="flex items-center gap-1"><Boxes size={11} /> stock</span>
                        </button>
                        <button onClick={() => quickStock(p, 1)} className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90"><Plus size={13} /></button>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setHistoryModal({ open: true, product: p })} title="Ver historial de inventario" className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"><History size={14} /></button>
                        <button onClick={() => openEdit(p)} title="Editar" className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"><Pencil size={14} /></button>
                        <button onClick={() => toggleActive(p)} title={p.isActive ? 'Desactivar' : 'Activar'} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500">{p.isActive ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                        <button onClick={() => removeProduct(p)} title="Eliminar" className="w-7 h-7 rounded-lg hover:bg-danger/10 flex items-center justify-center text-danger"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal crear/editar producto */}
      <ModalShell open={form.open} onClose={() => setForm(emptyForm)} title={form.editingId ? 'Editar producto' : 'Nuevo producto'} subtitle="Catálogo de la tienda">
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Datos generales</p>
            <FormInput label="Nombre" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Categoría</label>
              <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <FormInput label="Precio (COP)" type="number" value={form.price} onChange={(v) => setForm((f) => ({ ...f, price: v }))} />
            <FormInput label="Descripción (opcional)" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
          </div>

          <div className="space-y-3 pt-3 border-t border-gray-100">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Inventario</p>
            <div className="grid grid-cols-2 gap-3">
              {!form.editingId && <FormInput label="Stock inicial" type="number" value={form.stock} onChange={(v) => setForm((f) => ({ ...f, stock: v }))} />}
              <FormInput label="Stock mínimo (alerta)" type="number" value={form.minStock} onChange={(v) => setForm((f) => ({ ...f, minStock: v }))} />
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-gray-100">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Multimedia</p>
            <FormInput label="URL de imagen (opcional)" value={form.imageUrl} onChange={(v) => setForm((f) => ({ ...f, imageUrl: v }))} />
          </div>

          <button onClick={submitForm} className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90">
            {form.editingId ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </ModalShell>

      {/* Modal stock exacto */}
      <ModalShell open={stockModal.open} onClose={() => setStockModal({ open: false, product: null, value: '' })} title="Stock exacto" subtitle={stockModal.product?.name}>
        <div className="space-y-3">
          <FormInput label="Unidades en inventario" type="number" value={stockModal.value} onChange={(v) => setStockModal((s) => ({ ...s, value: v }))} />
          <button onClick={submitSetStock} className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90">Guardar</button>
        </div>
      </ModalShell>

      {/* Modal historial de inventario */}
      <InventoryHistoryModal
        open={historyModal.open}
        onClose={() => setHistoryModal({ open: false, product: null })}
        productId={historyModal.product?.id ?? null}
        productName={historyModal.product?.name}
      />
    </div>
  );
};

export default ProductsManagementPage;
