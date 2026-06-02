// ── أنواع الخدمات القانونية ──

export type ServiceType =
  | 'consultation'
  | 'contract_drafting'
  | 'company_formation'
  | 'licenses'
  | 'arbitration'
  | 'compliance'
  | 'labor'
  | 'real_estate'
  | 'due_diligence'
  | 'ip'
  | 'legal_notices'
  | 'training';

export type ServicePriority = 'low' | 'medium' | 'high' | 'urgent';
export type BillingType = 'hourly' | 'flat_fee' | 'milestone' | 'retainer';
export type ServiceSource = 'manual' | 'client_portal' | 'converted_from_case';

export type ConsultationClassification =
  | 'criminal' | 'commercial' | 'family' | 'labor' | 'administrative'
  | 'real_estate' | 'intellectual_property' | 'corporate' | 'tax' | 'other';

export type ConsultationUrgency = 'normal' | 'urgent' | 'very_urgent';
export type DeliveryMethod = 'in_person' | 'video' | 'phone' | 'written' | 'email';

export type ContractDraftingType =
  | 'employment' | 'supply' | 'construction' | 'lease' | 'nda' | 'partnership'
  | 'franchise' | 'distribution' | 'service_agreement' | 'shareholders'
  | 'joint_venture' | 'memorandum' | 'other';

export type ContractLanguage = 'arabic' | 'english' | 'both';
export type VersionStatus = 'draft' | 'review' | 'approved' | 'rejected';

// Company Formation
export type EntityType = 'llc' | 'single_person' | 'simplified_jsc' | 'jsc' | 'foreign_branch' | 'professional' | 'holding';

// Licenses
export type ProcedureType = 'commercial_registration' | 'municipality_license' | 'civil_defense' | 'investment_license' | 'professional_license' | 'industrial_license' | 'tourism_license' | 'health_license' | 'food_license' | 'import_export' | 'other';
export type GovernmentEntity = 'moc' | 'misa' | 'momra' | 'civil_defense' | 'moh' | 'sfda' | 'modon' | 'sagia' | 'saber' | 'balady' | 'other';

// Arbitration
export type DisputeType = 'commercial' | 'construction' | 'real_estate' | 'labor' | 'partnership' | 'insurance' | 'banking' | 'other';
export type ResolutionMethod = 'arbitration' | 'mediation' | 'conciliation';
export type LawyerRole = 'arbitrator' | 'claimant_representative' | 'respondent_representative' | 'mediator';
export type ArbitrationRules = 'scca' | 'icc' | 'uncitral' | 'ad_hoc' | 'other';

// Compliance
export type ComplianceArea = 'data_protection' | 'anti_corruption' | 'anti_money_laundering' | 'commercial' | 'labor' | 'tax' | 'corporate_governance' | 'environmental' | 'health_safety' | 'sanctions' | 'industry_specific' | 'other';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Labor
export type LaborServiceType = 'dispute_resolution' | 'end_of_service' | 'internal_regulations' | 'employment_contract' | 'termination_advisory' | 'workplace_investigation' | 'gosi_qiwa_procedures' | 'wage_protection' | 'other';

// Real Estate
export type RealEstateServiceType = 'sale_purchase' | 'lease_management' | 'deed_review' | 'inheritance_division' | 'dispute_resolution' | 'development_contract' | 'mortgage' | 'other';
export type PropertyType = 'residential' | 'commercial' | 'land' | 'industrial' | 'agricultural' | 'mixed';

// Due Diligence
export type DdType = 'acquisition' | 'merger' | 'investment' | 'partnership' | 'ipo' | 'real_estate' | 'regulatory' | 'other';

// IP
export type IpType = 'trademark' | 'patent' | 'copyright' | 'industrial_design' | 'trade_secret' | 'domain_name' | 'other';
export type RegistrationOffice = 'saip' | 'gcc_patent' | 'wipo' | 'other';

// Legal Notices
export type NoticeType = 'payment_demand' | 'contract_termination' | 'contract_breach' | 'eviction' | 'cease_desist' | 'warranty_claim' | 'debt_collection' | 'general_warning' | 'response_to_notice' | 'other';
export type NoticeDeliveryMethod = 'spl' | 'registered_mail' | 'courier' | 'email' | 'notary' | 'whatsapp' | 'hand_delivery';

// Training
export type TrainingType = 'workshop' | 'seminar' | 'course' | 'awareness' | 'induction' | 'certification' | 'other';
export type TopicCategory = 'new_companies_law' | 'labor_law' | 'data_protection' | 'anti_corruption' | 'commercial_law' | 'corporate_governance' | 'contract_management' | 'compliance' | 'other';
export type TrainingDeliveryFormat = 'in_person' | 'online' | 'hybrid';

