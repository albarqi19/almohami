import React from 'react';
import { X, CheckCircle, AlertCircle, Star, FileText, Gavel, Target, TrendingUp, Clock } from 'lucide-react';

interface AnalysisResult {
  document_analysis: string;
  memo_analysis: string;
  quality_score: number;
  improvement_suggestions: string[];
  legal_compliance_issues: string[];
}

interface AnalysisResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResult: AnalysisResult | null;
  memoTitle: string;
}

const AnalysisResultModal: React.FC<AnalysisResultModalProps> = ({
  isOpen,
  onClose,
  analysisResult,
  memoTitle
}) => {
  if (!isOpen || !analysisResult) return null;

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 85) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 70) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <AlertCircle className="w-5 h-5 text-red-600" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" style={{ direction: 'rtl' }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-full">
                <Gavel className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">نتائج التحليل الذكي</h2>
                <p className="text-blue-100 text-sm mt-1">{memoTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-140px)]">
          {/* Score Summary */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-center mb-4">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${getScoreColor(analysisResult.quality_score)}`}>
                {getScoreIcon(analysisResult.quality_score)}
                <div className="text-center">
                  <div className="text-2xl font-bold">{analysisResult.quality_score}/100</div>
                  <div className="text-xs font-medium">درجة الجودة الإجمالية</div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-1000 ${
                  analysisResult.quality_score >= 85 
                    ? 'bg-green-500' 
                    : analysisResult.quality_score >= 70 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
                }`}
                style={{ width: `${analysisResult.quality_score}%` }}
              ></div>
            </div>
          </div>

          {/* Analysis Sections */}
          <div className="p-6 space-y-6">
            
            {/* Document Analysis */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-800">تحليل الوثائق المرفقة</h3>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                  {analysisResult.document_analysis}
                </p>
              </div>
            </div>

            {/* Memo Analysis */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Gavel className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-800">التحليل القانوني للمذكرة</h3>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200 max-h-60 overflow-y-auto">
                <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                  {analysisResult.memo_analysis}
                </div>
              </div>
            </div>

            {/* Two Column Layout for Suggestions and Compliance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Improvement Suggestions */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-bold text-gray-800">اقتراحات التحسين</h3>
                </div>
                <div className="space-y-2">
                  {analysisResult.improvement_suggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-2 bg-white rounded-lg p-3 border border-green-200">
                      <div className="bg-green-100 rounded-full p-1 flex-shrink-0 mt-0.5">
                        <Target className="w-3 h-3 text-green-600" />
                      </div>
                      <p className="text-gray-700 text-sm flex-1">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal Compliance Issues */}
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-bold text-gray-800">نقاط الامتثال القانوني</h3>
                </div>
                <div className="space-y-2">
                  {analysisResult.legal_compliance_issues.map((issue, index) => (
                    <div key={index} className="flex items-start gap-2 bg-white rounded-lg p-3 border border-orange-200">
                      <div className="bg-orange-100 rounded-full p-1 flex-shrink-0 mt-0.5">
                        <Gavel className="w-3 h-3 text-orange-600" />
                      </div>
                      <p className="text-gray-700 text-sm flex-1">{issue}</p>
                    </div>
                  ))}
                </div>
              </div>
              
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm">تم إجراء التحليل بواسطة Gemini AI</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                إغلاق
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                طباعة التقرير
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResultModal;
