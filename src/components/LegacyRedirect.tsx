// [P4·UX-01] إعادة توجيه المسارات القديمة للوحدة الجديدة مع الحفاظ على معرّف المسار وسلسلة الاستعلام.
import React from 'react';
import { Navigate, useParams, useLocation } from 'react-router-dom';

interface LegacyRedirectProps {
  /** يبني المسار الجديد من بارامترات المسار القديم. */
  to: (params: Record<string, string | undefined>) => string;
}

const LegacyRedirect: React.FC<LegacyRedirectProps> = ({ to }) => {
  const params = useParams();
  const location = useLocation();
  return <Navigate to={`${to(params)}${location.search}`} replace />;
};

export default LegacyRedirect;
