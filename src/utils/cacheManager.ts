/**
 * Smart Cache Manager
 * نظام كاش ذكي يوفر السرعة مع التحديث التلقائي
 */

// Cache keys
export const CACHE_KEYS = {
    USERS: 'users_data',
    CLIENTS: 'clients_data',
    LAWYERS: 'lawyers_data',
    CASES: 'cases_data',
    TASKS: 'tasks_data',
    DOCUMENTS: 'documents_data',
    SESSIONS: 'sessions_data',
    WEKALAT: 'wekalat_data',
    NOTIFICATIONS: 'notifications_data',
} as const;

// Cache durations (in milliseconds)
export const CACHE_DURATIONS = {
    SHORT: 2 * 60 * 1000,      // 2 minutes - للبيانات المتغيرة كثيراً
    MEDIUM: 5 * 60 * 1000,     // 5 minutes - للبيانات المتغيرة أحياناً
    LONG: 15 * 60 * 1000,      // 15 minutes - للبيانات الثابتة نسبياً
} as const;

// Default durations for each cache key
const DEFAULT_DURATIONS: Record<string, number> = {
    [CACHE_KEYS.USERS]: CACHE_DURATIONS.SHORT,
    [CACHE_KEYS.CLIENTS]: CACHE_DURATIONS.SHORT,
    [CACHE_KEYS.LAWYERS]: CACHE_DURATIONS.SHORT,
    [CACHE_KEYS.CASES]: CACHE_DURATIONS.MEDIUM,
    [CACHE_KEYS.TASKS]: CACHE_DURATIONS.MEDIUM,
    [CACHE_KEYS.DOCUMENTS]: CACHE_DURATIONS.MEDIUM,
    [CACHE_KEYS.SESSIONS]: CACHE_DURATIONS.MEDIUM,
    [CACHE_KEYS.WEKALAT]: CACHE_DURATIONS.LONG,
    [CACHE_KEYS.NOTIFICATIONS]: CACHE_DURATIONS.SHORT,
};

// Related cache keys - when one is invalidated, related ones should be too
const RELATED_CACHES: Record<string, string[]> = {
    [CACHE_KEYS.USERS]: [CACHE_KEYS.CLIENTS, CACHE_KEYS.LAWYERS],
    [CACHE_KEYS.CLIENTS]: [CACHE_KEYS.USERS, CACHE_KEYS.CASES],
    [CACHE_KEYS.LAWYERS]: [CACHE_KEYS.USERS, CACHE_KEYS.CASES],
    [CACHE_KEYS.CASES]: [CACHE_KEYS.TASKS, CACHE_KEYS.DOCUMENTS, CACHE_KEYS.SESSIONS],
};

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    version: number;
}

// Global cache version - incremented on any write operation
let globalCacheVersion = Date.now();

class CacheManager {
    private static instance: CacheManager;

    private constructor() {
        // Load global version from storage
        const savedVersion = localStorage.getItem('cache_global_version');
        if (savedVersion) {
            globalCacheVersion = parseInt(savedVersion, 10);
        }
    }

    static getInstance(): CacheManager {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }

    /**
     * Get data from cache
     */
    get<T>(key: string): T | null {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return null;

            const entry: CacheEntry<T> = JSON.parse(cached);
            const duration = DEFAULT_DURATIONS[key] || CACHE_DURATIONS.MEDIUM;

            // Check if cache is expired
            if (Date.now() - entry.timestamp > duration) {
                this.remove(key);
                return null;
            }

            return entry.data;
        } catch (e) {
            console.error('Cache get error:', e);
            return null;
        }
    }

    /**
     * Set data in cache
     */
    set<T>(key: string, data: T): void {
        try {
            const entry: CacheEntry<T> = {
                data,
                timestamp: Date.now(),
                version: globalCacheVersion,
            };
            localStorage.setItem(key, JSON.stringify(entry));
        } catch (e) {
            console.error('Cache set error:', e);
            // If storage is full, clear old caches
            if (e instanceof Error && e.name === 'QuotaExceededError') {
                this.clearOldCaches();
                try {
                    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now(), version: globalCacheVersion }));
                } catch {
                    // Ignore if still fails
                }
            }
        }
    }

    /**
     * Remove specific cache
     */
    remove(key: string): void {
        localStorage.removeItem(key);
    }

    /**
     * Invalidate cache and related caches
     * استخدم هذا عند إضافة/تعديل/حذف بيانات
     */
    invalidate(key: string): void {
        this.remove(key);

        // Also invalidate related caches
        const related = RELATED_CACHES[key];
        if (related) {
            related.forEach(relatedKey => this.remove(relatedKey));
        }

        // Increment global version
        globalCacheVersion = Date.now();
        localStorage.setItem('cache_global_version', globalCacheVersion.toString());
    }

    /**
     * Invalidate all data caches (but keep auth/theme)
     */
    invalidateAll(): void {
        Object.values(CACHE_KEYS).forEach(key => this.remove(key));
        globalCacheVersion = Date.now();
        localStorage.setItem('cache_global_version', globalCacheVersion.toString());
    }

    /**
     * Check if cache needs refresh
     */
    needsRefresh(key: string): boolean {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return true;

            const entry: CacheEntry<unknown> = JSON.parse(cached);
            const duration = DEFAULT_DURATIONS[key] || CACHE_DURATIONS.MEDIUM;

            return Date.now() - entry.timestamp > duration;
        } catch {
            return true;
        }
    }

    /**
     * Get cache age in seconds
     */
    getCacheAge(key: string): number | null {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return null;

            const entry: CacheEntry<unknown> = JSON.parse(cached);
            return Math.floor((Date.now() - entry.timestamp) / 1000);
        } catch {
            return null;
        }
    }

    /**
     * Clear old caches (when storage is full)
     */
    private clearOldCaches(): void {
        const allKeys = Object.values(CACHE_KEYS);
        const cacheAges: { key: string; age: number }[] = [];

        allKeys.forEach(key => {
            const age = this.getCacheAge(key);
            if (age !== null) {
                cacheAges.push({ key, age });
            }
        });

        // Sort by age (oldest first) and remove half
        cacheAges.sort((a, b) => b.age - a.age);
        const toRemove = Math.ceil(cacheAges.length / 2);
        cacheAges.slice(0, toRemove).forEach(({ key }) => this.remove(key));
    }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();

// Helper function for common invalidation scenarios
export const invalidateOnCreate = {
    user: () => cacheManager.invalidate(CACHE_KEYS.USERS),
    client: () => cacheManager.invalidate(CACHE_KEYS.CLIENTS),
    lawyer: () => cacheManager.invalidate(CACHE_KEYS.LAWYERS),
    case: () => cacheManager.invalidate(CACHE_KEYS.CASES),
    task: () => cacheManager.invalidate(CACHE_KEYS.TASKS),
    document: () => cacheManager.invalidate(CACHE_KEYS.DOCUMENTS),
    session: () => cacheManager.invalidate(CACHE_KEYS.SESSIONS),
    all: () => cacheManager.invalidateAll(),
};

// Hook for React components
export const useCacheInvalidation = () => {
    return {
        invalidateUsers: () => cacheManager.invalidate(CACHE_KEYS.USERS),
        invalidateClients: () => cacheManager.invalidate(CACHE_KEYS.CLIENTS),
        invalidateCases: () => cacheManager.invalidate(CACHE_KEYS.CASES),
        invalidateTasks: () => cacheManager.invalidate(CACHE_KEYS.TASKS),
        invalidateAll: () => cacheManager.invalidateAll(),
        cache: cacheManager,
    };
};
