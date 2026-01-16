import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Settings2,
  Loader2,
  Trash2,
} from 'lucide-react';
import { LetterheadService } from '../../services/letterheadService';
import type {
  Letterhead,
  LetterheadFormData,
  LogoPosition,
  PageNumberFormat,
} from '../../types/letterhead';
import { DEFAULT_LETTERHEAD } from '../../types/letterhead';

interface LetterheadFormProps {
  letterhead: Letterhead | null;
  onClose: () => void;
  onSave: () => void;
}

const LetterheadForm: React.FC<LetterheadFormProps> = ({
  letterhead,
  onClose,
  onSave,
}) => {
  const isEditing = !!letterhead;
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'header' | 'footer' | 'margins'>('general');

  // Form state
  const [formData, setFormData] = useState<LetterheadFormData>({
    name: letterhead?.name || '',
    type: letterhead?.type || 'dynamic',
    is_default: letterhead?.is_default || false,
    is_active: letterhead?.is_active ?? true,
    // Image-based
    header_image_url: letterhead?.header_image_url || null,
    footer_image_url: letterhead?.footer_image_url || null,
    header_height_mm: letterhead?.header_height_mm || DEFAULT_LETTERHEAD.header_height_mm,
    footer_height_mm: letterhead?.footer_height_mm || DEFAULT_LETTERHEAD.footer_height_mm,
    // Dynamic - Header
    logo_url: letterhead?.logo_url || null,
    logo_position: letterhead?.logo_position || 'right',
    logo_width_px: letterhead?.logo_width_px || DEFAULT_LETTERHEAD.logo_width_px,
    company_name: letterhead?.company_name || null,
    company_name_en: letterhead?.company_name_en || null,
    header_text: letterhead?.header_text || null,
    show_border_bottom: letterhead?.show_border_bottom ?? DEFAULT_LETTERHEAD.show_border_bottom,
    border_color: letterhead?.border_color || DEFAULT_LETTERHEAD.border_color,
    // Dynamic - Footer
    footer_text: letterhead?.footer_text || null,
    footer_phone: letterhead?.footer_phone || null,
    footer_email: letterhead?.footer_email || null,
    footer_website: letterhead?.footer_website || null,
    footer_address: letterhead?.footer_address || null,
    show_page_numbers: letterhead?.show_page_numbers ?? DEFAULT_LETTERHEAD.show_page_numbers,
    page_number_format: letterhead?.page_number_format || 'arabic',
    // Colors
    primary_color: letterhead?.primary_color || DEFAULT_LETTERHEAD.primary_color,
    secondary_color: letterhead?.secondary_color || DEFAULT_LETTERHEAD.secondary_color,
    text_color: letterhead?.text_color || DEFAULT_LETTERHEAD.text_color,
    // Margins
    margin_top_mm: letterhead?.margin_top_mm || DEFAULT_LETTERHEAD.margin_top_mm,
    margin_bottom_mm: letterhead?.margin_bottom_mm || DEFAULT_LETTERHEAD.margin_bottom_mm,
    margin_right_mm: letterhead?.margin_right_mm || DEFAULT_LETTERHEAD.margin_right_mm,
    margin_left_mm: letterhead?.margin_left_mm || DEFAULT_LETTERHEAD.margin_left_mm,
  });

  // File input refs
  const headerImageRef = useRef<HTMLInputElement>(null);
  const footerImageRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  // Handle image upload
  const handleImageUpload = async (
    file: File,
    type: 'header' | 'footer' | 'logo'
  ) => {
    try {
      setUploadingImage(type);
      const response = await LetterheadService.uploadImage(file, type);
      if (response.success) {
        const fieldMap = {
          header: 'header_image_url',
          footer: 'footer_image_url',
          logo: 'logo_url',
        };
        setFormData((prev) => ({
          ...prev,
          [fieldMap[type]]: response.data.url,
        }));
      }
    } catch (err) {
      console.error(err);
      alert('فشل في رفع الصورة');
    } finally {
      setUploadingImage(null);
    }
  };

  // Handle save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('يرجى إدخال اسم الكليشة');
      return;
    }

    try {
      setSaving(true);
      let response;

      if (isEditing && letterhead) {
        response = await LetterheadService.update(letterhead.id, formData);
      } else {
        response = await LetterheadService.create(formData);
      }

      if (response.success) {
        onSave();
      } else {
        alert('فشل في حفظ الكليشة');
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'فشل في حفظ الكليشة');
    } finally {
      setSaving(false);
    }
  };

  const ImageUploadField: React.FC<{
    label: string;
    value: string | null | undefined;
    type: 'header' | 'footer' | 'logo';
    inputRef: React.RefObject<HTMLInputElement>;
    onClear: () => void;
    hint?: string;
  }> = ({ label, value, type, inputRef, onClear, hint }) => (
    <div className="letterhead-field">
      <label className="letterhead-field__label">{label}</label>
      {value ? (
        <div className="letterhead-image-preview">
          <img src={value} alt={label} className="letterhead-image-preview__img" />
          <button
            type="button"
            onClick={onClear}
            className="letterhead-image-preview__remove"
          >
            <Trash2 />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className={`letterhead-upload ${uploadingImage === type ? 'letterhead-upload--loading' : ''}`}
        >
          {uploadingImage === type ? (
            <Loader2 className="letterhead-upload__icon animate-spin" />
          ) : (
            <>
              <Upload className="letterhead-upload__icon" />
              <p className="letterhead-upload__text">اضغط لرفع صورة</p>
              {hint && <p className="letterhead-upload__hint">{hint}</p>}
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file, type);
        }}
      />
    </div>
  );

  return (
    <div className="letterhead-modal-overlay">
      <div className="letterhead-modal">
        {/* Header */}
        <div className="letterhead-modal__header">
          <div>
            <h2 className="letterhead-modal__title">
              {isEditing ? 'تعديل الكليشة' : 'إضافة كليشة جديدة'}
            </h2>
          </div>
          <button onClick={onClose} className="letterhead-modal__close">
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Type Selection */}
          <div className="letterhead-type-selection">
            <div className="letterhead-type-selection__label">نوع الكليشة</div>
            <div className="letterhead-type-options">
              <label
                className={`letterhead-type-option ${formData.type === 'dynamic' ? 'letterhead-type-option--active' : ''}`}
              >
                <input
                  type="radio"
                  name="type"
                  value="dynamic"
                  checked={formData.type === 'dynamic'}
                  onChange={() => setFormData((prev) => ({ ...prev, type: 'dynamic' }))}
                  style={{ display: 'none' }}
                />
                <Settings2 className="letterhead-type-option__icon" />
                <div>
                  <div className="letterhead-type-option__title">ديناميكية</div>
                  <div className="letterhead-type-option__desc">بناء من بيانات الشركة</div>
                </div>
              </label>
              <label
                className={`letterhead-type-option ${formData.type === 'image' ? 'letterhead-type-option--active' : ''}`}
              >
                <input
                  type="radio"
                  name="type"
                  value="image"
                  checked={formData.type === 'image'}
                  onChange={() => setFormData((prev) => ({ ...prev, type: 'image' }))}
                  style={{ display: 'none' }}
                />
                <ImageIcon className="letterhead-type-option__icon" />
                <div>
                  <div className="letterhead-type-option__title">صورية</div>
                  <div className="letterhead-type-option__desc">رفع صور جاهزة</div>
                </div>
              </label>
            </div>
          </div>

          {/* Tabs */}
          <div className="letterhead-tabs">
            {(['general', 'header', 'footer', 'margins'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`letterhead-tab ${activeTab === tab ? 'letterhead-tab--active' : ''}`}
              >
                {tab === 'general' && 'عام'}
                {tab === 'header' && 'الرأس'}
                {tab === 'footer' && 'التذييل'}
                {tab === 'margins' && 'الهوامش'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="letterhead-form-content">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="letterhead-form-section">
                <div className="letterhead-field">
                  <label className="letterhead-field__label letterhead-field__label--required">
                    اسم الكليشة
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="مثال: كليشة العقود الرسمية"
                    className="letterhead-field__input"
                    required
                  />
                </div>

                <div className="letterhead-checkbox-group" style={{ marginTop: 16 }}>
                  <label className="letterhead-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={(e) => setFormData((prev) => ({ ...prev, is_default: e.target.checked }))}
                    />
                    <span className="letterhead-checkbox__label">كليشة افتراضية</span>
                  </label>
                  <label className="letterhead-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                    />
                    <span className="letterhead-checkbox__label">مفعلة</span>
                  </label>
                </div>

                {/* Colors */}
                <div className="letterhead-form-grid--3" style={{ marginTop: 20 }}>
                  <div className="letterhead-field">
                    <label className="letterhead-field__label">اللون الأساسي</label>
                    <div className="letterhead-color-picker">
                      <input
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, primary_color: e.target.value }))}
                        className="letterhead-color-picker__input"
                      />
                      <input
                        type="text"
                        value={formData.primary_color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, primary_color: e.target.value }))}
                        className="letterhead-color-picker__text"
                      />
                    </div>
                  </div>
                  <div className="letterhead-field">
                    <label className="letterhead-field__label">اللون الثانوي</label>
                    <div className="letterhead-color-picker">
                      <input
                        type="color"
                        value={formData.secondary_color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, secondary_color: e.target.value }))}
                        className="letterhead-color-picker__input"
                      />
                      <input
                        type="text"
                        value={formData.secondary_color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, secondary_color: e.target.value }))}
                        className="letterhead-color-picker__text"
                      />
                    </div>
                  </div>
                  <div className="letterhead-field">
                    <label className="letterhead-field__label">لون النص</label>
                    <div className="letterhead-color-picker">
                      <input
                        type="color"
                        value={formData.text_color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, text_color: e.target.value }))}
                        className="letterhead-color-picker__input"
                      />
                      <input
                        type="text"
                        value={formData.text_color}
                        onChange={(e) => setFormData((prev) => ({ ...prev, text_color: e.target.value }))}
                        className="letterhead-color-picker__text"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Header Tab */}
            {activeTab === 'header' && (
              <div className="letterhead-form-section">
                {formData.type === 'image' ? (
                  <>
                    <ImageUploadField
                      label="صورة الرأس"
                      value={formData.header_image_url}
                      type="header"
                      inputRef={headerImageRef}
                      onClear={() => setFormData((prev) => ({ ...prev, header_image_url: null }))}
                      hint="الأبعاد المثالية: 2480 × 400 بكسل (A4 @ 300dpi)"
                    />
                    <div className="letterhead-field" style={{ marginTop: 16 }}>
                      <label className="letterhead-field__label">ارتفاع الرأس (مم)</label>
                      <input
                        type="number"
                        min={10}
                        max={100}
                        value={formData.header_height_mm}
                        onChange={(e) => setFormData((prev) => ({ ...prev, header_height_mm: Number(e.target.value) }))}
                        className="letterhead-field__input"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <ImageUploadField
                      label="الشعار"
                      value={formData.logo_url}
                      type="logo"
                      inputRef={logoRef}
                      onClear={() => setFormData((prev) => ({ ...prev, logo_url: null }))}
                      hint="PNG بخلفية شفافة"
                    />

                    <div className="letterhead-form-grid" style={{ marginTop: 16 }}>
                      <div className="letterhead-field">
                        <label className="letterhead-field__label">موضع الشعار</label>
                        <select
                          value={formData.logo_position}
                          onChange={(e) => setFormData((prev) => ({ ...prev, logo_position: e.target.value as LogoPosition }))}
                          className="letterhead-field__select"
                        >
                          <option value="right">يمين</option>
                          <option value="center">وسط</option>
                          <option value="left">يسار</option>
                        </select>
                      </div>
                      <div className="letterhead-field">
                        <label className="letterhead-field__label">عرض الشعار (بكسل)</label>
                        <input
                          type="number"
                          min={20}
                          max={300}
                          value={formData.logo_width_px}
                          onChange={(e) => setFormData((prev) => ({ ...prev, logo_width_px: Number(e.target.value) }))}
                          className="letterhead-field__input"
                        />
                      </div>
                    </div>

                    <div className="letterhead-field" style={{ marginTop: 16 }}>
                      <label className="letterhead-field__label">اسم الشركة (عربي)</label>
                      <input
                        type="text"
                        value={formData.company_name || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, company_name: e.target.value || null }))}
                        placeholder="مكتب المحاماة"
                        className="letterhead-field__input"
                      />
                    </div>

                    <div className="letterhead-field" style={{ marginTop: 16 }}>
                      <label className="letterhead-field__label">اسم الشركة (إنجليزي)</label>
                      <input
                        type="text"
                        value={formData.company_name_en || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, company_name_en: e.target.value || null }))}
                        placeholder="Law Firm"
                        className="letterhead-field__input"
                      />
                    </div>

                    <div className="letterhead-field" style={{ marginTop: 16 }}>
                      <label className="letterhead-field__label">نص إضافي (ترخيص، سجل تجاري)</label>
                      <textarea
                        value={formData.header_text || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, header_text: e.target.value || null }))}
                        placeholder="رقم الترخيص: 123456&#10;السجل التجاري: 789012"
                        rows={3}
                        className="letterhead-field__textarea"
                      />
                    </div>

                    <div className="letterhead-checkbox-group" style={{ marginTop: 16 }}>
                      <label className="letterhead-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.show_border_bottom}
                          onChange={(e) => setFormData((prev) => ({ ...prev, show_border_bottom: e.target.checked }))}
                        />
                        <span className="letterhead-checkbox__label">إظهار خط فاصل</span>
                      </label>
                      {formData.show_border_bottom && (
                        <div className="letterhead-color-picker" style={{ marginRight: 16 }}>
                          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>اللون:</span>
                          <input
                            type="color"
                            value={formData.border_color}
                            onChange={(e) => setFormData((prev) => ({ ...prev, border_color: e.target.value }))}
                            className="letterhead-color-picker__input"
                            style={{ width: 32, height: 32 }}
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Footer Tab */}
            {activeTab === 'footer' && (
              <div className="letterhead-form-section">
                {formData.type === 'image' ? (
                  <>
                    <ImageUploadField
                      label="صورة التذييل"
                      value={formData.footer_image_url}
                      type="footer"
                      inputRef={footerImageRef}
                      onClear={() => setFormData((prev) => ({ ...prev, footer_image_url: null }))}
                      hint="الأبعاد المثالية: 2480 × 300 بكسل"
                    />
                    <div className="letterhead-field" style={{ marginTop: 16 }}>
                      <label className="letterhead-field__label">ارتفاع التذييل (مم)</label>
                      <input
                        type="number"
                        min={10}
                        max={100}
                        value={formData.footer_height_mm}
                        onChange={(e) => setFormData((prev) => ({ ...prev, footer_height_mm: Number(e.target.value) }))}
                        className="letterhead-field__input"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="letterhead-form-grid">
                      <div className="letterhead-field">
                        <label className="letterhead-field__label">الهاتف</label>
                        <input
                          type="text"
                          value={formData.footer_phone || ''}
                          onChange={(e) => setFormData((prev) => ({ ...prev, footer_phone: e.target.value || null }))}
                          placeholder="+966 50 123 4567"
                          className="letterhead-field__input"
                        />
                      </div>
                      <div className="letterhead-field">
                        <label className="letterhead-field__label">البريد الإلكتروني</label>
                        <input
                          type="email"
                          value={formData.footer_email || ''}
                          onChange={(e) => setFormData((prev) => ({ ...prev, footer_email: e.target.value || null }))}
                          placeholder="info@lawfirm.com"
                          className="letterhead-field__input"
                        />
                      </div>
                    </div>

                    <div className="letterhead-field" style={{ marginTop: 16 }}>
                      <label className="letterhead-field__label">الموقع الإلكتروني</label>
                      <input
                        type="text"
                        value={formData.footer_website || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, footer_website: e.target.value || null }))}
                        placeholder="www.lawfirm.com"
                        className="letterhead-field__input"
                      />
                    </div>

                    <div className="letterhead-field" style={{ marginTop: 16 }}>
                      <label className="letterhead-field__label">العنوان</label>
                      <input
                        type="text"
                        value={formData.footer_address || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, footer_address: e.target.value || null }))}
                        placeholder="الرياض - حي الملقا - شارع..."
                        className="letterhead-field__input"
                      />
                    </div>

                    <div className="letterhead-field" style={{ marginTop: 16 }}>
                      <label className="letterhead-field__label">نص إضافي</label>
                      <textarea
                        value={formData.footer_text || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, footer_text: e.target.value || null }))}
                        placeholder="نص إضافي يظهر في التذييل"
                        rows={2}
                        className="letterhead-field__textarea"
                      />
                    </div>
                  </>
                )}

                {/* Page Numbers */}
                <div className="letterhead-separator">
                  <label className="letterhead-checkbox" style={{ marginBottom: 12 }}>
                    <input
                      type="checkbox"
                      checked={formData.show_page_numbers}
                      onChange={(e) => setFormData((prev) => ({ ...prev, show_page_numbers: e.target.checked }))}
                    />
                    <span className="letterhead-checkbox__label" style={{ fontWeight: 500 }}>
                      إظهار ترقيم الصفحات
                    </span>
                  </label>
                  {formData.show_page_numbers && (
                    <div className="letterhead-field">
                      <label className="letterhead-field__label">صيغة الترقيم</label>
                      <select
                        value={formData.page_number_format}
                        onChange={(e) => setFormData((prev) => ({ ...prev, page_number_format: e.target.value as PageNumberFormat }))}
                        className="letterhead-field__select"
                      >
                        <option value="arabic">صفحة 1 من 5</option>
                        <option value="english">Page 1 of 5</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Margins Tab */}
            {activeTab === 'margins' && (
              <div className="letterhead-form-section">
                <p className="letterhead-helper">
                  حدد هوامش الطباعة بالمليمتر. مقاس الصفحة A4 (210 × 297 مم)
                </p>
                <div className="letterhead-form-grid">
                  <div className="letterhead-field">
                    <label className="letterhead-field__label">الهامش العلوي (مم)</label>
                    <input
                      type="number"
                      min={5}
                      max={50}
                      value={formData.margin_top_mm}
                      onChange={(e) => setFormData((prev) => ({ ...prev, margin_top_mm: Number(e.target.value) }))}
                      className="letterhead-field__input"
                    />
                  </div>
                  <div className="letterhead-field">
                    <label className="letterhead-field__label">الهامش السفلي (مم)</label>
                    <input
                      type="number"
                      min={5}
                      max={50}
                      value={formData.margin_bottom_mm}
                      onChange={(e) => setFormData((prev) => ({ ...prev, margin_bottom_mm: Number(e.target.value) }))}
                      className="letterhead-field__input"
                    />
                  </div>
                  <div className="letterhead-field">
                    <label className="letterhead-field__label">الهامش الأيمن (مم)</label>
                    <input
                      type="number"
                      min={5}
                      max={50}
                      value={formData.margin_right_mm}
                      onChange={(e) => setFormData((prev) => ({ ...prev, margin_right_mm: Number(e.target.value) }))}
                      className="letterhead-field__input"
                    />
                  </div>
                  <div className="letterhead-field">
                    <label className="letterhead-field__label">الهامش الأيسر (مم)</label>
                    <input
                      type="number"
                      min={5}
                      max={50}
                      value={formData.margin_left_mm}
                      onChange={(e) => setFormData((prev) => ({ ...prev, margin_left_mm: Number(e.target.value) }))}
                      className="letterhead-field__input"
                    />
                  </div>
                </div>

                {/* Visual Preview */}
                <div className="letterhead-margin-preview">
                  <div className="letterhead-margin-preview__page">
                    <div
                      className="letterhead-margin-preview__content"
                      style={{
                        top: `${(formData.margin_top_mm! / 297) * 100}%`,
                        bottom: `${(formData.margin_bottom_mm! / 297) * 100}%`,
                        left: `${(formData.margin_left_mm! / 210) * 100}%`,
                        right: `${(formData.margin_right_mm! / 210) * 100}%`,
                      }}
                    />
                    <span className="letterhead-margin-preview__label">المحتوى</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="letterhead-modal__footer">
          <button type="button" onClick={onClose} className="letterhead-btn">
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="letterhead-btn letterhead-btn--primary"
          >
            {saving && <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />}
            {isEditing ? 'حفظ التغييرات' : 'إنشاء الكليشة'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LetterheadForm;
