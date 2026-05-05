import React, { useState } from 'react';
import { Download, X, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import Modal from './Modal';
import {
  buildClientReport,
  DEFAULT_CLIENT_EXPORT_CONFIG,
  type ClientExportConfig,
  type ClientReportData,
  type CaseScope,
  type TaskScope,
} from '../utils/clientExportHelpers';

interface ClientExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ClientReportData;
}

const ClientExportModal: React.FC<ClientExportModalProps> = ({ isOpen, onClose, data }) => {
  const [config, setConfig] = useState<ClientExportConfig>(() => structuredClone(DEFAULT_CLIENT_EXPORT_CONFIG));
  const [exporting, setExporting] = useState(false);

  const setSection = <K extends keyof ClientExportConfig>(k: K, patch: Partial<ClientExportConfig[K]>) => {
    setConfig(prev => ({ ...prev, [k]: { ...(prev[k] as object), ...patch } as ClientExportConfig[K] }));
  };

  const anyEnabled =
    config.clientInfo.enabled ||
    config.stats.enabled ||
    config.cases.enabled ||
    config.upcomingSessions.enabled ||
    config.tasks.enabled ||
    config.documentsWekalat.enabled ||
    config.communicationsActivities.enabled ||
    config.notes.enabled;

  const handleExport = async () => {
    if (!anyEnabled) return;
    setExporting(true);
    try {
      buildClientReport(data, config);
      onClose();
    } catch (err) {
      console.error('Client export failed:', err);
      alert('فشل تصدير التقرير');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تخصيص تقرير العميل" size="lg">
      <div className="client-export-modal">
        <p className="client-export-modal__hint">
          اختر الأقسام المراد تضمينها في التقرير. الافتراضي: معلومات العميل + الإحصائيات + القضايا النشطة.
        </p>

        <div className="client-export-modal__sections">

        <SectionRow
          checked={config.clientInfo.enabled}
          onChange={(v) => setSection('clientInfo', { enabled: v })}
          label="معلومات العميل"
        />

        <SectionRow
          checked={config.stats.enabled}
          onChange={(v) => setSection('stats', { enabled: v })}
          label="الإحصائيات"
        />

        <SectionRow
          checked={config.cases.enabled}
          onChange={(v) => setSection('cases', { enabled: v })}
          label="القضايا"
          count={getCaseCount(data, config.cases.scope)}
        >
          <ScopeRadios
            name="cases-scope"
            value={config.cases.scope}
            disabled={!config.cases.enabled}
            onChange={(v) => setSection('cases', { scope: v as CaseScope })}
            options={[
              { value: 'active', label: 'النشطة فقط (الافتراضي)', count: data.cases.filter(c => c.status === 'active' || c.status === 'pending').length },
              { value: 'closed', label: 'المغلقة فقط', count: data.cases.filter(c => c.status === 'closed' || c.status === 'settled' || c.status === 'dismissed').length },
              { value: 'all', label: 'كل القضايا', count: data.cases.length },
            ]}
          />
        </SectionRow>

        <SectionRow
          checked={config.upcomingSessions.enabled}
          onChange={(v) => setSection('upcomingSessions', { enabled: v })}
          label="الجلسات القادمة"
          count={data.upcoming_sessions.length}
        >
          <LimitRadios
            name="sessions-limit"
            value={config.upcomingSessions.limit}
            disabled={!config.upcomingSessions.enabled}
            onChange={(v) => setSection('upcomingSessions', { limit: v })}
            options={[10, 20, 50]}
          />
        </SectionRow>

        <SectionRow
          checked={config.tasks.enabled}
          onChange={(v) => setSection('tasks', { enabled: v })}
          label="المهام"
          count={data.tasks.length}
        >
          <ScopeRadios
            name="tasks-scope"
            value={config.tasks.scope}
            disabled={!config.tasks.enabled}
            onChange={(v) => setSection('tasks', { scope: v as TaskScope })}
            options={[
              { value: 'open', label: 'المفتوحة', count: data.tasks.filter(t => t.status !== 'completed').length },
              { value: 'overdue', label: 'المتأخرة', count: data.tasks.filter(t => t.status === 'overdue').length },
              { value: 'completed', label: 'المنجَزة', count: data.tasks.filter(t => t.status === 'completed').length },
              { value: 'all', label: 'الكل', count: data.tasks.length },
            ]}
          />
        </SectionRow>

        <SectionRow
          checked={config.documentsWekalat.enabled}
          onChange={(v) => setSection('documentsWekalat', { enabled: v })}
          label="المستندات والوكالات"
          count={data.documents.length + data.wekalat.length}
        />

        <SectionRow
          checked={config.communicationsActivities.enabled}
          onChange={(v) => setSection('communicationsActivities', { enabled: v })}
          label="سجل التواصل والنشاطات"
        >
          <LimitRadios
            name="comm-limit"
            value={config.communicationsActivities.limit}
            disabled={!config.communicationsActivities.enabled}
            onChange={(v) => setSection('communicationsActivities', { limit: v })}
            options={[10, 30, 100]}
          />
        </SectionRow>

        <SectionRow
          checked={config.notes.enabled}
          onChange={(v) => setSection('notes', { enabled: v })}
          label="الملاحظات الداخلية"
        />

        </div> {/* end client-export-modal__sections */}

        <div className="client-export-modal__divider" />

        <div className="client-export-modal__format">
          <span className="client-export-modal__format-label">صيغة الملف:</span>
          <label className={`client-export-modal__format-pill ${config.format === 'excel' ? 'is-active' : ''}`}>
            <input type="radio" name="format" checked={config.format === 'excel'} onChange={() => setConfig(c => ({ ...c, format: 'excel' }))} />
            <FileSpreadsheet size={14} /> Excel (.xls)
          </label>
          <label className={`client-export-modal__format-pill ${config.format === 'word' ? 'is-active' : ''}`}>
            <input type="radio" name="format" checked={config.format === 'word'} onChange={() => setConfig(c => ({ ...c, format: 'word' }))} />
            <FileText size={14} /> Word (.doc)
          </label>
        </div>

        <div className="client-export-modal__actions">
          <button type="button" className="client-export-modal__btn" onClick={onClose} disabled={exporting}>
            <X size={14} /> إلغاء
          </button>
          <button
            type="button"
            className="client-export-modal__btn client-export-modal__btn--primary"
            onClick={handleExport}
            disabled={exporting || !anyEnabled}
            title={!anyEnabled ? 'اختر قسم واحد على الأقل' : ''}
          >
            {exporting ? <Loader2 size={14} className="spinning" /> : <Download size={14} />}
            {exporting ? 'جاري التصدير...' : 'تصدير'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

const SectionRow: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  count?: number;
  children?: React.ReactNode;
}> = ({ checked, onChange, label, count, children }) => (
  <div className={`client-export-modal__section ${checked ? 'is-enabled' : ''}`}>
    <label className="client-export-modal__section-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="client-export-modal__section-label">{label}</span>
      {count != null && <span className="client-export-modal__section-count">({count})</span>}
    </label>
    {children && <div className="client-export-modal__section-body">{children}</div>}
  </div>
);

const ScopeRadios: React.FC<{
  name: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
  options: { value: string; label: string; count: number }[];
}> = ({ name, value, disabled, onChange, options }) => (
  <div className="client-export-modal__scopes">
    {options.map(opt => (
      <label key={opt.value} className={`client-export-modal__scope ${value === opt.value ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`}>
        <input type="radio" name={name} value={opt.value} checked={value === opt.value} disabled={disabled} onChange={() => onChange(opt.value)} />
        <span>{opt.label}</span>
        <span className="client-export-modal__scope-count">{opt.count}</span>
      </label>
    ))}
  </div>
);

const LimitRadios: React.FC<{
  name: string;
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
  options: number[];
}> = ({ name, value, disabled, onChange, options }) => (
  <div className="client-export-modal__limits">
    {options.map(opt => (
      <label key={opt} className={`client-export-modal__limit ${value === opt ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`}>
        <input type="radio" name={name} checked={value === opt} disabled={disabled} onChange={() => onChange(opt)} />
        <span>{opt}</span>
      </label>
    ))}
  </div>
);

function getCaseCount(data: ClientReportData, scope: CaseScope): number {
  if (scope === 'all') return data.cases.length;
  if (scope === 'active') return data.cases.filter(c => c.status === 'active' || c.status === 'pending').length;
  return data.cases.filter(c => c.status === 'closed' || c.status === 'settled' || c.status === 'dismissed').length;
}

export default ClientExportModal;
