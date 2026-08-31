/**
 * «أرسِل إلى قضية…» — تُحفظ المذكّرةُ النهائية في مكتبة المذكّرات مربوطةً بقضية.
 *
 * 🔑 البحثُ خادميٌّ (نفس بحث صفحة القضايا) والاختيارُ نقرة — لا كتابةَ أرقامِ
 * قضايا من الذاكرة. والإرسالُ بزرٍّ صريحٍ بعد الاختيار لا عند النقر على الصفّ:
 * ربطُ مذكّرةٍ بقضيةٍ خاطئة أغلى من نقرةٍ إضافية.
 *
 * ⚠️ `dir="rtl"` صريحٌ على `Content` — Radix يفرض ltr داخلياً.
 */

import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Briefcase, Search, Send, X } from 'lucide-react';
import { CaseService } from '../../services/caseService';
import type { Case } from '../../types';

interface Props {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSend: (caseId: number, caseTitle: string) => void;
}

export default function SendToCaseDialog({ open, busy, onClose, onSend }: Props) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Case[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Case | null>(null);
  const timer = useRef<number | null>(null);

  // فتحٌ جديد = بحثٌ جديد — لا بقايا اختيارٍ سابقٍ تُرسَل خطأً
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setPicked(null);
    setRows([]);
    void search('');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = async (term: string) => {
    setSearching(true);
    try {
      const page = await CaseService.getCases({ search: term || undefined, limit: 8, archived: '0' });
      setRows(page.data ?? []);
    } catch {
      setRows([]);
    } finally {
      setSearching(false);
    }
  };

  const onQuery = (term: string) => {
    setQuery(term);
    setPicked(null);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void search(term); }, 300);
  };

  const caseLabel = (c: Case) =>
    c.title || c.file_number || `قضية #${c.id}`;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="dr-dlg__overlay" />
        <Dialog.Content className="dr-dlg" dir="rtl" aria-describedby={undefined}>
          <header className="dr-dlg__head">
            <Dialog.Title className="dr-dlg__title">
              <Briefcase size={15} aria-hidden />
              إرسالُ المذكّرة إلى قضية
            </Dialog.Title>
            <button type="button" className="dr-dlg__close" aria-label="إغلاق" onClick={onClose} disabled={busy}>
              <X size={14} />
            </button>
          </header>

          <div className="dr-dlg__body">
            <label className="dr-dlg__field">
              <span className="dr-aside__title"><Search size={12} aria-hidden /> ابحث باسم القضية أو رقمها</span>
              <input
                className="dr-composer__input"
                style={{ minHeight: 38 }}
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="مثلاً: البناء الحديث"
                aria-label="بحثٌ عن قضية"
              />
            </label>

            <div className="dr-caselist" role="listbox" aria-label="نتائج البحث">
              {searching && <p className="dr-source__msg">يبحث…</p>}
              {!searching && rows.length === 0 && (
                <p className="dr-source__msg">لا نتائج — جرّب كلمةً أخرى.</p>
              )}
              {!searching && rows.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={picked?.id === c.id}
                  className={`dr-caserow${picked?.id === c.id ? ' dr-caserow--picked' : ''}`}
                  onClick={() => setPicked(c)}
                >
                  <span className="dr-caserow__title">{caseLabel(c)}</span>
                  {c.file_number && c.title && <span className="dr-caserow__meta">{c.file_number}</span>}
                </button>
              ))}
            </div>
          </div>

          <footer className="dr-dlg__foot">
            <button type="button" className="dr-btn" onClick={onClose} disabled={busy}>إلغاء</button>
            <button
              type="button"
              className="dr-btn dr-btn--primary"
              disabled={busy || !picked}
              onClick={() => picked && onSend(Number(picked.id), caseLabel(picked))}
            >
              <Send size={14} aria-hidden /> أرسِل المذكّرة
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
