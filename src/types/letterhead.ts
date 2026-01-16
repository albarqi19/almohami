/**
 * Letterhead Types
 * نظام الكليشات
 */

export type LetterheadType = 'image' | 'dynamic';
export type LogoPosition = 'right' | 'center' | 'left';
export type PageNumberFormat = 'arabic' | 'english';

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
};
