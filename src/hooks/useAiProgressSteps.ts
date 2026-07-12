import { useEffect, useState } from 'react';

/**
 * رسائل تقدّم متتابعة أثناء انتظار عمل ذكاء بالخلفية — تجربة «يحدث شيء الآن»:
 * تتقدم الرسائل واحدة تلو الأخرى كل فترة، وتقف عند الأخيرة حتى وصول النتيجة
 * (لا تدور من جديد — الدوران يوحي بالتعليق). عند التعطيل تعود للبداية.
 */
export function useAiProgressSteps(active: boolean, steps: string[], intervalMs = 2200) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) {
      setStep(0);
      return;
    }

    const id = window.setInterval(() => {
      setStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [active, steps.length, intervalMs]);

  return {
    label: steps[Math.min(step, steps.length - 1)] ?? '',
    step,
    total: steps.length,
  };
}