// ── الواجهات الرئيسية ──

export interface LegalService {
  id: number;
  tenant_id: number;
  service_number: string;
  title: string;
  service_type: ServiceType;
  client_id: number;
  assigned_lawyer_id: number | null;
  created_by: number | null;
  status: string;
  priority: ServicePriority;
  billing_type: BillingType;
  agreed_amount: string | null;
  hourly_rate: string | null;
  vat_rate: string;
  case_id: number | null;
  converted_to_case_at: string | null;
  contract_id: number | null;
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  description: string | null;
  notes: string | null;
  internal_notes: string | null;
  work_notes: string | null;
  source: ServiceSource;
  next_action_type: string | null;
  conversion_value: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Relationships (loaded)
  client?: { id: number; name: string; email?: string; phone?: string };
  assigned_lawyer?: { id: number; name: string; email?: string; phone?: string };
  creator?: { id: number; name: string };
  consultation_detail?: ConsultationDetail;
  contract_drafting_detail?: ContractDraftingDetail;
  company_formation_detail?: CompanyFormationDetail;
  license_procedure_detail?: LicenseProcedureDetail;
  arbitration_detail?: ArbitrationDetail;
  compliance_detail?: ComplianceDetail;
  labor_detail?: LaborDetail;
  real_estate_detail?: RealEstateDetail;
  due_diligence_detail?: DueDiligenceDetail;
  ip_detail?: IpDetail;
  legal_notice_detail?: LegalNoticeDetail;
  training_detail?: TrainingDetail;
  risk_score?: number | null;
  risk_level?: string | null;
  service_activities?: ServiceActivityItem[];
  service_documents?: ServiceDocumentItem[];
  time_entries?: ServiceTimeEntryItem[];
  invoices?: CaseInvoiceItem[];
  deliverables?: ServiceDeliverableItem[];
  case_model?: { id: number; case_number: string; title: string };

  // Computed
  total_billed?: number;
  total_time_seconds?: number;
  allowed_transitions?: string[];
  status_arabic?: string;
  service_type_arabic?: string;
  priority_arabic?: string;
  billing_type_arabic?: string;
  onedrive_connected?: boolean;
}

/** مخرَج رسمي مُولّد لخدمة (PDF/Word) */
export interface ServiceDeliverableItem {
  id: number;
  type: string;
  type_label: string;
  format: 'pdf' | 'docx';
  title: string;
  file_name: string;
  file_size: number | null;
  generated_by: string | null;
  created_at: string;
  download_url: string;
  view_url: string;
}

/** رابط بوابة العميل/الخصوم White-Label */
export interface ServicePortalLinkItem {
  id: number;
  token: string;
  audience: 'client' | 'adversary';
  audience_label: string;
  recipient_name: string | null;
  allow_upload: boolean;
  path: string;
  is_valid: boolean;
  expires_at: string | null;
  revoked_at: string | null;
  last_accessed_at: string | null;
  created_at: string;
}

/** أنواع الخدمات التي يصحّ تحويلها إلى قضية (نزاعات قد تتصاعد للتقاضي) */
export const CONVERTIBLE_SERVICE_TYPES: ServiceType[] = [
  'consultation', 'labor', 'legal_notices', 'ip', 'arbitration', 'real_estate', 'contract_drafting',
];

export interface ConsultationDetail {
  id: number;
  legal_service_id: number;
  classification: ConsultationClassification | null;
  urgency: ConsultationUrgency;
  scope_definition: string | null;
  client_question: string | null;
  legal_references: LegalReference[] | null;
  // التمثيل الموحّد: نص الرأي القانوني HTML غني (سابقاً legal_opinion_legacy).
  legal_opinion: string | null;
  opinion_finalized_at: string | null;
  delivery_method: DeliveryMethod | null;
  delivered_at: string | null;
  letterhead_id: number | null;
}

export interface LegalReference {
  title: string;
  source?: string;
  url?: string;
}

export interface LegalOpinion {
  summary?: string;
  analysis?: string;
  recommendations?: string;
  risks?: string;
  next_steps?: string;
}

export interface ContractDraftingDetail {
  id: number;
  legal_service_id: number;
  contract_type: ContractDraftingType | null;
  contract_type_other: string | null;
  parties_info: PartyInfo[] | null;
  contract_language: ContractLanguage;
  contract_value: string | null;
  contract_currency: string;
  contract_start_date: string | null;
  contract_end_date: string | null;
  auto_renewal: boolean;
  renewal_notice_days: number | null;
  current_version: number;
  checklist: ChecklistItem[] | null;
  review_comments: string | null;
  client_feedback: string | null;
  renewal_date: string | null;
  termination_notice_date: string | null;
  alert_days_before: number;
  versions?: ContractDraftingVersion[];
  ai_audit?: ContractAuditResult | null;
}

