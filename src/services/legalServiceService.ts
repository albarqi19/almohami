import { apiClient } from '../utils/api';
import type {
  LegalServiceFilters,
  LegalServicesResponse,
  LegalServiceResponse,
  ServiceStatsResponse,
  StatusFlowResponse,
  CreateLegalServiceData,
  ConsultationDetail,
  ContractDraftingVersion,
  ServiceTimeEntryItem,
  ServiceDocumentItem,
  ServiceActivityItem,
  ChecklistItem,
  LegalReference,
  LegalOpinion,
  CaseInvoiceItem,
  ServiceDeliverableItem,
  ServicePortalLinkItem,
  ContractAuditResult,
} from '../types/legalServices';

export class LegalServiceService {
  private static buildQueryString(filters: LegalServiceFilters): string {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    return params.toString() ? `?${params}` : '';
  }

  // ── CRUD ──

  static async getServices(filters: LegalServiceFilters = {}): Promise<LegalServicesResponse> {
    return apiClient.get<LegalServicesResponse>(`/legal-services${this.buildQueryString(filters)}`);
  }

  static async getService(id: number): Promise<LegalServiceResponse> {
    return apiClient.get<LegalServiceResponse>(`/legal-services/${id}`);
  }

  static async createService(data: CreateLegalServiceData): Promise<LegalServiceResponse> {
    return apiClient.post<LegalServiceResponse>('/legal-services', data);
  }

  static async updateService(id: number, data: Partial<CreateLegalServiceData>): Promise<LegalServiceResponse> {
    return apiClient.put<LegalServiceResponse>(`/legal-services/${id}`, data);
  }

  /** دفتر التدوين الموحّد: حفظ ملاحظات/مسودّات العمل الغنية (HTML) لأي نوع خدمة */
  static async updateWorkNotes(id: number, workNotes: string): Promise<LegalServiceResponse> {
    return apiClient.put<LegalServiceResponse>(`/legal-services/${id}`, { work_notes: workNotes });
  }

