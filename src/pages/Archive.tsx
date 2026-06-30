import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  Trash2, RotateCcw, Loader2, FileText, FileCheck, Users,
  Inbox, AlertCircle, RefreshCw,
} from 'lucide-react';
import ArchiveService, {
  type TrashedCase, type TrashedWekala, type ArchivedClient,
} from '../services/archiveService';
import ConfirmDialog from '../components/ConfirmDialog';

/* ============================================================
   صفحة «الأرشيف / سلة المحذوفات» — للمدير والمالك فقط.
   تبويبات: قضايا / وكالات / عملاء. لكل عنصر: استعادة + حذف نهائي (بتأكيد).
   مُثيَّمة بمتغيّرات CSS (تتكيّف مع light/dark/diwan) وبأسلوب ERP كثيف فلات.
   تطابق مسارات الباك إند (Phase 4) عبر ArchiveService.
   ============================================================ */

type EntityTab = 'cases' | 'wekalat' | 'clients';

// لوحة ألوان مثيّمة (لا hex صلب — fallback فقط للأمان)
const C = {
  surface: 'var(--dashboard-card, var(--color-surface, #fff))',
  bg: 'var(--dashboard-bg, var(--color-background, #f7f8fa))',
  border: 'var(--color-border, var(--quiet-gray-200, #e5e7eb))',
  borderSoft: 'var(--quiet-gray-100, #f0f1f3)',
  headBg: 'var(--quiet-gray-50, #fafbfc)',
  text: 'var(--color-text, var(--quiet-gray-900, #111827))',
  textSub: 'var(--color-text-secondary, var(--quiet-gray-600, #64748b))',
  navy: 'var(--law-navy, #1E3A5F)',
  gold: 'var(--law-gold, #B8860B)',
  green: 'var(--status-green, #059669)',
  red: 'var(--status-red, #DC2626)',
  orange: 'var(--status-orange, #D97706)',
};

const TABS: { key: EntityTab; label: string; icon: React.ElementType }[] = [
  { key: 'cases', label: 'القضايا', icon: FileText },
  { key: 'wekalat', label: 'الوكالات', icon: FileCheck },
  { key: 'clients', label: 'العملاء', icon: Users },
];

function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

const wekalaTone = (status: string): string => {
  if (status === 'معتمدة') return C.green;
  if (status === 'منتهية' || status === 'موقوفة') return C.orange;
  if (status === 'مفسوخة') return C.red;
  return C.textSub;
};

