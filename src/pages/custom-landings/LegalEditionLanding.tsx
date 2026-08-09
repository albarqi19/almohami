import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, LogIn } from 'lucide-react';
import useSEO from '../../hooks/useSEO';
import './legaledition-landing.css';

/**
 * صفحة هبوط مخصصة — شركة ليجّل إديشن للمحاماة والاستشارات القانونية (الشركة 404)
 * واجهة واحدة بهويّتهم: الشعار + الاسم + الشعار النصّي + زرّ الدخول. بلا تنقّل.
 *
 * الهوية: تيل عميق #002625 وذهبي #c69a63، والشعار مولَّد من شعارهم الرسمي
 * (كان أبيضَ صافياً بالكامل، فلُوِّن الميزانُ ذهبياً والنصُّ أبيض).
 *
 * كل التنسيقات محصورة تحت .le-page — Vite يحقن الـCSS عالمياً، فقواعدُ
 * :root و* و body في الملف الأصلي كانت تتسرّب إلى لوحة التحكم كلها.
 */

const SITE = 'https://www.legaleditionlawfirm.com/';

const LegalEditionLanding: React.FC = () => {
    const navigate = useNavigate();

    useSEO({
        title: 'شركة ليجّل إديشن للمحاماة والاستشارات القانونية',
        description: 'بوابة عملاء شركة ليجّل إديشن للمحاماة والاستشارات القانونية — بصمة التميز القانوني.',
        image: typeof window !== 'undefined' ? `${window.location.origin}/legaledition/logo-horizontal.png` : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        siteName: 'شركة ليجّل إديشن للمحاماة والاستشارات القانونية',
        author: 'شركة ليجّل إديشن للمحاماة والاستشارات القانونية',
    });

    // الخلفية تُضبط على body لا على .le-page: ارتدادُ التمرير في iOS يكشف
    // خلفيةَ body لا خلفيةَ الحاوية، فيومض شريطٌ أبيض فوق تصميم داكن.
    // وتُرَدّ عند الفكّ وإلا لوّثت بقيةَ صفحات النظام.
    useEffect(() => {
        const previous = document.body.style.backgroundColor;
        document.body.style.backgroundColor = '#002625';
        return () => {
            document.body.style.backgroundColor = previous;
        };
    }, []);

    return (
        <div className="le-page">
            <div className="le-grain" aria-hidden="true" />

            <main className="le-stage">
                <img
                    className="le-logo"
                    src="/legaledition/logo-stack.png"
                    alt="Legal Edition Law Firm"
                    width={1200}
                    height={1155}
                />

                <h1 className="le-name">
                    شركة ليجّل إديشن
                    <span>للمحاماة والاستشارات القانونية</span>
                </h1>

                <div className="le-rule" aria-hidden="true">
                    <i />
                    <b />
                    <i />
                </div>

                <p className="le-slogan">بصمة التميز القانوني</p>

                <div className="le-actions">
                    <button className="le-button" type="button" onClick={() => navigate('/login')}>
                        <LogIn size={18} aria-hidden="true" />
                        <span>الدخول إلى النظام</span>
                    </button>

                    <a
                        className="le-button le-button--ghost"
                        href={SITE}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Globe size={18} aria-hidden="true" />
                        <span>الموقع الرسمي</span>
                    </a>
                </div>
            </main>
        </div>
    );
};

export default LegalEditionLanding;
