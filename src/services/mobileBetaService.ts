import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

export type MobileBetaResponse = 'interested' | 'later' | 'not_interested';
export type MobileBetaPlatform = 'android' | 'ios';

export interface MobileBetaStatus {
  should_show: boolean;
  suggested_email?: string | null;
}

export interface MobileBetaRespondPayload {
  response: MobileBetaResponse;
  platform?: MobileBetaPlatform;
  email?: string;
}

/**
 * دعوة تجربة تطبيق الجوال — نافذة مستقلّة تُعرض مرّة واحدة لكل مستخدم مؤهَّل.
 * الأهلية والحجب يُقرّران في الباك؛ الفرونت يسأل ويعرض فقط.
 */
export class MobileBetaService {
  static async getStatus(): Promise<MobileBetaStatus> {
    try {
      const res = await apiClient.get<ApiResponse<MobileBetaStatus>>('/mobile-beta/status');
      return res.success && res.data ? res.data : { should_show: false };
    } catch {
      // صمت مقصود: تعذُّر الفحص يعني ألّا تظهر النافذة، لا أن يتعطّل شيء للمستخدم
      return { should_show: false };
    }
  }

  static async respond(payload: MobileBetaRespondPayload): Promise<void> {
    await apiClient.post<ApiResponse>('/mobile-beta/respond', payload);
  }
}
