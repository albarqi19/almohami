import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  X,
  FileText,
  Loader2,
  Cloud,
  CloudOff,
  Send,
  FileDown,
  Check,
  ZoomIn,
  ZoomOut,
  Scan,
  User,
  Hash,
  CalendarDays,
  PenLine,
  Save,
} from 'lucide-react';
import TiptapEditor, { type TiptapEditorRef } from '../TiptapEditor';
import LegalAIToolbarButton from '../LegalAIToolbarButton';
import { apiClient } from '../../utils/api';
import { getApiErrorMessage } from '../../utils/apiError';
import { useAuth } from '../../contexts/AuthContext';
import type { LegalService } from '../../types/legalServices';
import type { TextAnnotation } from '../../types/textAnnotations';

/**
 * ✍️ خطاب الخدمة — مخرَج الخدمة المبسطة بتجربة «إنشاء الصادر» نفسها:
 * ورقة A4 حيّة بكليشة المكتب يُكتب عليها مباشرة (Tiptap + أدوات الذكاء)،
 * لكن كل الجاهز جاهز: المستلم (عميل الخدمة) والرقم والتاريخ والتوقيع تلقائياً —
 * المحامي يكتب الموضوع والمتن فقط، ثم PDF وإرسال برابط موقّت.
 * يعيد استخدام كلاسات clc-* (correspondence-compose.css المحمّل مركزياً).
 */

const A4_WIDTH_PX = 794;

type LetterheadMode = 'official' | 'minimal' | 'none';

interface Props {
  service: LegalService;
  onClose: () => void;
  /** بعد توليد/إرسال — لتحديث أنشطة الصفحة الأم */
  onChanged: () => void;
}

const LETTERHEADS: Array<{ value: LetterheadMode; label: string; hint: string }> = [
  { value: 'official', label: 'رسمية', hint: 'شعار المكتب وترويسته وتذييله' },
  { value: 'minimal', label: 'مبسطة', hint: 'سطر باسم المكتب فقط' },
  { value: 'none', label: 'بلا كليشة', hint: 'ورقة صافية' },
];

