import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, Plus, Minus, Package, Tag, Trash2, Pencil, Eye, EyeOff, RefreshCw, Boxes } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import ModalShell from '../../components/wallet/ModalShell';
import FormInput from '../../components/ui/FormInput';
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
  description: '',
  imageUrl: '',
  sku: '',
};

const ProductsManagementPage: React.FC = () => {
  const { storeId = '' } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [stockModal, setStockModal] = useState<{ open: boolean; product: Product | null; value: string }>({ open: false, product: null, value: '' });

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? '—';
  }, [categories]);

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const token = await getToken().catch(() => null);
      const [storeData, cats, prods] = await Promise.all([
        getStoreById(storeId, token).catch(() => null),
        productsApi.getCategories(storeId, token).catch(() => []),
        productsApi.getProducts(storeId, { includeInactive: true }, token).catch(() => []),
      ]);
      setStore(storeData);
      setCategories(cats);
      setProducts(prods);
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo cargar el catálogo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storeId]);

  const handleCreateCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    try {
      const token = await getToken();
      const created = await productsApi.createCategory({ storeId, name, slug: slugify(name) }, token);
      setCategories((c) => [...c, created]);
      setNewCategory('');
      toast.success(`Categoría "${created.name}" creada`);
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo crear la categoría');
    }
  };

  const openCreate = () => {
    if (categories.length === 0) {
      toast.info('Crea primero una categoría');
      return;
    }
    setForm({ ...emptyForm, open: true, categoryId: categories[0].id });
  };

  const openEdit = (p: Product) => {
    setForm({
      open: true,
      editingId: p.id,
      name: p.name,
      categoryId: p.categoryId,
      price: String(parseFloat(p.price)),
      stock: String(p.stock),
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      <Sidebar activeItem="vendor-stores" />
      <main className="ml-16 p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 border border-white/40 text-gray-700 font-medium text-sm hover:bg-yellow-50">
                <ArrowLeft size={16} /> Volver
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
                <p className="text-sm text-gray-500">{store?.name ?? 'Tienda'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/70 border border-white/50 text-gray-700 font-semibold hover:bg-white">
                <RefreshCw size={16} /> Actualizar
              </button>
              <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-400 text-white font-semibold hover:bg-yellow-500">
                <Plus size={16} /> Nuevo producto
              </button>
            </div>
          </div>

          {/* Categorías */}
          <div className="rounded-2xl bg-white/70 border border-white/40 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-yellow-500" />
              <h2 className="font-bold text-gray-900">Categorías</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.length === 0 && <span className="text-sm text-gray-400">Aún no hay categorías. Crea una para empezar.</span>}
              {categories.map((c) => (
                <span key={c.id} className="px-3 py-1 rounded-lg bg-yellow-50 text-yellow-700 text-sm font-medium">{c.name}</span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateCategory(); }}
                placeholder="Nueva categoría (p. ej. Bebidas)"
                className="flex-1 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
              <button onClick={handleCreateCategory} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800">Añadir</button>
            </div>
          </div>

          {/* Productos */}
          {loading ? (
            <p className="text-sm text-gray-500">Cargando…</p>
          ) : products.length === 0 ? (
            <div className="rounded-2xl bg-white/60 border border-white/50 p-10 text-center text-gray-500">
              <Package className="mx-auto mb-2 text-yellow-400" />
              No hay productos en esta tienda. Crea el primero con "Nuevo producto".
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p.id} className={`rounded-2xl border p-4 flex items-center gap-4 ${p.isActive ? 'bg-white/70 border-white/50' : 'bg-gray-50 border-gray-200 opacity-70'}`}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-14 h-14 rounded-xl object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-400"><Package size={20} /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">{p.name}</h3>
                      {!p.isActive && <span className="text-[10px] uppercase font-bold text-gray-400">inactivo</span>}
                    </div>
                    <p className="text-xs text-gray-500">{categoryName(p.categoryId)} · {formatCOP(priceToCents(p.price))}</p>
                  </div>

                  {/* Stock */}
                  <div className="flex items-center gap-1">
                    <button onClick={() => quickStock(p, -1)} disabled={p.stock <= 0} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40"><Minus size={13} /></button>
                    <button onClick={() => setStockModal({ open: true, product: p, value: String(p.stock) })} title="Stock exacto" className="min-w-[3rem] px-2 py-1 rounded-lg bg-gray-100 text-sm font-semibold text-gray-800 hover:bg-gray-200">
                      <span className="flex items-center gap-1 justify-center"><Boxes size={12} /> {p.stock}</span>
                    </button>
                    <button onClick={() => quickStock(p, 1)} className="w-7 h-7 rounded-lg bg-yellow-400 text-white flex items-center justify-center hover:bg-yellow-500"><Plus size={13} /></button>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(p)} title="Editar" className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"><Pencil size={15} /></button>
                    <button onClick={() => toggleActive(p)} title={p.isActive ? 'Desactivar' : 'Activar'} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500">{p.isActive ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                    <button onClick={() => removeProduct(p)} title="Eliminar" className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal crear/editar producto */}
      <ModalShell open={form.open} onClose={() => setForm(emptyForm)} title={form.editingId ? 'Editar producto' : 'Nuevo producto'} subtitle="Catálogo de la tienda">
        <div className="space-y-3">
          <FormInput label="Nombre" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Categoría</label>
            <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white/60 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Precio (COP)" type="number" value={form.price} onChange={(v) => setForm((f) => ({ ...f, price: v }))} />
            {!form.editingId && <FormInput label="Stock inicial" type="number" value={form.stock} onChange={(v) => setForm((f) => ({ ...f, stock: v }))} />}
          </div>
          <FormInput label="Descripción (opcional)" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
          <FormInput label="URL de imagen (opcional)" value={form.imageUrl} onChange={(v) => setForm((f) => ({ ...f, imageUrl: v }))} />
          <button onClick={submitForm} className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold hover:from-yellow-500 hover:to-yellow-600">
            {form.editingId ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </ModalShell>

      {/* Modal stock exacto */}
      <ModalShell open={stockModal.open} onClose={() => setStockModal({ open: false, product: null, value: '' })} title="Stock exacto" subtitle={stockModal.product?.name}>
        <div className="space-y-3">
          <FormInput label="Unidades en inventario" type="number" value={stockModal.value} onChange={(v) => setStockModal((s) => ({ ...s, value: v }))} />
          <button onClick={submitSetStock} className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold hover:from-yellow-500 hover:to-yellow-600">Guardar</button>
        </div>
      </ModalShell>
    </div>
  );
};

export default ProductsManagementPage;
