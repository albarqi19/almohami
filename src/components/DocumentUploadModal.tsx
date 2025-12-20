import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import type { Case } from '../types';
import { DocumentService } from '../services/documentService';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  cases: Case[];
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  cases
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [caseId, setCaseId] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: 'contract', label: 'عقد' },
    { value: 'evidence', label: 'دليل' },
    { value: 'pleading', label: 'مذكرة' },
    { value: 'correspondence', label: 'مراسلات' },
    { value: 'report', label: 'تقرير' },
    { value: 'judgment', label: 'حكم' },
    { value: 'other', label: 'أخرى' },
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('يرجى اختيار ملف');
      return;
    }

    if (!title.trim()) {
      setError('يرجى إدخال عنوان الوثيقة');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      
      const documentData = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        case_id: caseId || undefined,
        file: selectedFile,
        is_confidential: isConfidential,
        tags: tagArray.length > 0 ? tagArray : undefined
      };
      
      console.log('Uploading document with data:', {
        ...documentData,
        file: selectedFile.name // Don't log the file object itself
      });
      
      await DocumentService.uploadDocument(documentData);

      onUploadSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء رفع الوثيقة');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setTitle('');
    setDescription('');
    setCategory('other');
    setCaseId('');
    setIsConfidential(false);
    setTags('');
    setError(null);
    setUploading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={{
          backgroundColor: 'var(--color-surface)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text)',
            margin: 0
          }}>
            رفع وثيقة جديدة
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 'var(--font-size-lg)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X style={{ height: '20px', width: '20px' }} />
          </button>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            backgroundColor: 'var(--color-error)10',
            border: '1px solid var(--color-error)',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <AlertCircle style={{ height: '16px', width: '16px', color: 'var(--color-error)' }} />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }}>
              {error}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* File Upload */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text)',
              marginBottom: '8px'
            }}>
              الملف *
            </label>
            <div style={{
              border: '2px dashed var(--color-border)',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              backgroundColor: 'var(--color-background)'
            }}>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.zip,.rar"
                style={{ display: 'none' }}
                id="file-upload"
                required
              />
              <label
                htmlFor="file-upload"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)'
                }}
              >
                <Upload style={{ height: '16px', width: '16px' }} />
                اختر ملف
              </label>
              {selectedFile && (
                <div style={{
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <FileText style={{ height: '16px', width: '16px', color: 'var(--color-primary)' }} />
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                    {selectedFile.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text)',
              marginBottom: '6px'
            }}>
              عنوان الوثيقة *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="أدخل عنوان الوثيقة"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text)',
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                outline: 'none'
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text)',
              marginBottom: '6px'
            }}>
              الوصف
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر للوثيقة (اختياري)"
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text)',
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Category and Case */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text)',
                marginBottom: '6px'
              }}>
                الفئة
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text)',
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  outline: 'none'
                }}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text)',
                marginBottom: '6px'
              }}>
                القضية (اختياري)
              </label>
              <select
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text)',
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  outline: 'none'
                }}
              >
                <option value="">غير مرتبطة بقضية</option>
                {cases.map(case_ => (
                  <option key={case_.id} value={case_.id}>
                    {case_.title} ({case_.file_number})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text)',
              marginBottom: '6px'
            }}>
              العلامات (مفصولة بفاصلة)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="مثال: عقد، شراء، أصلي"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text)',
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                outline: 'none'
              }}
            />
          </div>

          {/* Confidential */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={isConfidential}
                onChange={(e) => setIsConfidential(e.target.checked)}
                style={{ margin: 0 }}
              />
              <span style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text)'
              }}>
                وثيقة سرية
              </span>
            </label>
          </div>

          {/* Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              style={{
                padding: '10px 20px',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.7 : 1
              }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              style={{
                padding: '10px 20px',
                fontSize: 'var(--font-size-sm)',
                color: 'white',
                backgroundColor: 'var(--color-primary)',
                border: 'none',
                borderRadius: '8px',
                cursor: (uploading || !selectedFile) ? 'not-allowed' : 'pointer',
                opacity: (uploading || !selectedFile) ? 0.7 : 1
              }}
            >
              {uploading ? 'جاري الرفع...' : 'رفع الوثيقة'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default DocumentUploadModal;
