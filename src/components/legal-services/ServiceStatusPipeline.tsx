import React from 'react';
import { Check } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StatusStage {
  status: string;
  label: string;
  transitions: string[];
}

interface ServiceStatusPipelineProps {
  statusFlow: StatusStage[];
  currentStatus: string;
}

// ─── Arabic labels fallback ───────────────────────────────────────────────────
// الباك يرسل label عربية عادةً، لكن إن وصلت قيمة إنجليزية (بيانات قديمة/نوع جديد)
// نعرّبها هنا بدل عرض كود تقني يربك المحامي.

const STATUS_LABELS_AR: Record<string, string> = {
  new: 'جديدة',
  in_progress: 'قيد التنفيذ',
  under_review: 'تحت المراجعة',
  completed: 'مكتملة',
  closed: 'مغلقة',
  cancelled: 'ملغية',
  draft_ready: 'المسودة جاهزة',
  internal_review: 'مراجعة داخلية',
  delivered: 'تم التسليم',
  drafting: 'قيد الصياغة',
  client_review: 'مراجعة العميل',
  revision: 'قيد التعديل',
  approved: 'معتمدة',
  signed: 'تم التوقيع',
  archived: 'مؤرشفة',
  document_collection: 'جمع المستندات',
  name_reservation: 'حجز الاسم',
  aoa_drafting: 'صياغة عقد التأسيس',
  government_submission: 'تقديم للجهات الحكومية',
  cr_issued: 'تم إصدار السجل',
  post_cr_setup: 'إجراءات ما بعد السجل',
  document_preparation: 'تجهيز المستندات',
  submitted: 'تم التقديم',
  rejected: 'مرفوضة',
  active: 'فعّالة',
  renewal_pending: 'قيد التجديد',
  renewed: 'تم التجديد',
  case_study: 'دراسة القضية',
  parties_notified: 'تم إبلاغ الأطراف',
  hearing_scheduled: 'جلسة مجدولة',
  hearing_in_progress: 'جلسة قيد الانعقاد',
  deliberation: 'مداولة',
  settlement_reached: 'تمت التسوية',
  award_issued: 'صدر الحكم',
  enforcement: 'قيد التنفيذ',
  assessment: 'التقييم',
  gap_analysis: 'تحليل الفجوات',
  action_plan: 'خطة العمل',
  implementation: 'التنفيذ',
  review: 'المراجعة',
  compliant: 'ملتزم',
  monitoring: 'المراقبة',
  analysis: 'التحليل',
  friendly_settlement: 'تسوية ودية',
  negotiation: 'التفاوض',
  resolution: 'الحل',
  escalated_to_case: 'تصعيد لقضية',
  documentation: 'التوثيق',
  property_review: 'مراجعة العقار',
};

/** إن كانت التسمية عربية اعرضها كما هي، وإلا عرّبها من الخريطة أعلاه */
function arabicLabel(stage: StatusStage): string {
  if (/[؀-ۿ]/.test(stage.label)) return stage.label;
  return STATUS_LABELS_AR[stage.status] ?? stage.label;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStepState(
  stage: StatusStage,
  currentStatus: string,
  statusFlow: StatusStage[],
): 'completed' | 'active' | 'pending' {
  if (stage.status === currentStatus) return 'active';

  const currentIndex = statusFlow.findIndex((s) => s.status === currentStatus);
  const stageIndex = statusFlow.findIndex((s) => s.status === stage.status);

  if (stageIndex < currentIndex) return 'completed';
  return 'pending';
}

const STATE_HINT: Record<'completed' | 'active' | 'pending', string> = {
  completed: 'مرحلة مكتملة',
  active: 'المرحلة الحالية',
  pending: 'مرحلة قادمة',
};

// ─── Component ────────────────────────────────────────────────────────────────

const ServiceStatusPipeline: React.FC<ServiceStatusPipelineProps> = ({
  statusFlow,
  currentStatus,
}) => {
  if (!statusFlow || statusFlow.length === 0) return null;

  return (
    <div className="lsd-status-pipeline" dir="rtl">
      {statusFlow.map((stage, index) => {
        const state = getStepState(stage, currentStatus, statusFlow);
        const isLast = index === statusFlow.length - 1;

        return (
          <React.Fragment key={stage.status}>
            {/* Step */}
            <div
              className={[
                'lsd-pipeline-step',
                state === 'completed' ? 'lsd-pipeline-step--completed' : '',
                state === 'active' ? 'lsd-pipeline-step--active' : '',
                state === 'pending' ? 'lsd-pipeline-step--pending' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="lsd-pipeline-step__content" title={STATE_HINT[state]}>
                {/* Circle */}
                <div className="lsd-pipeline-step__dot">
                  {state === 'completed' ? (
                    <Check size={13} strokeWidth={2.5} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Label */}
                <span className="lsd-pipeline-step__label">{arabicLabel(stage)}</span>
              </div>
            </div>

            {/* Connector — placed after every step except the last */}
            {!isLast && (
              <div
                className={[
                  'lsd-pipeline-connector',
                  state === 'completed' ? 'lsd-pipeline-connector--completed' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* هوية فلات صرف: الحالة الحالية بإطار ذهبي رفيع بلا توهّج (يتجاوز box-shadow القديم)،
          والمراحل المكتملة بلون هادئ */}
      <style>{`
        .lsd-status-pipeline .lsd-pipeline-step--active .lsd-pipeline-step__content {
          border: 1px solid var(--law-gold);
          border-radius: 8px;
          background: var(--law-gold-light);
        }
        .lsd-status-pipeline .lsd-pipeline-step--active .lsd-pipeline-step__dot {
          background: var(--law-navy);
          border-color: var(--law-navy);
          color: #fff;
          box-shadow: none; /* بلا توهّج */
        }
        .lsd-status-pipeline .lsd-pipeline-step--active .lsd-pipeline-step__label {
          color: var(--law-navy);
          font-weight: 700;
        }
        .lsd-status-pipeline .lsd-pipeline-step--completed .lsd-pipeline-step__dot {
          background: var(--dashboard-card);
          border-color: var(--status-green);
          color: var(--status-green);
        }
        .lsd-status-pipeline .lsd-pipeline-step--completed .lsd-pipeline-step__label {
          color: var(--color-text-secondary);
        }
        .lsd-status-pipeline .lsd-pipeline-step--completed + .lsd-pipeline-connector {
          background: var(--status-green);
        }
      `}</style>
    </div>
  );
};

export default ServiceStatusPipeline;
