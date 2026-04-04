import React, { useState } from 'react';
import { Scale } from 'lucide-react';
import LawSearchModal from './LawSearchModal';

const LawSearchFab: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

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

      <LawSearchModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default LawSearchFab;
