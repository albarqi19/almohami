/**
 * Letterhead Types
 * نظام الكليشات
 */

export type LetterheadType = 'image' | 'dynamic';
export type LogoPosition = 'right' | 'center' | 'left';
export type PageNumberFormat = 'arabic' | 'english';

// Watermark Types
export type WatermarkType = 'text' | 'image';
export type WatermarkPosition = 'center' | 'top' | 'bottom' | 'repeat';
export type WatermarkRotation = 0 | -45 | 45 | 90;

// Watermark Presets
export interface WatermarkPreset {
  id: string;
  label: string;
  text: string;
  rotation: WatermarkRotation;
  opacity: number;
  position: WatermarkPosition;
}

export const WATERMARK_PRESETS: WatermarkPreset[] = [
  { id: 'secret', label: 'سري', text: 'سري', rotation: -45, opacity: 10, position: 'center' },
  { id: 'draft', label: 'مسودة', text: 'مسودة', rotation: -45, opacity: 15, position: 'center' },
  { id: 'copy', label: 'نسخة', text: 'نسخة', rotation: 0, opacity: 20, position: 'center' },
  { id: 'review', label: 'للمراجعة', text: 'للمراجعة الداخلية فقط', rotation: -45, opacity: 12, position: 'center' },
  { id: 'top_secret', label: 'سري للغاية', text: 'سري للغاية', rotation: -45, opacity: 8, position: 'repeat' },
];

export interface Letterhead {
  id: number;
  tenant_id: number;
  name: string;
  is_default: boolean;
  is_active: boolean;
  type: LetterheadType;

  // Image-based mode
  header_image_url: string | null;
  footer_image_url: string | null;
  header_height_mm: number;
  footer_height_mm: number;

  // Dynamic mode - Header
  logo_url: string | null;
  logo_position: LogoPosition;
  logo_width_px: number;
  company_name: string | null;
  company_name_en: string | null;
  header_text: string | null;
  show_border_bottom: boolean;
  border_color: string;

  // Dynamic mode - Footer
  footer_text: string | null;
  footer_phone: string | null;
  footer_email: string | null;
  footer_website: string | null;
  footer_address: string | null;
  show_page_numbers: boolean;
  page_number_format: PageNumberFormat;

  // Colors
  primary_color: string;
  secondary_color: string;
  text_color: string;

  // Margins (in mm)
  margin_top_mm: number;
  margin_bottom_mm: number;
  margin_right_mm: number;
  margin_left_mm: number;

  // Watermark - Primary
  watermark_enabled: boolean;
  watermark_type: WatermarkType;
  watermark_text: string | null;
  watermark_font_family: string;
  watermark_font_size: number;
  watermark_text_color: string;
  watermark_image_url: string | null;
  watermark_opacity: number;
  watermark_size: number;
  watermark_rotation: WatermarkRotation;
  watermark_position: WatermarkPosition;
  watermark_repeat_gap: number;
  watermark_use_lawyer_name: boolean;

  // Watermark - Secondary
  watermark_secondary_enabled: boolean;
  watermark_secondary_type: WatermarkType;
  watermark_secondary_text: string | null;
  watermark_secondary_image_url: string | null;
  watermark_secondary_opacity: number;
  watermark_secondary_size: number;
  watermark_secondary_rotation: WatermarkRotation;
  watermark_secondary_position: 'center' | 'top' | 'bottom';

