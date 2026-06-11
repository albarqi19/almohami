// صفحة "غرفة تحضير الجلسة"
// تجمع: Header + Banner + StatsBar + 3 أعمدة + Slide-over + ImportDialog

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AlertCircle, ArrowRight } from 'lucide-react';
import {
  useSessionWorkspace,
  useSessionAiBrief,
  useGenerateAiBrief,
  useNeighborSessions,
  useSessionPreparations,
  useSessionMotions,
} from '../hooks/useSessionPrep';
import { SessionPrepHeader } from '../components/session-prep/SessionPrepHeader';
import { SessionStatsBar } from '../components/session-prep/SessionStatsBar';
import { ContextBanner } from '../components/session-prep/ContextBanner';
import { PreparationsPanel } from '../components/session-prep/PreparationsPanel';
import { MotionsPanel } from '../components/session-prep/MotionsPanel';
import { ActionQueuePanel } from '../components/session-prep/ActionQueuePanel';
import { AIBriefSlideOver } from '../components/session-prep/AIBriefSlideOver';
import { ImportDefaultsDialog } from '../components/session-prep/ImportDefaultsDialog';
import type { ReadinessBreakdownItem } from '../components/session-prep/ReadinessBadge';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

const SessionPrep: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const id = Number(sessionId);

  const { data: workspace, isLoading: wsLoading, isError: wsError } = useSessionWorkspace(id);
  const { data: aiBrief, isLoading: aiLoading } = useSessionAiBrief(id);
  const generateMut = useGenerateAiBrief(id);
  const { data: preps } = useSessionPreparations(id);
  const { data: motions } = useSessionMotions(id);
  const { data: neighbors } = useNeighborSessions(workspace?.case_id, id);

  const [briefOpen, setBriefOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Readiness breakdown للـ tooltip
  const breakdown: ReadinessBreakdownItem[] = useMemo(() => {
    if (!workspace) return [];
    const out: ReadinessBreakdownItem[] = [];
    const prepsItems = preps?.items ?? [];
    const motionsItems = motions?.items ?? [];

    if (prepsItems.length === 0) {
      out.push({ label: 'لا توجد تحضيرات', status: 'warning' });
    } else {
      const done = prepsItems.filter((p) => p.is_completed).length;
      if (done === prepsItems.length) {
        out.push({ label: `كل التحضيرات مكتملة (${done}/${prepsItems.length})`, status: 'done' });
      } else {
        out.push({ label: `تحضيرات مكتملة: ${done}/${prepsItems.length}`, status: done > 0 ? 'pending' : 'warning' });
      }
    }

    if (motionsItems.length === 0) {
      out.push({ label: 'لا توجد طلبات إجرائية', status: 'pending' });
    } else {
      const ready = motionsItems.filter((m) => ['ready', 'submitted', 'approved'].includes(m.status)).length;
      out.push({ label: `طلبات جاهزة: ${ready}/${motionsItems.length}`, status: ready === motionsItems.length ? 'done' : 'pending' });
    }

    if (aiBrief?.status === 'ready') {
      out.push({ label: aiBrief?.reviewed_at ? 'كشف الجلسة مُراجَع' : 'كشف الجلسة جاهز (لم يُراجَع)', status: aiBrief?.reviewed_at ? 'done' : 'pending' });
    } else if (aiBrief?.status === 'failed') {
      out.push({ label: 'تعذّر توليد كشف الجلسة', status: 'warning' });
    }

    if (aiBrief?.has_procedural_gap) {
      out.push({ label: 'ثغرة إجرائية مرصودة', status: 'warning' });
    }
    if (aiBrief?.has_deadline_risk) {
      out.push({ label: 'مهلة حرجة قاربة', status: 'warning' });
    }
    return out;
  }, [workspace, preps, motions, aiBrief]);

  if (!sessionId || Number.isNaN(id)) {
    return (
      <div className="sp-page sp-page--error">
        <AlertCircle size={32} />
        <h2>معرّف الجلسة غير صحيح</h2>
        <button type="button" className="sp-btn sp-btn--primary" onClick={() => navigate('/sessions')}>
          <ArrowRight size={14} />
          العودة لقائمة الجلسات
        </button>
      </div>
    );
  }

  if (wsLoading) {
    return (
      <div className="sp-page sp-page--loading">
        <div className="aq-spinner" />
        <p>جاري تحميل الجلسة...</p>
      </div>
    );
  }

  if (wsError || !workspace) {
    return (
      <div className="sp-page sp-page--error">
        <AlertCircle size={32} />
        <h2>الجلسة غير موجودة</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
          قد تكون الجلسة محذوفة أو لا تملك صلاحية الوصول إليها.
        </p>
        <button type="button" className="sp-btn sp-btn--primary" onClick={() => navigate('/sessions')}>
          <ArrowRight size={14} />
          العودة لقائمة الجلسات
        </button>
      </div>
    );
  }

  // الجلسات المنتهية/الملغاة لا يُسمح بتوليد كشف جديد لها (الأرشيف يبقى للعرض فقط)
  const completedStatuses = ['منتهية', 'ملغاة', 'completed', 'cancelled'];
  const isSessionCompleted = completedStatuses.includes(workspace.status || '');

  const handleGenerateBrief = () => {
    if (isSessionCompleted) {
      toast.warning('لا يمكن توليد كشف للجلسات المنتهية. الكشوفات المُولَّدة سابقاً تبقى في الأرشيف.');
      return;
    }
    generateMut.mutate(undefined, {
      onSuccess: () => toast.info('بدأ التوليد... سيستغرق ~25 ثانية'),
      onError: () => toast.error('تعذّر بدء التوليد'),
    });
  };

  return (
    <div className="sp-page">
      <SessionPrepHeader
        session={workspace}
        neighbors={neighbors}
        readinessBreakdown={breakdown}
        onImportDefaults={() => setImportOpen(true)}
        onGenerateBrief={handleGenerateBrief}
        isGeneratingBrief={generateMut.isPending}
      />

      <ContextBanner aiBrief={aiBrief} onOpenBrief={() => setBriefOpen(true)} />

      <SessionStatsBar session={workspace} aiBrief={aiBrief} />

      <main className="sp-grid">
        <PreparationsPanel
          sessionId={id}
          onImportClick={() => setImportOpen(true)}
        />

        <MotionsPanel
          sessionId={id}
        />

        <ActionQueuePanel
          sessionId={id}
          aiBrief={aiBrief}
          isLoading={aiLoading}
          onOpenFullBrief={() => setBriefOpen(true)}
          onGenerateBrief={handleGenerateBrief}
        />
      </main>

      <AIBriefSlideOver
        sessionId={id}
        aiBrief={aiBrief}
        open={briefOpen}
        onClose={() => setBriefOpen(false)}
        isSessionCompleted={isSessionCompleted}
      />

      <ImportDefaultsDialog
        sessionId={id}
        sessionType={workspace.session_type}
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </div>
  );
};

export default SessionPrep;
