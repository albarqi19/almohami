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
              <div className="lsd-pipeline-step__content">
                {/* Circle */}
                <div className="lsd-pipeline-step__dot">
                  {state === 'completed' ? (
                    <Check size={13} strokeWidth={2.5} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Label */}
                <span className="lsd-pipeline-step__label">{stage.label}</span>
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
    </div>
  );
};

export default ServiceStatusPipeline;