const Archive: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<EntityTab>('cases');
  const [casesPage, setCasesPage] = useState(1);
  const [confirm, setConfirm] = useState<
    { type: 'restore' | 'force'; entity: EntityTab; id: number; name: string } | null
  >(null);

  // ───── الاستعلامات (كل تبويب يُجلب عند تفعيله فقط) ─────
  const casesQ = useQuery({
    queryKey: ['archive', 'cases', casesPage],
    queryFn: () => ArchiveService.getTrashedCases(casesPage),
    enabled: tab === 'cases',
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  const wekalatQ = useQuery({
    queryKey: ['archive', 'wekalat'],
    queryFn: () => ArchiveService.getTrashedWekalat(),
    enabled: tab === 'wekalat',
    staleTime: 60_000,
  });
  const clientsQ = useQuery({
    queryKey: ['archive', 'clients'],
    queryFn: () => ArchiveService.getArchivedClients(),
    enabled: tab === 'clients',
    staleTime: 60_000,
  });

  // ───── إجراء موحّد (استعادة/حذف نهائي) ─────
  const action = useMutation({
    mutationFn: async () => {
      if (!confirm) return;
      const { entity, type, id } = confirm;
      if (entity === 'cases') return type === 'restore' ? ArchiveService.restoreCase(id) : ArchiveService.forceDeleteCase(id);
      if (entity === 'wekalat') return type === 'restore' ? ArchiveService.restoreWekala(id) : ArchiveService.forceDeleteWekala(id);
      return type === 'restore' ? ArchiveService.restoreClient(id) : ArchiveService.forceDeleteClient(id);
    },
    onSuccess: () => {
      toast.success(confirm?.type === 'restore' ? 'تمت الاستعادة بنجاح' : 'تم الحذف النهائي بنجاح');
      queryClient.invalidateQueries({ queryKey: ['archive'] });
      // تحديث القوائم الحيّة المتأثرة (القضايا/الوكالات/العملاء) إن كانت مخزّنة
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['wekalat'] });
      setConfirm(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'تعذّر تنفيذ العملية';
      toast.error(msg);
    },
  });

  const askRestore = (entity: EntityTab, id: number, name: string) => setConfirm({ type: 'restore', entity, id, name });
  const askForce = (entity: EntityTab, id: number, name: string) => setConfirm({ type: 'force', entity, id, name });

  const counts = {
    cases: casesQ.data?.total,
    wekalat: wekalatQ.data?.length,
    clients: clientsQ.data?.length,
  };

  return (
    <div style={{ padding: 20, background: C.bg, minHeight: '100%' }} dir="rtl">
      {/* رأس الصفحة */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--law-navy-light, rgba(30,58,95,0.08))', color: C.navy,
        }}>
          <Trash2 size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>سلة المحذوفات</h1>
          <p style={{ fontSize: 12, color: C.textSub, margin: '2px 0 0' }}>
            استعادة أو حذف نهائي للقضايا والوكالات والعملاء المؤرشفين — متاحة للمدير والمالك فقط.
          </p>
        </div>
      </div>

      {/* بطاقة التبويبات + الجدول */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        {/* التبويبات */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.headBg }}>
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            const count = counts[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '12px 18px',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'transparent', border: 'none',
                  color: active ? C.navy : C.textSub,
                  borderBottom: active ? `2px solid ${C.gold}` : '2px solid transparent',
                }}
              >
                <Icon size={15} />
                {label}
                {typeof count === 'number' && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 9,
                    background: active ? 'var(--law-navy-light, rgba(30,58,95,0.10))' : C.borderSoft,
                    color: active ? C.navy : C.textSub, minWidth: 18, textAlign: 'center',
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* المحتوى */}
        <div>
          {tab === 'cases' && (
            <EntityTable
              query={casesQ}
              columns={['رقم الملف', 'العنوان', 'الموكّل', 'تاريخ الأرشفة', '']}
              rows={(casesQ.data?.data ?? []) as TrashedCase[]}
              renderRow={(c: TrashedCase) => [
                <span style={{ fontWeight: 700, color: C.navy }}>{c.file_number}</span>,
                <span>{c.title || '—'}</span>,
                <span style={{ color: C.textSub }}>{c.client_name || '—'}</span>,
                <span style={{ color: C.textSub }}>{fmtDate(c.deleted_at)}</span>,
                <RowActions
                  busy={action.isPending}
                  onRestore={() => askRestore('cases', c.id, `القضية ${c.file_number}`)}
                  onForce={() => askForce('cases', c.id, `القضية ${c.file_number}`)}
                />,
              ]}
              pagination={{
                page: casesPage,
                lastPage: casesQ.data?.last_page ?? 1,
                onChange: setCasesPage,
              }}
            />
          )}

          {tab === 'wekalat' && (
            <EntityTable
              query={wekalatQ}
              columns={['رقم الوكالة', 'النوع', 'الحالة', 'تاريخ الأرشفة', '']}
              rows={(wekalatQ.data ?? []) as TrashedWekala[]}
              renderRow={(w: TrashedWekala) => [
                <span style={{ fontWeight: 700, color: C.navy }}>{w.number}</span>,
                <span>{w.type || '—'}</span>,
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10,
                  border: `1px solid ${wekalaTone(w.status)}`, color: wekalaTone(w.status),
                }}>{w.status || '—'}</span>,
                <span style={{ color: C.textSub }}>{fmtDate(w.deleted_at)}</span>,
                <RowActions
                  busy={action.isPending}
                  onRestore={() => askRestore('wekalat', w.id, `الوكالة ${w.number}`)}
                  onForce={() => askForce('wekalat', w.id, `الوكالة ${w.number}`)}
                />,
              ]}
            />
          )}

          {tab === 'clients' && (
            <EntityTable
              query={clientsQ}
              columns={['الاسم', 'الجوال', 'الهوية', 'تاريخ الأرشفة', '']}
              rows={(clientsQ.data ?? []) as ArchivedClient[]}
              renderRow={(cl: ArchivedClient) => [
                <span style={{ fontWeight: 700, color: C.text }}>{cl.name}</span>,
                <span style={{ color: C.textSub, direction: 'ltr', display: 'inline-block' }}>{cl.phone || '—'}</span>,
                <span style={{ color: C.textSub }}>{cl.national_id || '—'}</span>,
                <span style={{ color: C.textSub }}>{fmtDate(cl.updated_at)}</span>,
                <RowActions
                  busy={action.isPending}
                  onRestore={() => askRestore('clients', cl.id, cl.name)}
                  onForce={() => askForce('clients', cl.id, cl.name)}
                />,
              ]}
            />
          )}
        </div>
      </div>

      {/* تأكيد الإجراء */}
      <ConfirmDialog
        isOpen={!!confirm}
        title={confirm?.type === 'force' ? 'حذف نهائي' : 'استعادة'}
        variant={confirm?.type === 'force' ? 'danger' : 'primary'}
        confirmLabel={confirm?.type === 'force' ? 'حذف نهائي' : 'استعادة'}
        loading={action.isPending}
        message={
          confirm?.type === 'force'
            ? <>هل أنت متأكد من <b>الحذف النهائي</b> لـ «{confirm?.name}»؟</>
            : <>هل تريد استعادة «{confirm?.name}» من الأرشيف؟</>
        }
        note={
          confirm?.type === 'force'
            ? 'لا يمكن التراجع عن الحذف النهائي. ستُحذف كل البيانات المرتبطة نهائياً.'
            : 'ستعود مع كل ما أُرشِف معها (الجلسات/المهام/المستندات أو الأطراف).'
        }
        onConfirm={() => action.mutate()}
        onClose={() => !action.isPending && setConfirm(null)}
      />
    </div>
  );
};

