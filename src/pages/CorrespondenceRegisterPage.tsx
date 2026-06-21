// صفحة «الصادر والوارد» — سجلّ المراسلات المرقّم: بطاقات إحصائية + قائمة جانبية للفلاتر + جدول مثيّم.
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive, Search, Download, Loader2, Send, Inbox, CheckCircle2,
  Clock, AlertTriangle, Ban, FileText, RefreshCw, X, Layers, Plus,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  correspondenceService,
  DOCUMENT_TYPE_LABELS,
  type Correspondence,
} from '../services/correspondenceService';
import ComposeCorrespondenceModal from '../components/ComposeCorrespondenceModal';

const STATUS_LABELS: Record<string, string> = {
  sent: 'مُرسَل', queued: 'بالانتظار', failed: 'فشل', no_channel: 'لا قناة', void: 'مُبطَل',
};

// لون كل حالة مشتقّ من متغيّرات الثيم (يتبع الثيمات الأربعة تلقائياً)
const STATUS_TONE: Record<string, string> = {
  sent: 'green', queued: 'orange', failed: 'red', no_channel: 'muted', void: 'muted',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  sent: <CheckCircle2 size={13} />, queued: <Clock size={13} />,
  failed: <AlertTriangle size={13} />, no_channel: <Ban size={13} />, void: <Ban size={13} />,
};

