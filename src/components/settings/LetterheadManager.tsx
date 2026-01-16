import React, { useState, useEffect } from 'react';
import {
  Plus,
  FileText,
  Star,
  Trash2,
  Edit,
  Copy,
  Eye,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Settings2,
} from 'lucide-react';
import { LetterheadService } from '../../services/letterheadService';
import type { Letterhead } from '../../types/letterhead';
import LetterheadForm from './LetterheadForm';
import LetterheadPreview from './LetterheadPreview';

const LetterheadManager: React.FC = () => {
  const [letterheads, setLetterheads] = useState<Letterhead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLetterhead, setEditingLetterhead] = useState<Letterhead | null>(null);
  const [previewLetterhead, setPreviewLetterhead] = useState<Letterhead | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Load letterheads
  const loadLetterheads = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await LetterheadService.getAll();
      if (response.success) {
        setLetterheads(response.data);
      }
    } catch (err) {
      setError('فشل في تحميل الكليشات');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLetterheads();
  }, []);

  // Handle create/update
  const handleSave = async () => {
    await loadLetterheads();
    setShowForm(false);
    setEditingLetterhead(null);
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذه الكليشة؟')) return;

    try {
      setDeletingId(id);
      const response = await LetterheadService.delete(id);
      if (response.success) {
        await loadLetterheads();
      } else {
        alert(response.message || 'فشل في حذف الكليشة');
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'فشل في حذف الكليشة');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle set default
  const handleSetDefault = async (id: number) => {
    try {
      const response = await LetterheadService.setDefault(id);
      if (response.success) {
        await loadLetterheads();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle duplicate
  const handleDuplicate = async (id: number) => {
    try {
      const response = await LetterheadService.duplicate(id);
      if (response.success) {
        await loadLetterheads();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="letterhead-loading">
        <Loader2 className="letterhead-loading__spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="letterhead-error">
        <AlertCircle />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-heading)' }}>
            الكليشات
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            إدارة كليشات الطباعة للعقود والفواتير
          </p>
        </div>
        <button
          onClick={() => {
            setEditingLetterhead(null);
            setShowForm(true);
          }}
          className="letterhead-btn letterhead-btn--primary"
        >
          <Plus />
          إضافة كليشة
        </button>
      </div>

      {/* Letterheads Grid */}
      {letterheads.length === 0 ? (
        <div className="letterhead-empty">
          <FileText className="letterhead-empty__icon" />
          <h3 className="letterhead-empty__title">لا توجد كليشات</h3>
          <p className="letterhead-empty__desc">
            أنشئ كليشة جديدة لاستخدامها في طباعة العقود والفواتير
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="letterhead-btn letterhead-btn--primary"
          >
            <Plus />
            إنشاء كليشة
          </button>
        </div>
      ) : (
        <div className="letterhead-grid">
          {letterheads.map((letterhead) => (
            <div
              key={letterhead.id}
              className={`letterhead-card ${
                letterhead.is_default ? 'letterhead-card--default' : ''
              } ${!letterhead.is_active ? 'letterhead-card--inactive' : ''}`}
            >
              {/* Default Badge */}
              {letterhead.is_default && (
                <div className="letterhead-card__badge">
                  <Star />
                  افتراضية
                </div>
              )}

              {/* Type Badges */}
              <div className="flex items-center gap-2">
                {letterhead.type === 'image' ? (
                  <span className="letterhead-type-badge letterhead-type-badge--image">
                    <ImageIcon style={{ width: 12, height: 12 }} />
                    صورية
                  </span>
                ) : (
                  <span className="letterhead-type-badge letterhead-type-badge--dynamic">
                    <Settings2 style={{ width: 12, height: 12 }} />
                    ديناميكية
                  </span>
                )}
                {!letterhead.is_active && (
                  <span className="letterhead-type-badge letterhead-type-badge--inactive">
                    غير مفعلة
                  </span>
                )}
              </div>

              {/* Name */}
              <h3 className="letterhead-card__name">{letterhead.name}</h3>

              {/* Preview Info */}
              <div className="letterhead-card__info">
                {letterhead.type === 'dynamic' && letterhead.company_name && (
                  <p>الشركة: {letterhead.company_name}</p>
                )}
                <p>
                  الهوامش: {letterhead.margin_top_mm}/{letterhead.margin_bottom_mm}/
                  {letterhead.margin_right_mm}/{letterhead.margin_left_mm} مم
                </p>
              </div>

              {/* Actions */}
              <div className="letterhead-card__actions">
                <button
                  onClick={() => setPreviewLetterhead(letterhead)}
                  className="letterhead-action-btn letterhead-action-btn--view"
                  title="معاينة"
                >
                  <Eye />
                </button>
                <button
                  onClick={() => {
                    setEditingLetterhead(letterhead);
                    setShowForm(true);
                  }}
                  className="letterhead-action-btn letterhead-action-btn--edit"
                  title="تعديل"
                >
                  <Edit />
                </button>
                <button
                  onClick={() => handleDuplicate(letterhead.id)}
                  className="letterhead-action-btn letterhead-action-btn--copy"
                  title="تكرار"
                >
                  <Copy />
                </button>
                {!letterhead.is_default && (
                  <button
                    onClick={() => handleSetDefault(letterhead.id)}
                    className="letterhead-action-btn letterhead-action-btn--default"
                    title="تعيين كافتراضية"
                  >
                    <Star />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(letterhead.id)}
                  disabled={deletingId === letterhead.id}
                  className="letterhead-action-btn letterhead-action-btn--delete"
                  title="حذف"
                >
                  {deletingId === letterhead.id ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Trash2 />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <LetterheadForm
          letterhead={editingLetterhead}
          onClose={() => {
            setShowForm(false);
            setEditingLetterhead(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* Preview Modal */}
      {previewLetterhead && (
        <LetterheadPreview
          letterhead={previewLetterhead}
          onClose={() => setPreviewLetterhead(null)}
        />
      )}
    </div>
  );
};

export default LetterheadManager;
