import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

export type AnnouncementSeverity =
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'promo'
  | 'neutral'
  | 'custom';

export type AnnouncementChannel =
  | 'ticker'
  | 'modal'
  | 'banner'
  | 'toast'
  | 'dashboard_card';

export type MotionSpeed = 'slow' | 'normal' | 'fast';

/**
 * Per-announcement motion/effect customization. All fields optional;
 * a null/empty config falls back to automatic per-severity behavior.
 */
export interface AnnouncementMotion {
  type?: 'none' | 'pulse' | 'bounce' | 'shake' | 'shimmer';
  speed?: MotionSpeed;
  glow?: boolean;
  glowSpeed?: MotionSpeed;
  intensity?: 'soft' | 'normal' | 'strong';
}

export interface Announcement {
  id: number;
  title: string;
  body_markdown?: string | null;
  icon?: string | null;
  image_url?: string | null;
  severity: AnnouncementSeverity;
  custom_bg?: string | null;
  custom_fg?: string | null;
  motion?: AnnouncementMotion | null;
  cta_label?: string | null;
  cta_url?: string | null;
  cta_open_mode?: 'new_tab' | 'same_tab' | 'modal';
  channels: AnnouncementChannel[];
  audience_scope: string;
  show_on_landing: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  priority: number;
  dismissible: boolean;
  repeat_policy: 'once' | 'session' | 'daily' | 'until_dismissed' | 'always';
  status: string;
  is_active: boolean;
}

export class AnnouncementService {
  static async getActive(): Promise<Announcement[]> {
    const res = await apiClient.get<ApiResponse<Announcement[]>>('/announcements/active');
    return res.success && Array.isArray(res.data) ? res.data : [];
  }

  static async dismiss(id: number): Promise<void> {
    await apiClient.post<ApiResponse>(`/announcements/${id}/dismiss`, {});
  }

  static async track(id: number, action: 'seen' | 'click'): Promise<void> {
    try {
      await apiClient.post<ApiResponse>(`/announcements/${id}/track`, { action });
    } catch {
      // tracking is best-effort
    }
  }
}
