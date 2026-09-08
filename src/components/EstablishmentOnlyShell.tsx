import React, { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import PageLoader from './PageLoader';
import { useAuth } from '../contexts/AuthContext';

/**
 * قشرة «الوضع الحصري» — كلُّ ما يراه عميلُ بوابة المنشأة.
 *
 * **قائمةُ سماحٍ لا قائمةُ منع.** `Layout` يستورد اثنين وعشرين مكوّناً (شريط
 * جانبيّ، ترويسة، دردشة، مؤقّت، إعلانات بأربع قنوات، لافتة اشتراك، جولة
 * تعريفية، ودجت جوال، مفكّرة، باحث أنظمة…). إطفاؤها واحداً واحداً بشرطٍ
 * `!isExclusive` كان سيعمل اليوم ثم ينكسر أوّلَ مرّة يضيف أحدٌ ودجتاً جديداً
 * ناسياً الشرط. فالقشرة هنا لا تعرف عن التطبيق شيئاً أصلاً: ما يُضاف إلى
 * `Layout` غداً لا يبلغ هذه الشاشة أبداً، بلا التزامٍ دائمٍ على أحد.
 *
 * وليس فيها ترويسةٌ خاصةٌ بها عمداً: `ClientEstablishmentPage` تحمل ترويستَها
 * (اسم المنشأة + «بوابة المنشأة» + أزرارها) وهي مصمَّمة لملء حاويتها
 * (`height:100%` وعمودٌ مرن)، فترويسةٌ ثانيةٌ فوقها تكرارٌ لا إطار.
 */
const EstablishmentOnlyShell: React.FC = () => {
  const { user } = useAuth();
  const officeName = user?.tenant?.name;

  /**
   * عنوان التبويب — `index.html` يثبّت «الرائد لإدارة المحاماة | نظام متكامل…»
   * وهو أوّلُ ما يقرؤه صاحبُ الشاشة وآخرُ ما يبقى في سجلّ متصفّحه وإشاراته.
   * إخفاءُ الاسم من الصفحة وتركُه في التبويب إخفاءٌ نصفُ منجَز.
   *
   * واسمُ المكتب يبقى (وهو مكتبُ العميل نفسِه، يعرفه ويتعامل معه) — الممنوع
   * اسمُ المنصّة لا اسمُ من اشتراها.
   */
  useEffect(() => {
    const previous = document.title;
    document.title = officeName ? `${officeName} — بوابة المنشأة` : 'بوابة المنشأة';

    return () => {
      document.title = previous;
    };
  }, [officeName]);

  /**
   * الثيم يُطبَّق هنا لأن `ClickUpHeader` — الذي يطبّقه للتطبيق كلّه — ليس في
   * هذه الشجرة. و`establishment-portal.css` فيه قواعدُ `body.dark`، فبلا هذا
   * يهبط من كان ثيمُه داكناً على صفحةٍ نصفَ منسّقة بلا مفتاحٍ يعيدها.
   * (لا يُنقل هذا من الترويسة إلى مزوّدٍ مشترك: ذاك مسٌّ بثيم كلّ مستخدمي
   * المنصّة، وإعادةُ تنظيمٍ تستحقّ جولتَها لا هذه.)
   */
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const root = document.documentElement;
    const body = document.body;

    root.classList.remove('dark', 'classic', 'diwan');
    body.classList.remove('dark', 'classic', 'diwan');

    if (saved === 'dark' || saved === 'classic' || saved === 'diwan') {
      root.classList.add(saved);
      body.classList.add(saved);
    }

    root.style.colorScheme = saved === 'dark' ? 'dark' : 'light';
    root.style.backgroundColor =
      saved === 'dark' ? '#10151f'
        : saved === 'diwan' ? '#F6F1E6'
          : saved === 'classic' ? '#F5EFE6'
            : '#FDFBF7';
  }, []);

  return (
    <div
      className="est-only-shell"
      dir="rtl"
      style={{
        height: '100vh',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--dashboard-bg)',
      }}
    >
      <Suspense fallback={<PageLoader full />}>
        <Outlet />
      </Suspense>
    </div>
  );
};

export default EstablishmentOnlyShell;
