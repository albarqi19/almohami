import React, { useCallback, useState } from 'react';
import NajizAccessRevokedModal from '../components/NajizAccessRevokedModal';

interface BlockedCase {
  title?: string | null;
  file_number?: string | null;
}

/** أي كائن قضية يحمل الراية — القوائم تُرجع أشكالاً مختلفة قليلاً. */
interface GuardableCase {
  najiz_access_revoked?: boolean | null;
  title?: string | null;
  file_number?: string | null;
  [key: string]: unknown;
}

/**
 * حارس فتح القضية.
 *
 * القضية التي انقطعت علاقة المكتب بها في ناجز لم تُجلب بياناتها أصلاً، فالانتقال
 * إليها يعرض صفحة فارغة ثم خطأ. لذلك نعترض الضغط **قبل** الانتقال ونعرض النافذة
 * مباشرةً — وهذا ما يجعل التجربة مفهومة بدل أن تبدو عطلاً.
 *
 * الاستعمال:
 *   const { guardOpen, accessModal } = useCaseAccessGuard();
 *   <tr onClick={() => guardOpen(c, () => navigate(url))}>
 *   ...
 *   {accessModal}
 */
export function useCaseAccessGuard() {
  const [blocked, setBlocked] = useState<BlockedCase | null>(null);

  const guardOpen = useCallback((caseObj: GuardableCase | null | undefined, proceed: () => void) => {
    if (caseObj?.najiz_access_revoked) {
      setBlocked({ title: caseObj.title, file_number: caseObj.file_number });
      return;
    }
    proceed();
  }, []);

  /** لعرض النافذة يدوياً — مثلاً عند التقاط 403 من الباك. */
  const showRevoked = useCallback((info?: BlockedCase) => {
    setBlocked(info ?? {});
  }, []);

  const accessModal = (
    <NajizAccessRevokedModal
      isOpen={blocked !== null}
      caseTitle={blocked?.title}
      fileNumber={blocked?.file_number}
      onClose={() => setBlocked(null)}
    />
  );

  return { guardOpen, showRevoked, accessModal, isBlockedOpen: blocked !== null };
}

export default useCaseAccessGuard;
