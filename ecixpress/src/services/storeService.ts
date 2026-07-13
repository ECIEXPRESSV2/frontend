import { apiFetch } from './api';

export interface StoreSchedule {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isActive: boolean;
}

export interface StoreClosure {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: string;
  createdAt: string;
}

export interface StoreStaff {
  id: string;
  userId: string;
  assignedAt: string;
  user?: { id: string; fullName: string; email: string };
}

export interface Store {
  id: string;
  name: string;
  type: 'CAFETERIA' | 'PAPELERIA' | 'RESTAURANTE';
  location: string;
  description?: string;
  /** URL pública del logo en Azure Blob (stores/<id>/logo/imagen.png). La setea el backend. */
  imageUrl?: string;
  /** URL pública del banner en Azure Blob (stores/<id>/banner/imagen.png). La setea el backend. */
  bannerUrl?: string;
  status: 'OPEN' | 'CLOSED' | 'TEMPORARILY_CLOSED';
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  schedules?: StoreSchedule[];
  closures?: StoreClosure[];
  staff?: StoreStaff[];
}

export interface CreateStoreDto {
  name: string;
  type: 'CAFETERIA' | 'PAPELERIA' | 'RESTAURANTE';
  location: string;
  description?: string;
}

/** Una imagen de la galería de la tienda (stores/<id>/images/…). */
export interface StoreGalleryImage {
  url: string;
  name: string;
  uploadedAt: string | null;
}

export interface CreateScheduleDto {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isActive: boolean;
}

