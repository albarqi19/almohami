import { useState, useEffect, useRef } from 'react';
import { X, Eye, Send, Stamp, RefreshCw, Undo2, FilePlus2 } from 'lucide-react';
import { memoWorkflowService, type MemoChannel, type MemoApprovalState } from '../services/memoWorkflowService';

interface MemoSendModalProps {
  memoId: string | number;
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
  /** حالة الاعتماد الحالية للمذكرة (لتحديد الإجراءات المتاحة). */
  approvalState?: MemoApprovalState | null;
  /** هل تشترط القضية الاعتماد؟ (لتمييز المسوّدة التي تحتاج اعتماداً). */
  requiresApproval?: boolean;
}

/**
 * نافذة إجراءات المذكرة — تعرض الإجراء المناسب لحالة المذكرة فقط (لا إجراءات تفشل):
 *  pending → سحب الطلب · endorsed/not_required → إرسال للعميل · draft+يشترط → إرسال للاعتماد
 *  issued/client_approved/client_changes_requested → بدء تعديل جديد.
 */
export default function MemoSendModal({ memoId, isOpen, onClose, onSent, approvalState, requiresApproval }: MemoSendModalProps) {
  const [channel, setChannel] = useState<MemoChannel>('whatsapp');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const st = approvalState ?? null;
  const isDraftish = st === null || st === 'not_required' || st === 'draft' || st === 'rejected';
  const showWithdraw = st === 'pending';
  const showNewRevision = st === 'issued' || st === 'client_approved' || st === 'client_changes_requested';
  // المسوّدة: إرسال للاعتماد إن اشترطت القضية؛ وإلا إرسال للعميل. عند الجهل بالاشتراط نعرض كليهما.
  const showSubmit = isDraftish && requiresApproval !== false;
  const showSendToClient = st === 'endorsed' || (isDraftish && requiresApproval !== true);

  const run = async (fn: () => Promise<{ success?: boolean; message?: string }>, okMsg: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fn();
      if (res.success === false) {
        setFeedback({ type: 'err', text: res.message || 'تعذّر تنفيذ الإجراء.' });
      } else {
        setFeedback({ type: 'ok', text: res.message || okMsg });
        onSent?.();
      }
    } catch (e: any) {
      setFeedback({ type: 'err', text: e?.message || 'تعذّر تنفيذ الإجراء.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="إجراءات المذكرة"
        style={modal} onClick={(e) => e.stopPropagation()} dir="rtl">
        <div style={header}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>إجراءات المذكرة</span>
          <button onClick={onClose} style={iconBtn} aria-label="إغلاق"><X size={18} /></button>
        </div>

        <button onClick={() => void memoWorkflowService.openPreview(memoId)} style={ghostBtn}>
          <Eye size={16} /> معاينة المذكرة (PDF)
        </button>

        {showNewRevision && (
          <div style={{ marginTop: 16 }}>
            <p style={hint}>هذه المذكرة أُرسلت/اعتُمدت. لتعديلها أنشئ نسخة جديدة.</p>
            <button disabled={busy} onClick={() => void run(() => memoWorkflowService.startNewRevision(memoId), 'تم فتح تعديل جديد.')} style={primaryBtn}>
              <FilePlus2 size={16} /> بدء تعديل جديد
            </button>
          </div>
        )}

        {showWithdraw && (
          <div style={{ marginTop: 16 }}>
            <p style={hint}>المذكرة قيد الاعتماد. يمكنك سحب الطلب لتعديلها.</p>
            <button disabled={busy} onClick={() => void run(() => memoWorkflowService.withdrawApproval(memoId), 'تم سحب طلب الاعتماد.')} style={ghostBtn}>
              <Undo2 size={16} /> سحب طلب الاعتماد
            </button>
          </div>
        )}

        {showSendToClient && (
          <>
            <div style={{ marginTop: 16 }}>
              <div style={label}>قناة الإرسال للعميل</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {([['whatsapp', 'واتساب'], ['email', 'إيميل'], ['both', 'كلاهما']] as [MemoChannel, string][]).map(([val, lbl]) => (
                  <button key={val} onClick={() => setChannel(val)} style={{ ...segBtn, ...(channel === val ? segActive : {}) }}>{lbl}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={label}>الرسالة المرفقة (اختياري)</div>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="رسالة افتراضية ستُستخدم إن تركتها فارغة (تتضمن رابط بوابة العميل)…" style={textarea} />
            </div>
          </>
        )}

        {feedback && <div style={{ ...alert, ...(feedback.type === 'ok' ? alertOk : alertErr) }}>{feedback.text}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          {showSubmit && (
            <button disabled={busy} onClick={() => void run(() => memoWorkflowService.submitForApproval(memoId), 'أُرسلت للاعتماد.')} style={ghostBtn}>
              <Stamp size={16} /> إرسال للاعتماد
            </button>
          )}
          {showSendToClient && (
            <button disabled={busy} onClick={() => void run(() => memoWorkflowService.send(memoId, { channels: channel, message: message.trim() || undefined }), 'تم الإرسال للعميل.')} style={primaryBtn}>
              {busy ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />} إرسال للعميل
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modal: React.CSSProperties = { background: 'var(--dashboard-card, #fff)', color: 'var(--quiet-gray-900, #1f2937)', borderRadius: 14, padding: 20, width: 'min(480px, 92vw)', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', outline: 'none' };
const header: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 };
const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--quiet-gray-700, #374151)' };
const hint: React.CSSProperties = { fontSize: 13, color: 'var(--quiet-gray-500, #6b7280)', margin: '0 0 8px' };
const textarea: React.CSSProperties = { width: '100%', minHeight: 80, padding: 10, borderRadius: 8, resize: 'vertical', fontFamily: 'inherit', border: '1px solid var(--quiet-gray-200, #e5e7eb)', background: 'transparent', color: 'inherit' };
const iconBtn: React.CSSProperties = { background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' };
const segBtn: React.CSSProperties = { flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, border: '1px solid var(--quiet-gray-200, #e5e7eb)', background: 'transparent', color: 'inherit' };
const segActive: React.CSSProperties = { background: 'var(--law-navy, #1f3a5f)', color: '#fff', borderColor: 'var(--law-navy, #1f3a5f)' };
const primaryBtn: React.CSSProperties = { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'var(--law-navy, #1f3a5f)', color: '#fff' };
const ghostBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', color: 'inherit', border: '1px solid var(--quiet-gray-200, #e5e7eb)', background: 'transparent' };
const alert: React.CSSProperties = { marginTop: 14, padding: '10px 12px', borderRadius: 8, fontSize: 13 };
const alertOk: React.CSSProperties = { background: 'var(--status-success-bg, #dcfce7)', color: 'var(--status-success-text, #166534)' };
const alertErr: React.CSSProperties = { background: 'var(--status-danger-bg, #fee2e2)', color: 'var(--status-danger-text, #b91c1c)' };
