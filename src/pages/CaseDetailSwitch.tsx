import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UiPreferencesService, type CaseDesign, type UiPrefs } from '../services/uiPreferencesService';
import CaseDetailPage from './CaseDetailPage';
import CaseStationPage from './CaseStationPage';
import CaseStationIntroModal from '../components/case-station/CaseStationIntroModal';
import PageLoader from '../components/PageLoader';

/**
 * مبدّل تصميم صفحة القضية.
 *
 * يقرأ تفضيل المستخدم (محلياً أولاً ثم من الخادم) ويعرض الصفحة الكلاسيكية أو
 * «محطة القضية». من لم يختر بعد يرى الصفحة الكلاسيكية ونافذة تعريف مرة واحدة؛
 * قراره يُحفظ في الخادم فيتبعه على كل أجهزته، والتبديل ممكن من الصفحتين.
 */
const INTRO_DELAY_MS = 1200;

const CaseDetailSwitch: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const cached = UiPreferencesService.cached(userId);
  const [prefs, setPrefs] = useState<UiPrefs | null>(cached);
  const [ready, setReady] = useState<boolean>(cached !== null);
  const [showIntro, setShowIntro] = useState(false);
  const introTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    UiPreferencesService.fetch(userId)
      .then((p) => { if (!cancelled) setPrefs(p); })
      .catch(() => { if (!cancelled) setPrefs((prev) => prev ?? {}); })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [userId]);

  // نافذة التعريف: لمن لم يقرّر بعد، بعد أن تستقر الصفحة
  useEffect(() => {
    if (!ready || !prefs) return;
    const undecided = !prefs.case_design && !prefs.case_design_intro_seen_at;
    if (!undecided) return;
    introTimer.current = window.setTimeout(() => setShowIntro(true), INTRO_DELAY_MS);
    return () => { if (introTimer.current) window.clearTimeout(introTimer.current); };
  }, [ready, prefs]);

  const choose = useCallback(async (design: CaseDesign, extra: Record<string, string> = {}) => {
    setShowIntro(false);
    const now = new Date().toISOString();
    const patch = { case_design: design, case_design_intro_seen_at: now, ...extra };
    setPrefs((prev) => ({ ...(prev ?? {}), ...patch }));
    try {
      const saved = await UiPreferencesService.patch(userId, patch);
      setPrefs(saved);
    } catch {
      /* النسخة المحلية كافية للجلسة الحالية؛ الخادم يُحدَّث في المرة القادمة */
    }
  }, [userId]);

  if (!ready && !prefs) {
    return <PageLoader />;
  }

  const design: CaseDesign = prefs?.case_design === 'station' ? 'station' : 'classic';

  return (
    <>
      {design === 'station' ? (
        <CaseStationPage
          prefs={prefs ?? {}}
          onPrefsChange={setPrefs}
          onSwitchToClassic={(reason) => choose('classic', reason ? { case_station_last_switch_reason: reason } : {})}
        />
      ) : (
        <CaseDetailPage onTryNewDesign={() => choose('station')} />
      )}

      <CaseStationIntroModal
        open={showIntro}
        onTry={() => choose('station')}
        onLater={() => choose('classic')}
      />
    </>
  );
};

export default CaseDetailSwitch;
