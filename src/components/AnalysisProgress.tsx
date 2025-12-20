import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, FileText, Brain, Upload, AlertCircle } from 'lucide-react';

interface AnalysisStep {
  id: string;
  title: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  message?: string;
  error?: string;
}

interface AnalysisProgressProps {
  steps: AnalysisStep[];
  isVisible: boolean;
}

const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ steps, isVisible }) => {
  if (!isVisible) return null;

  const getIcon = (step: AnalysisStep) => {
    switch (step.status) {
      case 'completed':
        return <Check size={20} style={{ color: 'var(--color-success)' }} />;
      case 'loading':
        return <Loader2 size={20} style={{ color: 'var(--color-primary)' }} className="animate-spin" />;
      case 'error':
        return <AlertCircle size={20} style={{ color: 'var(--color-error)' }} />;
      default:
        return <div style={{ width: '20px', height: '20px', border: '2px solid var(--color-border)', borderRadius: '50%' }} />;
    }
  };

  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'check_documents':
        return <FileText size={16} />;
      case 'analyze_document':
        return <Brain size={16} />;
      case 'upload_document':
        return <Upload size={16} />;
      case 'analyze_memo':
        return <Brain size={16} />;
      case 'merge_analysis':
        return <FileText size={16} />;
      default:
        return <Brain size={16} />;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '32px',
      borderRadius: '12px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      zIndex: 1000,
      minWidth: '400px',
      maxWidth: '500px',
      border: '1px solid var(--color-border)'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '24px'
      }}>
        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: 'var(--color-text)'
        }}>
          جاري التحليل الذكي
        </h3>
        <p style={{
          margin: 0,
          color: 'var(--color-text-light)',
          fontSize: '14px'
        }}>
          يرجى الانتظار أثناء تحليل المذكرة والوثائق المرفقة
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {steps.map((step, index) => (
          <AnimatePresence key={step.id}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: step.status === 'loading' ? 'var(--color-primary-light)' : 
                                step.status === 'completed' ? 'var(--color-success-light)' :
                                step.status === 'error' ? 'var(--color-error-light)' : 'transparent',
                border: `1px solid ${
                  step.status === 'loading' ? 'var(--color-primary)' : 
                  step.status === 'completed' ? 'var(--color-success)' :
                  step.status === 'error' ? 'var(--color-error)' : 'var(--color-border)'
                }`,
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '20px',
                marginTop: '2px'
              }}>
                {getIcon(step)}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: step.message ? '4px' : 0
                }}>
                  {getStepIcon(step.id)}
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: step.status === 'error' ? 'var(--color-error)' : 'var(--color-text)'
                  }}>
                    {step.title}
                  </span>
                </div>

                {step.message && (
                  <p style={{
                    margin: 0,
                    fontSize: '12px',
                    color: 'var(--color-text-light)',
                    lineHeight: '1.4'
                  }}>
                    {step.message}
                  </p>
                )}

                {step.error && (
                  <p style={{
                    margin: '4px 0 0 0',
                    fontSize: '12px',
                    color: 'var(--color-error)',
                    lineHeight: '1.4'
                  }}>
                    خطأ: {step.error}
                  </p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        ))}
      </div>
    </div>
  );
};

export default AnalysisProgress;
