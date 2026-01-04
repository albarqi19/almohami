export type TextAnnotationSeverity = 'high' | 'medium' | 'low';

export interface TextAnnotation {
  id: string;
  original_text: string;
  suggested_text: string;
  reason?: string;
  severity?: TextAnnotationSeverity;
  legal_reference?: string;
}
