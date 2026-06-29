import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, Plus, Trash2, Pencil, Eye, EyeOff, RefreshCw, BadgePercent, Filter } from 'lucide-react';
import Sidebar from '../../components/home/Sidebar';
import ModalShell from '../../components/wallet/ModalShell';
import FormInput from '../../components/ui/FormInput';
import { useAuth } from '../../context/AuthContext';
import { getStoreById, type Store } from '../../services/storeService';
import { productsApi, categoriesApi, priceToCents, type Product, type ProductCategory } from '../../lib/products-api';
import {
  promotionsApi,
  type Promotion,
  type PromotionScope,
  type DiscountType,
  type CreatePromotionInput,
} from '../../lib/promotions-api';
import { formatCOP, formatDateTime } from '../../lib/format';

const emptyForm = {
  open: false,
  editingId: null as string | null,
  name: '',
  description: '',
  scope: 'PRODUCT' as PromotionScope,
  targetId: '',
  discountType: 'PERCENTAGE' as DiscountType,
  discountValue: '',
  startsAt: '',
  endsAt: '',
};

/** Convierte un ISO string a formato compatible con <input type="datetime-local">. */
const toDatetimeLocal = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const PromotionsPage: React.FC = () => {
  const { storeId = '' } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [form, setForm] = useState(emptyForm);

  const targetName = useMemo(() => {
    const productMap = new Map(products.map((p) => [p.id, p.name]));
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    return (scope: PromotionScope, targetId: string) =>
      (scope === 'PRODUCT' ? productMap.get(targetId) : categoryMap.get(targetId)) ?? '—';
  }, [products, categories]);

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const token = await getToken().catch(() => null);
      const [storeData, prods, cats, promos] = await Promise.all([
        getStoreById(storeId, token).catch(() => null),
        productsApi.getAll(storeId, { includeInactive: true }, token).catch(() => []),
        categoriesApi.getAll(storeId, token).catch(() => []),
        promotionsApi.getAll(storeId, true, token).catch(() => []),
      ]);
      setStore(storeData);
      setProducts(prods);
      setCategories(cats);
      setPromotions(promos);
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo cargar las promociones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storeId]);

  const visiblePromotions = includeInactive ? promotions : promotions.filter((p) => p.isActive);

  const openCreate = () => {
    if (products.length === 0 && categories.length === 0) {
      toast.info('Crea primero un producto o categoría');
      return;
    }
    setForm({
      ...emptyForm,
      open: true,
      targetId: products[0]?.id ?? categories[0]?.id ?? '',
      scope: products.length > 0 ? 'PRODUCT' : 'CATEGORY',
    });
  };

  const openEdit = (p: Promotion) => {
    setForm({
      open: true,
      editingId: p.id,
      name: p.name,
      description: p.description ?? '',
      scope: p.scope,
      targetId: p.targetId,
      discountType: p.type,
      discountValue: String(p.value),
      startsAt: toDatetimeLocal(p.startsAt),
      endsAt: toDatetimeLocal(p.endsAt),
    });
  };

  const closeForm = () => setForm(emptyForm);

  const submitForm = async () => {
    const discountValue = Number(form.discountValue);
    if (!form.name.trim() || !form.targetId || !(discountValue > 0) || !form.startsAt || !form.endsAt) {
      toast.error('Completa nombre, destino, valor de descuento y fechas válidas');
      return;
    }
    if (new Date(form.endsAt) <= new Date(form.startsAt)) {
      toast.error('La fecha de fin debe ser posterior a la de inicio');
      return;
    }
    try {
      const token = await getToken();
      const base = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        scope: form.scope,
        targetId: form.targetId,
        type: form.discountType,
        value: discountValue,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
      };
      if (form.editingId) {
        const updated = await promotionsApi.update(form.editingId, base, token);
        setPromotions((list) => list.map((p) => (p.id === updated.id ? updated : p)));
        toast.success('Promoción actualizada');
      } else {
        const input: CreatePromotionInput = { storeId, ...base };
        const created = await promotionsApi.create(input, token);
        setPromotions((list) => [created, ...list]);
        toast.success('Promoción creada');
      }
      closeForm();
    } catch (e) {
      // 409 por solapamiento de fechas en el mismo destino — se muestra el
      // mensaje exacto del backend, sin genericizar.
      toast.error((e as Error).message || 'No se pudo guardar la promoción');
    }
  };

  const toggleActive = async (p: Promotion) => {
    try {
      const token = await getToken();
      const updated = p.isActive
        ? await promotionsApi.deactivate(p.id, token)
        : await promotionsApi.activate(p.id, token);
      setPromotions((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo cambiar el estado');
    }
  };

  const removePromotion = async (p: Promotion) => {
    if (!window.confirm('¿Eliminar esta promoción?')) return;
    try {
      const token = await getToken();
      await promotionsApi.remove(p.id, token);
      setPromotions((list) => list.filter((x) => x.id !== p.id));
      toast.success('Promoción eliminada');
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo eliminar');
    }
  };

  const discountLabel = (p: Promotion) =>
    p.type === 'PERCENTAGE' ? `${p.value}%` : formatCOP(priceToCents(p.value));

  const isCurrentlyValid = (p: Promotion) => {
    const now = Date.now();
    return p.isActive && new Date(p.startsAt).getTime() <= now && now <= new Date(p.endsAt).getTime();
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeItem="vendor-stores" />
      <main className="ml-16 px-4 pb-6 pt-20 md:px-8 md:pb-8 lg:px-10">
        <div className="relative mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-gray-200 text-gray-700 font-medium text-sm hover:bg-primary/10">
                <ArrowLeft size={16} /> Volver
              </button>
              <div>
                <h1 className="text-2xl font-display font-semibold text-gray-900">Promociones</h1>
                <p className="text-sm text-gray-500">{store?.name ?? 'Tienda'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">
                <RefreshCw size={16} /> Actualizar
              </button>
              <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90">
                <Plus size={16} /> Nueva promoción
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIncludeInactive((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Filter size={14} /> {includeInactive ? 'Mostrando todas' : 'Solo activas'}
            </button>
          </div>

          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-white border border-gray-100" />
              ))}
            </div>
          ) : visiblePromotions.length === 0 ? (
            <div className="rounded-2xl bg-surface border border-gray-100 shadow-card p-10 text-center text-gray-500">
              <BadgePercent className="mx-auto mb-2 text-primary" />
              No hay promociones. Crea la primera con "Nueva promoción".
            </div>
          ) : (
            <div className="space-y-3">
              {visiblePromotions.map((p) => {
                const valid = isCurrentlyValid(p);
                return (
                  <div key={p.id} className={`relative overflow-hidden rounded-2xl bg-surface shadow-card flex items-stretch ${!p.isActive ? 'opacity-60' : ''}`}>
                    <div className={`w-1 shrink-0 rounded-l-2xl ${valid ? 'bg-secondary' : 'bg-gray-300'}`} />
                    <div className="flex-1 p-4">
                      <div className="flex items-center gap-4">
                        <div className={`shrink-0 text-2xl font-display font-semibold tabular-nums tracking-wide ${valid ? 'text-secondary' : 'text-primary'}`}>
                          {discountLabel(p)}
                        </div>
                        <div className="flex-1 min-w-0 border-l border-dashed border-gray-200 pl-4">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 truncate">{p.name}</h3>
                            <span className="text-[10px] uppercase font-bold text-gray-400">{p.scope === 'PRODUCT' ? 'producto' : 'categoría'}</span>
                            {!p.isActive && <span className="text-[10px] uppercase font-bold text-gray-400">inactiva</span>}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{targetName(p.scope, p.targetId)}</p>
                          <p className="text-xs text-gray-500 tabular-nums tracking-wide">
                            {formatDateTime(p.startsAt)} → {formatDateTime(p.endsAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(p)} title="Editar" className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"><Pencil size={15} /></button>
                          <button onClick={() => toggleActive(p)} title={p.isActive ? 'Desactivar' : 'Activar'} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500">{p.isActive ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                          <button onClick={() => removePromotion(p)} title="Eliminar" className="w-8 h-8 rounded-lg hover:bg-danger/10 flex items-center justify-center text-danger"><Trash2 size={15} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <ModalShell open={form.open} onClose={closeForm} title={form.editingId ? 'Editar promoción' : 'Nueva promoción'} subtitle="Catálogo de la tienda">
        <div className="space-y-3">
          <FormInput
            label="Nombre"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          />
          <FormInput
            label="Descripción (opcional)"
            value={form.description}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
          />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de destino</label>
            <select
              value={form.scope}
              onChange={(e) => {
                const scope = e.target.value as PromotionScope;
                setForm((f) => ({ ...f, scope, targetId: scope === 'PRODUCT' ? (products[0]?.id ?? '') : (categories[0]?.id ?? '') }));
              }}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="PRODUCT">Producto</option>
              <option value="CATEGORY">Categoría</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{form.scope === 'PRODUCT' ? 'Producto' : 'Categoría'}</label>
            <select
              value={form.targetId}
              onChange={(e) => setForm((f) => ({ ...f, targetId: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {(form.scope === 'PRODUCT' ? products : categories).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de descuento</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as DiscountType }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="PERCENTAGE">Porcentaje (%)</option>
                <option value="FIXED_AMOUNT">Monto fijo (COP)</option>
              </select>
            </div>
            <FormInput
              label={form.discountType === 'PERCENTAGE' ? 'Valor (%)' : 'Valor (COP)'}
              type="number"
              value={form.discountValue}
              onChange={(v) => setForm((f) => ({ ...f, discountValue: v }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Inicio" type="datetime-local" value={form.startsAt} onChange={(v) => setForm((f) => ({ ...f, startsAt: v }))} />
            <FormInput label="Fin" type="datetime-local" value={form.endsAt} onChange={(v) => setForm((f) => ({ ...f, endsAt: v }))} />
          </div>
          <button onClick={submitForm} className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90">
            {form.editingId ? 'Guardar cambios' : 'Crear promoción'}
          </button>
        </div>
      </ModalShell>
    </div>
  );
};

export default PromotionsPage;
