import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Scale, Loader2, RotateCcw, CheckCircle2, Play } from 'lucide-react';
import { apiClient } from '../../utils/api';

/**
 * إعدادات «تسمية القضايا» — تحويل أسماء القضايا إلى صيغة
 * «العميل ضد الخصم - رقم القضية» مع تراجع كامل.
 * التحويل يجري بالخلفية في الباك (CaseNamingJob) ويسري على كل النظام
 * بما فيه رسائل التذكير، لأن العمود title نفسه هو الذي يتغيّر.
 */

interface NamingStatus {
  enabled: boolean;
  include_manual: boolean;
  total_count: number;
  eligible_count: number;
  converted_count: number;
}

const CaseNamingSettings: React.FC = () => {
  const [status, setStatus] = useState<NamingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [includeManual, setIncludeManual] = useState(false);
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState<'convert' | 'revert' | null>(null);
  const refreshTimers = useRef<number[]>([]);

  const fetchStatus = useCallback(async () => {
    try {
      const res: any = await apiClient.get('/tenant/case-naming/status');
      if (res.success) {
        setStatus(res.data);
        setIncludeManual(!!res.data.include_manual);
      }
    } catch (error) {
      console.error('Error fetching case naming status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const timers = refreshTimers.current;
    return () => { timers.forEach(t => window.clearTimeout(t)); };
  }, [fetchStatus]);

  // التحويل يعمل بالخلفية — نعيد جلب الحالة بعد مهلتين ليظهر تقدّمه
  const scheduleRefresh = () => {
    refreshTimers.current.push(
      window.setTimeout(fetchStatus, 5000),
      window.setTimeout(fetchStatus, 15000),
    );
  };

  const runConvert = async () => {
    setConfirming(null);
    setWorking(true);
    setMessage('');
    try {
      const res: any = await apiClient.post('/tenant/case-naming/convert', { include_manual: includeManual });
      if (res.success) {
        setMessage(res.message || 'بدأ التحويل بالخلفية');
        scheduleRefresh();
        fetchStatus();
      }
    } catch (error: any) {
      setMessage(error?.message || 'حدث خطأ أثناء بدء التحويل');
    } finally {
      setWorking(false);
    }
  };

  const runRevert = async () => {
    setConfirming(null);
    setWorking(true);
    setMessage('');
    try {
      const res: any = await apiClient.post('/tenant/case-naming/revert', {});
      if (res.success) {
        setMessage(res.message || 'بدأ التراجع بالخلفية');
        scheduleRefresh();
        fetchStatus();
      }
    } catch (error: any) {
      setMessage(error?.message || 'حدث خطأ أثناء بدء التراجع');
    } finally {
      setWorking(false);
    }
  };

  const statBox: React.CSSProperties = {
    flex: 1,
    minWidth: 120,
    padding: '10px 12px',
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    textAlign: 'center',
  };

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <div className="settings-section__icon">
          <Scale size={14} />
        </div>
        <span className="settings-section__title">تسمية القضايا</span>
      </div>
      <div className="settings-section__content">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 20 }}>
            <Loader2 className="animate-spin" size={20} />
            <span>جاري تحميل الحالة...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
              تحويل أسماء القضايا إلى صيغة <strong style={{ color: 'var(--law-navy)' }}>«العميل ضد الخصم - رقم القضية»</strong>.
              التغيير يسري على النظام كله: القوائم، الصفحة الرئيسية، رسائل تذكير الجلسات، والتقارير.
              القضايا الجديدة المستوردة من ناجز ستتسمى بنفس الصيغة تلقائياً ما دامت مفعّلة،
              والاسم الأصلي محفوظ ويمكن التراجع بضغطة واحدة.
            </p>

            <div style={{
              padding: '10px 14px',
              background: 'var(--color-bg-secondary)',
              border: '1px dashed var(--color-border)',
              borderRadius: 8,
              fontSize: 13,
            }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>مثال: </span>
              <strong>سالم القحطاني ضد شركة النور للمقاولات العامة وآخرون - 4570123456</strong>
            </div>

            {status && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={statBox}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--law-navy)' }}>{status.total_count}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>إجمالي القضايا</div>
                </div>
                <div style={statBox}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--law-navy)' }}>{status.eligible_count}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>مؤهلة للتحويل</div>
                </div>
                <div style={statBox}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-green, #16a34a)' }}>{status.converted_count}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>محوَّلة حالياً</div>
                </div>
                <div style={statBox}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: status.enabled ? 'var(--status-green, #16a34a)' : 'var(--color-text-secondary)', paddingTop: 4 }}>
                    {status.enabled ? 'الصيغة مفعّلة' : 'الصيغة مطفأة'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>الوضع الحالي</div>
                </div>
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeManual}
                onChange={(e) => setIncludeManual(e.target.checked)}
                disabled={working}
                style={{ marginTop: 3 }}
              />
              <span>
                شمول القضايا اليدوية والمعدَّل عنوانها يدوياً
                <span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  افتراضياً تُحوَّل قضايا ناجز فقط، وما سمّاه المستخدم بيده يبقى كما هو
                </span>
              </span>
            </label>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {confirming === 'convert' ? (
                <>
                  <button className="settings-btn settings-btn--primary" onClick={runConvert} disabled={working}>
                    تأكيد تحويل {status?.eligible_count ?? ''} قضية
                  </button>
                  <button className="settings-btn settings-btn--secondary" onClick={() => setConfirming(null)} disabled={working}>إلغاء</button>
                </>
              ) : (
                <button
                  className="settings-btn settings-btn--primary"
                  onClick={() => setConfirming('convert')}
                  disabled={working}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {working ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
                  تحويل أسماء القضايا
                </button>
              )}

              {confirming === 'revert' ? (
                <>
                  <button className="settings-btn settings-btn--danger" onClick={runRevert} disabled={working}>
                    تأكيد إعادة {status?.converted_count ?? ''} اسم أصلي
                  </button>
                  <button className="settings-btn settings-btn--secondary" onClick={() => setConfirming(null)} disabled={working}>إلغاء</button>
                </>
              ) : (
                <button
                  className="settings-btn settings-btn--secondary"
                  onClick={() => setConfirming('revert')}
                  disabled={working || !status || status.converted_count === 0}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <RotateCcw size={14} />
                  تراجع — إعادة الأسماء الأصلية
                </button>
              )}
            </div>

            {message && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 8, fontSize: 13,
                background: 'var(--status-green-light, rgba(22,163,74,.08))',
                color: 'var(--status-green, #16a34a)',
              }}>
                <CheckCircle2 size={15} />
                <span>{message}</span>
              </div>
            )}

            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
              ملاحظات: القضية التي لا يُعرف طرفاها تبقى بعنوانها الحالي.
              أسماء المنشآت (شركة، مؤسسة، ورثة...) تُكتب كاملة دون اختصار،
              والأفراد بالاسم الأول والأخير. إن لم يُحسم بعد مَن هو عميلكم في القضية
              تُسمّى «المدعي ضد المدعى عليه» مؤقتاً وتنصلح تلقائياً مع أول مزامنة من ناجز.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseNamingSettings;
