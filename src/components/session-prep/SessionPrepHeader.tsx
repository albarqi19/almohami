// Header للصفحة + horizontal session switcher (السابقة/التالية)

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, MapPin, ChevronRight, ChevronLeft, MoreVertical, FileText } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ReadinessBadge, type ReadinessBreakdownItem } from './ReadinessBadge';
import type { SessionWorkspaceData } from '../../hooks/useSessionPrep';
import type { NeighborSessions } from '../../hooks/useSessionPrep';

interface Props {
  session: SessionWorkspaceData;
  neighbors?: NeighborSessions;
  readinessBreakdown?: ReadinessBreakdownItem[];
  onImportDefaults: () => void;
  onGenerateBrief: () => void;
  isGeneratingBrief?: boolean;
}

export const SessionPrepHeader: React.FC<Props> = ({
  session,
  neighbors,
  readinessBreakdown,
  onImportDefaults,
  onGenerateBrief,
  isGeneratingBrief,
}) => {
  const navigate = useNavigate();

  const dateDisplay = session.session_date_gregorian || session.session_date || 'غير محدد';
  const timeDisplay = session.session_time || '';

  const primaryLawyer =
    session.case?.primary_lawyer?.[0]?.name ||
    session.case?.primaryLawyer?.[0]?.name ||
    session.case?.lawyers?.[0]?.name ||
    null;

  return (
    <header className="sp-header">
      <div className="sp-header__top">
        <button
          type="button"
          className="sp-header__back"
          onClick={() => navigate(-1)}
          aria-label="رجوع"
        >
          <ArrowRight size={16} />
          <span>رجوع</span>
        </button>

        <div className="sp-header__titles">
          <h1 className="sp-header__title">
            غرفة تحضير الجلسة — {session.session_type || 'جلسة'}
          </h1>
          {session.case && (
            <div className="sp-header__subtitle">
              قضية{' '}
              <button
                type="button"
                onClick={() => session.case && navigate(`/cases/${session.case.id}`)}
                title="فتح القضية"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'inherit',
                  font: 'inherit',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textDecorationStyle: 'dotted',
                  textUnderlineOffset: '3px',
                }}
              >
                #{session.case.file_number || session.case.id}
              </button>
              {' '}─ {session.case.title}
            </div>
          )}
        </div>

        <div className="sp-header__actions">
          <ReadinessBadge
            score={session.readiness_score}
            status={session.readiness_status}
            breakdown={readinessBreakdown}
          />

          <button
            type="button"
            className="sp-btn sp-btn--primary"
            onClick={onGenerateBrief}
            disabled={isGeneratingBrief || session.ai_brief_status === 'generating'}
          >
            <FileText size={13} strokeWidth={2.2} style={{ verticalAlign: '-2px', marginInlineEnd: 6 }} />
            {session.ai_brief_status === 'generating' ? 'جاري التوليد...' : session.ai_brief_status === 'ready' ? 'إعادة توليد الكشف' : 'توليد كشف الجلسة'}
          </button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button type="button" className="sp-btn sp-btn--ghost" aria-label="إجراءات">
                <MoreVertical size={14} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                className="sp-dropdown-content"
              >
                <DropdownMenu.Item className="sp-dropdown-item" onSelect={onImportDefaults}>
                  استيراد من قالب افتراضي
                </DropdownMenu.Item>
                <DropdownMenu.Item className="sp-dropdown-item" onSelect={() => alert('قريباً: النسخ من جلسة سابقة')}>
                  نسخ من جلسة سابقة
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      <div className="sp-header__meta">
        <span className="sp-meta-chip">
          <Calendar size={12} />
          <span>{dateDisplay}</span>
        </span>
        {timeDisplay && (
          <span className="sp-meta-chip">
            <Clock size={12} />
            <span>{timeDisplay}</span>
          </span>
        )}
        {session.court && (
          <span className="sp-meta-chip">
            <MapPin size={12} />
            <span>{session.court}{session.department ? ` ─ ${session.department}` : ''}</span>
          </span>
        )}
        {primaryLawyer && (
          <span className="sp-meta-chip">
            <span style={{ fontSize: 11, opacity: 0.7 }}>المحامي:</span>
            <span>{primaryLawyer}</span>
          </span>
        )}

        {/* Horizontal session switcher */}
        <div className="sp-switcher">
          <button
            type="button"
            className="sp-switcher__btn"
            disabled={!neighbors?.previous}
            onClick={() => neighbors?.previous && navigate(`/sessions/${neighbors.previous.id}/prep`)}
            aria-label="الجلسة السابقة"
          >
            <ChevronRight size={14} />
            <span>السابقة</span>
          </button>
          <button
            type="button"
            className="sp-switcher__btn"
            disabled={!neighbors?.next}
            onClick={() => neighbors?.next && navigate(`/sessions/${neighbors.next.id}/prep`)}
            aria-label="الجلسة التالية"
          >
            <span>التالية</span>
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};