const CorrespondenceRegisterPage: React.FC = () => {
  const [direction, setDirection] = useState('');
  const [docType, setDocType] = useState('');
  const [status, setStatus] = useState('');
  const [perPage, setPerPage] = useState(50);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['correspondence', direction, docType, status, search, perPage],
    queryFn: () => correspondenceService.list({
      ...(direction ? { direction } : {}),
      ...(docType ? { document_type: docType } : {}),
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
      per_page: perPage,
    }),
  });
  const rows: Correspondence[] = data?.data ?? [];

  const { data: statsResp } = useQuery({
    queryKey: ['correspondence-stats'],
    queryFn: () => correspondenceService.stats(),
  });
  const stats = statsResp?.data;
  const dir = stats?.by_direction ?? {};
  const st = stats?.by_status ?? {};
  const ty = stats?.by_type ?? {};

  const download = async (id: number) => {
    try { await correspondenceService.download(id); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذّر التحميل'); }
  };

  const clearFilters = () => {
    setDirection(''); setDocType(''); setStatus('');
    setSearch(''); setSearchInput('');
  };
  const hasFilters = !!(direction || docType || status || search);

  // بطاقات الإحصائيات العلوية
  const cards = [
    { key: 'total', label: 'إجمالي السجلات', value: stats?.total ?? 0, tone: 'navy', Icon: Archive },
    { key: 'outgoing', label: 'الصادر', value: dir.outgoing ?? 0, tone: 'blue', Icon: Send },
    { key: 'incoming', label: 'الوارد', value: dir.incoming ?? 0, tone: 'green', Icon: Inbox },
    { key: 'sent', label: 'مُرسَل بنجاح', value: st.sent ?? 0, tone: 'green', Icon: CheckCircle2 },
    { key: 'pending', label: 'قيد الانتظار / فشل', value: (st.queued ?? 0) + (st.failed ?? 0), tone: 'orange', Icon: Clock },
  ];

  return (
    <div className="corr-page">
      {/* ── شريط علوي ── */}
      <header className="corr-topbar">
        <div className="corr-topbar__title">
          <Archive size={20} />
          <span>الصادر والوارد</span>
          <span className="corr-topbar__badge">{stats?.total ?? data?.meta?.total ?? 0}</span>
        </div>

        <div className="corr-topbar__tools">
          <div className="corr-search">
            <Search size={15} />
            <input
              placeholder="بحث برقم الصادر / الموضوع / المستلِم…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
            />
            {searchInput && (
              <button className="corr-search__clear" onClick={() => { setSearchInput(''); setSearch(''); }}>
                <X size={13} />
              </button>
            )}
          </div>
          <select className="corr-select" value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} title="عدد السجلات">
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <button className="corr-btn" onClick={() => refetch()} disabled={isFetching} title="تحديث">
            <RefreshCw size={14} className={isFetching ? 'corr-spin' : ''} /> تحديث
          </button>
          <button className="corr-btn corr-btn--primary" onClick={() => setComposeOpen(true)} title="إنشاء صادر جديد">
            <Plus size={15} /> صادر جديد
          </button>
        </div>
      </header>

      {/* ── بطاقات إحصائية ── */}
      <div className="corr-stats">
        {cards.map(({ key, label, value, tone, Icon }) => (
          <div key={key} className={`corr-stat corr-stat--${tone}`}>
            <Icon className="corr-stat__bg" size={66} strokeWidth={1.5} />
            <div className="corr-stat__body">
              <div className="corr-stat__value">{value.toLocaleString('en-US')}</div>
              <div className="corr-stat__label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── التخطيط: قائمة جانبية + جدول ── */}
      <div className="corr-layout">
        <aside className="corr-sidebar">
          {/* الاتجاه */}
          <div className="corr-sidebar__group">
            <div className="corr-sidebar__title">الاتجاه</div>
            <button className={`corr-filter ${direction === '' ? 'corr-filter--active' : ''}`} onClick={() => setDirection('')}>
              <span className="corr-filter__label"><Layers size={15} /> الكل</span>
              <span className="corr-filter__badge">{stats?.total ?? 0}</span>
            </button>
            <button className={`corr-filter ${direction === 'outgoing' ? 'corr-filter--active' : ''}`} onClick={() => setDirection('outgoing')}>
              <span className="corr-filter__label"><Send size={15} /> الصادر</span>
              <span className="corr-filter__badge">{dir.outgoing ?? 0}</span>
            </button>
            <button className={`corr-filter ${direction === 'incoming' ? 'corr-filter--active' : ''}`} onClick={() => setDirection('incoming')}>
              <span className="corr-filter__label"><Inbox size={15} /> الوارد</span>
              <span className="corr-filter__badge">{dir.incoming ?? 0}</span>
            </button>
          </div>

          {/* الحالة */}
          <div className="corr-sidebar__group">
            <div className="corr-sidebar__title">الحالة</div>
            <button className={`corr-filter ${status === '' ? 'corr-filter--active' : ''}`} onClick={() => setStatus('')}>
              <span className="corr-filter__label"><Layers size={15} /> كل الحالات</span>
            </button>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <button key={v} className={`corr-filter ${status === v ? 'corr-filter--active' : ''}`} onClick={() => setStatus(v)}>
                <span className="corr-filter__label">
                  <span className={`corr-dot corr-dot--${STATUS_TONE[v]}`} /> {l}
                </span>
                <span className="corr-filter__badge">{st[v] ?? 0}</span>
              </button>
            ))}
          </div>

          {/* النوع */}
          <div className="corr-sidebar__group">
            <div className="corr-sidebar__title">النوع</div>
            <button className={`corr-filter ${docType === '' ? 'corr-filter--active' : ''}`} onClick={() => setDocType('')}>
              <span className="corr-filter__label"><FileText size={15} /> كل الأنواع</span>
            </button>
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([v, l]) => (
              <button key={v} className={`corr-filter ${docType === v ? 'corr-filter--active' : ''}`} onClick={() => setDocType(v)}>
                <span className="corr-filter__label">{l}</span>
                <span className="corr-filter__badge">{ty[v] ?? 0}</span>
              </button>
            ))}
          </div>

          {hasFilters && (
            <button className="corr-clear" onClick={clearFilters}>
              <X size={14} /> مسح الفلاتر
            </button>
          )}
        </aside>

        <main className="corr-main">
          {isLoading ? (
            <div className="corr-empty"><Loader2 size={22} className="corr-spin" /> جارٍ التحميل…</div>
          ) : rows.length === 0 ? (
            <div className="corr-empty">
              <Archive size={40} className="corr-empty__icon" />
              <div className="corr-empty__title">لا توجد سجلات مطابقة</div>
              <div className="corr-empty__desc">جرّب تغيير الفلاتر أو نص البحث.</div>
            </div>
          ) : (
            <div className="corr-table-wrap">
              <table className="corr-table">
                <thead>
                  <tr>
                    <th>الرقم</th><th>الاتجاه</th><th>النوع</th><th>الموضوع</th>
                    <th>المستلِم / المُرسِل</th><th>القضية</th><th>التاريخ</th><th>الحالة</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td><span className="corr-num">{c.number}</span></td>
                      <td>
                        <span className={`corr-dir corr-dir--${c.direction}`}>
                          {c.direction === 'outgoing' ? <Send size={11} /> : <Inbox size={11} />}
                          {c.direction === 'outgoing' ? 'صادر' : 'وارد'}
                        </span>
                      </td>
                      <td><span className="corr-chip">{c.type_label || DOCUMENT_TYPE_LABELS[c.document_type] || c.document_type}</span></td>
                      <td className="corr-td-ellipsis" title={c.subject || ''}>{c.subject || '—'}</td>
                      <td>
                        <div className="corr-party">
                          <span className="corr-party__to">{c.recipient_name_snapshot || '—'}</span>
                          {(c.sender_name_snapshot || c.sender?.name) && (
                            <span className="corr-party__from">من: {c.sender_name_snapshot || c.sender?.name}</span>
                          )}
                        </div>
                      </td>
                      <td>{c.case ? <span className="corr-num">{c.case.file_number}</span> : '—'}</td>
                      <td>{c.sent_at ? new Date(c.sent_at).toLocaleDateString('en-CA') : '—'}</td>
                      <td>
                        <span className={`corr-status corr-status--${STATUS_TONE[c.status] || 'muted'}`}>
                          {STATUS_ICON[c.status]} {STATUS_LABELS[c.status] || c.status}
                        </span>
                      </td>
                      <td>
                        <button className="corr-icon-btn" title="تحميل" onClick={() => download(c.id)}>
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      <ComposeCorrespondenceModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onIssued={() => {
          queryClient.invalidateQueries({ queryKey: ['correspondence'] });
          queryClient.invalidateQueries({ queryKey: ['correspondence-stats'] });
        }}
      />
    </div>
  );
};

export default CorrespondenceRegisterPage;
