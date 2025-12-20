import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Brain, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Edit3,
  Save,
  X
} from 'lucide-react';
import Modal from './Modal';
import { DocumentService } from '../services/documentService';

interface SmartUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseTitle: string;
  onDocumentAdded?: () => void;
}

interface AnalysisResult {
  document_type: string;
  suggested_title: string;
  description: string;
  parties: string[];
  important_dates: string[];
  keywords: string[];
  priority: string;
  summary: string;
}

interface FileInfo {
  original_name: string;
  temp_path: string;
  size: number;
  mime_type: string;
}

const SmartUploadModal: React.FC<SmartUploadModalProps> = ({
  isOpen,
  onClose,
  caseId,
  caseTitle,
  onDocumentAdded
}) => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'analyzing' | 'review' | 'saving'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // بيانات قابلة للتعديل
  const [editableTitle, setEditableTitle] = useState('');
  const [editableDescription, setEditableDescription] = useState('');
  const [editableType, setEditableType] = useState('');
  const [editableKeywords, setEditableKeywords] = useState<string[]>([]);

  const resetModal = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setAnalysis(null);
    setFileInfo(null);
    setError(null);
    setEditableTitle('');
    setEditableDescription('');
    setEditableType('');
    setEditableKeywords([]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setCurrentStep('analyzing');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('case_id', caseId);

      const response = await DocumentService.analyzeSmartDocument(formData);
      
      if (response.success) {
        const analysisData = response.data.analysis;
        const fileInfoData = response.data.file_info;
        
        setAnalysis(analysisData);
        setFileInfo(fileInfoData);
        
        // تعبئة البيانات القابلة للتعديل
        setEditableTitle(analysisData.suggested_title);
        setEditableDescription(analysisData.description);
        setEditableType(analysisData.document_type);
        setEditableKeywords(analysisData.keywords || []);
        
        setCurrentStep('review');
      } else {
        throw new Error(response.message || 'فشل في تحليل الوثيقة');
      }
    } catch (error: any) {
      setError(error.message || 'فشل في تحليل الوثيقة');
      setCurrentStep('upload');
    }
  };

  const handleSave = async () => {
    if (!analysis || !fileInfo) return;

    setCurrentStep('saving');

    try {
      const saveData = {
        case_id: caseId,
        temp_path: fileInfo.temp_path,
        title: editableTitle,
        description: editableDescription,
        document_type: editableType,
        keywords: editableKeywords,
        parties: analysis.parties,
        important_dates: analysis.important_dates,
        priority: analysis.priority
      };

      const response = await DocumentService.saveSmartDocument(saveData);
      
      if (response.success) {
        onDocumentAdded?.();
        resetModal();
        onClose();
      } else {
        throw new Error(response.message || 'فشل في حفظ الوثيقة');
      }
    } catch (error: any) {
      setError(error.message || 'فشل في حفظ الوثيقة');
      setCurrentStep('review');
    }
  };

  const handleCancel = async () => {
    if (fileInfo?.temp_path) {
      try {
        await DocumentService.deleteTempFile(fileInfo.temp_path);
      } catch (error) {
        console.error('Failed to delete temp file:', error);
      }
    }
    resetModal();
    onClose();
  };

  const addKeyword = (keyword: string) => {
    if (keyword.trim() && !editableKeywords.includes(keyword.trim())) {
      setEditableKeywords([...editableKeywords, keyword.trim()]);
    }
  };

  const removeKeyword = (index: number) => {
    setEditableKeywords(editableKeywords.filter((_, i) => i !== index));
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleCancel} 
      title="رفع الوثيقة الذكي"
      size="lg"
    >
      <div style={{ minHeight: '400px' }}>
        {/* خطوات التقدم */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '32px',
          padding: '0 20px'
        }}>
          {[
            { step: 'upload', label: 'رفع الملف', icon: Upload },
            { step: 'analyzing', label: 'التحليل', icon: Brain },
            { step: 'review', label: 'المراجعة', icon: Edit3 },
            { step: 'saving', label: 'الحفظ', icon: Save }
          ].map((item, index) => {
            const Icon = item.icon;
            const isActive = currentStep === item.step;
            const isCompleted = ['upload', 'analyzing', 'review', 'saving'].indexOf(currentStep) > index;
            
            return (
              <div key={item.step} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: isCompleted ? 'var(--color-success)' : isActive ? 'var(--color-primary)' : 'var(--color-border)',
                  color: isCompleted || isActive ? 'white' : 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}>
                  {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
                </div>
                <span style={{
                  fontSize: 'var(--font-size-xs)',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)'
                }}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: 'var(--color-red-50)',
            border: '1px solid var(--color-red-200)',
            borderRadius: '6px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--color-red-600)'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* محتوى كل خطوة */}
        {currentStep === 'upload' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              border: '2px dashed var(--color-border)',
              borderRadius: '8px',
              padding: '40px',
              marginBottom: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = e.dataTransfer.files;
              if (files[0]) {
                setSelectedFile(files[0]);
              }
            }}>
              <Brain size={48} style={{ color: 'var(--color-primary)', marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-text)' }}>
                رفع الوثيقة للتحليل الذكي
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
                سيتم تحليل الوثيقة باستخدام الذكاء الاصطناعي لاستخراج العنوان والتفاصيل تلقائياً
              </p>
              
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="smart-file-input"
              />
              <label 
                htmlFor="smart-file-input"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)'
                }}
              >
                <Upload size={16} />
                اختيار ملف
              </label>
              
              {selectedFile && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: 'var(--color-green-50)',
                  border: '1px solid var(--color-green-200)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <FileText size={16} style={{ color: 'var(--color-green-600)' }} />
                  <span style={{ color: 'var(--color-green-700)' }}>{selectedFile.name}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer'
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleAnalyze}
                disabled={!selectedFile}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: selectedFile ? 'var(--color-primary)' : 'var(--color-border)',
                  color: 'white',
                  cursor: selectedFile ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Brain size={16} />
                تحليل بالذكاء الاصطناعي
              </button>
            </div>
          </div>
        )}

        {currentStep === 'analyzing' && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Loader2 size={48} style={{ 
              color: 'var(--color-primary)', 
              marginBottom: '16px',
              animation: 'spin 1s linear infinite' 
            }} />
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-text)' }}>
              جاري التحليل...
            </h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              الذكاء الاصطناعي يحلل الوثيقة ويستخرج التفاصيل...
            </p>
          </div>
        )}

        {currentStep === 'review' && analysis && (
          <div style={{ padding: '20px 0' }}>
            <h3 style={{ 
              marginBottom: '20px', 
              color: 'var(--color-text)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
              نتائج التحليل - يمكنك التعديل حسب الحاجة
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  marginBottom: '8px',
                  color: 'var(--color-text)'
                }}>
                  العنوان
                </label>
                <input
                  type="text"
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    fontSize: 'var(--font-size-sm)'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  marginBottom: '8px',
                  color: 'var(--color-text)'
                }}>
                  الوصف
                </label>
                <textarea
                  value={editableDescription}
                  onChange={(e) => setEditableDescription(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    fontSize: 'var(--font-size-sm)',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    marginBottom: '8px',
                    color: 'var(--color-text)'
                  }}>
                    نوع الوثيقة
                  </label>
                  <input
                    type="text"
                    value={editableType}
                    onChange={(e) => setEditableType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      fontSize: 'var(--font-size-sm)'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    marginBottom: '8px',
                    color: 'var(--color-text)'
                  }}>
                    الأولوية
                  </label>
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    fontSize: 'var(--font-size-sm)'
                  }}>
                    {analysis.priority}
                  </div>
                </div>
              </div>

              {analysis.parties && analysis.parties.length > 0 && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    marginBottom: '8px',
                    color: 'var(--color-text)'
                  }}>
                    الأطراف المذكورة
                  </label>
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    fontSize: 'var(--font-size-sm)'
                  }}>
                    {analysis.parties.join('، ')}
                  </div>
                </div>
              )}

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  marginBottom: '8px',
                  color: 'var(--color-text)'
                }}>
                  الكلمات المفتاحية
                </label>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  {editableKeywords.map((keyword, index) => (
                    <span
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: 'var(--color-primary-light)',
                        color: 'var(--color-primary)',
                        borderRadius: '4px',
                        fontSize: 'var(--font-size-xs)'
                      }}
                    >
                      {keyword}
                      <button
                        onClick={() => removeKeyword(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'inherit',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              marginTop: '24px'
            }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '10px 20px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer'
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-success)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Save size={16} />
                حفظ الوثيقة
              </button>
            </div>
          </div>
        )}

        {currentStep === 'saving' && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Loader2 size={48} style={{ 
              color: 'var(--color-success)', 
              marginBottom: '16px',
              animation: 'spin 1s linear infinite' 
            }} />
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-text)' }}>
              جاري الحفظ...
            </h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              يتم حفظ الوثيقة في النظام...
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SmartUploadModal;
