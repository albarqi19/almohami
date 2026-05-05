import React, { useState } from 'react';
import { Download, X, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import Modal from './Modal';
import {
  buildLawyerReport,
  DEFAULT_EXPORT_CONFIG,
  type ExportConfig,
  type LawyerReportData,
  type CasesScope,
  type TasksScope,
} from '../utils/lawyerExportHelpers';

interface LawyerExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: LawyerReportData;
  initialConfig?: Partial<ExportConfig>;
}

const LawyerExportModal: React.FC<LawyerExportModalProps> = ({ isOpen, onClose, data, initialConfig }) => {
  const [config, setConfig] = useState<ExportConfig>(() => ({
    ...DEFAULT_EXPORT_CONFIG,
    ...initialConfig,
    cases: { ...DEFAULT_EXPORT_CONFIG.cases, ...initialConfig?.cases },
    tasks: { ...DEFAULT_EXPORT_CONFIG.tasks, ...initialConfig?.tasks },
    presence: { ...DEFAULT_EXPORT_CONFIG.presence, ...initialConfig?.presence },
    performance: { ...DEFAULT_EXPORT_CONFIG.performance, ...initialConfig?.performance },
    lawyerInfo: { ...DEFAULT_EXPORT_CONFIG.lawyerInfo, ...initialConfig?.lawyerInfo },
  }));
  const [isExporting, setIsExporting] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const setSection = <K extends keyof ExportConfig>(key: K, patch: Partial<ExportConfig[K]>) => {
    setConfig(prev => ({ ...prev, [key]: { ...(prev[key] as object), ...patch } as ExportConfig[K] }));
  };

  const anySectionEnabled =
    config.cases.enabled ||
    config.tasks.enabled ||
    config.presence.enabled ||
    config.performance.enabled ||
    config.lawyerInfo.enabled;

  const handleExport = async () => {
    if (!anySectionEnabled) return;
    setIsExporting(true);
    try {
      await buildLawyerReport(data, config);
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      alert('فشل تصدير التقرير. حاول مرة أخرى.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تخصيص التقرير" size="md">
      <div className="lawyer-export-modal">
        <p className="lawyer-export-modal__hint">
          اختر الأقسام التي تريد تضمينها في التقرير. الافتراضي: القضايا النشطة فقط.
        </p>

        {/* Cases Section */}
        <SectionRow
          checked={config.cases.enabled}
          onChange={(v) => setSection('cases', { enabled: v })}
          label="القضايا"
          count={getScopeCount(data, config.cases.scope, 'cases')}
        >
          <ScopeRadios
            name="cases-scope"
            value={config.cases.scope}
            disabled={!config.cases.enabled}
            onChange={(scope) => setSection('cases', { scope: scope as CasesScope })}
            options={[
              { value: 'active', label: 'النشطة فقط', count: data.active_cases.length, isDefault: true },
              { value: 'responsible', label: 'المسؤول عنها فقط', count: data.responsible_cases_count },
              { value: 'all', label: 'كل المكلف بها', count: data.cases.length },
            ]}
          />
        </SectionRow>

        {/* Tasks Section */}
        <SectionRow
          checked={config.tasks.enabled}
          onChange={(v) => setSection('tasks', { enabled: v })}
          label="المهام"
          count={getScopeCount(data, config.tasks.scope, 'tasks')}
        >
          <ScopeRadios
            name="tasks-scope"
            value={config.tasks.scope}
            disabled={!config.tasks.enabled}
            onChange={(scope) => setSection('tasks', { scope: scope as TasksScope })}
            options={[
              { value: 'overdue', label: 'المتأخرة فقط', count: data.tasks.filter(t => t.status === 'overdue').length },
              { value: 'unfinished', label: 'غير المنجَزة', count: data.tasks.filter(t => t.status !== 'completed').length },
              { value: 'completed', label: 'المنجَزة', count: data.tasks.filter(t => t.status === 'completed').length },
              { value: 'all', label: 'الكل', count: data.tasks.length },
            ]}
          />
        </SectionRow>

        {/* Presence Section */}
        <SectionRow
          checked={config.presence.enabled}
          onChange={(v) => setSection('presence', { enabled: v })}
          label="سجل الحضور"
        >
          <div className="lawyer-export-modal__date-range">
            <label>
              من:
              <input
                type="date"
                value={config.presence.startDate || today}
                disabled={!config.presence.enabled}
                onChange={(e) => setSection('presence', { startDate: e.target.value })}
              />
            </label>
            <label>
              إلى:
              <input
                type="date"
                value={config.presence.endDate || today}
                disabled={!config.presence.enabled}
                onChange={(e) => setSection('presence', { endDate: e.target.value })}
              />
            </label>
          </div>
        </SectionRow>

        {/* Performance Section */}
        <SectionRow
          checked={config.performance.enabled}
          onChange={(v) => setSection('performance', { enabled: v })}
          label="ملخص الأداء (KPIs + إحصائيات شهرية)"
        />

        {/* Lawyer Info Section */}
        <SectionRow
          checked={config.lawyerInfo.enabled}
          onChange={(v) => setSection('lawyerInfo', { enabled: v })}
          label="معلومات المحامي"
        />

        <div className="lawyer-export-modal__divider" />

        {/* Format */}
        <div className="lawyer-export-modal__format">
          <span className="lawyer-export-modal__format-label">صيغة الملف:</span>
          <label className={`lawyer-export-modal__format-pill ${config.format === 'excel' ? 'is-active' : ''}`}>
            <input
              type="radio"
              name="format"
              value="excel"
              checked={config.format === 'excel'}
              onChange={() => setConfig(c => ({ ...c, format: 'excel' }))}
            />
            <FileSpreadsheet size={14} />
            Excel (.xls)
          </label>
          <label className={`lawyer-export-modal__format-pill ${config.format === 'word' ? 'is-active' : ''}`}>
            <input
              type="radio"
              name="format"
              value="word"
              checked={config.format === 'word'}
              onChange={() => setConfig(c => ({ ...c, format: 'word' }))}
            />
            <FileText size={14} />
            Word (.doc)
          </label>
        </div>

        {/* Actions */}
        <div className="lawyer-export-modal__actions">
          <button type="button" className="lawyer-export-modal__btn lawyer-export-modal__btn--secondary" onClick={onClose} disabled={isExporting}>
            <X size={14} /> إلغاء
          </button>
          <button
            type="button"
            className="lawyer-export-modal__btn lawyer-export-modal__btn--primary"
            onClick={handleExport}
            disabled={isExporting || !anySectionEnabled}
            title={!anySectionEnabled ? 'اختر قسم واحد على الأقل' : ''}
          >
            {isExporting ? <Loader2 size={14} className="spinning" /> : <Download size={14} />}
            {isExporting ? 'جاري التصدير...' : 'تصدير'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// --- Sub-components -----------------------------------------------------

interface SectionRowProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  count?: number;
  children?: React.ReactNode;
}

const SectionRow: React.FC<SectionRowProps> = ({ checked, onChange, label, count, children }) => (
  <div className={`lawyer-export-modal__section ${checked ? 'is-enabled' : ''}`}>
    <label className="lawyer-export-modal__section-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="lawyer-export-modal__section-label">{label}</span>
      {count != null && <span className="lawyer-export-modal__section-count">({count})</span>}
    </label>
    {children && <div className="lawyer-export-modal__section-body">{children}</div>}
  </div>
);

interface ScopeRadiosProps {
  name: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
  options: { value: string; label: string; count: number; isDefault?: boolean }[];
}

const ScopeRadios: React.FC<ScopeRadiosProps> = ({ name, value, disabled, onChange, options }) => (
  <div className="lawyer-export-modal__scopes">
    {options.map(opt => (
      <label key={opt.value} className={`lawyer-export-modal__scope ${value === opt.value ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`}>
        <input
          type="radio"
          name={name}
          value={opt.value}
          checked={value === opt.value}
          disabled={disabled}
          onChange={() => onChange(opt.value)}
        />
        <span>{opt.label}{opt.isDefault ? ' (الافتراضي)' : ''}</span>
        <span className="lawyer-export-modal__scope-count">{opt.count}</span>
      </label>
    ))}
  </div>
);

function getScopeCount(data: LawyerReportData, scope: string, kind: 'cases' | 'tasks'): number {
  if (kind === 'cases') {
    if (scope === 'active') return data.active_cases.length;
    if (scope === 'responsible') return data.responsible_cases_count;
    return data.cases.length;
  }
  if (scope === 'overdue') return data.tasks.filter(t => t.status === 'overdue').length;
  if (scope === 'unfinished') return data.tasks.filter(t => t.status !== 'completed').length;
  if (scope === 'completed') return data.tasks.filter(t => t.status === 'completed').length;
  return data.tasks.length;
}

export default LawyerExportModal;
