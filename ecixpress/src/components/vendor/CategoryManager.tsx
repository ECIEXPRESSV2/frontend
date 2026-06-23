import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Plus, Pencil, Trash2, Tag, ChevronRight, ChevronDown, FolderTree } from 'lucide-react';
import ModalShell from '../wallet/ModalShell';
import FormInput from '../ui/FormInput';
import { useAuth } from '../../context/AuthContext';
import {
  categoriesApi,
  slugify,
  type Category,
  type ProductCategory,
  type CreateCategoryInput,
} from '../../lib/products-api';

interface CategoryManagerProps {
  storeId: string;
  categories: ProductCategory[];
  onCategoriesChange: (categories: ProductCategory[]) => void;
  /** Cantidad de productos por categoría, para el chip informativo de cada fila. */
  productCounts?: Record<string, number>;
}

const emptyForm = {
  open: false,
  editingId: null as string | null,
  name: '',
  slug: '',
  parentId: '',
  description: '',
};

/** Paleta cíclica para distinguir ramas de categorías de un vistazo (no es decoración: cada color identifica una raíz distinta). */
const BRANCH_COLORS = ['#F4B942', '#5EC0D9', '#E2725B', '#8E7FD1', '#5BAE82'];

/** Tarjeta de gestión de categorías: árbol + alta/edición/borrado inline. */
const CategoryManager: React.FC<CategoryManagerProps> = ({ storeId, categories, onCategoriesChange, productCounts }) => {
  const { getToken } = useAuth();
  const [tree, setTree] = useState<Category[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [form, setForm] = useState(emptyForm);

  const flatById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const loadTree = async () => {
    if (!storeId) return;
    setLoadingTree(true);
    try {
      const token = await getToken().catch(() => null);
      const result = await categoriesApi.getTree(storeId, token);
      setTree(result);
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo cargar el árbol de categorías');
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    void loadTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, categories.length]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = () => setForm({ ...emptyForm, open: true });

  const openEdit = (c: ProductCategory) => {
    setForm({
      open: true,
      editingId: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId ?? '',
      description: c.description ?? '',
    });
  };

  const closeForm = () => setForm(emptyForm);

  const refreshFlatList = async (token: string | null) => {
    const fresh = await categoriesApi.getAll(storeId, token);
    onCategoriesChange(fresh);
  };

  const submitForm = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error('El nombre es obligatorio');
      return;
    }
    try {
      const token = await getToken();
      const slug = form.slug.trim() || slugify(name);
      const base = {
        name,
        slug,
        parentId: form.parentId || undefined,
        description: form.description.trim() || undefined,
      };
      if (form.editingId) {
        await categoriesApi.update(form.editingId, base, token);
        toast.success('Categoría actualizada');
      } else {
        const input: CreateCategoryInput = { storeId, ...base };
        await categoriesApi.create(input, token);
        toast.success(`Categoría "${name}" creada`);
      }
      closeForm();
      await Promise.all([loadTree(), refreshFlatList(token)]);
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo guardar la categoría');
    }
  };

  const removeCategory = async (c: ProductCategory) => {
    if (!window.confirm(`¿Eliminar la categoría "${c.name}"?`)) return;
    try {
      const token = await getToken();
      await categoriesApi.remove(c.id, token);
      toast.success('Categoría eliminada');
      await Promise.all([loadTree(), refreshFlatList(token)]);
    } catch (e) {
      // El backend devuelve 409 con un mensaje claro si tiene subcategorías o
      // productos activos — se muestra verbatim, sin genericizar.
      toast.error((e as Error).message || 'No se pudo eliminar la categoría');
    }
  };

  const renderNode = (node: Category, depth: number, branchColor: string): React.ReactNode => {
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isExpanded = expanded.has(node.id);
    const isRoot = depth === 0;
    const count = productCounts?.[node.id];

    const row = (
      <div
        className={`flex items-center gap-2.5 py-2.5 px-2 rounded-lg hover:bg-gray-50 group ${!isRoot ? 'relative' : ''}`}
        style={{ paddingLeft: isRoot ? '0.5rem' : `${depth * 1.25 + 0.75}rem` }}
      >
        {!isRoot && (
          <span
            className="absolute border-l border-gray-200"
            style={{ left: `${(depth - 1) * 1.25 + 1.1}rem`, top: '-0.25rem', bottom: '0.5rem' }}
          />
        )}
        {hasChildren ? (
          <button onClick={() => toggleExpanded(node.id)} className="text-gray-400 hover:text-gray-700 shrink-0">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-[14px] shrink-0" />
        )}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: node.isActive ? branchColor : '#D1D5DB' }}
        />
        <span className={`text-sm ${node.isActive ? 'text-gray-800' : 'text-gray-400 italic'} ${isRoot ? 'font-semibold' : 'font-medium'} flex-1 truncate`}>
          {node.name}
        </span>
        {typeof count === 'number' && (
          <span className="text-[11px] font-semibold text-gray-400 tabular-nums shrink-0">
            {count} {count === 1 ? 'producto' : 'productos'}
          </span>
        )}
        {!node.isActive && <span className="text-[10px] uppercase font-bold text-gray-400 shrink-0">inactiva</span>}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => openEdit(node)} title="Editar" className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500">
            <Pencil size={13} />
          </button>
          <button onClick={() => removeCategory(node)} title="Eliminar" className="w-7 h-7 rounded-lg hover:bg-danger/10 flex items-center justify-center text-danger">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );

    if (isRoot) {
      return (
        <div key={node.id} className="relative overflow-hidden rounded-2xl bg-surface border border-gray-100 flex items-stretch transition-shadow hover:shadow-card">
          <div className="w-1 shrink-0 rounded-l-2xl" style={{ background: node.isActive ? branchColor : '#D1D5DB' }} />
          <div className="flex-1">
            {row}
            {hasChildren && isExpanded && (
              <div className="border-t border-dashed border-gray-200 py-1">
                {node.children!.map((child) => renderNode(child as Category, depth + 1, branchColor))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={node.id}>
        {row}
        {hasChildren && isExpanded && node.children!.map((child) => renderNode(child as Category, depth + 1, branchColor))}
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-surface border border-gray-100 shadow-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-primary" />
          <h2 className="font-display font-semibold text-gray-900">Categorías</h2>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90">
          <Plus size={14} /> Nueva
        </button>
      </div>

      {loadingTree ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : tree.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-2 py-8 text-gray-400">
          <FolderTree size={28} className="text-gray-300" />
          <p className="text-sm">Aún no hay categorías. Crea la primera para empezar a organizar tu catálogo.</p>
        </div>
      ) : (
        <div className="space-y-2">{tree.map((node, i) => renderNode(node, 0, BRANCH_COLORS[i % BRANCH_COLORS.length]))}</div>
      )}

      <ModalShell open={form.open} onClose={closeForm} title={form.editingId ? 'Editar categoría' : 'Nueva categoría'} subtitle="Catálogo de la tienda">
        <div className="space-y-3">
          <FormInput
            label="Nombre"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v, slug: f.editingId ? f.slug : slugify(v) }))}
          />
          <FormInput label="Slug" value={form.slug} onChange={(v) => setForm((f) => ({ ...f, slug: v }))} />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Categoría padre (opcional)</label>
            <select
              value={form.parentId}
              onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">— Sin categoría padre —</option>
              {categories
                .filter((c) => c.id !== form.editingId)
                .map((c) => (
                  <option key={c.id} value={c.id}>{flatById.get(c.id)?.name ?? c.name}</option>
                ))}
            </select>
          </div>
          <FormInput label="Descripción (opcional)" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
          <button onClick={submitForm} className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90">
            {form.editingId ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </div>
      </ModalShell>
    </div>
  );
};

export default CategoryManager;
