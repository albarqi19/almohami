import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { ClipboardCheck, Plus, Trash2, Check, AlertCircle, ListChecks } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { usePermission } from '../../hooks/usePermission';
import { CHECKLIST_KIND_LABELS } from '../../types/hr';
import type { HrChecklistItem, ChecklistKind } from '../../types/hr';

const OnboardingTab: React.FC<{ empId: number }> = ({ empId }) => {
  const qc = useQueryClient();
  const canManage = usePermission('hr.manage');
  const [kind, setKind] = useState<ChecklistKind>('onboarding');
  const [newLabel, setNewLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: items, isLoading, isError } = useQuery({
    queryKey: ['hr', 'checklist', empId],
    queryFn: () => hrService.getChecklist(empId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hr', 'checklist', empId] });

  const all = items ?? [];
  const current = all.filter((i) => i.kind === kind);
  const onboarding = all.filter((i) => i.kind === 'onboarding');
  const pct = onboarding.length ? Math.round((onboarding.filter((i) => i.is_done).length / onboarding.length) * 100) : 0;

  const seed = async () => {
    setBusy(true);
    try { await hrService.seedChecklist(empId); invalidate(); }
    catch (e: any) { toast.error(e?.message || 'فشل التهيئة'); }
    finally { setBusy(false); }
  };

  const toggle = async (it: HrChecklistItem) => {
    try { await hrService.toggleChecklistItem(empId, it.id); invalidate(); }
    catch (e: any) { toast.error(e?.message || 'فشل التحديث'); }
  };

  const add = async () => {
    if (!newLabel.trim()) return;
    setBusy(true);
    try { await hrService.addChecklistItem(empId, kind, newLabel.trim()); setNewLabel(''); invalidate(); }
    catch (e: any) { toast.error(e?.message || 'فشل الإضافة'); }
    finally { setBusy(false); }
  };

  const remove = async (it: HrChecklistItem) => {
    try { await hrService.deleteChecklistItem(empId, it.id); invalidate(); }
    catch (e: any) { toast.error(e?.message || 'فشل الحذف'); }
  };

  return (
    <div className="hr-dbody hr-dbody--single">
      <div className="hr-sec">
        <div className="hr-sec__h">
          <div className="hr-sec__t"><ClipboardCheck size={15} /> المباشرة والمغادرة</div>
          <div className="hr-roster__filter" style={{ maxWidth: 260 }}>
            {(['onboarding', 'offboarding'] as ChecklistKind[]).map((k) => (
              <button key={k} className={`hr-chip ${kind === k ? 'hr-chip--active' : ''}`} onClick={() => setKind(k)}>
                {CHECKLIST_KIND_LABELS[k]}
              </button>
            ))}
          </div>
        </div>
        <div className="hr-sec__b">
          {/* شريط اكتمال المباشرة */}
          <div className="hr-onb-progress">
            <div className="hr-onb-progress__top"><span>اكتمال المباشرة</span><span>{pct}%</span></div>
            <div className="hr-upload-progress">
              <div className="hr-upload-progress__bar" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--status-green)' : 'var(--law-navy)' }} />
            </div>
          </div>

          {isLoading ? (
            <div className="hr-locked">جارٍ التحميل…</div>
          ) : isError ? (
            <div className="hr-locked"><AlertCircle size={16} /> تعذّر جلب القائمة.</div>
          ) : current.length === 0 ? (
            <div className="hr-locked" style={{ flexDirection: 'column', gap: 12 }}>
              <ListChecks size={20} />
              <div>لا توجد بنود في «{CHECKLIST_KIND_LABELS[kind]}».</div>
              {canManage && all.length === 0 && (
                <button className="hr-btn hr-btn--primary hr-btn--sm" onClick={seed} disabled={busy}>تهيئة القائمة الافتراضية</button>
              )}
            </div>
          ) : (
            current.map((it) => (
              <div className="hr-check-row" key={it.id}>
                <button
                  className={`hr-check-box ${it.is_done ? 'hr-check-box--done' : ''}`}
                  onClick={() => canManage && toggle(it)}
                  disabled={!canManage}
                  aria-label={it.is_done ? 'إلغاء الإنجاز' : 'إنجاز'}
                >
                  {it.is_done && <Check size={13} />}
                </button>
                <span className={`hr-check-label ${it.is_done ? 'hr-check-label--done' : ''}`}>{it.label}</span>
                {canManage && (
                  <button className="hr-icon-btn hr-icon-btn--sm" title="حذف" onClick={() => remove(it)}><Trash2 size={14} /></button>
                )}
              </div>
            ))
          )}

          {canManage && current.length > 0 && (
            <div className="hr-check-add">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && add()}
                placeholder={`إضافة بند إلى «${CHECKLIST_KIND_LABELS[kind]}»…`}
              />
              <button className="hr-btn hr-btn--sm hr-btn--primary" onClick={add} disabled={busy || !newLabel.trim()}><Plus size={14} /> إضافة</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingTab;
