export type TextAnnotationSeverity = 'high' | 'medium' | 'low';

export interface TextAnnotation {
  id: string;
  original_text: string;
  suggested_text: string;
  reason?: string;
  severity?: TextAnnotationSeverity;
  legal_reference?: string;
  /** مؤشّر المادة المحقونة (أدوات المحامي v2) — يجعل المرجع شارة قابلة للنقر بدل نصّ. */
  citation_index?: number | null;
  /** هل المرجع مؤرَّض من مصدر حقيقي؟ (يُلوَّن § أخضر) أم اجتهادي (? برتقالي). */
  grounded?: boolean;
  /** لون التمييز في المحرّر (من المساعد المستندي/التدقيق). */
  color_code?: 'yellow' | 'red' | 'blue';
}
