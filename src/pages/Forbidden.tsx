import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowRight } from 'lucide-react';

const Forbidden: React.FC<{ requiredPermission?: string }> = ({ requiredPermission }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 mb-6">
          <ShieldOff className="w-10 h-10 text-red-500" strokeWidth={1.5} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          غير مصرح بالوصول
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-2">
          ليس لديك الصلاحية اللازمة لعرض هذه الصفحة.
        </p>

        {requiredPermission && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-6 font-mono">
            الصلاحية المطلوبة: <span className="text-gray-700 dark:text-gray-300">{requiredPermission}</span>
          </p>
        )}

        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
          إذا كنت تحتاج الوصول، تواصل مع مدير الشركة لمنحك الصلاحية المناسبة.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            العودة
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark transition-colors"
          >
            لوحة التحكم
          </button>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