/* ───────────── جدول ERP عام (تحميل/خطأ/فراغ + صفوف) ───────────── */
interface EntityTableProps<T> {
  query: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => void };
  columns: string[];
  rows: T[];
  renderRow: (row: T) => React.ReactNode[];
  pagination?: { page: number; lastPage: number; onChange: (p: number) => void };
}

function EntityTable<T extends { id: number }>({ query, columns, rows, renderRow, pagination }: EntityTableProps<T>) {
  if (query.isLoading) return <StateBlock kind="loading" />;
  if (query.isError) {
    const msg = query.error instanceof Error ? query.error.message : 'تعذّر تحميل البيانات';
    return <StateBlock kind="error" message={msg} onRetry={query.refetch} />;
  }
  if (!rows.length) return <StateBlock kind="empty" />;

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i} style={{
                  textAlign: 'right', padding: '10px 16px', fontSize: 12, fontWeight: 700,
                  color: C.textSub, background: C.headBg, borderBottom: `1px solid ${C.border}`,
                  whiteSpace: 'nowrap',
                }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const cells = renderRow(row);
              return (
                <tr
                  key={row.id}
                  style={{ borderBottom: `1px solid ${C.borderSoft}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.headBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {cells.map((cell, i) => (
                    <td key={i} style={{
                      padding: '10px 16px', color: C.text, whiteSpace: 'nowrap',
                      textAlign: i === cells.length - 1 ? 'left' : 'right',
                    }}>{cell}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && pagination.lastPage > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.textSub,
        }}>
          <span>صفحة {pagination.page} من {pagination.lastPage}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <PagerBtn disabled={pagination.page <= 1} onClick={() => pagination.onChange(pagination.page - 1)}>السابق</PagerBtn>
            <PagerBtn disabled={pagination.page >= pagination.lastPage} onClick={() => pagination.onChange(pagination.page + 1)}>التالي</PagerBtn>
          </div>
        </div>
      )}
    </>
  );
}

const PagerBtn: React.FC<{ disabled: boolean; onClick: () => void; children: React.ReactNode }> = ({ disabled, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '5px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6,
      border: `1px solid ${C.border}`, background: 'transparent', color: C.text,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
    }}
  >{children}</button>
);

/* ───────────── أزرار الصف ───────────── */
const RowActions: React.FC<{ busy: boolean; onRestore: () => void; onForce: () => void }> = ({ busy, onRestore, onForce }) => (
  <div style={{ display: 'inline-flex', gap: 6 }}>
    <button
      type="button"
      onClick={onRestore}
      disabled={busy}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 12, fontWeight: 700,
        borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer',
        border: `1px solid ${C.green}`, color: C.green, background: 'transparent',
      }}
    >
      <RotateCcw size={13} /> استعادة
    </button>
    <button
      type="button"
      onClick={onForce}
      disabled={busy}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 12, fontWeight: 700,
        borderRadius: 6, cursor: busy ? 'not-allowed' : 'pointer',
        border: `1px solid ${C.red}`, color: C.red, background: 'transparent',
      }}
    >
      <Trash2 size={13} /> حذف نهائي
    </button>
  </div>
);

/* ───────────── حالات (تحميل/فراغ/خطأ) ───────────── */
const StateBlock: React.FC<{ kind: 'loading' | 'empty' | 'error'; message?: string; onRetry?: () => void }> = ({ kind, message, onRetry }) => {
  const wrap: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: '56px 20px', color: C.textSub, textAlign: 'center',
  };
  if (kind === 'loading') {
    return <div style={wrap}><Loader2 size={26} className="spinning" style={{ color: C.navy }} /><span style={{ fontSize: 13 }}>جاري التحميل…</span></div>;
  }
  if (kind === 'empty') {
    return <div style={wrap}><Inbox size={30} style={{ color: 'var(--quiet-gray-400, #c1c7d0)' }} /><span style={{ fontSize: 13, fontWeight: 600 }}>السلة فارغة — لا عناصر مؤرشفة هنا.</span></div>;
  }
  return (
    <div style={wrap}>
      <AlertCircle size={28} style={{ color: C.red }} />
      <span style={{ fontSize: 13 }}>{message || 'حدث خطأ أثناء التحميل.'}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700,
          borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.text, cursor: 'pointer',
        }}><RefreshCw size={13} /> إعادة المحاولة</button>
      )}
    </div>
  );
};

export default Archive;
