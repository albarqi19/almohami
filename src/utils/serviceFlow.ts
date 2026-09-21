import type { StatusFlowItem } from '../types/legalServices';

/**
 * مسار الخدمة كما يُعرض — لا كما يُخزَّن.
 *
 * الخادم يعيد **كل** حالات النوع في قائمة واحدة: المحطات الرئيسية ومعها الفروع («تعديل»،
 * «مرفوض»، «مرتجع»…) و«ملغاة». وكانت الواجهة ترسمها كلها خطاً واحداً، فيظهر:
 *  · «ملغاة» محطةً أخيرة في مسار كل خدمة،
 *  · و«تعديل» محطةً خضراء «منجزة» لعقدٍ اعتُمد دون أن يمرّ بها قط،
 *  · و«٣ من ٩» بينما المحطات الفعلية سبع.
 *
 * المسار الرئيسي يُشتق من الانتقالات نفسها: من أول حالة، نتبع في كل محطة **أول** انتقال
 * ليس إلغاءً ولم نزره (الانتقالات مرتّبة في الخادم: التقدّم أولاً ثم الرجوع). جُرّب على الأنواع
 * الثلاثة عشر فأعطى المسار المتوقع لكلٍّ منها.
 */

const CANCELLED = 'cancelled';

export function mainPath(flow: StatusFlowItem[]): StatusFlowItem[] {
  if (flow.length === 0) return [];
  const byStatus = new Map(flow.map((f) => [f.status, f]));
  const path: StatusFlowItem[] = [];
  const seen = new Set<string>();
  let current: StatusFlowItem | undefined = flow[0];
  while (current && !seen.has(current.status)) {
    path.push(current);
    seen.add(current.status);
    const next: string | undefined = current.transitions.find((t) => t !== CANCELLED && !seen.has(t));
    current = next ? byStatus.get(next) : undefined;
  }
  return path;
}

export interface FlowView {
  /** المحطات الرئيسية بالترتيب */
  path: StatusFlowItem[];
  /** موضع الخدمة على المسار (للفرع: المحطة التي تفرّع منها) — ‎-1 إن لم يُعرف */
  index: number;
  /** الحالة الحالية فرعٌ خارج المسار الرئيسي («تعديل»، «مرفوض»…) */
  branch: StatusFlowItem | null;
  cancelled: boolean;
  /**
   * الحالة ليست من حالات هذا النوع أصلاً (سجل قديم/مستورد كُتب بحالة عامة: «in_progress» على
   * خدمة صياغة عقود). الخادم يسمح حينها بإعادتها إلى أي محطة من مسار نوعها.
   */
  offFlow: boolean;
}

export function flowView(flow: StatusFlowItem[], status: string): FlowView {
  const path = mainPath(flow);
  const onPath = path.findIndex((f) => f.status === status);
  if (onPath >= 0) return { path, index: onPath, branch: null, cancelled: false, offFlow: false };

  if (status === CANCELLED) return { path, index: -1, branch: null, cancelled: true, offFlow: false };

  const branch = flow.find((f) => f.status === status) ?? null;
  if (!branch) return { path, index: -1, branch: null, cancelled: false, offFlow: flow.length > 0 };
  // الفرع يُعلَّق على المحطة الرئيسية التي تؤدي إليه
  const parent = path.findIndex((f) => f.transitions.includes(status));
  return { path, index: parent, branch, cancelled: false, offFlow: false };
}

export type TransitionKind = 'forward' | 'back' | 'branch' | 'cancel';

/** نوع الانتقال بالنسبة لموضع الخدمة: تقدّم على المسار، رجوع، فرع جانبي، أو إلغاء. */
export function transitionKind(view: FlowView, target: string): TransitionKind {
  if (target === CANCELLED) return 'cancel';
  const targetIndex = view.path.findIndex((f) => f.status === target);
  if (targetIndex < 0) return 'branch';
  // من فرعٍ: العودة إلى محطته أو ما قبلها رجوع، وما بعدها تقدّم
  if (view.branch) return targetIndex > view.index ? 'forward' : 'back';
  return targetIndex > view.index ? 'forward' : 'back';
}

/** ترتيب العرض: التقدّم أولاً، ثم الفروع، ثم الرجوع، والإلغاء آخراً. */
export function sortTransitions(view: FlowView, targets: string[]): string[] {
  const rank: Record<TransitionKind, number> = { forward: 0, branch: 1, back: 2, cancel: 3 };
  return [...targets].sort((a, b) => rank[transitionKind(view, a)] - rank[transitionKind(view, b)]);
}
