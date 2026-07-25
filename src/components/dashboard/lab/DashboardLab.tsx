import React from 'react';
import {
    Plus, Lock, Unlock, RotateCcw, LayoutDashboard, Info, Magnet, Move,
} from 'lucide-react';

import WidgetBoard, { type StarterEntry } from './WidgetBoard';

/**
 * 🧪 مختبر اللوحة القابلة للتخصيص — غلاف رقيق فوق WidgetBoard.
 * الجوهر كله (شبكة/معرض/خصائص/تثبيت/مزامنة) في WidgetBoard المشترك مع
 * اللوحة الإنتاجية CustomDashboard؛ هنا فقط كروم المختبر (عنوان/تنويه).
 */

const STORAGE_KEY = 'dashboard_lab_v1';

const STARTER: StarterEntry[] = [
    { i: 'tabs-1', type: 'tabs', lg: { x: 0, y: 0, w: 5, h: 6 } },
    { i: 'wisdom-1', type: 'wisdom', lg: { x: 5, y: 0, w: 4, h: 3 } },
    { i: 'news-1', type: 'news', lg: { x: 5, y: 3, w: 4, h: 3 } },
    { i: 'clock-1', type: 'clock', lg: { x: 9, y: 0, w: 3, h: 5 } },
];

const DashboardLab: React.FC = () => {
    return (
        <div className="lab-root" dir="rtl">
            <WidgetBoard
                storageKey={STORAGE_KEY}
                starter={STARTER}
                serverSync={false}
                initialEditMode
                toolbar={(api) => (
                    <>
                        <div className="lab-toolbar">
                            <div className="lab-toolbar__title">
                                <span className="lab-toolbar__icon"><LayoutDashboard size={18} /></span>
                                <div>
                                    <div className="lab-toolbar__heading">
                                        مختبر اللوحة القابلة للتخصيص
                                        <span className="lab-beta">تجريبي</span>
                                    </div>
                                    <div className="lab-toolbar__hint">
                                        اسحب من الترويسة · حجّم من الحواف والزوايا · ⚙️ خصائص لكل ودجت · 📌 يثبّتها عائمة في كل الصفحات
                                    </div>
                                </div>
                            </div>

                            <div className="lab-toolbar__actions">
                                <button
                                    className="lab-btn"
                                    onClick={() => api.setFreeFlow((f) => !f)}
                                    title={api.freeFlow ? 'التموضع حر: الودجتس تبقى حيث تتركها (يسمح بالفراغات)' : 'رصّ تلقائي: الودجتس تلتصق للأعلى وتسدّ الفراغات'}
                                >
                                    {api.freeFlow ? <Move size={15} /> : <Magnet size={15} />}
                                    {api.freeFlow ? 'تموضع حر' : 'رصّ تلقائي'}
                                </button>
                                <button className="lab-btn" onClick={() => api.setEditMode((e) => !e)} title={api.editMode ? 'قفل التخطيط' : 'تفعيل التخصيص'}>
                                    {api.editMode ? <Unlock size={15} /> : <Lock size={15} />}
                                    {api.editMode ? 'وضع التخصيص' : 'مقفل'}
                                </button>
                                <button className="lab-btn lab-btn--ghost" onClick={api.resetLayout} title="إعادة الضبط للوضع الافتراضي">
                                    <RotateCcw size={15} /> إعادة الضبط
                                </button>
                                <button className="lab-btn lab-btn--primary" onClick={api.openPicker}>
                                    <Plus size={16} /> إضافة ودجت
                                </button>
                            </div>
                        </div>

                        <div className="lab-note">
                            <Info size={13} />
                            <span>هذه تجربة على الفرونت فقط — يُحفظ ترتيبك محلياً في هذا المتصفح. النسخة الإنتاجية (اللوحة الرئيسية للمكاتب المفعّلة) تُزامن تلقائياً عبر أجهزتك.</span>
                        </div>
                    </>
                )}
            />
        </div>
    );
};

export default DashboardLab;
