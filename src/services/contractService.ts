import { apiClient } from '../utils/api';
import type {
  Contract,
  ContractFilters,
  ContractsResponse,
  ContractResponse,
  ContractStatsResponse,
  ContractParty,
  PaymentTerm,
  CreateContractData,
  CreatePaymentTermData,
} from '../types/contracts';

export class ContractService {
  private static buildQueryString(filters: ContractFilters): string {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  // === العقود CRUD ===

  /**
   * الحصول على قائمة العقود
   */
  static async getContracts(filters: ContractFilters = {}): Promise<ContractsResponse> {
    const query = this.buildQueryString(filters);
    return apiClient.get<ContractsResponse>(`/contracts${query}`);
  }

  /**
   * الحصول على عقد محدد
   */
  static async getContract(id: number): Promise<ContractResponse> {
    return apiClient.get<ContractResponse>(`/contracts/${id}`);
  }

  /**
   * إنشاء عقد جديد
   */
  static async createContract(data: CreateContractData): Promise<ContractResponse> {
    return apiClient.post<ContractResponse>('/contracts', data);
  }

  /**
   * تحديث عقد
   */
  static async updateContract(id: number, data: Partial<Contract>): Promise<ContractResponse> {
    return apiClient.put<ContractResponse>(`/contracts/${id}`, data);
  }

  /**
   * حذف عقد
   */
  static async deleteContract(id: number): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/contracts/${id}`);
  }

  // === إجراءات العقد ===

  /**
   * توقيع العقد
   */
  static async signContract(id: number, signedBy?: string): Promise<ContractResponse> {
    return apiClient.post<ContractResponse>(`/contracts/${id}/sign`, {
      signed_by: signedBy || 'المستخدم الحالي',
    });
  }

  /**
   * تحميل العقد كـ PDF
   */
  static async downloadPdf(id: number): Promise<{ success: boolean; data: { url: string } }> {
    return apiClient.get<{ success: boolean; data: { url: string } }>(`/contracts/${id}/pdf`);
  }

  /**
   * إرسال العقد للعميل
   */
  static async sendContract(
    id: number,
    channel: 'email' | 'whatsapp',
    message?: string
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>(`/contracts/${id}/send`, {
      channel,
      message,
    });
  }

  /**
   * ربط العقد بقضية
   */
  static async linkToCase(id: number, caseId: number): Promise<ContractResponse> {
    return apiClient.post<ContractResponse>(`/contracts/${id}/link-case`, { case_id: caseId });
  }

  /**
   * الحصول على إحصائيات العقود
   */
  static async getStats(): Promise<ContractStatsResponse> {
    return apiClient.get<ContractStatsResponse>('/contracts/stats');
  }

  /**
   * الحصول على عقود قضية محددة
   */
  static async getCaseContracts(caseId: number): Promise<ContractsResponse> {
    return apiClient.get<ContractsResponse>(`/cases/${caseId}/contracts`);
  }

  /**
   * الحصول على عقود عميل محدد
   */
  static async getClientContracts(clientId: number): Promise<ContractsResponse> {
    return this.getContracts({ client_id: clientId });
  }

  // === أطراف العقد ===

  /**
   * الحصول على أطراف العقد
   */
  static async getParties(contractId: number): Promise<{ success: boolean; data: ContractParty[] }> {
    return apiClient.get<{ success: boolean; data: ContractParty[] }>(`/contracts/${contractId}/parties`);
  }

  /**
   * إضافة طرف للعقد
   */
  static async addParty(
    contractId: number,
    data: Partial<ContractParty>
  ): Promise<{ success: boolean; data: ContractParty; message: string }> {
    return apiClient.post<{ success: boolean; data: ContractParty; message: string }>(
      `/contracts/${contractId}/parties`,
      data
    );
  }

  /**
   * تحديث طرف في العقد
   */
  static async updateParty(
    contractId: number,
    partyId: number,
    data: Partial<ContractParty>
  ): Promise<{ success: boolean; data: ContractParty; message: string }> {
    return apiClient.put<{ success: boolean; data: ContractParty; message: string }>(
      `/contracts/${contractId}/parties/${partyId}`,
      data
    );
  }

  /**
   * حذف طرف من العقد
   */
  static async deleteParty(
    contractId: number,
    partyId: number
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/contracts/${contractId}/parties/${partyId}`
    );
  }

  // === شروط الدفع ===

  /**
   * الحصول على شروط دفع العقد
   */
  static async getPaymentTerms(contractId: number): Promise<{ success: boolean; data: PaymentTerm[] }> {
    return apiClient.get<{ success: boolean; data: PaymentTerm[] }>(`/contracts/${contractId}/payment-terms`);
  }

  /**
   * إضافة شرط دفع
   */
  static async addPaymentTerm(
    contractId: number,
    data: CreatePaymentTermData
  ): Promise<{ success: boolean; data: PaymentTerm; message: string }> {
    return apiClient.post<{ success: boolean; data: PaymentTerm; message: string }>(
      `/contracts/${contractId}/payment-terms`,
      data
    );
  }

  /**
   * تحديث شرط دفع
   */
  static async updatePaymentTerm(
    contractId: number,
    termId: number,
    data: Partial<PaymentTerm>
  ): Promise<{ success: boolean; data: PaymentTerm; message: string }> {
    return apiClient.put<{ success: boolean; data: PaymentTerm; message: string }>(
      `/contracts/${contractId}/payment-terms/${termId}`,
      data
    );
  }

  /**
   * حذف شرط دفع
   */
  static async deletePaymentTerm(
    contractId: number,
    termId: number
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `/contracts/${contractId}/payment-terms/${termId}`
    );
  }

  /**
   * إنشاء فاتورة من شرط دفع
   */
  static async generateInvoiceFromTerm(
    termId: number
  ): Promise<{ success: boolean; data: any; message: string }> {
    return apiClient.post<{ success: boolean; data: any; message: string }>(
      `/payment-terms/${termId}/generate-invoice`
    );
  }

  /**
   * تحديث شرط دفع من حكم قضائي (للنسبة المئوية)
   */
  static async updateFromJudgment(
    termId: number,
    judgmentAmount: number,
    judgmentDate?: string
  ): Promise<{ success: boolean; data: PaymentTerm; message: string }> {
    return apiClient.put<{ success: boolean; data: PaymentTerm; message: string }>(
      `/payment-terms/${termId}/update-from-judgment`,
      { judgment_amount: judgmentAmount, judgment_date: judgmentDate }
    );
  }
}

