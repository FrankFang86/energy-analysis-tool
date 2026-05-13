/**
 * 本地缓存工具 - 使用 localStorage 缓存项目数据
 */

const CACHE_PREFIX = 'energy_tool_';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天过期

interface CacheData<T> {
  data: T;
  timestamp: number;
  userId: string;
}

/**
 * 保存数据到本地缓存
 */
export function setCache<T>(key: string, data: T, userId: string): void {
  try {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now(),
      userId,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData));
  } catch (err) {
    console.error('缓存保存失败:', err);
  }
}

/**
 * 从本地缓存读取数据
 */
export function getCache<T>(key: string, userId: string): T | null {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;

    const cacheData: CacheData<T> = JSON.parse(cached);

    // 检查用户ID是否匹配
    if (cacheData.userId !== userId) {
      clearCache(key);
      return null;
    }

    // 检查是否过期
    if (Date.now() - cacheData.timestamp > CACHE_EXPIRY) {
      clearCache(key);
      return null;
    }

    return cacheData.data;
  } catch (err) {
    console.error('缓存读取失败:', err);
    clearCache(key);
    return null;
  }
}

/**
 * 清除指定缓存
 */
export function clearCache(key: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch (err) {
    console.error('缓存清除失败:', err);
  }
}

/**
 * 清除所有应用缓存
 */
export function clearAllCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (err) {
    console.error('清除所有缓存失败:', err);
  }
}

/**
 * 检查缓存是否有效
 */
export function isCacheValid(key: string, userId: string): boolean {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return false;

    const cacheData: CacheData<any> = JSON.parse(cached);

    // 检查用户ID
    if (cacheData.userId !== userId) return false;

    // 检查过期
    if (Date.now() - cacheData.timestamp > CACHE_EXPIRY) return false;

    return true;
  } catch {
    return false;
  }
}
