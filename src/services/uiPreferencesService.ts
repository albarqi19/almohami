import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

/**
 * تفضيلات الواجهة لكل مستخدم — تُخزَّن في الخادم (user_preferences.ui_prefs)
 * وتُنسَخ محلياً باسم المستخدم كي يُحسم الاختيار فوراً عند فتح الصفحة بلا وميض.
 *
 * الحفظ في الخادم دمجٌ لا استبدال: يُرسَل المفتاح المتغيّر وحده، وقيمة null تحذفه.
 */
export type CaseDesign = 'station' | 'classic';

export interface UiPrefs {
  case_design?: CaseDesign;
  case_design_intro_seen_at?: string;
  case_station_first_used_at?: string;
  case_station_visits?: number;
  case_station_feedback_at?: string;
  case_station_feedback_prompted_at?: string;
  case_station_last_switch_reason?: string;
}

export type UiPrefsPatch = { [K in keyof UiPrefs]?: UiPrefs[K] | null };

const cacheKey = (userId: string | number | undefined) => `ui_prefs_v1:u${userId ?? 'anon'}`;

function safeRead(key: string): UiPrefs | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as UiPrefs) : null;
  } catch {
    return null;
  }
}

function safeWrite(key: string, prefs: UiPrefs): void {
  try {
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    /* التخزين المحلي محجوب — الخادم يبقى المصدر */
  }
}

export const UiPreferencesService = {
  cached(userId: string | number | undefined): UiPrefs | null {
    return safeRead(cacheKey(userId));
  },

  async fetch(userId: string | number | undefined): Promise<UiPrefs> {
    const res = await apiClient.get<ApiResponse<UiPrefs>>('/ui-preferences');
    const prefs = (res.data && typeof res.data === 'object' ? res.data : {}) as UiPrefs;
    safeWrite(cacheKey(userId), prefs);
    return prefs;
  },

  async patch(userId: string | number | undefined, changes: UiPrefsPatch): Promise<UiPrefs> {
    // تحديث النسخة المحلية فوراً، ثم الخادم — إن فشل الخادم بقيت المحلية دليلاً حتى التحديث التالي
    const local = { ...(safeRead(cacheKey(userId)) ?? {}) } as Record<string, unknown>;
    Object.entries(changes).forEach(([k, v]) => {
      if (v === null || v === undefined) delete local[k];
      else local[k] = v;
    });
    safeWrite(cacheKey(userId), local as UiPrefs);

    const res = await apiClient.patch<ApiResponse<UiPrefs>>('/ui-preferences', changes);
    const prefs = (res.data && typeof res.data === 'object' ? res.data : local) as UiPrefs;
    safeWrite(cacheKey(userId), prefs);
    return prefs;
  },
};

export default UiPreferencesService;
