import React, { useEffect, useState } from 'react';
import { CalendarClock, Bell } from 'lucide-react';
import Modal from '../erp/Modal';
import DualDateInput from '../common/DualDateInput';
import { CATEGORY_COLORS } from '../../services/meetingCategoryService';
import {
  personalEventService,
  type PersonalEvent,
  type PersonalEventKind,
} from '../../services/personalEventService';
import type { MeetingColor } from '../../services/meetingService';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** «YYYY-MM-DD» — من الخلية المنقورة */
  initialDate?: string;
  /** «HH:mm» — من الوقت المنقور */
  initialTime?: string;
  initialKind?: PersonalEventKind;
  /** موجود ⇒ وضع التعديل */
  event?: PersonalEvent | null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** «HH:mm» بعد إضافة دقائق — بلا Date كي لا ننزلق عبر منتصف الليل. */
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h * 60 + m + minutes) % (24 * 60);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/**
 * موعد أو تذكير شخصي.
 *
 * الفرق بين النوعين ليس تجميلياً: الموعد له مدّة ويحجب وقتك في حساب التوفّر،
 * والتذكير لحظة لا مدّة لها فلا يحجب شيئاً. لذلك يختفي حقل «إلى» ومربّع الحجب
 * في وضع التذكير بدل أن يبقيا معطّلين — الحقل المعطّل يقول «هنا شيء لا تملكه»
 * والاختفاء يقول «هذا لا معنى له هنا».
 */
