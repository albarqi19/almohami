import { useEffect, useState, useCallback, useRef } from 'react';
import { FileCheck, Check, X, RefreshCw, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../utils/api';
import {
  memoWorkflowService,
  type MemoApprovalInboxItem,
} from '../services/memoWorkflowService';

/**
 * صندوق «اعتمادات المذكرات» — split-view: قائمة + معاينة PDF مضمّنة + لوحة قرار (اعتماد/رفض بسبب).
 * (المرحلة 3). محمي بالباك: تفويض السجل + بوابة المكتب. responsive عبر قياس عرض النافذة.
 */
export default function MemoApprovals() {
  const [items, setItems] = useState<MemoApprovalInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MemoApprovalInboxItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isNarrow, setIsNarrow] = useState(typeof window !== 'undefined' && window.innerWidth < 900);
  const lastObjectUrl = useRef<string | null>(null);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await memoWorkflowService.approvalsInbox();
      setItems(res.data ?? []);
    } catch {
      setError('تعذّر تحميل صندوق الاعتمادات. تأكد من تفعيل الميزة وصلاحيتك.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // تحميل معاينة الـPDF (blob عبر Bearer) عند اختيار مذكرة
  useEffect(() => {
    if (!selected) { setPdfUrl(null); return; }
    let cancelled = false;
    setPdfLoading(true);
    const token = localStorage.getItem('authToken');
    fetch(`${API_BASE_URL}/legal-memos/${selected.id}/preview-pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => { if (!r.ok) throw new Error(); return r.blob(); })
      .then((blob) => {
        if (cancelled) return;
        if (lastObjectUrl.current) URL.revokeObjectURL(lastObjectUrl.current);
        const url = URL.createObjectURL(blob);
        lastObjectUrl.current = url;
        setPdfUrl(url);
      })
      .catch(() => { if (!cancelled) setPdfUrl(null); })
      .finally(() => { if (!cancelled) setPdfLoading(false); });
    return () => { cancelled = true; };
  }, [selected]);

  useEffect(() => () => { if (lastObjectUrl.current) URL.revokeObjectURL(lastObjectUrl.current); }, []);

  const endorse = async (item: MemoApprovalInboxItem) => {
    setBusy(true);
    try {
      await memoWorkflowService.endorse(item.id, note.trim() || undefined);
      setSelected(null); setNote('');
      await load();
    } catch { setError('تعذّر اعتماد المذكرة.'); } finally { setBusy(false); }
  };

  const reject = async (item: MemoApprovalInboxItem) => {
    if (!note.trim()) { setError('اكتب سبب الرفض في حقل الملاحظة أولاً.'); return; }
    setBusy(true);
    try {
      await memoWorkflowService.reject(item.id, note.trim());
      setSelected(null); setNote('');
      await load();
    } catch { setError('تعذّر رفض المذكرة.'); } finally { setBusy(false); }
  };

  return (
    <div style={{ padding: 24, color: 'var(--quiet-gray-900, #1f2937)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 22, fontWeight: 700 }}>
          <FileCheck size={22} /> اعتمادات المذكرات
        </h1>
        <button onClick={() => void load()} disabled={loading} style={btn('ghost')}>
          <RefreshCw size={16} /> تحديث
        </button>
      </div>

      {error && <div style={alertStyle}>{error}</div>}

      {loading ? (
        <div style={muted}>جارٍ التحميل…</div>
      ) : items.length === 0 ? (
        <div style={muted}>لا توجد مذكرات بانتظار اعتمادك حالياً.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : 'minmax(260px, 340px) 1fr', gap: 16, alignItems: 'start' }}>
          {/* القائمة */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item) => (
              <button key={item.id} onClick={() => { setSelected(item); setNote(''); setError(null); }}
                style={{ ...cardStyle, textAlign: 'right', cursor: 'pointer', borderColor: selected?.id === item.id ? 'var(--law-gold, #c8a04f)' : 'var(--quiet-gray-200, #e5e7eb)' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.title || 'مذكرة بلا عنوان'}</div>
                <div style={{ fontSize: 12, color: 'var(--quiet-gray-500, #6b7280)' }}>{item.case?.title ?? '—'} · {item.case?.file_number ?? ''}</div>
                <div style={{ fontSize: 12, color: 'var(--quiet-gray-500, #6b7280)' }}>{item.creator?.name ? `بواسطة ${item.creator.name}` : ''}</div>
              </button>
            ))}
          </div>

          {/* لوحة المعاينة + القرار */}
          <div style={cardStyle}>
            {selected ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17 }}>{selected.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--quiet-gray-500, #6b7280)' }}>{selected.memo_number ?? ''} · {selected.case?.title ?? ''}</div>
                  </div>
                  <button onClick={() => void memoWorkflowService.openPreview(selected.id)} style={btn('ghost')} title="فتح في تبويب">
                    <ExternalLink size={15} />
                  </button>
                </div>

                {/* معاينة PDF مضمّنة */}
                <div style={{ height: isNarrow ? 360 : 520, border: '1px solid var(--quiet-gray-200, #e5e7eb)', borderRadius: 8, overflow: 'hidden', background: 'var(--quiet-gray-100, #f3f4f6)' }}>
                  {pdfLoading ? (
                    <div style={{ ...muted, paddingTop: 60 }}>جارٍ تحميل المعاينة…</div>
                  ) : pdfUrl ? (
                    <iframe title="معاينة المذكرة" src={pdfUrl} style={{ width: '100%', height: '100%', border: 'none' }} />
                  ) : (
                    <div style={{ ...muted, paddingTop: 60 }}>تعذّرت المعاينة.</div>
                  )}
                </div>

                <textarea value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="ملاحظة الاعتماد (اختياري)، أو سبب الرفض (إلزامي للرفض)…"
                  style={{ width: '100%', marginTop: 14, minHeight: 70, padding: 10, borderRadius: 8, border: '1px solid var(--quiet-gray-200, #e5e7eb)', background: 'var(--dashboard-card, #fff)', color: 'inherit', resize: 'vertical', fontFamily: 'inherit' }} />

                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button disabled={busy} onClick={() => void endorse(selected)} style={btn('primary')}><Check size={16} /> اعتماد</button>
                  <button disabled={busy} onClick={() => void reject(selected)} style={btn('danger')}><X size={16} /> رفض</button>
                </div>
              </>
            ) : (
              <div style={muted}>اختر مذكرة من القائمة لمراجعتها واعتمادها.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: 'var(--dashboard-card, #fff)', border: '1px solid var(--quiet-gray-200, #e5e7eb)', borderRadius: 12, padding: 16 };
const muted: React.CSSProperties = { padding: 40, textAlign: 'center', color: 'var(--quiet-gray-500, #6b7280)' };
const alertStyle: React.CSSProperties = { background: 'var(--status-warning-bg, #fef3c7)', color: 'var(--status-warning-text, #92400e)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 };

function btn(kind: 'primary' | 'danger' | 'ghost'): React.CSSProperties {
  const base: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', border: '1px solid transparent', fontSize: 14 };
  if (kind === 'primary') return { ...base, background: 'var(--law-navy, #1f3a5f)', color: '#fff' };
  if (kind === 'danger') return { ...base, background: 'var(--status-danger-bg, #fee2e2)', color: 'var(--status-danger-text, #b91c1c)' };
  return { ...base, background: 'transparent', borderColor: 'var(--quiet-gray-200, #e5e7eb)', color: 'inherit' };
}
