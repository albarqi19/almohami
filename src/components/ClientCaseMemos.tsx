import { useEffect, useState, useCallback } from 'react';
import { FileText, Eye, Check, MessageSquarePlus, MessagesSquare } from 'lucide-react';
import {
  clientMemoService,
  MEMO_APPROVAL_STATE_LABELS,
  type MemoApprovalState,
  type MemoIssue,
  type MemoComment,
} from '../services/memoWorkflowService';

interface MemoSummary {
  id: number;
  title: string;
  memo_type_name: string;
  memo_number: string | null;
  approval_state: MemoApprovalState;
  current_issue: number;
  last_sent_at: string | null;
}

/**
 * بطاقة «مذكرات القضية» في بوابة العميل — سجل النسخ + معاينة كل نسخة + تعليقاتها، والتعليق/
 * التصحيح/الاعتماد على النسخة الأحدث. (المرحلة 2 — الفرونت). تفويض بالملكية في الباك.
 */
export default function ClientCaseMemos({ caseId }: { caseId: string }) {
  const [memos, setMemos] = useState<MemoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [issues, setIssues] = useState<MemoIssue[]>([]);
  const [commentText, setCommentText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<number | null>(null);
  const [commentsByIssue, setCommentsByIssue] = useState<Record<number, MemoComment[]>>({});

  const load = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await clientMemoService.caseMemos(caseId);
      setMemos((res.data as MemoSummary[]) ?? []);
    } catch (e: any) {
      setLoadError(e?.message || 'تعذّر تحميل المذكرات.');
      setMemos([]);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { void load(); }, [load]);

  const latest = issues.find((i) => i.is_latest) ?? issues[0] ?? null;

  const openMemo = async (memo: MemoSummary) => {
    setMsg(null); setCommentText(''); setExpandedComments(null);
    if (openId === memo.id) { setOpenId(null); setIssues([]); return; }
    setOpenId(memo.id);
    try {
      const res = await clientMemoService.memo(memo.id);
      setIssues(res.data?.issues ?? []);
    } catch {
      setIssues([]);
    }
  };

  const toggleComments = async (memoId: number, issueId: number) => {
    if (expandedComments === issueId) { setExpandedComments(null); return; }
    setExpandedComments(issueId);
    if (!commentsByIssue[issueId]) {
      try {
        const res = await clientMemoService.issueComments(memoId, issueId);
        setCommentsByIssue((prev) => ({ ...prev, [issueId]: res.data ?? [] }));
      } catch {
        setCommentsByIssue((prev) => ({ ...prev, [issueId]: [] }));
      }
    }
  };

  const submit = async (memo: MemoSummary, kind: 'comment' | 'correction') => {
    if (!latest || !commentText.trim()) return;
    setBusy(true); setMsg(null);
    try {
      await clientMemoService.addComment(memo.id, latest.id, { content: commentText.trim(), kind });
      setCommentText('');
      setMsg(kind === 'correction' ? 'تم إرسال طلب التعديل للمحامي.' : 'تم إرسال تعليقك.');
      setCommentsByIssue((prev) => { const c = { ...prev }; delete c[latest.id]; return c; });
      await load();
    } catch (e: any) {
      setMsg(e?.message || 'تعذّر إرسال الملاحظة.');
    } finally { setBusy(false); }
  };

  const approve = async (memo: MemoSummary) => {
    if (!latest) return;
    if (!window.confirm('هل تعتمد هذه المذكرة؟')) return;
    setBusy(true); setMsg(null);
    try {
      await clientMemoService.approve(memo.id, latest.id);
      setMsg('تم اعتماد المذكرة. شكراً لك.');
      await load();
      await openMemoRefresh(memo);
    } catch (e: any) {
      setMsg(e?.message || 'تعذّر اعتماد المذكرة.');
    } finally { setBusy(false); }
  };

  const openMemoRefresh = async (memo: MemoSummary) => {
    try { const res = await clientMemoService.memo(memo.id); setIssues(res.data?.issues ?? []); } catch { /* ignore */ }
  };

  const decisionLabel = (d: MemoIssue['client_decision']) =>
    d === 'approved' ? 'معتمدة منك' : d === 'changes_requested' ? 'طلبت تعديلاً' : 'بانتظار قرارك';

  return (
    <div className="detail-card">
      <div className="detail-card__header">
        <h2 className="detail-card__title">
          <FileText size={18} style={{ marginInlineEnd: 6 }} /> مذكرات القضية ({memos.length})
        </h2>
      </div>
      <div className="detail-card__body">
        {loadError && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, background: 'var(--status-danger-bg, #fee2e2)', color: 'var(--status-danger-text, #b91c1c)', fontSize: 13 }}>{loadError}</div>
        )}
        {loading ? (
          <div style={muted}>جارٍ التحميل…</div>
        ) : memos.length === 0 && !loadError ? (
          <div style={muted}>لا توجد مذكرات مُرسلة لك في هذه القضية.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {memos.map((memo) => (
              <div key={memo.id} style={row}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{memo.title || memo.memo_type_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--quiet-gray-500, #6b7280)' }}>
                      {memo.memo_type_name} · {memo.memo_number ?? ''} · <span style={badge}>{MEMO_APPROVAL_STATE_LABELS[memo.approval_state] ?? memo.approval_state}</span>
                    </div>
                  </div>
                  <button onClick={() => void openMemo(memo)} style={ghostBtn}>{openId === memo.id ? 'إغلاق' : 'عرض'}</button>
                </div>

                {openId === memo.id && (
                  <div style={{ marginTop: 12, borderTop: '1px solid var(--quiet-gray-200, #e5e7eb)', paddingTop: 12 }}>
                    {/* سجل النسخ */}
                    {issues.length === 0 ? (
                      <div style={{ ...muted, padding: 12 }}>لا توجد نسخ.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {issues.map((iss) => (
                          <div key={iss.id} style={{ border: '1px solid var(--quiet-gray-200, #e5e7eb)', borderRadius: 8, padding: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>
                                النسخة {iss.issue_number} {iss.is_latest ? '(الأحدث)' : ''} · <span style={{ color: 'var(--quiet-gray-500,#6b7280)' }}>{iss.outgoing_number ?? ''}</span>
                              </span>
                              <span style={badge}>{decisionLabel(iss.client_decision)}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                              <button onClick={() => void clientMemoService.openIssuePdf(memo.id, iss.id)} style={ghostBtn}><Eye size={15} /> معاينة</button>
                              <button onClick={() => void toggleComments(memo.id, iss.id)} style={ghostBtn}>
                                <MessagesSquare size={15} /> تعليقات{iss.comments_count ? ` (${iss.comments_count})` : ''}
                              </button>
                            </div>
                            {expandedComments === iss.id && (
                              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {(commentsByIssue[iss.id] ?? []).length === 0 ? (
                                  <span style={{ fontSize: 12, color: 'var(--quiet-gray-500,#6b7280)' }}>لا توجد تعليقات على هذه النسخة.</span>
                                ) : (commentsByIssue[iss.id] ?? []).map((c) => (
                                  <div key={c.id} style={{ fontSize: 13, background: 'var(--quiet-gray-100,#f3f4f6)', borderRadius: 6, padding: '6px 8px' }}>
                                    <span style={{ fontWeight: 600 }}>{c.author?.name ?? (c.author_kind === 'client' ? 'العميل' : 'المكتب')}:</span>{' '}
                                    <span>{c.content}</span>
                                    {c.kind === 'correction' && <span style={{ color: 'var(--status-warning-text,#92400e)' }}> (طلب تعديل)</span>}
                                    {c.kind === 'approval' && <span style={{ color: 'var(--status-success-text,#166534)' }}> (اعتماد)</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* إجراءات على النسخة الأحدث */}
                    {latest && (
                      <div style={{ marginTop: 12 }}>
                        {latest.client_decision !== 'approved' && (
                          <button disabled={busy} onClick={() => void approve(memo)} style={{ ...primaryBtn, marginBottom: 8 }}><Check size={16} /> اعتماد النسخة الأحدث</button>
                        )}
                        <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="اكتب ملاحظتك أو تصحيحك على النسخة الأحدث…" style={textarea} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button disabled={busy} onClick={() => void submit(memo, 'comment')} style={ghostBtn}><MessageSquarePlus size={16} /> تعليق</button>
                          {latest.client_decision !== 'approved' && (
                            <button disabled={busy} onClick={() => void submit(memo, 'correction')} style={ghostBtn}>طلب تعديل</button>
                          )}
                        </div>
                        {msg && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--law-navy, #1f3a5f)' }}>{msg}</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const muted: React.CSSProperties = { padding: 24, textAlign: 'center', color: 'var(--quiet-gray-500, #6b7280)' };
const row: React.CSSProperties = { border: '1px solid var(--quiet-gray-200, #e5e7eb)', borderRadius: 10, padding: 12, background: 'var(--dashboard-card, #fff)' };
const badge: React.CSSProperties = { background: 'var(--quiet-gray-100, #f3f4f6)', borderRadius: 6, padding: '1px 6px', fontSize: 11 };
const ghostBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--quiet-gray-200, #e5e7eb)', background: 'transparent', color: 'inherit', fontWeight: 600, fontSize: 13 };
const primaryBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', border: 'none', background: 'var(--law-navy, #1f3a5f)', color: '#fff', fontWeight: 700, fontSize: 13 };
const textarea: React.CSSProperties = { width: '100%', minHeight: 70, padding: 10, borderRadius: 8, margin: '12px 0 8px', resize: 'vertical', fontFamily: 'inherit', border: '1px solid var(--quiet-gray-200, #e5e7eb)', background: 'transparent', color: 'inherit' };
