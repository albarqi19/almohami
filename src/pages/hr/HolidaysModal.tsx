import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { CalendarDays, X, Plus, Trash2, Check, Sparkles, AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { hrService } from '../../services/hrService';
import EmptyLine from './dossier/EmptyLine';
import { errorText } from './leave/leaveFormat';
import { HOLIDAY_TYPE_LABELS } from '../../types/hr';
import type { HrHoliday } from '../../types/hr';

/** نصٌّ احتياطيٌّ واحدٌ لفرع الخطأ — عرفُ `LeaveTabPanel`. */
const CONNECTION_FALLBACK = 'انقطعَ الاتصال بالخادم.';

const fmtDate = (v: string): string => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
};

const HolidaysModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const qc = useQueryClient();
  const nowYear = new Date().getFullYear();
  const [year, setYear] = useState(nowYear);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  const holidaysQuery = useQuery({
    queryKey: ['hr', 'holidays', year],
    queryFn: () => hrService.getHolidays(year),
  });
  const holidays = holidaysQuery.data;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hr', 'holidays'] });

  const generate = async () => {
    setBusy(true);
    try {
      const r = await hrService.generateHolidays(year);
      toast.success(`تم توليد ${r.created} إجازة (قيد الاعتماد)`);
      invalidate();
    } catch (e: any) { toast.error(e?.message || 'فشل التوليد'); }
    finally { setBusy(false); }
  };

  const confirm = async (h: HrHoliday) => {
    try { await hrService.confirmHoliday(h.id); invalidate(); }
    catch (e: any) { toast.error(e?.message || 'فشل الاعتماد'); }
  };

  const remove = async (h: HrHoliday) => {
    if (!window.confirm('حذف هذه الإجازة؟')) return;
    try { await hrService.deleteHoliday(h.id); invalidate(); }
    catch (e: any) { toast.error(e?.message || 'فشل الحذف'); }
  };

  const add = async () => {
    if (!name.trim() || !date) { toast.error('الاسم والتاريخ مطلوبان'); return; }
    setBusy(true);
    try { await hrService.addHoliday({ name: name.trim(), date_gregorian: date }); setName(''); setDate(''); invalidate(); }
    catch (e: any) { toast.error(e?.message || 'فشل الإضافة'); }
    finally { setBusy(false); }
  };

  return (
    <div className="hr-modal-overlay" onClick={onClose}>
      <div className="hr-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="hr-modal__h">
          <h3><CalendarDays size={17} style={{ verticalAlign: '-3px', marginInlineEnd: 6 }} /> التقويم الرسمي</h3>
          <button className="hr-icon-btn" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </div>
        <div className="hr-modal__b">
          <div className="hr-holiday-bar">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[nowYear - 1, nowYear, nowYear + 1, nowYear + 2].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="hr-btn hr-btn--sm hr-btn--primary" onClick={generate} disabled={busy}>
              <Sparkles size={14} /> توليد إجازات {year}
            </button>
          </div>
          <div className="hr-holiday-note">
            <AlertCircle size={14} /> المولّدة آلياً «قيد الاعتماد» ولا تؤثّر على احتساب الإجازات حتى تعتمدها (الأعياد تقريبية).
          </div>

          {/* ثلاثُ حالاتٍ متمايزة: هياكلُ التحميل · مثلثٌ أحمرُ بنصِّ الخادم وزرُّ إعادة ·
              وسطرٌ فارغٌ يحمل فعلَه. (لا حالةَ «محميّ» هنا: المودالُ نفسُه محروسٌ بـ
              `hr.manage` في `HrModule` فلا يُفتح أصلاً بدونها.) */}
          {holidaysQuery.isPending ? (
            <div className="hrl-state hrl-state--loading" aria-busy="true" aria-label="جارٍ تحميل التقويم">
              {Array.from({ length: 4 }, (_, i) => (
                <span className="hrl-skel" key={i} />
              ))}
            </div>
          ) : holidaysQuery.isError ? (
            <div className="hrl-state hrl-state--error">
              <AlertTriangle size={20} />
              <p className="hrl-state__t">تعذّر جلب التقويم</p>
              <p className="hrl-state__d">{errorText(holidaysQuery.error, CONNECTION_FALLBACK)}</p>
              <button type="button" className="hr-btn hr-btn--sm" onClick={() => void holidaysQuery.refetch()}>
                <RefreshCw size={13} /> إعادة المحاولة
              </button>
            </div>
          ) : !holidays || holidays.length === 0 ? (
            <EmptyLine
              text={`لا إجازاتِ ${year} مسجَّلة`}
              action={(
                <button type="button" className="hr-btn hr-btn--sm" onClick={generate} disabled={busy}>
                  <Sparkles size={13} /> توليد إجازات {year}
                </button>
              )}
            />
          ) : (
            /* صفوفٌ ملتصقةٌ على بدائيّة `hrl-row` — مات معها آخرُ مستدعٍ لـ`.hr-doc*`.
               والأزرارُ **ظاهرةٌ دائماً** ولا تدخل `hrl-tools`: الاعتمادُ والحذفُ هما
               مهمّةُ هذا المودال نفسِها، وإخفاءُ الفعل خلف التحويم في سطحٍ فُتح لأجله
               إخفاءٌ لا كثافة. */
            <div className="hrl-list">
              {holidays.map((h) => (
                <div className="hrl-row" key={h.id}>
                  <span className="hrl-dot" aria-hidden="true"><CalendarDays size={12} /></span>
                  <span className="hrl-row__main">
                    <span className="hrl-row__name">{h.name}</span>
                    <span className="hrl-row__meta">{fmtDate(h.date_gregorian)} · {HOLIDAY_TYPE_LABELS[h.type]}</span>
                  </span>
                  <span className={`hr-badge ${h.confirmation_status === 'confirmed' ? 'hr-badge--green' : 'hr-badge--gold'}`}>
                    {h.confirmation_status === 'confirmed' ? 'معتمدة' : 'قيد الاعتماد'}
                  </span>
                  {h.confirmation_status === 'pending' && (
                    <button type="button" className="hr-icon-btn hr-icon-btn--sm" title="اعتماد" onClick={() => confirm(h)}><Check size={15} /></button>
                  )}
                  <button type="button" className="hr-icon-btn hr-icon-btn--sm" title="حذف" onClick={() => remove(h)}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="hr-holiday-add">
            <input placeholder="اسم إجازة مخصّصة" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <button className="hr-btn hr-btn--sm hr-btn--primary" onClick={add} disabled={busy || !name.trim() || !date}><Plus size={14} /> إضافة</button>
          </div>
        </div>
        <div className="hr-modal__f">
          <button className="hr-btn" onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
};

export default HolidaysModal;