/** نتيجة التدقيق الآلي للعقد (AI) */
export interface ContractAuditFinding {
  id: string;
  original_text: string;
  suggested_text: string;
  reason: string;
  legal_reference: string | null;
  severity: 'high' | 'medium' | 'low';
  category: string;
}

export interface ContractAuditResult {
  status: string;
  model: string;
  prompt_version: string;
  audited_version_number: number | null;
  audited_at: string;
  overall_risk: 'low' | 'medium' | 'high';
  summary: string;
  missing_clauses: string[];
  findings: ContractAuditFinding[];
}

export interface PartyInfo {
  name: string;
  role: string;
  type?: string;
  contact?: string;
}

export interface ChecklistItem {
  key: string;
  label: string;
  checked: boolean;
  notes?: string;
}

export interface ContractDraftingVersion {
  id: number;
  contract_drafting_id: number;
  version_number: number;
  content: string;
  change_summary: string | null;
  created_by: number | null;
  creator?: { id: number; name: string };
  status: VersionStatus;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
}

// ── تفاصيل تأسيس الشركات ──

export interface CompanyFormationDetail {
  id: number;
  legal_service_id: number;
  entity_type: EntityType | null;
  proposed_name_1: string | null;
  proposed_name_2: string | null;
  proposed_name_3: string | null;
  name_reservation_status: 'pending' | 'approved' | 'rejected' | null;
  approved_name: string | null;
  capital_amount: string | null;
  capital_currency: string;
  capital_distribution_notes: string | null;
  isic_code: string | null;
  business_activity: string | null;
  business_activity_details: string | null;
  hq_city: string | null;
  national_address: Record<string, string> | null;
  partners: CompanyPartner[] | null;
  manager_authorities: ManagerAuthority[] | null;
  trade_name_reservation_ref: string | null;
  trade_name_reservation_date: string | null;
  aoa_notarization_ref: string | null;
  aoa_notarization_date: string | null;
  cr_number: string | null;
  cr_issue_date: string | null;
  cr_expiry_date: string | null;
  zatca_registered: boolean;
  zatca_number: string | null;
  gosi_registered: boolean;
  gosi_number: string | null;
  qiwa_registered: boolean;
  municipality_license: boolean;
  municipality_license_number: string | null;
  has_shareholders_agreement: boolean;
  unified_number_700: string | null;
  document_checklist: DocumentChecklistItem[] | null;
  notes: string | null;
}

export interface CompanyPartner {
  name: string;
  national_id?: string;
  nationality?: string;
  share_percentage?: number;
  share_amount?: number;
  partner_type?: 'managing' | 'silent' | 'general';
}

export interface ManagerAuthority {
  authority: string;
  granted: boolean;
  notes?: string;
}

export interface DocumentChecklistItem {
  key: string;
  label: string;
  collected: boolean;
  notes?: string;
}

// ── تفاصيل التراخيص ──

export interface LicenseProcedureDetail {
  id: number;
  legal_service_id: number;
  procedure_type: ProcedureType | null;
  procedure_type_other: string | null;
  government_entity: GovernmentEntity | null;
  government_entity_other: string | null;
  license_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  renewal_alert_days: number;
  reference_number: string | null;
  submission_date: string | null;
  approval_date: string | null;
  days_taken: number | null;
  completion_days?: number | null;
  rejection_reason: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  requirements_checklist: RequirementItem[] | null;
  government_fees: string | null;
  service_fees: string | null;
  fees_paid: boolean;
  notes: string | null;
}

export interface RequirementItem {
  key: string;
  label: string;
  item?: string;
  completed: boolean;
  collected?: boolean;
  notes?: string;
}

// ── تفاصيل التحكيم ──

export interface ArbitrationDetail {
  id: number;
  legal_service_id: number;
  dispute_type: DisputeType | null;
  resolution_method: ResolutionMethod;
  claimant: ArbitrationParty | null;
  respondent: ArbitrationParty | null;
  lawyer_role: LawyerRole | null;
  arbitrator_name: string | null;
  arbitrator_license_number: string | null;
  arbitration_panel: PanelMember[] | null;
  dispute_summary: string | null;
  claim_amount: string | null;
  claim_currency: string;
  claimant_demands: string | null;
  arbitration_agreement_ref: string | null;
  arbitration_rules: ArbitrationRules | null;
  arbitration_seat: string | null;
  arbitration_language: 'arabic' | 'english' | 'both';
  hearings: ArbitrationHearing[] | null;
  award_summary: string | null;
  award_amount: string | null;
  award_date: string | null;
  award_document_path: string | null;
  award_enforceable: boolean;
  settlement_terms: string | null;
  settlement_date: string | null;
  settlement_document_path: string | null;
  notes: string | null;
}

