import React, { useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Send,
  AlertTriangle,
  Users as UsersIcon,
  Search,
  Loader2,
} from 'lucide-react';
import Modal from './Modal';
import { UserService, type User } from '../services/UserService';
import { useTenant } from '../contexts/TenantContext';
import { apiClient } from '../utils/api';

type WaStatus = 'connected' | 'connecting' | 'disconnected' | 'unknown';

interface CompanyLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  waStatus: WaStatus;
  onOpenWhatsappSettings: () => void;
}

interface CompanyInfo {
  slug: string | null;
  domain: string | null;
  name: string;
}

const buildCompanyUrl = (info: CompanyInfo | null): string => {
  if (!info) return '';
  if (info.domain) return `https://${info.domain}`;
  if (info.slug) return `https://${info.slug}.alraedlaw.com`;
  return '';
};

const buildMessage = (companyName: string, url: string): string =>
  `مرحباً،\nهذا رابط نظام ${companyName}:\n${url}\n\nسجّل دخولك للوصول إلى قضاياك ومهامك.`;

const sendWhatsapp = async (phone: string, message: string): Promise<boolean> => {
  try {
    const response: any = await apiClient.post('/whatsapp/send', { phone, message });
    return response?.success !== false;
  } catch {
    return false;
  }
};

const CompanyLinkModal: React.FC<CompanyLinkModalProps> = ({
  isOpen,
  onClose,
  waStatus,
  onOpenWhatsappSettings,
}) => {
  const { tenant: ctxTenant } = useTenant();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [lawyers, setLawyers] = useState<User[]>([]);
  const [loadingLawyers, setLoadingLawyers] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const url = useMemo(() => buildCompanyUrl(companyInfo), [companyInfo]);
  const companyName = companyInfo?.name || 'الشركة';
  const isWaConnected = waStatus === 'connected';

  // 1) من TenantContext (subdomain) لو متوفر
  useEffect(() => {
    if (ctxTenant?.slug) {
      setCompanyInfo({
        slug: ctxTenant.slug,
        domain: null,
        name: ctxTenant.name,
      });
    }
  }, [ctxTenant?.slug, ctxTenant?.name]);

  // 2) Fallback: جلب بيانات الشركة من /tenant (لما المستخدم على الدومين الرئيسي)
  useEffect(() => {
    if (!isOpen) return;
    if (companyInfo) return;
    setLoadingCompany(true);
    apiClient.get<any>('/tenant')
      .then((response) => {
        const t = response?.data?.tenant;
        if (t) {
          setCompanyInfo({
            slug: t.slug || null,
            domain: t.domain || null,
            name: t.name || 'الشركة',
          });
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => setLoadingCompany(false));
  }, [isOpen, companyInfo]);

  useEffect(() => {
    if (!isOpen) return;
    setResult(null);
    setSearch('');
    setLoadingLawyers(true);
    UserService.getLawyers()
      .then((list) => {
        const withPhone = list.filter((l) => !!l.phone);
        setLawyers(withPhone);
      })
      .catch(() => setLawyers([]))
      .finally(() => setLoadingLawyers(false));
  }, [isOpen]);

  const filteredLawyers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lawyers;
    return lawyers.filter((l) =>
      l.name.toLowerCase().includes(q) || (l.phone || '').includes(q)
    );
  }, [lawyers, search]);

  const allFilteredSelected = filteredLawyers.length > 0 &&
    filteredLawyers.every((l) => selected.has(l.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredLawyers.forEach((l) => next.delete(l.id));
      } else {
        filteredLawyers.forEach((l) => next.add(l.id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpen = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const handleSend = async () => {
    if (!isWaConnected) return;
    const targets = lawyers.filter((l) => selected.has(l.id) && l.phone);
    if (targets.length === 0) return;

    setSending(true);
    setResult(null);
    const message = buildMessage(companyName, url);
    let success = 0;
    let failed = 0;
    for (const lawyer of targets) {
      const ok = await sendWhatsapp(lawyer.phone!, message);
      if (ok) success += 1;
      else failed += 1;
    }
    setResult({ success, failed });
    setSending(false);
  };

  const selectedCount = selected.size;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="رابط الشركة" size="md">
      <div style={s.container}>
        {/* URL Display + Actions */}
        <section style={s.section}>
          <div style={s.sectionLabel}>رابط الشركة</div>
          <div style={s.urlRow}>
            {loadingCompany && !url ? (
              <span style={{ ...s.urlCode, color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Loader2 size={12} className="wa-spin" />
                جاري التحميل...
              </span>
            ) : (
              <code style={s.urlCode}>{url || '—'}</code>
            )}
            <button type="button" onClick={handleCopy} style={s.iconBtn} title="نسخ" disabled={!url}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <div style={s.actionsRow}>
            <button
              type="button"
              onClick={handleOpen}
              style={{ ...s.btnPrimary, ...(!url ? s.btnDisabled : {}) }}
              disabled={!url}
            >
              <ExternalLink size={14} />
              <span>فتح في تبويب جديد</span>
            </button>
          </div>
        </section>

        <div style={s.divider} />

        {/* WhatsApp Send Section */}
        <section style={s.section}>
          <div style={s.sectionHeader}>
            <span style={s.sectionLabel}>إرسال إلى المحامين</span>
            <span style={{ ...s.statusPill, ...statusPillStyle(waStatus) }}>
              <span style={{ ...s.statusDot, background: statusColor(waStatus) }} />
              {waStatusLabel(waStatus)}
            </span>
          </div>

          {!isWaConnected ? (
            <div style={s.warningBox}>
              <AlertTriangle size={16} color="#b45309" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 2 }}>
                  واتساب غير متصل
                </div>
                <div style={{ color: '#78350f', fontSize: 12 }}>
                  يجب ربط واتساب الشركة قبل إرسال الرابط للمحامين.
                </div>
              </div>
              <button type="button" onClick={onOpenWhatsappSettings} style={s.warningAction}>
                إعدادات الواتساب
              </button>
            </div>
          ) : (
            <>
              <div style={s.searchRow}>
                <Search size={14} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو الجوال..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={s.searchInput}
                />
                <label style={s.selectAllLabel}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAll}
                    disabled={filteredLawyers.length === 0}
                  />
                  <span>تحديد الكل</span>
                </label>
              </div>

              <div style={s.lawyersList}>
                {loadingLawyers ? (
                  <div style={s.emptyState}>
                    <Loader2 size={18} className="wa-spin" />
                    <span>جاري تحميل المحامين...</span>
                  </div>
                ) : filteredLawyers.length === 0 ? (
                  <div style={s.emptyState}>
                    <UsersIcon size={18} color="#94a3b8" />
                    <span>
                      {lawyers.length === 0
                        ? 'لا يوجد محامون بأرقام جوال مسجلة'
                        : 'لا توجد نتائج للبحث'}
                    </span>
                  </div>
                ) : (
                  filteredLawyers.map((l) => {
                    const isSelected = selected.has(l.id);
                    return (
                      <label key={l.id} style={lawyerRowStyle(isSelected)}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(l.id)}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={s.lawyerName}>{l.name}</div>
                          <div style={s.lawyerPhone}>{l.phone}</div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div style={s.sendRow}>
                {result && (
                  <span style={s.resultBadge}>
                    <Check size={13} color="#16a34a" />
                    تم الإرسال: {result.success}
                    {result.failed > 0 && <span style={{ color: '#dc2626' }}> / فشل: {result.failed}</span>}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || selectedCount === 0}
                  style={{
                    ...s.btnPrimary,
                    ...(sending || selectedCount === 0 ? s.btnDisabled : {}),
                    marginRight: 'auto',
                  }}
                >
                  {sending ? <Loader2 size={14} className="wa-spin" /> : <Send size={14} />}
                  <span>
                    إرسال{selectedCount > 0 ? ` (${selectedCount})` : ''}
                  </span>
                </button>
              </div>
            </>
          )}
        </section>
      </div>
      <style>{`@keyframes clm-spin { to { transform: rotate(360deg); } } .wa-spin { animation: clm-spin 0.8s linear infinite; }`}</style>
    </Modal>
  );
};

// ── styling helpers ──────────────────────────────────────────────

const statusColor = (st: WaStatus) => {
  switch (st) {
    case 'connected': return '#16a34a';
    case 'connecting': return '#f59e0b';
    case 'disconnected': return '#dc2626';
    default: return '#94a3b8';
  }
};

const waStatusLabel = (st: WaStatus) => {
  switch (st) {
    case 'connected': return 'متصل';
    case 'connecting': return 'جاري الربط';
    case 'disconnected': return 'غير متصل';
    default: return '—';
  }
};

const statusPillStyle = (st: WaStatus): React.CSSProperties => {
  const c = statusColor(st);
  return {
    color: c,
    background: `color-mix(in srgb, ${c} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${c} 35%, transparent)`,
  };
};

type S = Record<string, React.CSSProperties>;

// مفصول عن `s` لأنه دالة وليس كائن CSS ثابت
const lawyerRowStyle = (selected: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 12px', borderBottom: '1px solid #f1f5f9',
  cursor: 'pointer', userSelect: 'none',
  background: selected ? '#f8fafc' : 'transparent',
  transition: 'background 0.1s',
});

const s: S = {
  container: { display: 'flex', flexDirection: 'column', gap: 18, fontSize: 13, color: '#0f172a' },
  section: { display: 'flex', flexDirection: 'column', gap: 10 },
  sectionLabel: { fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.2px' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  urlRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#f8fafc', border: '1px solid #e2e8f0',
    borderRadius: 8, padding: '8px 10px',
  },
  urlCode: {
    flex: 1, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12, color: '#0f172a', direction: 'ltr', textAlign: 'left',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  iconBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, padding: 0,
    border: '1px solid #e2e8f0', background: '#ffffff',
    borderRadius: 6, cursor: 'pointer', color: '#475569',
    transition: 'background 0.15s, border-color 0.15s',
  },
  actionsRow: { display: 'flex', gap: 8 },
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '8px 14px', fontSize: 13, fontWeight: 500,
    background: '#0f172a', color: '#ffffff', border: 'none',
    borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
    transition: 'background 0.15s',
  },
  btnDisabled: { background: '#cbd5e1', cursor: 'not-allowed' },
  divider: { height: 1, background: '#e2e8f0' },
  statusPill: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
  },
  statusDot: { width: 6, height: 6, borderRadius: '50%' },
  warningBox: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '12px 14px',
    background: '#fffbeb', border: '1px solid #fde68a',
    borderRadius: 8,
  },
  warningAction: {
    padding: '6px 12px', fontSize: 12, fontWeight: 500,
    background: '#92400e', color: '#ffffff', border: 'none',
    borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  },
  searchRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 10px',
    background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8,
  },
  searchInput: {
    flex: 1, border: 'none', outline: 'none', background: 'transparent',
    fontSize: 13, color: '#0f172a', fontFamily: 'inherit',
  },
  selectAllLabel: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 12, color: '#475569', cursor: 'pointer', userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  lawyersList: {
    maxHeight: 260, overflowY: 'auto',
    border: '1px solid #e2e8f0', borderRadius: 8,
    background: '#ffffff',
    display: 'flex', flexDirection: 'column',
  },
  lawyerName: { fontSize: 13, fontWeight: 500, color: '#0f172a', lineHeight: 1.2 },
  lawyerPhone: { fontSize: 11, color: '#64748b', direction: 'ltr', textAlign: 'right', marginTop: 2 },
  emptyState: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 24, color: '#64748b', fontSize: 13,
  },
  sendRow: { display: 'flex', alignItems: 'center', gap: 10 },
  resultBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 12, fontWeight: 500, color: '#15803d',
  },
};

export default CompanyLinkModal;
