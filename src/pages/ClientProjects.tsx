import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronLeft, FolderKanban } from 'lucide-react';
import { ClientProjectService } from '../services/projectService';
import type { ClientProjectCard } from '../types/projects';
import { PROJECT_STATUS_LABELS } from '../types/projects';
import { PBar, fmtDate } from '../components/projects/ui';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (بدائيّات cx-* + prj-*)

/** «مشاريعي» للعميل: مشاريعه الكبرى وما هو مطلوب منه في كل واحد. */
const ClientProjects: React.FC = () => {
  const [items, setItems] = useState<ClientProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { ClientProjectService.list().then(setItems).catch((e: Error) => setError(e.message)).finally(() => setLoading(false)); }, []);

  return (
    <div className="cx-page prj-scope" dir="rtl">
      <div className="cx-header">
        <div className="cx-header__title">
          <div className="cx-header__icon"><FolderKanban size={20} /></div>
          <div>
            <h1 className="cx-header__h1">مشاريعي</h1>
            <p className="cx-header__sub">المشاريع القانونية التي يديرها المكتب لكم: مراحلها ومواعيدها وما هو مطلوب منكم</p>
          </div>
        </div>
      </div>
      <div className="cx-content">
        {loading ? (
          <div className="cx-skeleton" aria-busy="true"><div className="cx-skeleton__row" /><div className="cx-skeleton__row" /></div>
        ) : error ? (
          <div className="cx-error" role="alert"><AlertCircle size={16} /><span>{error}</span></div>
        ) : items.length === 0 ? (
          <div className="cx-empty"><div className="cx-empty__icon"><FolderKanban size={28} /></div><div className="cx-empty__title">لا مشاريع بعد</div><div className="cx-empty__text">عندما يفتح المكتب مشروعاً باسمكم يظهر هنا.</div></div>
        ) : (
          <div className="cx-list">
            {items.map((p) => (
              <Link key={p.id} to={`/my-projects/${p.id}`} className={`cx-row prj-color-${p.color}`}>
                <span className="cx-row__num"><span className="prj-dot" style={{ marginInlineEnd: 6 }} />{p.code}</span>
                <span className="cx-row__meta">
                  <b style={{ display: 'block', fontSize: 14 }}>{p.name}</b>
                  <span className="prj-dim">{PROJECT_STATUS_LABELS[p.status]}{p.manager_name ? ` · يديره ${p.manager_name}` : ''} · بدأ {fmtDate(p.start_date)}</span>
                  <span style={{ display: 'block', marginTop: 6 }}><PBar value={p.progress} width={220} /></span>
                </span>
                <span className="cx-row__date">{p.pending_from_you > 0 ? <span className="cx-chip cx-chip--partial">مطلوب منكم {p.pending_from_you}</span> : <span className="cx-chip">{p.progress}٪</span>}</span>
                <span className="cx-row__arrow"><ChevronLeft size={16} /></span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientProjects;
