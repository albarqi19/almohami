import { apiClient } from '../utils/api';
import type { MeetingColor } from './meetingService';

/** المصادر الستة التي تشغل وقت الموظف — مطابقة لـMyDayService::SOURCES */
export type AgendaSource =
  | 'session'
  | 'deadline'
  | 'task'
  | 'meeting'
  | 'client_meeting'
  | 'personal';

export interface AgendaItem {
  /** `source:id` — فريد عبر المصادر، صالح كـkey في React */
  key: string;
  source: AgendaSource;
  source_label: string;
  id: number;
  title: string;
  subtitle: string;
  /** مفتاح يوم الرياض «YYYY-MM-DD» — محسوب في الخادم لا في المتصفّح */
  day: string;
  /** ISO أو null. **null = بلا وقت محدّد** لا «منتصف الليل» */
  at: string | null;
  end_at: string | null;
  /** نصّ الوقت الخام — للجلسات وحدها (عربي غير قابل للفرز) */
  time_text: string | null;
  status: string;
  is_done: boolean;
  color: MeetingColor;
  /** رابط عميق إلى الصفحة الحقيقية للبند */
  url: string;
  extra: Record<string, unknown>;
}

interface MyDayResponse {
  success: boolean;
  data: AgendaItem[];
  /** المصادر التي بلغت السقف — تُعرض للمستخدم ولا تُخفى */
  truncated: AgendaSource[];
  meta: {
    from: string;
    to: string;
    sources: AgendaSource[];
    labels: Record<AgendaSource, string>;
    colors: Record<AgendaSource, MeetingColor>;
  };
}

export interface MyDayResult {
  items: AgendaItem[];
  truncated: AgendaSource[];
}

/**
 * ترتيب عرض المصادر في المفتاح — من الأكثر إلزاماً إلى الأقلّ.
 * الجلسة موعد قضائي لا يُؤجَّل، والشخصي يخصّني وحدي.
 */
export const AGENDA_SOURCES: { key: AgendaSource; label: string; color: MeetingColor }[] = [
  { key: 'session', label: 'الجلسات', color: 'red' },
  { key: 'deadline', label: 'المهل', color: 'orange' },
  { key: 'meeting', label: 'الاجتماعات', color: 'navy' },
  { key: 'client_meeting', label: 'مواعيد العملاء', color: 'gold' },
  { key: 'task', label: 'المهام', color: 'blue' },
  { key: 'personal', label: 'شخصي', color: 'purple' },
];

export const myDayService = {
  async range(from: string, to: string, sources?: AgendaSource[]): Promise<MyDayResult> {
    const params = new URLSearchParams({ from, to });
    // مصدر واحد مستبعَد يعني إرسال الباقي صراحةً — أرخص من جلب الكل وترشيحه
    sources?.forEach(s => params.append('sources[]', s));

    const response = await apiClient.get<MyDayResponse>(`/my-day?${params.toString()}`);

    return {
      items: response.data ?? [],
      truncated: response.truncated ?? [],
    };
  },
};

export default myDayService;