const PersonalEventModal: React.FC<Props> = ({
  open, onClose, onSaved, initialDate, initialTime, initialKind = 'appointment', event,
}) => {
  const editing = Boolean(event);

  const [kind, setKind] = useState<PersonalEventKind>(initialKind);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [from, setFrom] = useState('09:00');
  const [to, setTo] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState<MeetingColor>('purple');
  const [blocks, setBlocks] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // إعادة التهيئة عند كل فتح — بلا هذا يحمل المودال بقايا الفتحة السابقة
  useEffect(() => {
    if (!open) return;

    if (event) {
      const start = new Date(event.starts_at);
      setKind(event.kind);
      setTitle(event.title);
      setNotes(event.notes ?? '');
      setDate(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
      setFrom(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
      if (event.ends_at) {
        const end = new Date(event.ends_at);
        setTo(`${pad(end.getHours())}:${pad(end.getMinutes())}`);
      }
      setAllDay(event.all_day);
      setColor(event.color);
      setBlocks(event.blocks_availability);
      setError(null);
      return;
    }

    const today = new Date();
    setKind(initialKind);
    setTitle('');
    setNotes('');
    setDate(initialDate ?? `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`);
    setFrom(initialTime ?? '09:00');
    setTo(addMinutes(initialTime ?? '09:00', 60));
    setAllDay(false);
    setColor(initialKind === 'reminder' ? 'orange' : 'purple');
    setBlocks(initialKind !== 'reminder');
    setError(null);
  }, [open, event, initialDate, initialTime, initialKind]);

  const isReminder = kind === 'reminder';

  const submit = async () => {
    if (!title.trim()) { setError('اكتب عنواناً.'); return; }
    if (!date) { setError('اختر تاريخاً.'); return; }
    if (!isReminder && !allDay && to <= from) { setError('وقت الانتهاء يجب أن يكون بعد البداية.'); return; }

    setSaving(true);
    setError(null);

    try {
      // سلسلة محلية بلا منطقة زمنية — نفس اتفاقية الاجتماعات. toISOString هنا
      // يحوّل إلى UTC فينزلق الموعد ثلاث ساعات في كل حفظ.
      const payload = {
        kind,
        title: title.trim(),
        notes: notes.trim() || null,
        starts_at: allDay ? `${date}T00:00:00` : `${date}T${from}:00`,
        ends_at: isReminder || allDay ? null : `${date}T${to}:00`,
        all_day: allDay,
        color,
        blocks_availability: isReminder ? false : blocks,
      };

      if (event) await personalEventService.update(event.id, payload);
      else await personalEventService.create(payload);

      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر الحفظ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'تعديل البند الشخصي' : (isReminder ? 'تذكير جديد' : 'موعد شخصي جديد')}
      icon={isReminder ? Bell : CalendarClock}
      size="narrow"
      footer={
        <>
          <button type="button" className="fin-btn fin-btn--primary" onClick={submit} disabled={saving}>
            {saving ? 'يُحفظ…' : 'حفظ'}
          </button>
          <button type="button" className="fin-btn" onClick={onClose} disabled={saving}>إلغاء</button>
        </>
      }
    >
      <div className="pem">
        {!editing && (
          <div className="mfm-types" role="tablist" aria-label="النوع">
            <button
              type="button"
              role="tab"
              aria-selected={!isReminder}
              className={`mfm-type${!isReminder ? ' is-active' : ''}`}
              onClick={() => setKind('appointment')}
            >
              موعد
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isReminder}
              className={`mfm-type${isReminder ? ' is-active' : ''}`}
              onClick={() => setKind('reminder')}
            >
              تذكير
            </button>
          </div>
        )}

        <div className="fin-field">
          <label className="fin-label" htmlFor="pem-title">العنوان</label>
          <input
            id="pem-title"
            className="fin-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={isReminder ? 'اتصل بالعميل' : 'مراجعة الأحوال المدنية'}
            maxLength={200}
            autoFocus
          />
        </div>

        <div className="fin-field">
          <label className="fin-label" htmlFor="pem-date">التاريخ</label>
          <DualDateInput id="pem-date" value={date} onChange={setDate} />
        </div>

        {!isReminder && (
          <label className="pem-check">
            <input type="checkbox" className="fin-checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} />
            <span>طوال اليوم</span>
          </label>
        )}

        {!allDay && (
          <div className="pem-times">
            <div className="fin-field">
              <label className="fin-label" htmlFor="pem-from">{isReminder ? 'الوقت' : 'من'}</label>
              <input
                id="pem-from"
                type="time"
                className="fin-input"
                value={from}
                onChange={e => {
                  setFrom(e.target.value);
                  // النهاية تتبع البداية تلقائياً ما دامت لم تُحرَّر يدوياً بعدُ
                  if (!isReminder && e.target.value >= to) setTo(addMinutes(e.target.value, 60));
                }}
              />
            </div>
            {!isReminder && (
              <div className="fin-field">
                <label className="fin-label" htmlFor="pem-to">إلى</label>
                <input id="pem-to" type="time" className="fin-input" value={to} onChange={e => setTo(e.target.value)} />
              </div>
            )}
          </div>
        )}

        <div className="fin-field">
          <label className="fin-label">اللون</label>
          <div className="pem-colors">
            {CATEGORY_COLORS.map(c => (
              <button
                key={c.key}
                type="button"
                className={`pem-color cat-${c.key}${color === c.key ? ' is-selected' : ''}`}
                onClick={() => setColor(c.key)}
                aria-label={c.label}
                aria-pressed={color === c.key}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {!isReminder && (
          <label className="pem-check">
            <input type="checkbox" className="fin-checkbox" checked={blocks} onChange={e => setBlocks(e.target.checked)} />
            <span>
              يحجب وقتي
              {/* هذا سطر الأثر الفعلي: بلا الحجب يبقى الموعد بطاقةً على شاشة */}
              <em>زملاؤك يرون «مشغول» بلا عنوان، والنظام يمنع حجزك في هذا الوقت</em>
            </span>
          </label>
        )}

        <div className="fin-field">
          <label className="fin-label" htmlFor="pem-notes">ملاحظات</label>
          <textarea
            id="pem-notes"
            className="fin-input"
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            maxLength={5000}
          />
        </div>

        {error && <p className="pem-error">{error}</p>}
      </div>
    </Modal>
  );
};

export default PersonalEventModal;