const SimpleLetterComposer: React.FC<Props> = ({ service, onClose, onChanged }) => {
  const { user: authUser } = useAuth();
  const officeName = (authUser as any)?.tenant?.name || (authUser as any)?.tenant_name || 'مكتب المحاماة';
  const comp: any = service.simple_service_detail?.composition ?? null;

  // ── الحقول: الموضوع افتراضياً من عنوان الخدمة، والتوقيع من المحامي المسؤول ──
  const [subject, setSubject] = useState<string>(
    comp?.letter_subject || `خطاب بخصوص: ${service.title}`
  );
  const [body, setBody] = useState<string>(comp?.letter_html || '');
  const [letterhead, setLetterhead] = useState<LetterheadMode>(comp?.letterhead || 'official');
  const [signatoryName, setSignatoryName] = useState<string>(
    comp?.signatory_name || service.assigned_lawyer?.name || officeName
  );
  const [signatoryTitle, setSignatoryTitle] = useState<string>(comp?.signatory_title || 'المحامي');

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [generating, setGenerating] = useState(false);
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);

  // مودال الإرسال بعد التوليد
  const [sendFor, setSendFor] = useState<{ id: number; title: string } | null>(null);
  const [channels, setChannels] = useState<{ whatsapp: boolean; email: boolean }>({ whatsapp: true, email: true });
  const [sendNote, setSendNote] = useState('');
  const [sending, setSending] = useState(false);

  const editorRef = useRef<TiptapEditorRef>(null);
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null);
  const editorColRef = useRef<HTMLDivElement>(null);

  // ── التكبير (كمنشئ الصادر) ──
  const [zoom, setZoom] = useState<number>(() => {
    const saved = Number(localStorage.getItem('ssl_zoom'));
    return saved >= 0.5 && saved <= 2 ? saved : 1;
  });
  const applyZoom = (z: number) => {
    const v = Math.min(2, Math.max(0.5, Math.round(z * 100) / 100));
    setZoom(v);
    localStorage.setItem('ssl_zoom', String(v));
  };
  const zoomBy = (d: number) => applyZoom(zoom + d);
  const fitWidth = () => {
    const w = editorColRef.current?.clientWidth ?? 0;
    if (w) applyZoom(Math.min(1.4, Math.max(0.6, (w - 64) / A4_WIDTH_PX)));
  };

  // ── التاريخ الهجري/الميلادي (مرآة meta الـ PDF) ──
  const pageDates = useMemo(() => {
    const now = new Date();
    let hijri = '';
    try {
      hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(now) + 'هـ';
    } catch { /* متصفح بلا تقويم هجري — يكفي الميلادي */ }
    const greg = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return { hijri, greg };
  }, []);

  // ── الحفظ التلقائي للمسودة (composition.letter_*) ──
  const dirtyRef = useRef(false);
  const payload = useMemo(
    () => ({
      doc_title: subject || null,
      letter_subject: subject || null,
      letter_html: body || null,
      letterhead,
      signatory_name: signatoryName || null,
      signatory_title: signatoryTitle || null,
    }),
    [subject, body, letterhead, signatoryName, signatoryTitle]
  );

  const save = useCallback(async (silent = true) => {
    setSaving(true);
    try {
      await apiClient.put(`/legal-services/${service.id}/simple/composition`, payload);
      setLastSaved(new Date());
      dirtyRef.current = false;
      if (!silent) toast.success('حُفظت المسودة');
    } catch (err) {
      if (!silent) toast.error(getApiErrorMessage(err, 'تعذّر الحفظ'));
    } finally {
      setSaving(false);
    }
  }, [service.id, payload]);

  useEffect(() => {
    dirtyRef.current = true;
    const t = setTimeout(() => save(true), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  // ── التوليد ثم الإرسال ──
  const generate = async () => {
    const html = editorRef.current?.getHTML?.() ?? body;
    if (!subject.trim()) {
      toast.error('اكتب موضوع الخطاب أولاً');
      return;
    }
    setGenerating(true);
    try {
      const res = await apiClient.post<{ success: boolean; data: { id: number; title: string }; message?: string }>(
        `/legal-services/${service.id}/simple/letter/generate`,
        {
          subject: subject.trim(),
          body_html: html,
          letterhead,
          signatory_name: signatoryName.trim() || undefined,
          signatory_title: signatoryTitle.trim() || undefined,
        }
      );
      toast.success(res.message || 'وُلِّد الخطاب PDF');
      onChanged();
      setSendFor({ id: res.data.id, title: res.data.title });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر توليد الخطاب'));
    } finally {
      setGenerating(false);
    }
  };

  const submitSend = async () => {
    if (!sendFor) return;
    const chosen = [
      ...(channels.whatsapp ? ['whatsapp'] : []),
      ...(channels.email ? ['email'] : []),
    ];
    if (chosen.length === 0) {
      toast.error('اختر قناة إرسال واحدة على الأقل');
      return;
    }
    setSending(true);
    try {
      const res = await apiClient.post<{ success: boolean; message?: string }>(
        `/legal-services/${service.id}/simple/share-deliverable`,
        { deliverable_id: sendFor.id, note: sendNote.trim() || undefined, channels: chosen }
      );
      toast.success(res.message || 'أُرسل الخطاب للعميل');
      setSendFor(null);
      setSendNote('');
      onChanged();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إرسال الخطاب'));
    } finally {
      setSending(false);
    }
  };

  const busy = saving || generating;
  const fmtTime = (d: Date | null) => (d ? d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '');
  const clientName = service.client?.name ?? null;

  return (
    <div className="clc-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="clc-modal">
        {/* ── الرأس ── */}
        <header className="clc-header">
          <div className="clc-header__right">
            <button className="clc-iconbtn" onClick={onClose} title="إغلاق"><X size={18} /></button>
            <div className="clc-title">
              <FileText size={17} />
              <span>خطاب الخدمة — {service.service_number}</span>
            </div>
            <div className="clc-save-state">
              {saving ? <><Loader2 size={13} className="clc-spin" /> جارٍ الحفظ…</>
                : lastSaved ? <><Cloud size={13} /> حُفظ {fmtTime(lastSaved)}</>
                : <><CloudOff size={13} /> غير محفوظ</>}
            </div>
          </div>
          <div className="clc-header__left">
            <LegalAIToolbarButton
              onSelectText={() => {
                const s = window.getSelection();
                return s && s.toString().trim() ? s.toString().trim() : null;
              }}
              onGetAllText={() => editorRef.current?.getAllText?.() || null}
              onReplaceText={(t) => editorRef.current?.replaceSelectedText?.(t)}
              onReplaceAllText={(t) => editorRef.current?.replaceAllText?.(t)}
              onSetTextAnnotations={(a) => setTextAnnotations(a)}
              source="memo"
              memoType="خطاب"
            />
            <button className="clc-btn clc-btn--ghost" onClick={() => void save(false)} disabled={busy}>
              <Save size={15} /> حفظ
            </button>
            <button className="clc-btn clc-btn--primary" onClick={generate} disabled={busy}>
              {generating ? <Loader2 size={15} className="clc-spin" /> : <FileDown size={15} />}
              توليد PDF
            </button>
          </div>
        </header>

        {/* ── الجسم ── */}
        <div className="clc-body">
          {/* الورقة الحيّة على المنضدة */}
          <main className="clc-editor-col" ref={editorColRef}>
            <div className="clc-ribbon">
              <div className="clc-ribbon__tools" ref={setToolbarHost} />
            </div>
            <div className="clc-desk">
              <div className="clc-page" style={{ ['--clc-zoom' as any]: zoom }}>
                {/* الترويسة حسب الكليشة */}
                {letterhead === 'official' && (
                  <div className="clc-page__dh">
                    <div className="clc-page__dh-info">
                      <div className="clc-page__dh-name" style={{ color: '#1f3a5f' }}>{officeName}</div>
                    </div>
                  </div>
                )}
                {letterhead === 'minimal' && <div className="ssl-minlh">{officeName}</div>}

                <div className="clc-page__inner">
                  <div className="clc-page__meta">
                    <span>الرقم: <b>{service.service_number}</b></span>
                    <span className="clc-page__meta-dates">
                      {pageDates.hijri && <>{pageDates.hijri}<br /></>}
                      <i>الموافق {pageDates.greg}م</i>
                    </span>
                  </div>

                  {clientName && (
                    <>
                      <div className="clc-page__addr">
                        <b>إلى:</b> السادة/ {clientName} &nbsp;المحترمين
                      </div>
                      <div className="ssl-salam">السلام عليكم ورحمة الله وبركاته، وبعد:</div>
                    </>
                  )}

                  <label className="clc-page__subject">
                    <span>الموضوع:</span>
                    <input
                      placeholder="اكتب موضوع الخطاب…"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </label>

                  <div className="clc-editor-wrap">
                    <TiptapEditor
                      ref={editorRef}
                      content={body}
                      onChange={setBody}
                      placeholder="اكتب متن الخطاب هنا… (المستلم والرقم والتاريخ والتوقيع جاهزون تلقائياً — تدعم الجداول والألوان وأدوات الذكاء بالأعلى)"
                      minHeight="330px"
                      autoFocus
                      textAnnotations={textAnnotations}
                      onApplyAnnotation={(id) => setTextAnnotations((prev) => prev.filter((a) => a.id !== id))}
                      toolbarPortalEl={toolbarHost}
                    />
                  </div>

                  <div className="ssl-closing">وتفضلوا بقبول فائق الاحترام والتقدير،،،</div>
                  <div className="ssl-sign">
                    <b>{signatoryName || officeName}</b>
                    <span>{signatoryTitle}</span>
                  </div>
                </div>

                {letterhead !== 'none' && (
                  <div className="clc-page__df">{officeName} — صدر عبر نظام الرائد لإدارة المحاماة</div>
                )}
              </div>
            </div>
            <div className="clc-zoomdock">
              <div className="clc-zoomdock__pill">
                <button onClick={() => zoomBy(-0.1)} title="تصغير"><ZoomOut size={15} /></button>
                <button className="clc-zoomdock__pct" onClick={() => applyZoom(1)} title="الحجم الفعلي (100%)">{Math.round(zoom * 100)}%</button>
                <button onClick={() => zoomBy(0.1)} title="تكبير"><ZoomIn size={15} /></button>
                <span className="clc-zoomdock__sep" />
                <button onClick={fitWidth} title="ملاءمة عرض الشاشة"><Scan size={15} /> ملاءمة</button>
              </div>
            </div>
          </main>

          {/* اللوحة الجانبية */}
          <aside className="clc-side">
            {/* الجاهز تلقائياً — للاطمئنان لا للإدخال */}
            <section className="clc-card clc-summary">
              <div className="clc-card__h"><Check size={13} /> جاهز تلقائياً من الخدمة</div>
              <ul>
                <li><span><User size={11} /> المستلم</span><b>{clientName ?? 'لا عميل مرتبط'}</b></li>
                <li><span><Hash size={11} /> الرقم</span><b>{service.service_number}</b></li>
                <li><span><CalendarDays size={11} /> التاريخ</span><b>{pageDates.hijri || pageDates.greg}</b></li>
              </ul>
              <p className="clc-summary__note">
                لا تحتاج اختيار عميل ولا كتابة عنوان — كله من بيانات الخدمة. اكتب المتن فقط.
              </p>
            </section>

            {/* الكليشة */}
            <section className="clc-card">
              <div className="clc-card__h"><FileText size={13} /> الكليشة</div>
              <div className="clc-methods">
                {LETTERHEADS.map((l) => (
                  <button
                    key={l.value}
                    className={`clc-method${letterhead === l.value ? ' is-on' : ''}`}
                    onClick={() => setLetterhead(l.value)}
                  >
                    <span>
                      <span className="clc-method__l">{l.label}</span>
                      <span className="clc-method__h" style={{ display: 'block' }}>{l.hint}</span>
                    </span>
                    {letterhead === l.value && <Check size={14} className="clc-method__ok" />}
                  </button>
                ))}
              </div>
            </section>

            {/* التوقيع */}
            <section className="clc-card">
              <div className="clc-card__h"><PenLine size={13} /> التوقيع</div>
              <div className="clc-field">
                <span>اسم الموقّع</span>
                <input value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} placeholder={officeName} />
              </div>
              <div className="clc-field">
                <span>الصفة</span>
                <input value={signatoryTitle} onChange={(e) => setSignatoryTitle(e.target.value)} placeholder="المحامي" />
              </div>
            </section>

            <button className="clc-btn clc-btn--primary" style={{ justifyContent: 'center' }} onClick={generate} disabled={busy}>
              {generating ? <Loader2 size={15} className="clc-spin" /> : <FileDown size={15} />}
              توليد الخطاب PDF
            </button>
          </aside>
        </div>
      </div>

      {/* ── مودال الإرسال بعد التوليد ── */}
      {sendFor && (
        <div className="ssp2-overlay" style={{ zIndex: 1400 }} onMouseDown={(e) => e.target === e.currentTarget && setSendFor(null)}>
          <div className="ssp2-modal">
            <div className="ssp2-modal__head">
              <span>إرسال «{sendFor.title}» للعميل</span>
              <button className="ssp2-icon-btn" onClick={() => setSendFor(null)} aria-label="إغلاق"><X size={15} /></button>
            </div>
            <div className="ssp2-modal__body">
              <p className="ssp2-hint">يُرسل رابط تحميل مؤقت (72 ساعة) ويُدوَّن في سجل الخدمة.</p>
              <div className="sdc-channels">
                <label className={channels.whatsapp ? 'on' : ''}>
                  <input type="checkbox" checked={channels.whatsapp} onChange={(e) => setChannels((c) => ({ ...c, whatsapp: e.target.checked }))} />
                  واتساب
                </label>
                <label className={channels.email ? 'on' : ''}>
                  <input type="checkbox" checked={channels.email} onChange={(e) => setChannels((c) => ({ ...c, email: e.target.checked }))} />
                  بريد إلكتروني
                </label>
              </div>
              <label className="ssp2-label">رسالة مرافقة (اختياري)</label>
              <input className="ssp2-input" value={sendNote} onChange={(e) => setSendNote(e.target.value)} placeholder="مثال: هذا الخطاب النهائي بعد المراجعة" />
              <div className="ssp2-modal__foot">
                <button className="ssp2-btn" onClick={() => setSendFor(null)}>لاحقاً</button>
                <button className="ssp2-btn ssp2-btn--primary" onClick={submitSend} disabled={sending}>
                  {sending ? <Loader2 size={14} className="ssp2-spin" /> : <Send size={14} />} إرسال للعميل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleLetterComposer;
