import type { ClientMeeting } from '../../services/meetingService';
import { riyadhDayKey } from '../../utils/dateAr';

type Tone = 'warning' | 'success' | 'info' | 'danger' | 'neutral';

/** حالات موعد العميل — التسميات نفسها التي تعرضها الصفحة وبوابة العميل. */
export const CLIENT_MEETING_STATUS: Record<ClientMeeting['status'], { label: string; tone: Tone }> = {
  pending: { label: 'قيد الانتظار', tone: 'warning' },
  confirmed: { label: 'مؤكد', tone: 'success' },
  completed: { label: 'مكتمل', tone: 'info' },
  cancelled_by_client: { label: 'ملغي (العميل)', tone: 'danger' },
  cancelled_by_lawyer: { label: 'ملغي (المحامي)', tone: 'danger' },
  no_show: { label: 'لم يحضر', tone: 'neutral' },
};

/** اسم العميل للعرض: الحساب الحيّ أولاً ثم اللقطة — رابط الحجز المربوط بعميل لا يحفظ لقطة. */
export const clientDisplayName = (m: ClientMeeting): string =>
  m.client?.name || m.client_name || 'عميل غير محدد';

export const clientDisplayPhone = (m: ClientMeeting): string | null => m.client?.phone || m.client_phone || null;

export const clientDisplayEmail = (m: ClientMeeting): string | null => m.client?.email || m.client_email || null;

const isOpen = (m: ClientMeeting): boolean => m.status === 'pending' || m.status === 'confirmed';

/**
 * موعدٌ «عن بُعد» مؤكَّد بلا رابط — العميل وُعد به «قبل الموعد» ولا يُضيفه غير المكتب.
 *
 * المؤكَّد وحده: الطلب المعلَّق لم يَعِد العميلَ بشيء بعد، ورابطه يُرفق في نافذة الاعتماد.
 */
export const isMissingLink = (m: ClientMeeting): boolean =>
  m.status === 'confirmed' && m.meeting_type === 'remote' && !m.video_meeting_url;

/**
 * الإجراءات المتاحة — **مرآة حرّاس الخادم** (ClientMeetingController)، كي لا يُعرض
 * زرٌّ يفشل عند الضغط.
 */
export function clientMeetingActions(m: ClientMeeting, now: Date = new Date()) {
  const start = new Date(m.scheduled_at);
  const started = start.getTime() <= now.getTime();
  // «اليوم أو قبله» بيوم الرياض: عميلٌ حضر قبل موعده بساعة يُسجَّل اجتماعه
  const dayReached = riyadhDayKey(start) <= riyadhDayKey(now);

  return {
    approve: m.status === 'pending' && !started,
    edit: isOpen(m),
    // «لم يحضر» قابلٌ للتصحيح إن حضر العميل متأخراً
    complete: (isOpen(m) || m.status === 'no_show') && dayReached,
    viewOutcome: m.status === 'completed',
    noShow: isOpen(m) && started,
    cancel: isOpen(m) && !started,
  };
}