export interface ArbitrationParty {
  name: string;
  type?: 'individual' | 'company';
  id_number?: string;
  representative?: string;
  contact_phone?: string;
  contact_email?: string;
}

export interface PanelMember {
  name: string;
  role: 'chair' | 'member';
  license?: string;
}

export interface ArbitrationHearing {
  date: string;
  time?: string;
  location?: string;
  type?: 'in_person' | 'remote';
  agenda?: string;
  outcome?: string;
}

// ── تفاصيل الامتثال ──

export interface ComplianceDetail {
  id: number;
  legal_service_id: number;
  compliance_area: ComplianceArea | null;
  regulation_reference: string | null;
  regulatory_body: string | null;
  regulation_effective_date: string | null;
  compliance_score: number | null;
  risk_level: RiskLevel | null;
  audit_checklist: AuditChecklistItem[] | null;
  risk_register: RiskRegisterItem[] | null;
  corrective_actions: CorrectiveAction[] | null;
  assessment_report: string | null;
  recommendations: string | null;
  next_review_date: string | null;
  review_frequency_months: number | null;
  notes: string | null;
}

export interface AuditChecklistItem {
  category: string;
  item: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable' | 'not_checked';
  evidence?: string;
  notes?: string;
  severity?: 'high' | 'medium' | 'low' | 'critical';
}

export interface RiskRegisterItem {
  risk: string;
  category?: string;
  likelihood?: 'low' | 'medium' | 'high';
  impact?: 'low' | 'medium' | 'high';
  mitigation?: string;
  owner?: string;
  deadline?: string;
  status?: 'open' | 'mitigated' | 'accepted';
}

export interface CorrectiveAction {
  action: string;
  responsible?: string;
  deadline?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  completion_date?: string;
}

// ── تفاصيل العمل ──

export interface LaborDetail {
  id: number;
  legal_service_id: number;
  labor_service_type: LaborServiceType | null;
  employee_name: string | null;
  employee_id_number: string | null;
  employee_nationality: string | null;
  employee_position: string | null;
  employment_start_date: string | null;
  employment_end_date: string | null;
  monthly_salary: string | null;
  total_allowances: string | null;
  employer_name: string | null;
  employer_cr_number: string | null;
  eos_calculation: Record<string, unknown> | null;
  friendly_settlement_ref: string | null;
  friendly_settlement_date: string | null;
  friendly_settlement_result: 'settled' | 'failed' | 'pending' | null;
  dispute_description: string | null;
  claimed_amount: string | null;
  claimed_items: ClaimedItem[] | null;
  settlement_amount: string | null;
  settlement_terms: string | null;
  settlement_date: string | null;
  qiwa_reference: string | null;
  gosi_reference: string | null;
  mhrsd_reference: string | null;
  notes: string | null;
}

export interface ClaimedItem {
  item: string;
  amount: number;
}

// ── تفاصيل العقارات ──

export interface RealEstateDetail {
  id: number;
  legal_service_id: number;
  real_estate_service_type: RealEstateServiceType | null;
  property_type: PropertyType | null;
  property_location: string | null;
  deed_number: string | null;
  deed_date: string | null;
  property_area: string | null;
  property_value: string | null;
  property_currency: string;
  deed_review: Record<string, unknown> | null;
  transaction_parties: TransactionParty[] | null;
  ejar_contract_number: string | null;
  annual_rent: string | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  heirs: HeirInfo[] | null;
  inheritance_deed_number: string | null;
  total_estate_value: string | null;
  notes: string | null;
}

export interface TransactionParty {
  name: string;
  role: string;
  id_number?: string;
  contact?: string;
}

export interface HeirInfo {
  name: string;
  relationship: string;
  share_fraction: string;
  id_number?: string;
}

// ── تفاصيل العناية الواجبة ──

export interface DueDiligenceDetail {
  id: number;
  legal_service_id: number;
  dd_type: DdType | null;
  target_company_name: string | null;
  target_cr_number: string | null;
  target_industry: string | null;
  target_location: string | null;
  estimated_deal_value: string | null;
  deal_value?: string | null;
  deal_currency: string;
  scope_areas: ScopeArea[] | null;
  findings: DdFinding[] | null;
  red_flags_count: number;
  yellow_flags_count: number;
  green_flags_count: number;
  overall_risk: 'low' | 'moderate' | 'medium' | 'high' | 'critical' | null;
  risk_summary: string | null;
  executive_summary: string | null;
  detailed_report: string | null;
  report_pdf_path: string | null;
  report_date: string | null;
  recommendation: 'proceed' | 'proceed_with_conditions' | 'do_not_proceed' | null;
  recommendation_details: string | null;
  data_room_access_date: string | null;
  data_room_deadline: string | null;
  notes: string | null;
}

