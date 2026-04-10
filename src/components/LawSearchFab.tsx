import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Scale } from 'lucide-react';
import LawSearchModal from './LawSearchModal';

const LawSearchFab: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [detectedCaseId, setDetectedCaseId] = useState<number | null>(null);
  const location = useLocation();

  useEffect(() => {
    const match = location.pathname.match(/\/cases\/(\d+)/);
    setDetectedCaseId(match ? Number(match[1]) : null);
  }, [location.pathname]);

  return (
    <>
      <button
        className="law-search-fab"
        onClick={() => setIsOpen(true)}
        title="باحث الأنظمة"
      >
        <Scale size={15} />
        <span>باحث الأنظمة</span>
      </button>

      <LawSearchModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        caseId={detectedCaseId}
      />
    </>
  );
};

export default LawSearchFab;
