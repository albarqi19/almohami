import React, { useEffect, useState } from 'react';
import { AlertTriangle, Briefcase, Search, X } from 'lucide-react';
import Modal from '../erp/Modal';
import { clientMeetingService, type ClientMeeting } from '../../services/meetingService';
import { apiClient } from '../../utils/api';
import { getApiErrorMessage } from '../../utils/apiError';
import { clientDisplayName } from './clientMeetingHelpers';

interface Props {
  meeting: ClientMeeting;
  onClose: () => void;
  /** message: ما يُعرض فوق القائمة بعد النجاح */
  onSuccess: (message?: string) => void;
}

interface CaseRow {
  id: number;
  title: string;
  file_number: string | null;
  client_name: string | null;
}

/**
 * ربط موعد العميل بقضية — أو تغييرها أو فكّ الربط.
 *
 * النسخة السابقة كانت تقرأ `/cases` مصفوفةً وهو يُرجع صفحةً مقسّمة، فكان
 * `cases.filter` يرمي عند فتح النافذة؛ ولو عملت لما عرضت إلا أول 15 قضية.
 * البحث الآن على الخادم، وبلا بحث تظهر قضايا عميل الموعد أولاً.
 */
const LinkToCaseModal: React.FC<Props> = ({ meeting, onClose, onSuccess }) => {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [searching, setSearching] = useState(true);
  const [chosen, setChosen] = useState<CaseRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const term = query.trim();
  const byClient = !term && Boolean(meeting.client_id);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ limit: '20' });
        if (term) params.set('search', term);
        else if (meeting.client_id) params.set('client_id', String(meeting.client_id));

        const response = await apiClient.get<{ data: CaseRow[] | { data: CaseRow[] } }>(`/cases?${params.toString()}`);
        const payload = response.data;
        if (!cancelled) setRows(Array.isArray(payload) ? payload : payload?.data ?? []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, term ? 300 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [term, meeting.client_id]);

  const save = async (caseId: number | null) => {
    setSaving(true);
    setError(null);
    try {
      await clientMeetingService.linkToCase(meeting.id, caseId);
      onSuccess(caseId ? 'ربط الموعد بالقضية' : 'فك ربط الموعد بالقضية');
    } catch (err) {
      setError(getApiErrorMessage(err, 'تعذر حفظ ربط القضية'));
    } finally {
      setSaving(false);
    }
  };

  const reference = (row: { file_number: string | null; id: number }) => row.file_number || `#${row.id}`;

  return (
    <Modal
      open
      onClose={onClose}
      size="narrow"
      icon={Briefcase}
      title={meeting.case ? 'تغيير القضية المرتبطة' : 'ربط الموعد بقضية'}
      footerAlign="end"
      closeOnOverlay={!saving}
      footer={
        <>
          <button type="button" className="fin-btn" onClick={onClose} disabled={saving}>إلغاء</button>
          <button
            type="button"
            className="fin-btn fin-btn--primary"
            onClick={() => chosen && save(chosen.id)}
            disabled={saving || !chosen || chosen.id === meeting.case_id}
          >
            {saving ? 'جار الحفظ…' : 'ربط بالقضية'}
          </button>
        </>
      }
    >
      {error && (
        <div className="cmo-alert cmo-alert--error cmo-form-alert" role="alert">
          <AlertTriangle size={14} aria-hidden="true" />
          <span className="cmo-alert__text">{error}</span>
        </div>
      )}

      <div className="cmo-summary">
        <span>{meeting.title || `موعد مع ${clientDisplayName(meeting)}`}</span>
        <em>{clientDisplayName(meeting)}</em>
      </div>

      <div className="mfm-link cmo-dialog-field">
        {meeting.case && (
          <div className="mfm-link__chosen">
            <span>
              <strong>مرتبط حاليا:</strong> {meeting.case.title}
              <em> ({reference(meeting.case)})</em>
            </span>
            <button
              type="button"
              className="fin-btn fin-btn--ghost fin-btn--sm"
              onClick={() => save(null)}
              disabled={saving}
            >
              <X size={13} /> فك الربط
            </button>
          </div>
        )}

        {chosen ? (
          <div className="mfm-link__chosen">
            <span>
              <strong>القضية المختارة:</strong> {chosen.title}
              <em> ({reference(chosen)})</em>
            </span>
            <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" onClick={() => setChosen(null)} disabled={saving}>
              <X size={13} /> تغيير
            </button>
          </div>
        ) : (
          <>
            <div className="mfm-link__search">
              <Search size={14} aria-hidden="true" />
              <input
                className="fin-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بعنوان القضية أو رقمها أو اسم العميل…"
                autoFocus
              />
            </div>

            <p className="mfm-link__state">
              {searching
                ? 'جار البحث…'
                : rows.length === 0
                  ? (byClient ? 'لا قضايا لهذا العميل — ابحث في قضايا المكتب' : 'لا نتائج مطابقة')
                  : (term ? 'نتائج البحث' : byClient ? 'قضايا هذا العميل' : 'أحدث القضايا')}
            </p>

            {!searching && rows.length > 0 && (
              <ul className="mfm-link__results">
                {rows.map((row) => (
                  <li key={row.id}>
                    <button type="button" onClick={() => setChosen(row)}>
                      <span>{row.title}</span>
                      <em>{reference(row)}{row.client_name ? ` · ${row.client_name}` : ''}</em>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default LinkToCaseModal;