export interface CreateClosureDto {
  startDate: string;
  endDate: string;
  reason?: string;
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const getDayName = (day: number) => DAY_NAMES[day] ?? `Día ${day}`;

export interface ScheduleGroup {
  label: string;
  openTime: string;
  closeTime: string;
  days: number[];
}

/**
 * Agrupa días consecutivos (Lunes a Domingo) con el mismo horario en una sola línea
 * ("Lunes a Viernes · 8:00 – 18:00") para que el horario real de la tienda se lea
 * corto y no abrume al comprador con las 7 filas del día por día.
 */
const labelForDays = (days: number[]): string => {
  if (days.length === 1) return getDayName(days[0]);
  if (days.length === 2) return `${getDayName(days[0])} y ${getDayName(days[1])}`;
  return `${getDayName(days[0])} a ${getDayName(days.at(-1)!)}`;
};

export const groupSchedules = (schedules: StoreSchedule[]): ScheduleGroup[] => {
  const weekOrder = [1, 2, 3, 4, 5, 6, 0];
  const byDay = new Map(schedules.filter((s) => s.isActive).map((s) => [s.dayOfWeek, s]));
  const groups: { days: number[]; openTime: string; closeTime: string }[] = [];
  let previousDay: number | null = null;

  for (const day of weekOrder) {
    const s = byDay.get(day);
    if (!s) {
      previousDay = null;
      continue;
    }
    const last = groups.at(-1);
    const isConsecutive = last?.openTime === s.openTime && last?.closeTime === s.closeTime && previousDay !== null;
    if (last && isConsecutive) {
      last.days.push(day);
    } else {
      groups.push({ days: [day], openTime: s.openTime, closeTime: s.closeTime });
    }
    previousDay = day;
  }

  return groups.map((g) => ({ ...g, label: labelForDays(g.days) }));
};

export const getStores = (token: string) =>
  apiFetch<Store[]>('/stores', token);

export const getAvailableStores = (token: string | null) =>
  apiFetch<Store[]>('/stores/available', token);

export const getMyStores = (token: string) =>
  apiFetch<Store[]>('/stores/my', token);

export const getStoresByUser = (userId: string, token: string) =>
  apiFetch<Store[]>(`/stores/user/${userId}`, token);

export const getStoreById = (id: string, token: string | null) =>
  apiFetch<Store>(`/stores/${id}`, token);

export const getStoreSchedules = (storeId: string, token: string | null) =>
  apiFetch<StoreSchedule[]>(`/stores/${storeId}/schedules`, token);

export const getStoreClosures = (storeId: string, token: string) =>
  apiFetch<StoreClosure[]>(`/stores/${storeId}/closures`, token);

/**
 * Crea una tienda. El backend exige `multipart/form-data` con el **logo** y el **banner**
 * OBLIGATORIOS: los sube a Azure Blob (stores/<id>/logo|banner/imagen.png) y devuelve la tienda
 * ya con `imageUrl` y `bannerUrl`.
 */
export const createStore = (data: CreateStoreDto, logo: File, banner: File, token: string) => {
  const body = new FormData();
  body.append('name', data.name);
  body.append('type', data.type);
  body.append('location', data.location);
  if (data.description) body.append('description', data.description);
  body.append('logo', logo);
  body.append('banner', banner);
  return apiFetch<Store>('/stores', token, { method: 'POST', body });
};

export const updateStore = (id: string, data: Partial<CreateStoreDto>, token: string) =>
  apiFetch<Store>(`/stores/${id}`, token, { method: 'PUT', body: JSON.stringify(data) });

/**
 * Sube/reemplaza el logo (multipart) al backend, que lo guarda en Azure Blob Storage como
 * stores/<storeId>/logo/imagen.png y actualiza `imageUrl`. Devuelve la tienda ya actualizada.
 */
export const uploadStoreLogo = (id: string, file: File, token: string) => {
  const body = new FormData();
  body.append('file', file);
  return apiFetch<Store>(`/stores/${id}/logo`, token, { method: 'POST', body });
};

/**
 * Sube/reemplaza el banner (multipart) al backend, que lo guarda como
 * stores/<storeId>/banner/imagen.png y persiste `bannerUrl` en la tienda.
 */
export const uploadStoreBanner = (id: string, file: File, token: string) => {
  const body = new FormData();
  body.append('file', file);
  return apiFetch<{ storeId: string; bannerUrl: string }>(`/stores/${id}/banner`, token, {
    method: 'POST',
    body,
  });
};

// ── Galería de imágenes de la tienda (stores/<id>/images/…) ──────────────────

/** Lista las imágenes de la galería de una tienda (endpoint público). */
export const getStoreImages = (id: string, token: string | null) =>
  apiFetch<{ storeId: string; images: StoreGalleryImage[] }>(`/stores/${id}/images`, token);

/** Sube una o varias imágenes a la galería; devuelve la galería completa ya actualizada. */
export const addStoreImages = (id: string, files: File[], token: string) => {
  const body = new FormData();
  files.forEach(f => body.append('files', f));
  return apiFetch<{ storeId: string; images: StoreGalleryImage[] }>(`/stores/${id}/images`, token, {
    method: 'POST',
    body,
  });
};

/** Elimina una imagen de la galería por su `name` (el que devuelve getStoreImages). */
export const deleteStoreImage = (id: string, name: string, token: string) =>
  apiFetch<{ storeId: string; name: string; message: string }>(
    `/stores/${id}/images/${encodeURIComponent(name)}`,
    token,
    { method: 'DELETE' },
  );

export const updateStoreStatus = (id: string, status: string, token: string) =>
  apiFetch<Store>(`/stores/${id}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const createSchedule = (storeId: string, data: CreateScheduleDto, token: string) =>
  apiFetch<StoreSchedule>(`/stores/${storeId}/schedules`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateSchedule = (
  storeId: string,
  scheduleId: string,
  data: Partial<CreateScheduleDto>,
  token: string
) =>
  apiFetch<StoreSchedule>(`/stores/${storeId}/schedules/${scheduleId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteSchedule = (storeId: string, scheduleId: string, token: string) =>
  apiFetch<void>(`/stores/${storeId}/schedules/${scheduleId}`, token, { method: 'DELETE' });

export const createClosure = (storeId: string, data: CreateClosureDto, token: string) =>
  apiFetch<StoreClosure>(`/stores/${storeId}/closures`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const cancelClosure = (storeId: string, closureId: string, token: string) =>
  apiFetch<void>(`/stores/${storeId}/closures/${closureId}`, token, { method: 'DELETE' });

export const assignStaff = (storeId: string, userId: string, token: string) =>
  apiFetch<StoreStaff>(`/stores/${storeId}/staff`, token, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });

export const removeStaff = (storeId: string, userId: string, token: string) =>
  apiFetch<void>(`/stores/${storeId}/staff/${userId}`, token, { method: 'DELETE' });