export interface ScopeArea {
  area: string;
  included: boolean;
  checked?: boolean;
  assigned_to?: string;
  notes?: string;
}

export interface DdFinding {
  category: string;
  finding: string;
  risk_level: 'red' | 'yellow' | 'green';
  recommendation?: string;
  document_ref?: string;
}

// ── تفاصيل الملكية الفكرية ──

export interface IpDetail {
  id: number;
  legal_service_id: number;
  ip_type: IpType | null;
  ip_title: string | null;
  ip_description: string | null;
  application_number: string | null;
  application_date: string | null;
  registration_number: string | null;
  registration_date: string | null;
  expiry_date: string | null;
  renewal_alert_days: number;
  nice_classes: number[] | null;
  nice_classes_description: string | null;
  registration_office: RegistrationOffice | null;
  owner_name: string | null;
  owner_type: 'individual' | 'company' | null;
  owner_id_number: string | null;
  publication_start_date: string | null;
  publication_end_date: string | null;
  final_fees_paid: boolean;
  search_results: IpSearchResult[] | null;
  search_clear: boolean | null;
  objections: IpObjection[] | null;
  infringements: IpInfringement[] | null;
  notes: string | null;
}

export interface IpSearchResult {
  similar_mark: string;
  similarity_percentage: number;
  class_number?: number;
  class?: number;
  owner?: string;
  risk?: 'low' | 'medium' | 'high';
  risk_level?: 'low' | 'medium' | 'high';
}

export interface IpObjection {
  date: string;
  objector_name: string;
  objector?: string;
  grounds?: string;
  response_deadline?: string;
  response_filed?: boolean;
  outcome?: string;
}

export interface IpInfringement {
  date: string;
  infringer: string;
  description?: string;
  action_taken?: string;
  status?: 'reported' | 'warning_sent' | 'legal_action' | 'litigation' | 'resolved';
}

// ── تفاصيل الإنذارات ──

export interface LegalNoticeDetail {
  id: number;
  legal_service_id: number;
  notice_type: NoticeType | null;
  recipient_name: string | null;
  recipient_type: 'individual' | 'company' | 'government' | null;
  recipient_id_number: string | null;
  recipient_address: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  notice_content: string | null;
  notice_summary: string | null;
  demanded_amount: string | null;
  demanded_currency: string;
  demanded_actions: string | null;
  response_deadline_days: number | null;
  response_deadline_date: string | null;
  template_used: string | null;
  delivery_method: NoticeDeliveryMethod | null;
  tracking_number: string | null;
  sent_date: string | null;
  delivered_date: string | null;
  delivery_proof_path: string | null;
  response_received_date: string | null;
  response_content: string | null;
  response_document_path: string | null;
  letterhead_id: number | null;
  pdf_path: string | null;
  notes: string | null;
}

// ── تفاصيل التدريب ──

export interface TrainingDetail {
  id: number;
  legal_service_id: number;
  training_type: TrainingType | null;
  topic: string | null;
  topic_category: TopicCategory | null;
  description: string | null;
  objectives: string | null;
  target_audience: string | null;
  max_attendees: number | null;
  duration_hours: number | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  delivery_format: TrainingDeliveryFormat;
  venue: string | null;
  online_link: string | null;
  trainer_name: string | null;
  trainer_id: number | null;
  trainer_bio: string | null;
  attendees: TrainingAttendee[] | null;
  materials: TrainingMaterial[] | null;
  evaluation: TrainingEvaluation | null;
  certificates_enabled: boolean;
  certificate_template: string | null;
  certificates_issued_count: number;
  price_per_attendee: string | null;
  is_free: boolean;
  notes: string | null;
}

export interface TrainingAttendee {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  registered_at?: string;
  attended?: boolean;
  certificate_issued?: boolean;
  certificate_number?: string;
}

export interface TrainingMaterial {
  title: string;
  type: 'presentation' | 'document' | 'video' | 'exercise';
  file_path?: string;
  description?: string;
}

export interface TrainingEvaluation {
  average_rating: number;
  total_responses: number;
  comments?: string[];
}