  static async deleteService(id: number): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/legal-services/${id}`);
  }

  // ── الحالة ──

  static async updateStatus(id: number, status: string): Promise<LegalServiceResponse> {
    return apiClient.patch<LegalServiceResponse>(`/legal-services/${id}/status`, { status });
  }

  static async getStatusFlow(type: string): Promise<StatusFlowResponse> {
    return apiClient.get<StatusFlowResponse>(`/legal-services/status-flow/${type}`);
  }

  // ── الإحصائيات ──

  static async getStats(): Promise<ServiceStatsResponse> {
    return apiClient.get<ServiceStatsResponse>('/legal-services/stats');
  }

  // ── الاستشارات ──

  static async updateOpinion(id: number, data: { legal_opinion?: string; finalize?: boolean }): Promise<{ success: boolean; data: ConsultationDetail }> {
    return apiClient.put(`/legal-services/${id}/consultation/opinion`, data);
  }

  static async addReference(id: number, reference: LegalReference): Promise<{ success: boolean; data: ConsultationDetail }> {
    return apiClient.post(`/legal-services/${id}/consultation/references`, reference);
  }

  static async removeReference(id: number, index: number): Promise<{ success: boolean; data: ConsultationDetail }> {
    return apiClient.delete(`/legal-services/${id}/consultation/references/${index}`);
  }

  static async markDelivered(id: number): Promise<LegalServiceResponse> {
    return apiClient.post(`/legal-services/${id}/consultation/mark-delivered`);
  }

  // ── صياغة العقود ──

  static async getVersions(id: number): Promise<{ success: boolean; data: ContractDraftingVersion[] }> {
    return apiClient.get(`/legal-services/${id}/contract-drafting/versions`);
  }

  static async createVersion(id: number, data: { content: string; change_summary?: string; status?: string }): Promise<{ success: boolean; data: ContractDraftingVersion }> {
    return apiClient.post(`/legal-services/${id}/contract-drafting/versions`, data);
  }

  static async getVersion(id: number, versionId: number): Promise<{ success: boolean; data: ContractDraftingVersion }> {
    return apiClient.get(`/legal-services/${id}/contract-drafting/versions/${versionId}`);
  }

  static async updateChecklist(id: number, checklist: ChecklistItem[]): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/contract-drafting/checklist`, { checklist });
  }

  static async addReviewComment(id: number, comment: string): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/contract-drafting/review-comment`, { comment });
  }

  static async updateClientFeedback(id: number, feedback: string): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/contract-drafting/client-feedback`, { feedback });
  }

  /** التدقيق الآلي للعقد (AI) مقابل نظام المعاملات المدنية */
  static async auditContract(id: number): Promise<{ success: boolean; data: ContractAuditResult; message?: string }> {
    return apiClient.post(`/legal-services/${id}/contract-drafting/audit`);
  }

  // ── تتبع الوقت ──

  static async startTimer(id: number, description?: string): Promise<{ success: boolean; data: ServiceTimeEntryItem }> {
    return apiClient.post(`/legal-services/${id}/time/start`, { description });
  }

  static async stopTimer(id: number, entryId: number): Promise<{ success: boolean; data: ServiceTimeEntryItem }> {
    return apiClient.post(`/legal-services/${id}/time/stop/${entryId}`);
  }

  static async getTimeEntries(id: number): Promise<{ success: boolean; data: ServiceTimeEntryItem[] }> {
    return apiClient.get(`/legal-services/${id}/time/entries`);
  }

  static async getTimeSummary(id: number): Promise<{ success: boolean; data: { total_entries: number; total_seconds: number; total_formatted: string; billable_seconds: number; billable_formatted: string; total_amount: number } }> {
    return apiClient.get(`/legal-services/${id}/time/summary`);
  }

  static async addManualTimeEntry(id: number, data: { started_at: string; ended_at: string; description?: string; is_billable?: boolean; hourly_rate?: number }): Promise<{ success: boolean; data: ServiceTimeEntryItem }> {
    return apiClient.post(`/legal-services/${id}/time/manual`, data);
  }

  static async getActiveTimer(): Promise<{ success: boolean; data: ServiceTimeEntryItem | null }> {
    return apiClient.get('/service-time-entries/active');
  }

  // ── المستندات ──

  static async getDocuments(id: number): Promise<{ success: boolean; data: ServiceDocumentItem[] }> {
    return apiClient.get(`/legal-services/${id}/documents`);
  }

  static async uploadDocument(id: number, formData: FormData): Promise<{ success: boolean; data: ServiceDocumentItem }> {
    return apiClient.post(`/legal-services/${id}/documents`, formData);
  }

  static async removeDocument(id: number, docId: number): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/legal-services/${id}/documents/${docId}`);
  }

  // ── الأنشطة ──

  static async getActivities(id: number): Promise<{ success: boolean; data: ServiceActivityItem[] }> {
    return apiClient.get(`/legal-services/${id}/activities`);
  }

  // ── تأسيس الشركات ──

  static async updateCompanyDetails(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/company-formation/details`, data);
  }

  static async updatePartners(id: number, partners: any[]): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/company-formation/partners`, { partners });
  }

  static async updateAuthorities(id: number, manager_authorities: any[]): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/company-formation/authorities`, { manager_authorities });
  }

  static async updateGovernmentTracking(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/company-formation/government-tracking`, data);
  }

  static async updatePostCr(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/company-formation/post-cr`, data);
  }

  static async updateFormationChecklist(id: number, document_checklist: any[]): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/company-formation/checklist`, { document_checklist });
  }

  static async getFormationProgress(id: number): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.get(`/legal-services/${id}/company-formation/progress`);
  }

  // ── التحكيم ──

  static async updateArbitrationParties(id: number, data: { claimant?: any; respondent?: any }): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/arbitration/parties`, data);
  }

  static async updateArbitrationPanel(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/arbitration/panel`, data);
  }

  static async addHearing(id: number, hearing: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/arbitration/hearings`, hearing);
  }

  static async updateHearing(id: number, index: number, hearing: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/arbitration/hearings/${index}`, hearing);
  }

  static async recordAward(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/arbitration/award`, data);
  }

  static async recordSettlement(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/arbitration/settlement`, data);
  }

  // ── الإنذارات القانونية ──

  static async updateNoticeRecipient(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/legal-notice/recipient`, data);
  }

  static async updateNoticeContent(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/legal-notice/content`, data);
  }

  static async recordNoticeSend(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/legal-notice/send`, data);
  }

  static async recordNoticeDelivery(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/legal-notice/delivery`, data);
  }

  static async recordNoticeResponse(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/legal-notice/response`, data);
  }

  static async generateNoticePdf(id: number): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/legal-notice/generate-pdf`);
  }

  // ── التدريب ──

  static async updateTrainingDetails(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/training/details`, data);
  }

  static async addTrainingAttendee(id: number, attendee: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/training/attendees`, attendee);
  }

  static async updateTrainingAttendee(id: number, index: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/training/attendees/${index}`, data);
  }

  static async removeTrainingAttendee(id: number, index: number): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/legal-services/${id}/training/attendees/${index}`);
  }

  static async addTrainingMaterial(id: number, material: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/training/materials`, material);
  }

  static async generateCertificates(id: number): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/training/certificates/generate`);
  }

  static async updateTrainingEvaluation(id: number, evaluation: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/training/evaluation`, { evaluation });
  }

  // ── الخدمات العمالية ──

  static async updateEmployeeInfo(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/labor/employee-info`, data);
  }

  static async calculateEos(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/labor/eos-calculate`, data);
  }

  static async updateFriendlySettlement(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/labor/friendly-settlement`, data);
  }

  static async addClaimedItem(id: number, item: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/labor/claimed-items`, item);
  }

  static async removeClaimedItem(id: number, index: number): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.delete(`/legal-services/${id}/labor/claimed-items/${index}`);
  }

  static async updateLaborSettlement(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/labor/settlement`, data);
  }

  // ── الامتثال القانوني ──

  static async updateComplianceInfo(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/compliance/info`, data);
  }

  static async updateAuditChecklist(id: number, audit_checklist: any[]): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/compliance/audit-checklist`, { audit_checklist });
  }

  static async addRiskItem(id: number, item: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/compliance/risk-register`, item);
  }

  static async removeRiskItem(id: number, index: number): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.delete(`/legal-services/${id}/compliance/risk-register/${index}`);
  }

  static async addCorrectiveAction(id: number, item: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/compliance/corrective-actions`, item);
  }

  static async removeCorrectiveAction(id: number, index: number): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.delete(`/legal-services/${id}/compliance/corrective-actions/${index}`);
  }

  // ── العقارات ──

  static async updatePropertyInfo(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/real-estate/property-info`, data);
  }

  static async addTransactionParty(id: number, party: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/real-estate/transaction-parties`, party);
  }

  static async removeTransactionParty(id: number, index: number): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.delete(`/legal-services/${id}/real-estate/transaction-parties/${index}`);
  }

  static async updateLeaseInfo(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/real-estate/lease-info`, data);
  }

  static async addHeir(id: number, heir: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/real-estate/heirs`, heir);
  }

  static async removeHeir(id: number, index: number): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.delete(`/legal-services/${id}/real-estate/heirs/${index}`);
  }

  // ── الملكية الفكرية ──

  static async updateIpInfo(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/ip/info`, data);
  }

  static async addIpSearchResult(id: number, result: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/ip/search-results`, result);
  }

  static async removeIpSearchResult(id: number, index: number): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.delete(`/legal-services/${id}/ip/search-results/${index}`);
  }

  static async addIpObjection(id: number, objection: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/ip/objections`, objection);
  }

  static async removeIpObjection(id: number, index: number): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.delete(`/legal-services/${id}/ip/objections/${index}`);
  }

  static async addIpInfringement(id: number, infringement: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/ip/infringements`, infringement);
  }

  static async removeIpInfringement(id: number, index: number): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.delete(`/legal-services/${id}/ip/infringements/${index}`);
  }

  // ── العناية الواجبة ──

  static async updateDdTargetInfo(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/due-diligence/target-info`, data);
  }

  static async updateDdScopeAreas(id: number, scope_areas: any[]): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/due-diligence/scope-areas`, { scope_areas });
  }

  static async addDdFinding(id: number, finding: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/due-diligence/findings`, finding);
  }

  static async removeDdFinding(id: number, index: number): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.delete(`/legal-services/${id}/due-diligence/findings/${index}`);
  }

  // ── التراخيص ──

  static async updateLicenseInfo(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/licenses/info`, data);
  }

  static async updateLicenseCosts(id: number, data: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/licenses/costs`, data);
  }

  static async updateLicenseRequirements(id: number, requirements_checklist: any[]): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.put(`/legal-services/${id}/licenses/requirements`, { requirements_checklist });
  }

  static async addLicenseRequirement(id: number, item: Record<string, any>): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.post(`/legal-services/${id}/licenses/requirements`, item);
  }

  static async removeLicenseRequirement(id: number, index: number): Promise<{ success: boolean; data: any; message?: string }> {
    return apiClient.delete(`/legal-services/${id}/licenses/requirements/${index}`);
  }

  // ── التحويل والفوترة ──

  static async convertToCase(id: number, data: { title?: string; case_type?: string; case_category?: string; description?: string }): Promise<{ success: boolean; data: any; message: string }> {
    return apiClient.post(`/legal-services/${id}/convert-to-case`, data);
  }

  static async createInvoice(id: number, data: { title?: string; description?: string; amount?: number; due_date?: string }): Promise<{ success: boolean; data: CaseInvoiceItem; message: string }> {
    return apiClient.post(`/legal-services/${id}/create-invoice`, data);
  }

  // ── المخرجات الرسمية (PDF/Word) ──

  static async listDeliverables(id: number): Promise<{ success: boolean; data: ServiceDeliverableItem[] }> {
    return apiClient.get(`/legal-services/${id}/deliverables`);
  }

  static async generateDeliverable(id: number, type: string): Promise<{ success: boolean; data: ServiceDeliverableItem; message?: string }> {
    return apiClient.post(`/legal-services/${id}/deliverables/generate`, { type });
  }

  static async deleteDeliverable(id: number, deliverableId: number): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/legal-services/${id}/deliverables/${deliverableId}`);
  }

  // ── بوابة العميل/الخصوم (White-Label) ──

  static async listPortalLinks(id: number): Promise<{ success: boolean; data: ServicePortalLinkItem[] }> {
    return apiClient.get(`/legal-services/${id}/portal-links`);
  }

  static async createPortalLink(
    id: number,
    data: { audience?: 'client' | 'adversary'; recipient_name?: string; allow_upload?: boolean; expires_in_days?: number }
  ): Promise<{ success: boolean; data: ServicePortalLinkItem; message?: string }> {
    return apiClient.post(`/legal-services/${id}/portal-links`, data);
  }

  static async revokePortalLink(id: number, linkId: number): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/legal-services/${id}/portal-links/${linkId}`);
  }
}

