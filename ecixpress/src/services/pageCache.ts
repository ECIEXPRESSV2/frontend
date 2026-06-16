const pageCache = new Map<string, unknown>();

export const pageCacheKeys = {
  adminUsers: (search = '') => `admin-users:${search.trim()}`,
  adminRoles: 'admin-roles',
  adminAudit: (page: number, action = '') => `admin-audit:${page}:${action.trim()}`,
  adminStores: 'admin-stores',
  adminStoreDetail: (storeId: string) => `admin-store-detail:${storeId}`,
  vendorStores: 'vendor-stores',
};

export function getPageCache<T>(key: string): T | undefined {
  return pageCache.get(key) as T | undefined;
}

export function setPageCache<T>(key: string, value: T): T {
  pageCache.set(key, value);
  return value;
}

export function deletePageCache(key: string): void {
  pageCache.delete(key);
}
