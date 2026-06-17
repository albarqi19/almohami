import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Scale, Search, Loader2, Gavel, ExternalLink, ShieldCheck, AlertTriangle,
  ListChecks, TrendingUp, Sparkles, RefreshCw, Info, FileText,
} from 'lucide-react';
import { PrecedentsService } from '../services/precedentsService';
import type { PrecedentResponse, PrecedentResult, PrecedentFactor } from '../services/precedentsService';

interface PrecedentSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId?: number | null;
  caseTitle?: string | null;
}

// تصنيف لون النتيجة (يتكيّف مع الثيمات الثلاثة عبر فئات CSS)
function outcomeClass(outcome: string | null): string {
  const o = (outcome || '').trim();
  if (o.includes('قبول جزئي')) return 'partial';
  if (o.startsWith('قبول')) return 'accept';
  if (o.includes('رفض') || o.includes('عدم')) return 'reject';
  if (o.includes('نقض') || o.includes('إحالة')) return 'partial';
  return 'other';
}

const PrecedentSearchModal: React.FC<PrecedentSearchModalProps> = ({ isOpen, onClose, caseId, caseTitle }) => {
  const [data, setData] = useState<PrecedentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'case' | 'free'>(caseId ? 'case' : 'free');
  const loadedFor = useRef<number | null>(null);

  // عند فتح النافذة من قضية: اجلب آخر تحليل مخزّن (إن وُجد) دون استدعاء ذكاء
  useEffect(() => {
    if (!isOpen || !caseId || loadedFor.current === caseId) return;
    loadedFor.current = caseId;
    setMode('case');
    setLoading(true);
    setError('');
    PrecedentsService.getCaseAnalysis(caseId)
      .then((res) => { if (res) setData(res); })
      .catch(() => { /* صامت — لا تحليل بعد */ })
      .finally(() => setLoading(false));
  }, [isOpen, caseId]);

  const runCaseAnalysis = useCallback(async (force = false) => {
    if (!caseId) return;
    setLoading(true);
    setError('');
    setMode('case');
    try {
      const res = await PrecedentsService.analyzeCase(caseId, force);
      setData(res);
    } catch (e: any) {
      setError(e?.message || 'تعذّر استخراج السوابق');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const runFreeSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 5) return;
    setLoading(true);
    setError('');
    setMode('free');
    try {
      const res = await PrecedentsService.freeSearch(q);
      setData(res);
    } catch (e: any) {
      setError(e?.message || 'تعذّر البحث في السوابق');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleClose = () => {
    setData(null);
    setQuery('');
    setError('');
    setLoading(false);
    loadedFor.current = null;
    onClose();
  };

  const analysis = data?.analysis;
  const trend = data?.trend;
  const results = data?.results ?? [];
  const noMatch = analysis?.no_match || (data && results.length === 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="precedent-modal__overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="precedent-modal"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="precedent-modal__header">
              <div className="precedent-modal__title-group">
                <div className="precedent-modal__icon"><Gavel size={18} /></div>
                <div>
                  <h2 className="precedent-modal__title">السوابق القضائية</h2>
                  <p className="precedent-modal__subtitle">
                    {caseTitle ? caseTitle : 'بحث ذكي في السوابق السعودية وتحليل الاتجاه'}
                  </p>
                </div>
              </div>
              <button className="precedent-modal__close-btn" onClick={handleClose}><X size={18} /></button>
            </div>

            {/* Action bar */}
            <div className="precedent-modal__actions">
              {caseId && (
                <button
                  className="precedent-modal__primary-btn"
                  onClick={() => runCaseAnalysis(false)}
                  disabled={loading}
                >
                  {loading && mode === 'case' ? <Loader2 size={15} className="precedent-modal__spin" /> : <Sparkles size={15} />}
                  استخراج سوابق هذه القضية وتحليلها
                </button>
              )}
              {caseId && data && mode === 'case' && (
                <button className="precedent-modal__ghost-btn" onClick={() => runCaseAnalysis(true)} disabled={loading} title="إعادة التحليل من جديد">
                  <RefreshCw size={14} /> إعادة
                </button>
              )}
              <div className="precedent-modal__search">
                <Search size={15} className="precedent-modal__search-icon" />
                <input
                  className="precedent-modal__search-input"
                  placeholder="أو ابحث بوصف مسألة قانونية حرّة…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') runFreeSearch(); }}
                />
                <button className="precedent-modal__search-btn" onClick={runFreeSearch} disabled={loading || query.trim().length < 5}>
                  {loading && mode === 'free' ? <Loader2 size={14} className="precedent-modal__spin" /> : 'بحث'}
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="precedent-modal__body">
              {loading && (
                <div className="precedent-modal__loading">
                  <Loader2 size={30} className="precedent-modal__spin" />
                  <span>{mode === 'case' ? 'نقرأ القضية ونبحث في السوابق ونحلّل الاتجاه…' : 'نبحث في فهرس السوابق…'}</span>
                  <small>قد يستغرق ذلك بضع ثوانٍ</small>
                </div>
              )}

              {!loading && error && (
                <div className="precedent-modal__error"><AlertTriangle size={18} /><span>{error}</span></div>
              )}

              {!loading && !error && !data && (
                <div className="precedent-modal__empty">
                  <div className="precedent-modal__empty-icon"><Scale size={40} /></div>
                  <h3>استخرج السوابق القضائية المشابهة</h3>
                  <p>
                    {caseId
                      ? 'اضغط «استخراج سوابق هذه القضية» ليقرأ النظام موضوع قضيتك وطلباتك وصفة موكّلك، ثم يعرض أقرب الأحكام السعودية، واتجاهها، وتحليلاً لعوامل القبول والمخاطر.'
                      : 'اكتب وصفاً للمسألة القانونية لتظهر أقرب السوابق السعودية وتحليلها.'}
                  </p>
                </div>
              )}

              {!loading && !error && data && (
                <div className="precedent-modal__results">
                  {/* تنبيه التغطية */}
                  <div className="precedent-modal__coverage-note">
                    <Info size={13} />
                    <span>التغطية الحالية تتركّز في القضايا التجارية والأحكام المنشورة. النتائج استرشادية.</span>
                  </div>

                  {noMatch ? (
                    <div className="precedent-modal__no-match">
                      <Search size={28} />
                      <h3>لم يُعثر على سوابق مطابقة كافية</h3>
                      <p>{analysis?.summary || 'جرّب إعادة صياغة المسألة أو توسيع وصف القضية.'}</p>
                    </div>
                  ) : (
                    <>
                      {/* الاتجاه */}
                      {trend && trend.total > 0 && (
                        <section className="precedent-modal__section">
                          <div className="precedent-modal__section-head">
                            <TrendingUp size={14} /><span>اتجاه السوابق المشابهة</span>
                            <span className="precedent-modal__muted">({trend.total} سابقة — استرشادي)</span>
                          </div>
                          <div className="precedent-modal__trend-bar">
                            {Object.entries(trend.counts).map(([label, count]) => (
                              <div
                                key={label}
                                className={`precedent-modal__trend-seg precedent-modal__trend-seg--${outcomeClass(label)}`}
                                style={{ flexGrow: count }}
                                title={`${label}: ${count}`}
                              >
                                <span>{label}</span><b>{count}</b>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* التحليل */}
                      {analysis && (
                        <section className="precedent-modal__section precedent-modal__analysis">
                          {analysis.client_posture && (
                            <div className="precedent-modal__posture">
                              <Gavel size={13} /><span>{analysis.client_posture}</span>
                            </div>
                          )}
                          <div className="precedent-modal__factors-grid">
                            <FactorColumn
                              title="عوامل تقوّي الموقف" icon={<ShieldCheck size={13} />}
                              tone="accept" factors={analysis.acceptance_factors}
                            />
                            <FactorColumn
                              title="عوامل ومخاطر مضادّة" icon={<AlertTriangle size={13} />}
                              tone="reject" factors={analysis.risk_factors}
                            />
                          </div>
                          {analysis.required_evidence?.length > 0 && (
                            <div className="precedent-modal__evidence">
                              <div className="precedent-modal__factor-title"><ListChecks size={13} /><span>بيّنات وإجراءات مُوصى بتجهيزها</span></div>
                              <ul>
                                {analysis.required_evidence.map((e, i) => <li key={i}>{e}</li>)}
                              </ul>
                            </div>
                          )}
                          {analysis.summary && (
                            <div className="precedent-modal__summary"><strong>الخلاصة:</strong> {analysis.summary}</div>
                          )}
                        </section>
                      )}

                      {/* السوابق */}
                      <section className="precedent-modal__section">
                        <div className="precedent-modal__section-head">
                          <FileText size={14} /><span>أقرب السوابق</span>
                          <span className="precedent-modal__muted">({results.length})</span>
                        </div>
                        <div className="precedent-modal__cards">
                          {results.map((r, i) => <PrecedentCard key={i} index={i + 1} r={r} />)}
                        </div>
                      </section>
                    </>
                  )}

                  {/* تنويه الأمانة */}
                  {data.disclaimer && (
                    <div className="precedent-modal__disclaimer">
                      <ShieldCheck size={13} /><span>{data.disclaimer}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ── عمود عوامل ──
const FactorColumn: React.FC<{ title: string; icon: React.ReactNode; tone: 'accept' | 'reject'; factors: PrecedentFactor[] }> = ({ title, icon, tone, factors }) => (
  <div className={`precedent-modal__factor-col precedent-modal__factor-col--${tone}`}>
    <div className="precedent-modal__factor-title">{icon}<span>{title}</span></div>
    {factors?.length ? (
      <ul>
        {factors.map((f, i) => (
          <li key={i}>
            {f.text}
            {f.refs?.length > 0 && (
              <span className="precedent-modal__refs">
                {f.refs.map((n) => <span key={n} className="precedent-modal__ref">{n}</span>)}
              </span>
            )}
          </li>
        ))}
      </ul>
    ) : (
      <p className="precedent-modal__muted">—</p>
    )}
  </div>
);

// ── بطاقة سابقة ──
const PrecedentCard: React.FC<{ index: number; r: PrecedentResult }> = ({ index, r }) => (
  <div className="precedent-modal__card">
    <div className="precedent-modal__card-head">
      <span className="precedent-modal__card-num">{index}</span>
      <span className="precedent-modal__card-meta">
        {r.court_name}{r.judgement_number ? ` · حكم ${r.judgement_number}` : ''}{r.date_hijri ? ` · ${r.date_hijri}` : ''}
      </span>
      {r.outcome && (
        <span className={`precedent-modal__outcome precedent-modal__outcome--${outcomeClass(r.outcome)}`}>{r.outcome}</span>
      )}
    </div>
    <p className="precedent-modal__card-principle">{r.legal_principle}</p>
    {r.cited_statutes?.length > 0 && (
      <div className="precedent-modal__statutes">
        {r.cited_statutes.slice(0, 6).map((s, i) => (
          <span key={i} className="precedent-modal__statute-chip">{s.statute}{s.article ? ` ${s.article}` : ''}</span>
        ))}
      </div>
    )}
    {r.source_url && (
      <a className="precedent-modal__source" href={r.source_url} target="_blank" rel="noopener noreferrer">
        <ExternalLink size={12} /> المصدر في بوّابة العدل
      </a>
    )}
  </div>
);

export default PrecedentSearchModal;