export interface ServiceActivityItem {
  id: number;
  legal_service_id: number;
  type: string;
  title: string;
  description: string | null;
  performed_by: number | null;
  performer?: { id: number; name: string };
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ServiceDocumentItem {
  id: number;
  legal_service_id: number;
  document_id: number;
  relation_type: string | null;
  notes: string | null;
  document?: {
    id: number;
    title: string;
    file_path: string;
    file_name: string;
    file_size: number;
    file_type: string;
  };
}

export interface ServiceTimeEntryItem {
  id: number;
  legal_service_id: number;
  user_id: number;
  user?: { id: number; name: string };
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  description: string | null;
  is_billable: boolean;
  hourly_rate: string | null;
}

export interface CaseInvoiceItem {
  id: number;
  invoice_number: string;
  title: string;
  total_amount: string;
  paid_amount: string;
  remaining_amount: string;
  status: string;
  due_date: string | null;
}

// ── الفلاتر ──

export interface LegalServiceFilters {
  service_type?: ServiceType;
  status?: string;
  client_id?: number;
  assigned_lawyer_id?: number;
  priority?: ServicePriority;
  search?: string;
  date_from?: string;
  date_to?: string;
  active_only?: boolean;
  page?: number;
  per_page?: number;
}

// ── بيانات الإنشاء ──

export interface CreateLegalServiceData {
  title: string;
  service_type: ServiceType;
  client_id: number;
  assigned_lawyer_id?: number;
  priority?: ServicePriority;
  billing_type?: BillingType;
  agreed_amount?: number;
  hourly_rate?: number;
  vat_rate?: number;
  start_date?: string;
  due_date?: string;
  description?: string;
  notes?: string;
  internal_notes?: string;
  source?: ServiceSource;
  // Consultation fields
  classification?: ConsultationClassification;
  urgency?: ConsultationUrgency;
  scope_definition?: string;
  client_question?: string;
  delivery_method?: DeliveryMethod;
  // Contract drafting fields
  contract_type?: ContractDraftingType;
  contract_type_other?: string;
  parties_info?: PartyInfo[];
  contract_language?: ContractLanguage;
  contract_value?: number;
  contract_currency?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  auto_renewal?: boolean;
  renewal_notice_days?: number;
  checklist?: ChecklistItem[];
  // Company formation fields
  entity_type?: EntityType;
  proposed_name_1?: string;
  proposed_name_2?: string;
  proposed_name_3?: string;
  capital_amount?: number;
  capital_currency?: string;
  business_activity?: string;
  isic_code?: string;
  hq_city?: string;
  has_shareholders_agreement?: boolean;
  // License fields
  procedure_type?: ProcedureType;
  procedure_type_other?: string;
  government_entity?: GovernmentEntity;
  government_entity_other?: string;
  reference_number?: string;
  renewal_alert_days?: number;
  // Arbitration fields
  dispute_type?: DisputeType;
  resolution_method?: ResolutionMethod;
  lawyer_role?: LawyerRole;
  claimant?: ArbitrationParty;
  respondent?: ArbitrationParty;
  claim_amount?: number;
  dispute_summary?: string;
  // Compliance fields
  compliance_area?: ComplianceArea;
  regulation_reference?: string;
  regulatory_body?: string;
  risk_level?: RiskLevel;
  audit_checklist?: AuditChecklistItem[];
  // Labor fields
  labor_service_type?: LaborServiceType;
  employee_name?: string;
  monthly_salary?: number;
  total_allowances?: number;
  employment_start_date?: string;
  dispute_description?: string;
  // Real estate fields
  real_estate_service_type?: RealEstateServiceType;
  property_type?: PropertyType;
  property_location?: string;
  deed_number?: string;
  property_value?: number;
  property_currency?: string;
  // Due diligence fields
  dd_type?: DdType;
  target_company_name?: string;
  estimated_deal_value?: number;
  deal_currency?: string;
  scope_areas?: ScopeArea[];
  // IP fields
  ip_type?: IpType;
  ip_title?: string;
  owner_name?: string;
  registration_office?: RegistrationOffice;
  nice_classes?: number[];
  // Legal notices fields
  notice_type?: NoticeType;
  recipient_name?: string;
  recipient_type?: 'individual' | 'company' | 'government';
  recipient_address?: string;
  demanded_amount?: number;
  response_deadline_days?: number;
  delivery_method_notice?: NoticeDeliveryMethod;
  // Training fields
  training_type?: TrainingType;
  topic?: string;
  topic_category?: TopicCategory;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  delivery_format?: TrainingDeliveryFormat;
  venue?: string;
  online_link?: string;
  max_attendees?: number;
  price_per_attendee?: number;
  is_free?: boolean;
}

// ── استجابات API ──

export interface LegalServicesResponse {
  success: boolean;
  data: {
    data: LegalService[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface LegalServiceResponse {
  success: boolean;
  data: LegalService;
  message?: string;
}

export interface ServiceStatsResponse {
  success: boolean;
  data: {
    total: number;
    active: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
    total_revenue: number;
    total_billed: number;
  };
}

export interface StatusFlowItem {
  status: string;
  label: string;
  transitions: string[];
}

export interface StatusFlowResponse {
  success: boolean;
  data: StatusFlowItem[];
}

// ── التسميات العربية ──

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  consultation: 'استشارة قانونية',
  contract_drafting: 'صياغة عقود',
  company_formation: 'تأسيس شركات',
  licenses: 'تراخيص وإجراءات حكومية',
  arbitration: 'تحكيم ووساطة',
  compliance: 'امتثال قانوني',
  labor: 'شؤون العمل',
  real_estate: 'عقارات',
  due_diligence: 'العناية القانونية الواجبة',
  ip: 'ملكية فكرية',
  legal_notices: 'إنذارات قانونية',
  training: 'تدريب قانوني',
};

export const PRIORITY_LABELS: Record<ServicePriority, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
};

export const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  hourly: 'بالساعة',
  flat_fee: 'مبلغ مقطوع',
  milestone: 'على مراحل',
  retainer: 'اشتراك',
};

export const CLASSIFICATION_LABELS: Record<ConsultationClassification, string> = {
  criminal: 'جنائي',
  commercial: 'تجاري',
  family: 'أحوال شخصية',
  labor: 'عمالي',
  administrative: 'إداري',
  real_estate: 'عقاري',
  intellectual_property: 'ملكية فكرية',
  corporate: 'شركات',
  tax: 'ضريبي',
  other: 'أخرى',
};

export const URGENCY_LABELS: Record<ConsultationUrgency, string> = {
  normal: 'عادية',
  urgent: 'عاجلة',
  very_urgent: 'عاجلة جداً',
};

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  in_person: 'حضوري',
  video: 'مرئي',
  phone: 'هاتفي',
  written: 'مكتوب',
  email: 'بريد إلكتروني',
};