  // Watermark - Document Types
  watermark_apply_to_contracts: boolean;
  watermark_apply_to_memos: boolean;
  watermark_apply_to_letters: boolean;

  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface LetterheadFormData {
  name: string;
  type: LetterheadType;
  is_default?: boolean;
  is_active?: boolean;

  // Image-based mode
  header_image_url?: string | null;
  footer_image_url?: string | null;
  header_height_mm?: number;
  footer_height_mm?: number;

  // Dynamic mode - Header
  logo_url?: string | null;
  logo_position?: LogoPosition;
  logo_width_px?: number;
  company_name?: string | null;
  company_name_en?: string | null;
  header_text?: string | null;
  show_border_bottom?: boolean;
  border_color?: string;

  // Dynamic mode - Footer
  footer_text?: string | null;
  footer_phone?: string | null;
  footer_email?: string | null;
  footer_website?: string | null;
  footer_address?: string | null;
  show_page_numbers?: boolean;
  page_number_format?: PageNumberFormat;

  // Colors
  primary_color?: string;
  secondary_color?: string;
  text_color?: string;

  // Margins
  margin_top_mm?: number;
  margin_bottom_mm?: number;
  margin_right_mm?: number;
  margin_left_mm?: number;

  // Watermark - Primary
  watermark_enabled?: boolean;
  watermark_type?: WatermarkType;
  watermark_text?: string | null;
  watermark_font_family?: string;
  watermark_font_size?: number;
  watermark_text_color?: string;
  watermark_image_url?: string | null;
  watermark_opacity?: number;
  watermark_size?: number;
  watermark_rotation?: WatermarkRotation;
  watermark_position?: WatermarkPosition;
  watermark_repeat_gap?: number;
  watermark_use_lawyer_name?: boolean;

  // Watermark - Secondary
  watermark_secondary_enabled?: boolean;
  watermark_secondary_type?: WatermarkType;
  watermark_secondary_text?: string | null;
  watermark_secondary_image_url?: string | null;
  watermark_secondary_opacity?: number;
  watermark_secondary_size?: number;
  watermark_secondary_rotation?: WatermarkRotation;
  watermark_secondary_position?: 'center' | 'top' | 'bottom';

  // Watermark - Document Types
  watermark_apply_to_contracts?: boolean;
  watermark_apply_to_memos?: boolean;
  watermark_apply_to_letters?: boolean;
}

export interface LetterheadResponse {
  success: boolean;
  data: Letterhead;
  message?: string;
  is_fallback?: boolean;
}

export interface LetterheadListResponse {
  success: boolean;
  data: Letterhead[];
}

export interface ImageUploadResponse {
  success: boolean;
  message?: string;
  data: {
    url: string;
    path: string;
  };
}

// Default values for new letterhead
export const DEFAULT_LETTERHEAD: Partial<LetterheadFormData> = {
  name: '',
  type: 'dynamic',
  is_default: false,
  is_active: true,
  logo_position: 'right',
  logo_width_px: 80,
  show_border_bottom: true,
  border_color: '#C5A059',
  show_page_numbers: true,
  page_number_format: 'arabic',
  primary_color: '#C5A059',
  secondary_color: '#1a1a1a',
  text_color: '#333333',
  header_height_mm: 30,
  footer_height_mm: 25,
  margin_top_mm: 25,
  margin_bottom_mm: 20,
  margin_right_mm: 20,
  margin_left_mm: 20,
  // Watermark defaults
  watermark_enabled: false,
  watermark_type: 'text',
  watermark_text: null,
  watermark_font_family: 'Traditional Arabic',
  watermark_font_size: 48,
  watermark_text_color: '#000000',
  watermark_image_url: null,
  watermark_opacity: 15,
  watermark_size: 100,
  watermark_rotation: -45,
  watermark_position: 'center',
  watermark_repeat_gap: 100,
  watermark_use_lawyer_name: false,
  // Secondary watermark defaults
  watermark_secondary_enabled: false,
  watermark_secondary_type: 'text',
  watermark_secondary_text: null,
  watermark_secondary_image_url: null,
  watermark_secondary_opacity: 10,
  watermark_secondary_size: 80,
  watermark_secondary_rotation: 0,
  watermark_secondary_position: 'top',
  // Document types defaults
  watermark_apply_to_contracts: true,
  watermark_apply_to_memos: true,
  watermark_apply_to_letters: false,
};
