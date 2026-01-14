import { useMemo, useCallback } from 'react';
import type { ContractVariable } from '../types/contracts';

// قائمة المتغيرات المتاحة
export const CONTRACT_VARIABLES: ContractVariable[] = [
  // متغيرات العميل
  { key: 'client_name', label: 'اسم العميل', category: 'client', description: 'الاسم الكامل للعميل' },
  { key: 'client_national_id', label: 'رقم هوية العميل', category: 'client', description: 'رقم الهوية الوطنية أو الإقامة' },
  { key: 'client_phone', label: 'هاتف العميل', category: 'client', description: 'رقم جوال العميل' },
  { key: 'client_email', label: 'بريد العميل', category: 'client', description: 'البريد الإلكتروني للعميل' },
  { key: 'client_address', label: 'عنوان العميل', category: 'client', description: 'العنوان الكامل للعميل' },
  { key: 'client_nationality', label: 'جنسية العميل', category: 'client', description: 'جنسية العميل' },

  // متغيرات القضية
  { key: 'case_number', label: 'رقم القضية', category: 'case', description: 'رقم القضية في المحكمة' },
  { key: 'court_name', label: 'اسم المحكمة', category: 'case', description: 'اسم المحكمة المختصة' },
  { key: 'scope_type', label: 'صفة الموكل', category: 'case', description: 'مدعي أو مدعى عليه' },

  // متغيرات المالية
  { key: 'first_payment', label: 'الدفعة الأولى', category: 'payment', description: 'مبلغ الدفعة الأولى بالريال' },
  { key: 'second_payment', label: 'الدفعة الثانية', category: 'payment', description: 'مبلغ الدفعة الثانية بالريال' },
  { key: 'total_amount', label: 'المبلغ الإجمالي', category: 'payment', description: 'إجمالي قيمة العقد' },
  { key: 'percentage', label: 'النسبة المئوية', category: 'payment', description: 'نسبة من الحكم إن وجدت' },
  { key: 'vat_rate', label: 'نسبة الضريبة', category: 'payment', description: 'نسبة ضريبة القيمة المضافة' },

  // متغيرات العقد
  { key: 'contract_date', label: 'تاريخ العقد', category: 'contract', description: 'تاريخ العقد بالميلادي' },
  { key: 'contract_date_hijri', label: 'تاريخ العقد هجري', category: 'contract', description: 'تاريخ العقد بالهجري' },
  { key: 'day_name', label: 'اسم اليوم', category: 'contract', description: 'اسم يوم التوقيع' },

  // متغيرات المكتب
  { key: 'firm_name', label: 'اسم المكتب', category: 'firm', description: 'الاسم الرسمي للمكتب' },
  { key: 'firm_cr', label: 'السجل التجاري', category: 'firm', description: 'رقم السجل التجاري' },
  { key: 'firm_license', label: 'رقم الترخيص', category: 'firm', description: 'رقم ترخيص المحاماة' },
  { key: 'firm_address', label: 'عنوان المكتب', category: 'firm', description: 'العنوان الكامل للمكتب' },
  { key: 'firm_phone', label: 'هاتف المكتب', category: 'firm', description: 'رقم هاتف المكتب' },
  { key: 'firm_email', label: 'بريد المكتب', category: 'firm', description: 'البريد الإلكتروني للمكتب' },
  { key: 'firm_iban', label: 'رقم الآيبان', category: 'firm', description: 'رقم الحساب البنكي (IBAN)' },
  { key: 'firm_bank', label: 'اسم البنك', category: 'firm', description: 'اسم البنك' },
  { key: 'manager_name', label: 'اسم المدير', category: 'firm', description: 'اسم المدير العام' },
  { key: 'manager_id', label: 'هوية المدير', category: 'firm', description: 'رقم هوية المدير العام' },
];

// تصنيفات المتغيرات
export const VARIABLE_CATEGORIES: Record<string, string> = {
  client: 'العميل',
  case: 'القضية',
  payment: 'المالية',
  contract: 'العقد',
  firm: 'المكتب',
};

// ألوان التصنيفات
export const CATEGORY_COLORS: Record<string, string> = {
  client: '#3B82F6', // أزرق
  case: '#8B5CF6', // بنفسجي
  payment: '#10B981', // أخضر
  contract: '#F59E0B', // برتقالي
  firm: '#6366F1', // نيلي
};

export function useContractVariables() {
  // تجميع المتغيرات حسب التصنيف
  const groupedVariables = useMemo(() => {
    const groups: Record<string, ContractVariable[]> = {};
    CONTRACT_VARIABLES.forEach((variable) => {
      if (!groups[variable.category]) {
        groups[variable.category] = [];
      }
      groups[variable.category].push(variable);
    });
    return groups;
  }, []);

  // استبدال المتغيرات في المحتوى
  const replaceVariables = useCallback(
    (content: string, values: Record<string, string>): string => {
      let result = content;
      Object.entries(values).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, value || '');
      });
      return result;
    },
    []
  );

  // استخراج المتغيرات من المحتوى
  const extractVariables = useCallback((content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    return matches;
  }, []);

  // التحقق من وجود متغيرات غير معروفة
  const getUnknownVariables = useCallback((content: string): string[] => {
    const usedVariables = extractVariables(content);
    const knownKeys = CONTRACT_VARIABLES.map((v) => v.key);
    return usedVariables.filter((v) => !knownKeys.includes(v));
  }, [extractVariables]);

  // الحصول على المتغيرات المستخدمة مع تفاصيلها
  const getUsedVariablesDetails = useCallback(
    (content: string): ContractVariable[] => {
      const usedKeys = extractVariables(content);
      return CONTRACT_VARIABLES.filter((v) => usedKeys.includes(v.key));
    },
    [extractVariables]
  );

  // البحث في المتغيرات
  const searchVariables = useCallback((query: string): ContractVariable[] => {
    if (!query.trim()) return CONTRACT_VARIABLES;
    const lowerQuery = query.toLowerCase();
    return CONTRACT_VARIABLES.filter(
      (v) =>
        v.key.toLowerCase().includes(lowerQuery) ||
        v.label.toLowerCase().includes(lowerQuery) ||
        v.description?.toLowerCase().includes(lowerQuery)
    );
  }, []);

  // تنسيق المتغير للعرض
  const formatVariableForInsert = useCallback((key: string): string => {
    return `{{${key}}}`;
  }, []);

  // الحصول على متغير بالمفتاح
  const getVariableByKey = useCallback((key: string): ContractVariable | undefined => {
    return CONTRACT_VARIABLES.find((v) => v.key === key);
  }, []);

  return {
    variables: CONTRACT_VARIABLES,
    groupedVariables,
    categories: VARIABLE_CATEGORIES,
    categoryColors: CATEGORY_COLORS,
    replaceVariables,
    extractVariables,
    getUnknownVariables,
    getUsedVariablesDetails,
    searchVariables,
    formatVariableForInsert,
    getVariableByKey,
  };
}

export default useContractVariables;