export const CONTRACT_TYPE_LABELS: Record<ContractDraftingType, string> = {
  employment: 'عقد عمل',
  supply: 'عقد توريد',
  construction: 'عقد مقاولة',
  lease: 'عقد إيجار',
  nda: 'اتفاقية سرية',
  partnership: 'عقد شراكة',
  franchise: 'عقد امتياز',
  distribution: 'عقد توزيع',
  service_agreement: 'عقد خدمات',
  shareholders: 'اتفاقية مساهمين',
  joint_venture: 'مشروع مشترك',
  memorandum: 'مذكرة تفاهم',
  other: 'أخرى',
};

export const CONTRACT_LANGUAGE_LABELS: Record<ContractLanguage, string> = {
  arabic: 'عربي',
  english: 'إنجليزي',
  both: 'عربي وإنجليزي',
};

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  llc: 'شركة ذات مسؤولية محدودة',
  single_person: 'شركة الشخص الواحد',
  simplified_jsc: 'شركة مساهمة مبسطة',
  jsc: 'شركة مساهمة',
  foreign_branch: 'فرع شركة أجنبية',
  professional: 'شركة مهنية',
  holding: 'شركة قابضة',
};

export const PROCEDURE_TYPE_LABELS: Record<ProcedureType, string> = {
  commercial_registration: 'سجل تجاري',
  municipality_license: 'رخصة بلدية',
  civil_defense: 'الدفاع المدني',
  investment_license: 'رخصة استثمار',
  professional_license: 'رخصة مهنية',
  industrial_license: 'رخصة صناعية',
  tourism_license: 'رخصة سياحية',
  health_license: 'رخصة صحية',
  food_license: 'رخصة غذائية',
  import_export: 'استيراد وتصدير',
  other: 'أخرى',
};

export const GOVERNMENT_ENTITY_LABELS: Record<GovernmentEntity, string> = {
  moc: 'وزارة التجارة',
  misa: 'وزارة الاستثمار',
  momra: 'وزارة الشؤون البلدية',
  civil_defense: 'الدفاع المدني',
  moh: 'وزارة الصحة',
  sfda: 'هيئة الغذاء والدواء',
  modon: 'مدن',
  sagia: 'الهيئة العامة للاستثمار',
  saber: 'منصة سابر',
  balady: 'منصة بلدي',
  other: 'أخرى',
};

export const DISPUTE_TYPE_LABELS: Record<DisputeType, string> = {
  commercial: 'تجاري',
  construction: 'مقاولات',
  real_estate: 'عقاري',
  labor: 'عمالي',
  partnership: 'شراكة',
  insurance: 'تأمين',
  banking: 'مصرفي',
  other: 'أخرى',
};

export const RESOLUTION_METHOD_LABELS: Record<ResolutionMethod, string> = {
  arbitration: 'تحكيم',
  mediation: 'وساطة',
  conciliation: 'صلح',
};

export const LAWYER_ROLE_LABELS: Record<LawyerRole, string> = {
  arbitrator: 'محكم',
  claimant_representative: 'ممثل المدعي',
  respondent_representative: 'ممثل المدعى عليه',
  mediator: 'وسيط',
};

