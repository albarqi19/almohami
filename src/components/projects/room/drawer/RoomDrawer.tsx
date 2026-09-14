import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, ExternalLink, Home, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { useRoom } from '../RoomContext';
import type { DrawerItem, DrawerType } from '../RoomContext';
import TaskPanel from './TaskPanel';
import DocPanel from './DocPanel';

const TYPE_LABEL: Record<DrawerType, string> = { task: 'مهمة', case: 'قضية', session: 'جلسة', exec: 'طلب تنفيذ', service: 'خدمة قانونية', meeting: 'اجتماع', doc: 'مستند', client: 'العميل' };

/** الصفحة الكاملة للعنصر، للنادر الذي لا تغطيه اللوحة */
export const fullPagePath = (item: DrawerItem): string | null => {
  switch (item.type) {
    case 'task': return `/tasks/${item.id}`;
    case 'case': return `/cases/${item.id}`;
    case 'exec': return '/execution-requests';
    case 'service': return `/legal-services/${item.id}`;
    case 'meeting': return '/meetings/internal';
    case 'doc': return '/documents';
    case 'client': return `/clients/${item.id}`;
    default: return null;
  }
};

const keyOf = (i: DrawerItem) => `${i.type}:${i.id}`;

/**
 * اللوحة الجانبية داخل الغرفة: تفتح من طرف المسرح الأيسر فوق المحتوى، وقائمة الصفحات والترويسة
 * تبقيان ظاهرتين. اللوحات تتراكب (حتى ثلاث) بشريط مسار يعيدك لأي منها، وEscape يغلق الأعلى.
 * ما هو مفتوح يعيش في الرابط فيُنسخ ويُشارك.
 */
const RoomDrawer: React.FC = () => {
  const { project, drawerStack, closeDrawer, popDrawerTo } = useRoom();
  const navigate = useNavigate();
  const [titles, setTitles] = useState<Record<string, string>>({});
  const top = drawerStack[drawerStack.length - 1];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeDrawer]);

  const setTitle = useCallback((item: DrawerItem, title: string) => {
    setTitles((prev) => (prev[keyOf(item)] === title ? prev : { ...prev, [keyOf(item)]: title }));
  }, []);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast.success('نُسخ رابط هذه اللوحة'); }
    catch { toast.error('تعذر نسخ الرابط'); }
  };

  if (!top) return null;
  const full = fullPagePath(top);

  const renderPanel = (item: DrawerItem) => {
    switch (item.type) {
      case 'task': return <TaskPanel key={keyOf(item)} taskId={item.id} onTitle={(t) => setTitle(item, t)} />;
      case 'doc': return <DocPanel key={keyOf(item)} documentId={item.id} onTitle={(t) => setTitle(item, t)} />;
      default:
        return (
          <div className="prj-panel">
            <div className="prj-panel__head"><div className="prj-panel__title"><span className="prj-badge">{TYPE_LABEL[item.type]}</span><h2>#{item.id}</h2></div></div>
            <div className="prj-panel__body"><div className="prj-empty">لوحة {TYPE_LABEL[item.type]} تُبنى في الحزمة التالية. الصفحة الكاملة متاحة الآن من الزر أعلاه.</div></div>
          </div>
        );
    }
  };

  return (
    <>
      <div className="prj-drawer-scrim" onClick={() => closeDrawer()} />
      <aside className="prj-drawer" role="dialog" aria-label="اللوحة الجانبية">
        <div className="prj-drawer__bar">
          <button type="button" className="prj-crumb" onClick={() => closeDrawer(true)} title="إغلاق كل اللوحات والعودة للمشروع"><Home size={12} /> {project.code}</button>
          {drawerStack.map((item, i) => (
            <React.Fragment key={keyOf(item)}>
              <span className="prj-crumb__sep">›</span>
              <button type="button" className={`prj-crumb ${i === drawerStack.length - 1 ? 'is-last' : ''}`} onClick={() => popDrawerTo(i)} title={titles[keyOf(item)] ?? ''}>
                {TYPE_LABEL[item.type]}: {titles[keyOf(item)] ?? `#${item.id}`}
              </button>
            </React.Fragment>
          ))}
          <span className="prj-spacer" />
          <button type="button" className="prj-ibtn" title="نسخ رابط هذه اللوحة" onClick={copyLink}><Copy size={13} /></button>
          {full && <button type="button" className="prj-ibtn" title="الصفحة الكاملة" onClick={() => navigate(full)}><ExternalLink size={13} /></button>}
          <button type="button" className="prj-ibtn" title="إغلاق (Escape)" onClick={() => closeDrawer()}><X size={13} /></button>
        </div>
        <div className="prj-drawer__body">{renderPanel(top)}</div>
      </aside>
    </>
  );
};

export default RoomDrawer;
