import { createContext, useContext } from 'react';
import type { User } from '../../../services/UserService';
import type { ProjectEvent, ProjectFull, ProjectOverview } from '../../../types/projects';

/** مفاتيح صفحات الغرفة كما في التصوّر (ov, map, tasks, …) — تُحفظ في ?s= */
export type SectionKey = 'ov' | 'map' | 'tasks' | 'issues' | 'risks' | 'decisions' | 'deliv' | 'docs' | 'people' | 'events' | 'money' | 'client' | 'feed' | 'reports' | 'chat';

/** بنود قائمة «إجراء سريع» في الترويسة — كل بند يفتح نافذته في صفحته */
export type QuickAction = 'task' | 'phase' | 'upload' | 'person' | 'meeting' | 'decision' | 'decision_point' | 'issue' | 'risk' | 'client_update' | 'report' | 'link';

export interface RoomCtx {
  project: ProjectFull;
  overview: ProjectOverview | null;
  /** جلسات وأحكام ومراحل واجتماعات الارتباطات (تُقرأ تلقائياً) */
  events: ProjectEvent[];
  /** يعيد جلب المشروع والنظرة العامة والأحداث بعد أي تغيير */
  refresh: () => Promise<void>;
  users: User[];
  canEdit: boolean;
  canApprove: boolean;
  goTo: (section: SectionKey) => void;
  /** يفتح بطاقة المهمة داخل الغرفة */
  openTask: (taskId: number) => void;
  /** يذهب إلى صفحة المهمة الكاملة */
  openTaskPage: (taskId: number) => void;
  /** تصفية المهام على مرحلة (من شريط المراحل في الترويسة) */
  phaseFilter: number | null;
  setPhaseFilter: (id: number | null) => void;
  /** إجراء سريع ينتظر صفحته: الصفحة تستهلكه عند فتحها */
  pending: QuickAction | null;
  consumePending: (action: QuickAction) => boolean;
  /** يفتح محادثة المشروع بسؤال لرائد (يبدأ بـ@رائد) */
  askRaed: (question?: string) => void;
  /** يفتح نافذة نقطة القرار (السؤال والمسارات ومن يقرر) */
  openDecision: (pointId: number) => void;
  /** يفتح نموذج نقطة قرار يدوية: جديدة (بلا معرف) أو تعديل قائمة */
  openDecisionForm: (pointId?: number) => void;
  chatDraft: string;
  setChatDraft: (s: string) => void;
}

export const RoomContext = createContext<RoomCtx | null>(null);

export const useRoom = (): RoomCtx => {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom خارج غرفة المشروع');
  return ctx;
};
