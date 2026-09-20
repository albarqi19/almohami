import { apiClient } from '../utils/api';
import type { DictationProfile } from '../components/voice/dictation/dictationContext';

/**
 * «الإملاء الذكي» — POST /ai/dictate: صوت ⟵ نص مصاغ بحسب نمط الحقل.
 * الخادم لا يحفظ شيئاً؛ النص يعود ليوضع في الحقل والمستخدم يحفظ بيده.
 */

export interface DictationResult {
  text: string;
  transcript: string;
  profile: string;
}

interface DictateOptions {
  profile: DictationProfile;
  /** ذيل النص قبل المؤشر — للاستئناس بتهجئة الأسماء واتصال الأسلوب */
  precedingText?: string;
  /** حقل سطر واحد (input) */
  singleLine?: boolean;
}

interface DictateResponse {
  success: boolean;
  message?: string;
  data?: DictationResult;
}

export async function dictate(audio: Blob, options: DictateOptions): Promise<DictationResult> {
  const formData = new FormData();
  formData.append('audio', audio, 'dictation.wav');
  formData.append('profile', options.profile);
  if (options.precedingText) formData.append('preceding_text', options.precedingText.slice(-800));
  if (options.singleLine) formData.append('single_line', '1');

  const response = await apiClient.post<DictateResponse>('/ai/dictate', formData);

  if (response.success && response.data?.text) {
    return response.data;
  }
  throw new Error(response.message || 'تعذّر تحويل التسجيل إلى نص');
}