// Instance export للاستخدام المباشر
export const contractService = {
  getContracts: ContractService.getContracts.bind(ContractService),
  getContract: ContractService.getContract.bind(ContractService),
  createContract: ContractService.createContract.bind(ContractService),
  updateContract: ContractService.updateContract.bind(ContractService),
  deleteContract: ContractService.deleteContract.bind(ContractService),
  signContract: ContractService.signContract.bind(ContractService),
  downloadPdf: ContractService.downloadPdf.bind(ContractService),
  sendContract: ContractService.sendContract.bind(ContractService),
  linkToCase: ContractService.linkToCase.bind(ContractService),
  getStats: ContractService.getStats.bind(ContractService),
  getCaseContracts: ContractService.getCaseContracts.bind(ContractService),
  getClientContracts: ContractService.getClientContracts.bind(ContractService),
  getParties: ContractService.getParties.bind(ContractService),
  addParty: ContractService.addParty.bind(ContractService),
  updateParty: ContractService.updateParty.bind(ContractService),
  deleteParty: ContractService.deleteParty.bind(ContractService),
  getPaymentTerms: ContractService.getPaymentTerms.bind(ContractService),
  addPaymentTerm: ContractService.addPaymentTerm.bind(ContractService),
  updatePaymentTerm: ContractService.updatePaymentTerm.bind(ContractService),
  deletePaymentTerm: ContractService.deletePaymentTerm.bind(ContractService),
  generateInvoiceFromTerm: ContractService.generateInvoiceFromTerm.bind(ContractService),
  updateFromJudgment: ContractService.updateFromJudgment.bind(ContractService),
};
