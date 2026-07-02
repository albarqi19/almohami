import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/extensionGuide.css';

/* ------------------------------------------------------------------ */
/* دليل إضافة ناجز — /extension                                        */
/* تُفتح تلقائياً بعد تثبيت إضافة كروم (background.js → onInstalled)   */
/* الثيم: صفحة mail.alraedlaw.com — مفتوح بلا بطاقات، فواصل ذهبية      */
/* ------------------------------------------------------------------ */

const DiamondMark: React.FC = () => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M24 4 L44 24 L24 44 L4 24 Z" />
    <path d="M24 15 L33 24 L24 33 L15 24 Z" />
  </svg>
);

const WidgetIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const ExtensionGuidePage: React.FC = () => {
  React.useEffect(() => {
    document.title = 'دليل إضافة ناجز — نظام الرائد';
  }, []);

  return (
    <div className="rl-ext" dir="rtl">
      <div className="rl-ext__col">
        {/* الترويسة */}
        <header className="rl-ext__head">
          <div className="rl-ext__mark">
            <DiamondMark />
          </div>
          <div className="rl-ext__eyebrow">نظام الرائد — إضافة المتصفح</div>
          <h1>تم تثبيت إضافة ناجز بنجاح</h1>
          <p className="rl-ext__tagline">
            دقائق معدودة وتكون قضاياك ووكالاتك وجلساتك داخل نظام مكتبك
          </p>
          <hr className="rl-ext__rule" />
        </header>

        {/* خطوات البدء */}
        <section>
          <h2>خطوات البدء</h2>

          <div className="rl-ext__step">
            <span className="rl-ext__step-num">١</span>
            <p>
              <strong>سجّل الدخول من أيقونة الإضافة</strong> أعلى المتصفح، بحساب{' '}
              <strong>مدير</strong> في نظام الرائد.
              <small>
                إن لم تظهر الأيقونة: اضغط رمز القطعة (🧩) بجوار شريط العنوان وثبّت الإضافة.
              </small>
            </p>
          </div>

          <div className="rl-ext__step">
            <span className="rl-ext__step-num">٢</span>
            <p>
              <strong>افتح بوابة ناجز</strong> (najiz.sa) وسجّل دخولك فيها كالمعتاد — الويدجت لا
              يظهر خارج صفحات ناجز.
            </p>
          </div>

          <div className="rl-ext__step">
            <span className="rl-ext__step-num">٣</span>
            <p>
              <strong>ابحث عن الزر العائم أسفل يسار الصفحة</strong> — هذا هو الويدجت، ومنه تتم كل
              عمليات السحب.
            </p>
          </div>

          <div className="rl-ext__mock">
            <div className="rl-ext__browser">
              <div className="rl-ext__browser-bar">
                <span className="rl-ext__dot" />
                <span className="rl-ext__dot" />
                <span className="rl-ext__dot" />
                <span className="rl-ext__url">najiz.sa</span>
              </div>
              <div className="rl-ext__browser-page">
                <div className="rl-ext__sk rl-ext__sk--w60" />
                <div className="rl-ext__sk rl-ext__sk--w85" />
                <div className="rl-ext__sk rl-ext__sk--w70" />
                <div className="rl-ext__sk rl-ext__sk--w40" />
                <div className="rl-ext__fab">
                  <WidgetIcon />
                </div>
                <div className="rl-ext__fab-hint">الويدجت هنا</div>
              </div>
            </div>
            <p className="rl-ext__mock-caption">
              الزر الكحلي بالإطار الذهبي — أسفل يسار أي صفحة في ناجز
            </p>
          </div>
        </section>

        {/* أنواع السحب */}
        <section>
          <h2>أنواع السحب</h2>

          <div className="rl-ext__type">
            <h3 className="rl-ext__type-title">
              سحب هذه القضية
              <span className="rl-ext__type-badge">يشترط أن تكون داخل القضية</span>
            </h3>
            <p>
              يسحب القضية المفتوحة أمامك الآن بكل تفاصيلها: الأطراف، الجلسات، الأحكام، والموضوع.
              افتح صفحة القضية في ناجز أولاً ثم اضغط الزر — لو ضغطته من خارج صفحة قضية ستظهر لك
              رسالة تطلب الدخول إلى القضية.
            </p>
          </div>

          <div className="rl-ext__type">
            <h3 className="rl-ext__type-title">
              سحب كل القضايا
              <span className="rl-ext__type-badge">من أي صفحة في ناجز</span>
            </h3>
            <p>
              لا يشترط أن تكون داخل قضية — بضغطة زر واحدة يجلب جميع قضايا المكتب من كل الصفحات.
            </p>
            <p className="rl-ext__hint">
              <strong>ننصح به كسحبٍ أول:</strong> اختر وضع «مع التفاصيل» ليجلب كل قضاياك بتفاصيلها
              الكاملة دفعة واحدة، ثم استخدم «تحديث ذكي» في المرات التالية لتحديث الجديد والنشط فقط.
            </p>
          </div>

          <div className="rl-ext__type">
            <h3 className="rl-ext__type-title">الجلسات القادمة</h3>
            <p>
              يسحب جلسات الثلاثة أشهر القادمة من تقويم ناجز ويزامنها مع جدول الجلسات في النظام —
              فتصلك التذكيرات وتظهر في نشرة الصباح.
            </p>
          </div>

          <div className="rl-ext__type">
            <h3 className="rl-ext__type-title">سحب الوكالات</h3>
            <p>
              يجلب جميع وكالات المكتب مع بيانات الموكلين والصلاحيات وتواريخ الانتهاء.
            </p>
            <p className="rl-ext__hint">
              <strong>وكالات مخصصة:</strong> إن كان عدد الوكالات كبيراً أو أردت وكالات بعينها،
              اختر وضع «وكالات مخصصة» وحدّدها من القائمة بأرقامها — أدق وأسرع.
            </p>
          </div>

          <div className="rl-ext__type">
            <h3 className="rl-ext__type-title">ضبط جلسات اليوم</h3>
            <p>يجلب ضبوط الجلسات التي انتهت اليوم ويرفقها بقضاياها في النظام.</p>
          </div>

          <div className="rl-ext__type">
            <h3 className="rl-ext__type-title">طلبات التنفيذ</h3>
            <p>
              يسحب طلبات التنفيذ من ناجز بحالاتها وسنداتها، ويمكنك بعدها ربط كل طلب بعميله وقضيته
              ومتابعة السدادات من داخل النظام.
            </p>
          </div>

          <div className="rl-ext__type">
            <h3 className="rl-ext__type-title">طلبات الإفلاس</h3>
            <p>
              يسحب طلبات الإفلاس بجلساتها وأحكامها وأطرافها، وتظهر في قسم الإفلاس بالنظام مع
              التذكيرات والمهل.
            </p>
          </div>
        </section>

        {/* تنبيهات */}
        <section>
          <h2>تنبيهات مهمة</h2>
          <p className="rl-ext__note">
            أثناء السحب <strong>أبقِ تبويب ناجز مفتوحاً وفي المقدمة</strong> حتى تكتمل العملية —
            تصغير التبويب أو الانتقال عنه قد يوقفها.
          </p>
          <p className="rl-ext__note">
            الإضافة مخصصة <strong>للمدراء فقط</strong> (مالك المكتب أو مدير) — حسابات المحامين
            والموظفين لا تدخل.
          </p>
          <p className="rl-ext__note">
            <strong>الحساب التجريبي</strong> يسحب القضية التي يفتحها فقط، وبقية المزايا تُفعَّل
            بالاشتراك.
          </p>
          <p className="rl-ext__note">
            بياناتك تنتقل مباشرة من ناجز إلى نظام مكتبك — <strong>لا تُخزَّن لدى أي طرف ثالث</strong>.
          </p>
        </section>

        {/* الخاتمة */}
        <div className="rl-ext__cta-wrap">
          <a className="rl-ext__cta" href="https://www.najiz.sa" target="_blank" rel="noopener noreferrer">
            افتح ناجز وابدأ الآن
          </a>
        </div>

        <footer className="rl-ext__foot">
          إضافة نظام الرائد لإدارة المحاماة — تعمل على بوابتي ناجز وتراضي
          <br />
          <Link to="/privacy">سياسة الخصوصية</Link> · <Link to="/terms">الشروط والأحكام</Link> ·{' '}
          <Link to="/">الصفحة الرئيسية</Link>
        </footer>
      </div>
    </div>
  );
};

export default ExtensionGuidePage;
