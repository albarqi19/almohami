import { apiClient } from '../utils/api';

/**
 * «الأمر الصوتي» — POST /ai/voice-command: مقطعٌ قصير ⟵ نيّةٌ واحدة.
 *
 * الخادم يفرّغ الكلمة ثم يصنّفها بقواعد نصّية صريحة (لا يسأل النموذج عن النيّة)،
 * ويعيد ما سُمع مع النيّة — فتقول الواجهة «سمعت: …» بدل صمتٍ غامض حين لا يُفهم الأمر.
 */

export type VoiceIntent = 'approve' | 'next' | 'previous' | 'edit' | 'cancel' | 'unknown';

export interface VoiceCommandResult {
  intent: VoiceIntent;
  transcript: string;
}

interface VoiceCommandResponse {
  success: boolean;
  message?: string;
  data?: VoiceCommandResult;
}

export async function interpretVoiceCommand(audio: Blob): Promise<VoiceCommandResult> {
  const formData = new FormData();
  formData.append('audio', audio, 'command.wav');

  const response = await apiClient.post<VoiceCommandResponse>('/ai/voice-command', formData);

  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || 'تعذّر فهم الأمر الصوتي');
}