export const legalServiceService = {
  getServices: LegalServiceService.getServices.bind(LegalServiceService),
  getService: LegalServiceService.getService.bind(LegalServiceService),
  createService: LegalServiceService.createService.bind(LegalServiceService),
  updateService: LegalServiceService.updateService.bind(LegalServiceService),
  updateWorkNotes: LegalServiceService.updateWorkNotes.bind(LegalServiceService),
  deleteService: LegalServiceService.deleteService.bind(LegalServiceService),
  updateStatus: LegalServiceService.updateStatus.bind(LegalServiceService),
  getStatusFlow: LegalServiceService.getStatusFlow.bind(LegalServiceService),
  getStats: LegalServiceService.getStats.bind(LegalServiceService),
  updateOpinion: LegalServiceService.updateOpinion.bind(LegalServiceService),
  addReference: LegalServiceService.addReference.bind(LegalServiceService),
  removeReference: LegalServiceService.removeReference.bind(LegalServiceService),
  markDelivered: LegalServiceService.markDelivered.bind(LegalServiceService),
  getVersions: LegalServiceService.getVersions.bind(LegalServiceService),
  createVersion: LegalServiceService.createVersion.bind(LegalServiceService),
  getVersion: LegalServiceService.getVersion.bind(LegalServiceService),
  updateChecklist: LegalServiceService.updateChecklist.bind(LegalServiceService),
  addReviewComment: LegalServiceService.addReviewComment.bind(LegalServiceService),
  updateClientFeedback: LegalServiceService.updateClientFeedback.bind(LegalServiceService),
  auditContract: LegalServiceService.auditContract.bind(LegalServiceService),
  startTimer: LegalServiceService.startTimer.bind(LegalServiceService),
  stopTimer: LegalServiceService.stopTimer.bind(LegalServiceService),
  getTimeEntries: LegalServiceService.getTimeEntries.bind(LegalServiceService),
  getTimeSummary: LegalServiceService.getTimeSummary.bind(LegalServiceService),
  addManualTimeEntry: LegalServiceService.addManualTimeEntry.bind(LegalServiceService),
  getActiveTimer: LegalServiceService.getActiveTimer.bind(LegalServiceService),
  getDocuments: LegalServiceService.getDocuments.bind(LegalServiceService),
  uploadDocument: LegalServiceService.uploadDocument.bind(LegalServiceService),
  removeDocument: LegalServiceService.removeDocument.bind(LegalServiceService),
  convertToCase: LegalServiceService.convertToCase.bind(LegalServiceService),
  createInvoice: LegalServiceService.createInvoice.bind(LegalServiceService),
  // المخرجات الرسمية
  listDeliverables: LegalServiceService.listDeliverables.bind(LegalServiceService),
  generateDeliverable: LegalServiceService.generateDeliverable.bind(LegalServiceService),
  deleteDeliverable: LegalServiceService.deleteDeliverable.bind(LegalServiceService),
  listPortalLinks: LegalServiceService.listPortalLinks.bind(LegalServiceService),
  createPortalLink: LegalServiceService.createPortalLink.bind(LegalServiceService),
  revokePortalLink: LegalServiceService.revokePortalLink.bind(LegalServiceService),
  // Intellectual property
  updateIpInfo: LegalServiceService.updateIpInfo.bind(LegalServiceService),
  addIpSearchResult: LegalServiceService.addIpSearchResult.bind(LegalServiceService),
  removeIpSearchResult: LegalServiceService.removeIpSearchResult.bind(LegalServiceService),
  addIpObjection: LegalServiceService.addIpObjection.bind(LegalServiceService),
  removeIpObjection: LegalServiceService.removeIpObjection.bind(LegalServiceService),
  addIpInfringement: LegalServiceService.addIpInfringement.bind(LegalServiceService),
  removeIpInfringement: LegalServiceService.removeIpInfringement.bind(LegalServiceService),
  // Company formation
  updatePartners: LegalServiceService.updatePartners.bind(LegalServiceService),
  updateAuthorities: LegalServiceService.updateAuthorities.bind(LegalServiceService),
  updateGovernmentTracking: LegalServiceService.updateGovernmentTracking.bind(LegalServiceService),
  updatePostCr: LegalServiceService.updatePostCr.bind(LegalServiceService),
  updateFormationChecklist: LegalServiceService.updateFormationChecklist.bind(LegalServiceService),
  getFormationProgress: LegalServiceService.getFormationProgress.bind(LegalServiceService),
  // Arbitration
  updateArbitrationParties: LegalServiceService.updateArbitrationParties.bind(LegalServiceService),
  updateArbitrationPanel: LegalServiceService.updateArbitrationPanel.bind(LegalServiceService),
  addHearing: LegalServiceService.addHearing.bind(LegalServiceService),
  updateHearing: LegalServiceService.updateHearing.bind(LegalServiceService),
  recordAward: LegalServiceService.recordAward.bind(LegalServiceService),
  recordSettlement: LegalServiceService.recordSettlement.bind(LegalServiceService),
  // Legal notices
  updateNoticeContent: LegalServiceService.updateNoticeContent.bind(LegalServiceService),
  recordNoticeSend: LegalServiceService.recordNoticeSend.bind(LegalServiceService),
  recordNoticeDelivery: LegalServiceService.recordNoticeDelivery.bind(LegalServiceService),
  recordNoticeResponse: LegalServiceService.recordNoticeResponse.bind(LegalServiceService),
  generateNoticePdf: LegalServiceService.generateNoticePdf.bind(LegalServiceService),
  // Training
  updateTrainingDetails: LegalServiceService.updateTrainingDetails.bind(LegalServiceService),
  addTrainingAttendee: LegalServiceService.addTrainingAttendee.bind(LegalServiceService),
  updateTrainingAttendee: LegalServiceService.updateTrainingAttendee.bind(LegalServiceService),
  removeTrainingAttendee: LegalServiceService.removeTrainingAttendee.bind(LegalServiceService),
  addTrainingMaterial: LegalServiceService.addTrainingMaterial.bind(LegalServiceService),
  generateCertificates: LegalServiceService.generateCertificates.bind(LegalServiceService),
  updateTrainingEvaluation: LegalServiceService.updateTrainingEvaluation.bind(LegalServiceService),
};
