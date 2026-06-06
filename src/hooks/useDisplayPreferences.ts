// تفضيلات عرض الجداول (تبقى عبر التنقل بين الصفحات وتتزامن بينها فورياً).
// أول تفضيل: إظهار اسم الخصم ضمن عمود الأطراف في القضايا والجلسات.
import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'display_prefs';
const CHANGE_EVENT = 'display-prefs-changed';

export interface DisplayPreferences {
	/** إظهار اسم الخصم ضمن عمود الأطراف (مخفي افتراضياً). */
	showOpponent: boolean;
}

const DEFAULTS: DisplayPreferences = {
	showOpponent: false,
};

const readPrefs = (): DisplayPreferences => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return DEFAULTS;
		return { ...DEFAULTS, ...JSON.parse(raw) };
	} catch {
		return DEFAULTS;
	}
};

const writePrefs = (prefs: DisplayPreferences) => {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
	} catch {}
	// إشعار باقي المكوّنات في نفس التبويب (storage event لا يُطلق على نفس التبويب).
	window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
};

/**
 * يُرجع التفضيلات الحالية ودالة لتعديل مفتاح واحد.
 * يتزامن تلقائياً بين كل المكوّنات التي تستخدمه (زر الإعدادات + الجداول).
 */
export function useDisplayPreferences() {
	const [prefs, setPrefs] = useState<DisplayPreferences>(readPrefs);

	useEffect(() => {
		const sync = () => setPrefs(readPrefs());
		window.addEventListener(CHANGE_EVENT, sync);
		window.addEventListener('storage', sync); // مزامنة عبر التبويبات
		return () => {
			window.removeEventListener(CHANGE_EVENT, sync);
			window.removeEventListener('storage', sync);
		};
	}, []);

	const setPreference = useCallback(<K extends keyof DisplayPreferences>(
		key: K,
		value: DisplayPreferences[K],
	) => {
		const next = { ...readPrefs(), [key]: value };
		writePrefs(next);
		setPrefs(next);
	}, []);

	return { prefs, setPreference };
}

export default useDisplayPreferences;