export const COMPLIANCE_AREA_LABELS: Record<ComplianceArea, string> = {
  data_protection: 'حماية البيانات الشخصية',
  anti_corruption: 'مكافحة الفساد',
  anti_money_laundering: 'مكافحة غسل الأموال',
  commercial: 'النظام التجاري',
  labor: 'نظام العمل',
  tax: 'الضريبي',
  corporate_governance: 'حوكمة الشركات',
  environmental: 'البيئي',
  health_safety: 'الصحة والسلامة',
  sanctions: 'العقوبات الدولية',
  industry_specific: 'خاص بالصناعة',
  other: 'أخرى',
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'عالي',
  critical: 'حرج',
};

export const LABOR_SERVICE_TYPE_LABELS: Record<LaborServiceType, string> = {
  dispute_resolution: 'تسوية نزاع عمالي',
  end_of_service: 'حساب مكافأة نهاية الخدمة',
  internal_regulations: 'لائحة عمل داخلية',
  employment_contract: 'عقد عمل',
  termination_advisory: 'استشارة فصل',
  workplace_investigation: 'تحقيق داخلي',
  gosi_qiwa_procedures: 'إجراءات التأمينات/قوى',
  wage_protection: 'حماية الأجور',
  other: 'أخرى',
};

export const REAL_ESTATE_SERVICE_TYPE_LABELS: Record<RealEstateServiceType, string> = {
  sale_purchase: 'بيع وشراء',
  lease_management: 'إدارة إيجارية',
  deed_review: 'مراجعة صكوك',
  inheritance_division: 'تصفية تركات',
  dispute_resolution: 'حل نزاع عقاري',
  development_contract: 'عقود تطوير',
  mortgage: 'رهن عقاري',
  other: 'أخرى',
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  residential: 'سكني',
  commercial: 'تجاري',
  land: 'أرض',
  industrial: 'صناعي',
  agricultural: 'زراعي',
  mixed: 'متعدد الاستخدام',
};

export const DD_TYPE_LABELS: Record<DdType, string> = {
  acquisition: 'استحواذ',
  merger: 'اندماج',
  investment: 'استثمار',
  partnership: 'شراكة',
  ipo: 'طرح عام',
  real_estate: 'عقاري',
  regulatory: 'تنظيمي',
  other: 'أخرى',
};

export const IP_TYPE_LABELS: Record<IpType, string> = {
  trademark: 'علامة تجارية',
  patent: 'براءة اختراع',
  copyright: 'حق مؤلف',
  industrial_design: 'نموذج صناعي',
  trade_secret: 'سر تجاري',
  domain_name: 'اسم نطاق',
  other: 'أخرى',
};

export const REGISTRATION_OFFICE_LABELS: Record<RegistrationOffice, string> = {
  saip: 'الهيئة السعودية للملكية الفكرية',
  gcc_patent: 'مكتب براءات الخليج',
  wipo: 'المنظمة العالمية للملكية الفكرية',
  other: 'أخرى',
};

export const NOTICE_TYPE_LABELS: Record<NoticeType, string> = {
  payment_demand: 'مطالبة مالية',
  contract_termination: 'فسخ عقد',
  contract_breach: 'إخلال بالعقد',
  eviction: 'إخلاء',
  cease_desist: 'كف ومنع',
  warranty_claim: 'مطالبة ضمان',
  debt_collection: 'تحصيل دين',
  general_warning: 'تحذير عام',
  response_to_notice: 'رد على إنذار',
  other: 'أخرى',
};

export const NOTICE_DELIVERY_METHOD_LABELS: Record<NoticeDeliveryMethod, string> = {
  spl: 'البريد السعودي',
  registered_mail: 'بريد مسجل',
  courier: 'مندوب',
  email: 'بريد إلكتروني',
  notary: 'كاتب عدل',
  whatsapp: 'واتساب',
  hand_delivery: 'تسليم يدوي',
};

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  workshop: 'ورشة عمل',
  seminar: 'ندوة',
  course: 'دورة تدريبية',
  awareness: 'حملة توعوية',
  induction: 'برنامج تعريفي',
  certification: 'برنامج شهادة',
  other: 'أخرى',
};

export const TOPIC_CATEGORY_LABELS: Record<TopicCategory, string> = {
  new_companies_law: 'نظام الشركات الجديد',
  labor_law: 'نظام العمل',
  data_protection: 'حماية البيانات',
  anti_corruption: 'مكافحة الفساد',
  commercial_law: 'النظام التجاري',
  corporate_governance: 'حوكمة الشركات',
  contract_management: 'إدارة العقود',
  compliance: 'الامتثال',
  other: 'أخرى',
};

export const TRAINING_FORMAT_LABELS: Record<TrainingDeliveryFormat, string> = {
  in_person: 'حضوري',
  online: 'عن بعد',
  hybrid: 'هجين',
};
