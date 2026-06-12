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
  imageUrl?: string;
  status: 'OPEN' | 'CLOSED' | 'TEMPORARILY_CLOSED';
  isActive: boolean;
  createdAt: string;
  schedules?: StoreSchedule[];
  closures?: StoreClosure[];
  staff?: StoreStaff[];
}

export interface CreateStoreDto {
  name: string;
  type: 'CAFETERIA' | 'PAPELERIA' | 'RESTAURANTE';
  location: string;
  description?: string;
  imageUrl?: string;
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

export const getStores = (token: string) =>
  apiFetch<Store[]>('/stores', token);

export const getAvailableStores = (token: string | null) =>
  apiFetch<Store[]>('/stores/available', token);

export const getMyStores = (token: string) =>
  apiFetch<Store[]>('/stores/my', token);

export const getStoreById = (id: string, token: string | null) =>
  apiFetch<Store>(`/stores/${id}`, token);

export const getStoreSchedules = (storeId: string, token: string | null) =>
  apiFetch<StoreSchedule[]>(`/stores/${storeId}/schedules`, token);

export const getStoreClosures = (storeId: string, token: string) =>
  apiFetch<StoreClosure[]>(`/stores/${storeId}/closures`, token);

export const createStore = (data: CreateStoreDto, token: string) =>
  apiFetch<Store>('/stores', token, { method: 'POST', body: JSON.stringify(data) });

export const updateStore = (id: string, data: Partial<CreateStoreDto>, token: string) =>
  apiFetch<Store>(`/stores/${id}`, token, { method: 'PUT', body: JSON.stringify(data) });

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
