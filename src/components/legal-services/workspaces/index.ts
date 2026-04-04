import React from 'react';
import type { WorkspaceProps } from './types';

// ── استيراد مساحات العمل ──
import LegalNoticesWorkspace from './LegalNoticesWorkspace';
import TrainingWorkspace from './TrainingWorkspace';
import ArbitrationWorkspace from './ArbitrationWorkspace';
import CompanyFormationWorkspace from './CompanyFormationWorkspace';
import LaborWorkspace from './LaborWorkspace';
import ComplianceWorkspace from './ComplianceWorkspace';
import RealEstateWorkspace from './RealEstateWorkspace';
import IpWorkspace from './IpWorkspace';
import DueDiligenceWorkspace from './DueDiligenceWorkspace';
import LicensesWorkspace from './LicensesWorkspace';

// ── سجل مساحات العمل ──
export const WorkspaceRegistry: Record<string, React.FC<WorkspaceProps>> = {
  legal_notices: LegalNoticesWorkspace,
  training: TrainingWorkspace,
  arbitration: ArbitrationWorkspace,
  company_formation: CompanyFormationWorkspace,
  labor: LaborWorkspace,
  compliance: ComplianceWorkspace,
  real_estate: RealEstateWorkspace,
  ip: IpWorkspace,
  due_diligence: DueDiligenceWorkspace,
  licenses: LicensesWorkspace,
};

export type { WorkspaceProps } from './types';
export { default as MicroStatsBar } from './MicroStatsBar';
export { default as ContextualAlert } from './ContextualAlert';
export { default as SkeletonCard } from './SkeletonCard';
