import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  Check, 
  AlertCircle,
  Download,
  Eye,
  Trash2
} from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
  status: 'uploading' | 'completed' | 'error';
  progress?: number;
}

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
  maxFiles?: number;
  existingFiles?: UploadedFile[];
  title?: string;
  description?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesUploaded,
  maxFileSize = 10,
  allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif'],
  maxFiles = 5,
  existingFiles = [],
  title = "رفع الملفات",
  description = "اسحب الملفات هنا أو انقر للاختيار"
}) => {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image size={20} style={{ color: 'var(--color-primary)' }} />;
    } else if (type.includes('pdf')) {
      return <FileText size={20} style={{ color: '#dc2626' }} />;
    } else if (type.includes('doc')) {
      return <FileText size={20} style={{ color: '#2563eb' }} />;
    } else {
      return <File size={20} style={{ color: 'var(--color-text-secondary)' }} />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `حجم الملف يجب أن يكون أقل من ${maxFileSize} ميجابايت`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      return `نوع الملف غير مسموح. الأنواع المسموحة: ${allowedTypes.join(', ')}`;
    }

    return null;
  };

  const simulateUpload = (file: File): Promise<UploadedFile> => {
    return new Promise((resolve, reject) => {
      const uploadedFile: UploadedFile = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file), // In real app, this would be the server URL
        uploadedAt: new Date(),
        status: 'uploading',
        progress: 0
      };

      // Update files with uploading status
      setFiles(prev => [...prev, uploadedFile]);

      // Simulate upload progress
      const interval = setInterval(() => {
        uploadedFile.progress = (uploadedFile.progress || 0) + Math.random() * 20;
        
        if (uploadedFile.progress >= 100) {
          uploadedFile.progress = 100;
          uploadedFile.status = 'completed';
          clearInterval(interval);
          
          setFiles(prev => 
            prev.map(f => f.id === uploadedFile.id ? uploadedFile : f)
          );
          
          resolve(uploadedFile);
        } else {
          setFiles(prev => 
            prev.map(f => f.id === uploadedFile.id ? uploadedFile : f)
          );
        }
      }, 100);

      // Simulate potential error (5% chance)
      if (Math.random() < 0.05) {
        setTimeout(() => {
          clearInterval(interval);
          uploadedFile.status = 'error';
          setFiles(prev => 
            prev.map(f => f.id === uploadedFile.id ? uploadedFile : f)
          );
          reject(new Error('خطأ في رفع الملف'));
        }, 1000);
      }
    });
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);
    const totalFiles = files.length + fileArray.length;

    if (totalFiles > maxFiles) {
      alert(`لا يمكن رفع أكثر من ${maxFiles} ملفات`);
      return;
    }

    setIsUploading(true);

    const uploadPromises = fileArray.map(async (file) => {
      const error = validateFile(file);
      if (error) {
        alert(`${file.name}: ${error}`);
        return null;
      }

      try {
        return await simulateUpload(file);
      } catch (error) {
        console.error('Upload error:', error);
        return null;
      }
    });

    const uploadedFiles = await Promise.all(uploadPromises);
    const successfulUploads = uploadedFiles.filter(file => file !== null) as UploadedFile[];

    if (successfulUploads.length > 0) {
      onFilesUploaded(successfulUploads);
    }

    setIsUploading(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const newFiles = prev.filter(f => f.id !== fileId);
      onFilesUploaded(newFiles);
      return newFiles;
    });
  };

  const downloadFile = (file: UploadedFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const previewFile = (file: UploadedFile) => {
    if (file.type.startsWith('image/')) {
      window.open(file.url, '_blank');
    } else {
      // For other file types, you might want to implement a preview modal
      window.open(file.url, '_blank');
    }
  };

  return (
    <div style={{
      width: '100%',
      padding: '20px',
      backgroundColor: 'var(--color-surface)',
      borderRadius: '12px',
      border: '1px solid var(--color-border)'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text)',
          margin: '0 0 8px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Upload size={20} />
          {title}
        </h3>
        <p style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          margin: 0
        }}>
          {description}
        </p>
      </div>

      {/* Upload Area */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        style={{
          padding: '40px 20px',
          border: `2px dashed ${isDragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: '8px',
          backgroundColor: isDragOver ? 'var(--color-primary)10' : 'var(--color-background)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: files.length > 0 ? '20px' : '0'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          style={{ display: 'none' }}
        />
        
        <Upload 
          size={48} 
          style={{ 
            color: isDragOver ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            margin: '0 auto 16px'
          }} 
        />
        
        <h4 style={{
          fontSize: 'var(--font-size-md)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--color-text)',
          margin: '0 0 8px 0'
        }}>
          {isDragOver ? 'أفلت الملفات هنا' : 'اسحب الملفات هنا أو انقر للاختيار'}
        </h4>
        
        <p style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          margin: '0 0 12px 0'
        }}>
          الحد الأقصى {maxFileSize} ميجابايت لكل ملف، {maxFiles} ملفات كحد أقصى
        </p>
        
        <div style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-secondary)',
          marginTop: '8px'
        }}>
          الأنواع المسموحة: {allowedTypes.join(', ')}
        </div>
      </motion.div>

      {/* Files List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <h4 style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text)',
              margin: '0 0 12px 0'
            }}>
              الملفات المرفوعة ({files.length})
            </h4>

            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-background)',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)'
                }}
              >
                {/* File Icon */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: '6px'
                }}>
                  {getFileIcon(file.type)}
                </div>

                {/* File Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text)',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {file.name}
                  </div>
                  <div style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{file.uploadedAt.toLocaleDateString('ar-SA')}</span>
                  </div>

                  {/* Progress Bar (for uploading files) */}
                  {file.status === 'uploading' && (
                    <div style={{
                      width: '100%',
                      height: '4px',
                      backgroundColor: 'var(--color-border)',
                      borderRadius: '2px',
                      marginTop: '8px',
                      overflow: 'hidden'
                    }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${file.progress}%` }}
                        style={{
                          height: '100%',
                          backgroundColor: 'var(--color-primary)',
                          borderRadius: '2px'
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Status Icon */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px'
                }}>
                  {file.status === 'completed' && (
                    <Check size={16} style={{ color: 'var(--color-success)' }} />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle size={16} style={{ color: 'var(--color-error)' }} />
                  )}
                  {file.status === 'uploading' && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid var(--color-border)',
                        borderTop: '2px solid var(--color-primary)',
                        borderRadius: '50%'
                      }}
                    />
                  )}
                </div>

                {/* Actions */}
                {file.status === 'completed' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        previewFile(file);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: 'transparent',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                        e.currentTarget.style.color = 'var(--color-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--color-text-secondary)';
                      }}
                      title="معاينة"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadFile(file);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: 'transparent',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                        e.currentTarget.style.color = 'var(--color-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--color-text-secondary)';
                      }}
                      title="تحميل"
                    >
                      <Download size={16} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: 'transparent',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-error)20';
                        e.currentTarget.style.color = 'var(--color-error)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--color-text-secondary)';
                      }}
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Status */}
      {isUploading && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          backgroundColor: 'var(--color-primary)10',
          borderRadius: '8px',
          border: '1px solid var(--color-primary)30',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--color-primary)',
          fontSize: 'var(--font-size-sm)'
        }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid var(--color-primary)30',
              borderTop: '2px solid var(--color-primary)',
              borderRadius: '50%'
            }}
          />
          جاري رفع الملفات...
        </div>
      )}
    </div>
  );
};

export default FileUpload;
