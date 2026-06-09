import React, { useCallback, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { BookOpen, BotMessageSquare, TextSearch } from 'lucide-react';
import LawChat from '../../components/laws/LawChat';
import LawSmartSearch from '../../components/laws/LawSmartSearch';
import LawBrowse from '../../components/laws/LawBrowse';
import '../../styles/laws-page.css';

export type LawsTab = 'chat' | 'search' | 'browse';

/** هدف فتح مادة في تبويب التصفّح (من نتيجة بحث أو استشهاد محادثة) */
export interface BrowseTarget {
  serial: string;
  articleId: number | null;
  /** يتغيّر مع كل طلب فتح حتى لو تكرر نفس الهدف */
  nonce: number;
}

const LawsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LawsTab>('chat');
  const [browseTarget, setBrowseTarget] = useState<BrowseTarget | null>(null);

  const openArticleInBrowse = useCallback((serial: string, articleId: number | null) => {
    setBrowseTarget({ serial, articleId, nonce: Date.now() });
    setActiveTab('browse');
  }, []);

  return (
    <div className="laws-page" dir="rtl">
      {/* dir إلزامي هنا — Radix يفرض ltr داخلياً ما لم يُمرَّر صراحة */}
      <Tabs.Root
        dir="rtl"
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as LawsTab)}
        className="laws-tabs"
      >
        <Tabs.List className="laws-tabs__list" aria-label="أوضاع صفحة الأنظمة">
          <Tabs.Trigger value="chat" className="laws-tabs__trigger">
            <BotMessageSquare size={16} />
            المحادثة الذكية
          </Tabs.Trigger>
          <Tabs.Trigger value="search" className="laws-tabs__trigger">
            <TextSearch size={16} />
            البحث الذكي
          </Tabs.Trigger>
          <Tabs.Trigger value="browse" className="laws-tabs__trigger">
            <BookOpen size={16} />
            تصفّح الأنظمة
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="chat" className="laws-tabs__content" forceMount hidden={activeTab !== 'chat'}>
          <LawChat onOpenArticle={openArticleInBrowse} />
        </Tabs.Content>
        <Tabs.Content value="search" className="laws-tabs__content" forceMount hidden={activeTab !== 'search'}>
          <LawSmartSearch onOpenArticle={openArticleInBrowse} />
        </Tabs.Content>
        <Tabs.Content value="browse" className="laws-tabs__content" forceMount hidden={activeTab !== 'browse'}>
          <LawBrowse target={browseTarget} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default LawsPage;
