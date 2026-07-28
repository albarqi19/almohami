import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, RefreshCw } from 'lucide-react';
import { apiClient, type ApiResponse } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import Forbidden from './Forbidden';

/**
 * دليل الاستخدام — محوِّل لا صفحة.
 *
 * الرابط الذي يُرسل للمكاتب هو alraedlaw.com/guide. من ليس مسجّل دخوله يسوقه
 * حارس المسار إلى تسجيل الدخول ثم يعود، ومن كان مسجّلاً نطلب له تذكرة موقّعة
 * بتوكنه فينتقل إلى الدليل بملء الشاشة. لا رابط ثابت يُقرأ منه شيء بلا دخول.
 *
 * يقبل ?chapter=22 لفتح فصل بعينه.
 */
const UserGuide: React.FC = () => {
  const [params] = useSearchParams();
  const [failed, setFailed] = useState(false);
  const { user } = useAuth();

  // الدليل لمستخدمي المكتب وحدهم. نستثني العميل ولا نعدّد المسموحين — فالمكتب
  // ينشئ أدواراً مخصّصة، وأي قائمة سماح تحجبها لأنها لم تكن مكتوبة فيها.
  // والحاجز الحقيقي في الخادم (internal.user)، وهذا لتجنيب العميل صفحة بيضاء.
  const isClient = user?.role === 'client';

  const chapter = params.get('chapter');

  const openGuide = useCallback(async () => {
    if (user?.role === 'client') return;
    setFailed(false);
    try {
      const to = chapter ? `chapter-${String(chapter).padStart(2, '0')}.html` : undefined;
      const res = await apiClient.get<ApiResponse<{ url: string }>>(
        `/guide/ticket${to ? `?to=${encodeURIComponent(to)}` : ''}`
      );
      if (res?.data?.url) {
        // replace لا assign: زر الرجوع من الدليل يعود لما قبله لا لحلقة تحويل.
        window.location.replace(res.data.url);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    }
  }, [chapter, user?.role]);

  useEffect(() => { void openGuide(); }, [openGuide]);

  if (isClient) return <Forbidden />;

  if (failed) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <BookOpen className="w-10 h-10 mx-auto mb-4" strokeWidth={1.5} style={{ color: 'var(--color-text-muted)' }} />
          <p className="mb-4" style={{ color: 'var(--color-text)' }}>تعذّر فتح الدليل الآن.</p>
          <button
            onClick={() => void openGuide()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
            style={{ background: 'var(--color-surface-2, rgba(0,0,0,0.05))', color: 'var(--color-text)' }}
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>جارٍ فتح الدليل…</div>
    </div>
  );
};

export default UserGuide;
