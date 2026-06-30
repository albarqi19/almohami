import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { CalendarDays, X, Plus, Trash2, Check, Sparkles, AlertCircle } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { HOLIDAY_TYPE_LABELS } from '../../types/hr';
import type { HrHoliday } from '../../types/hr';

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

  const { data: holidays, isLoading, isError } = useQuery({
    queryKey: ['hr', 'holidays', year],
    queryFn: () => hrService.getHolidays(year),
  });

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

          {isLoading ? (
            <div className="hr-locked">جارٍ التحميل…</div>
          ) : isError ? (
            <div className="hr-locked"><AlertCircle size={16} /> تعذّر جلب التقويم.</div>
          ) : !holidays || holidays.length === 0 ? (
            <div className="hr-locked"><CalendarDays size={16} /> لا توجد إجازات لسنة {year}.</div>
          ) : (
            holidays.map((h) => (
              <div className="hr-doc" key={h.id}>
                <div className="hr-doc__ic"><CalendarDays size={16} /></div>
                <div className="hr-doc__main">
                  <div className="hr-doc__nm">{h.name}</div>
                  <div className="hr-doc__m">{fmtDate(h.date_gregorian)} · {HOLIDAY_TYPE_LABELS[h.type]}</div>
                </div>
                <span className={`hr-badge ${h.confirmation_status === 'confirmed' ? 'hr-badge--green' : 'hr-badge--gold'}`}>
                  {h.confirmation_status === 'confirmed' ? 'معتمدة' : 'قيد الاعتماد'}
                </span>
                {h.confirmation_status === 'pending' && (
                  <button className="hr-icon-btn hr-icon-btn--sm" title="اعتماد" onClick={() => confirm(h)}><Check size={15} /></button>
                )}
                <button className="hr-icon-btn hr-icon-btn--sm" title="حذف" onClick={() => remove(h)}><Trash2 size={14} /></button>
              </div>
            ))
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
