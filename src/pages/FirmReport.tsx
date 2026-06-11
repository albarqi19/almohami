import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
	Scale, Gavel, TrendingUp, TrendingDown, Trophy, AlertTriangle, RefreshCw,
	Briefcase, CalendarClock, FileCheck, Users, Building2, Landmark, Banknote,
	ShieldAlert, Handshake, CircleSlash, Target, Crown, Flame,
} from 'lucide-react';
import { apiClient } from '../utils/api';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

/* ===================== أنواع البيانات (مطابقة لـ /firm-report) ===================== */

interface Kpis {
	total_cases: number; active_cases: number; closed_cases: number;
	win_rate: number | null; total_outcomes: number;
	total_sessions: number; total_judgements: number; objection_open: number;
	clients_count: number; lawyers_count: number;
	wekalat_total: number; wekalat_expired: number;
}
interface Outcomes {
	won: number; won_partial: number; lost: number; lost_partial: number;
	settled: number; dismissed: number; total: number; win_rate: number | null;
}
interface RoleOutcome { role: 'plaintiff' | 'defendant'; won: number; lost: number; settled: number; win_rate: number | null }
interface TypeOutcome { type: string; won: number; lost: number; settled: number; total: number; win_rate: number | null }
interface CourtRow { court: string; judgements: number; won: number; lost: number; win_rate: number | null }
interface LawyerRow {
	id: number; name: string; role: string; total: number; active: number;
	won: number; won_partial: number; lost: number; settled: number; win_rate: number | null;
	top_court: { name: string; judgements: number } | null;
	best_type: { name: string; won: number } | null;
	worst_type: { name: string; lost: number } | null;
}
interface MonthRow { ym: string; filed: number; judgements: number }
interface ObjectionRow { case_id: number; file_number: string | null; title: string | null; court: string | null; remaining_days: number | null }
interface FirmReportData {
	generated_at: string;
	kpis: Kpis;
	outcomes: Outcomes;
	outcomes_by_role: RoleOutcome[];
	outcomes_by_type: TypeOutcome[];
	courts: CourtRow[];
	lawyers: LawyerRow[];
	monthly: MonthRow[];
	najiz_statuses: { status: string; count: number }[];
	judgement_types: { type: string; count: number }[];
	objection_judgements: ObjectionRow[];
	sessions: { total: number; with_dabt: number; upcoming: number; avg_per_case: number; top_cases: { case_id: number; file_number: string | null; title: string | null; sessions: number }[] };
	top_clients: { name: string; cases: number; active: number; won: number; lost: number }[];
	wekalat: { total: number; expired: number; expiring_30d: number };
	finance: { contracts_count: number; contracts_value: number; invoices_count: number; invoices_total: number; invoices_paid: number; invoices_outstanding: number };
	team: { lawyers: number; legal_assistants: number; admins: number; clients: number };
}

/* ===================== مساعدات ===================== */

const MONTHS_AR = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'];
const ROLE_LABELS: Record<string, string> = {
	admin: 'مدير', owner: 'مالك', partner: 'شريك', lawyer: 'محامٍ',
	senior_lawyer: 'محامٍ أول', legal_assistant: 'مساعد قانوني',
};

const n = (v: number | null | undefined) => (v ?? 0).toLocaleString('en-US');
const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v}%`);
const money = (v: number) => v >= 1000 ? `${(v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} ألف` : v.toLocaleString('en-US');
const monthLabel = (ym: string) => {
	const m = parseInt(ym.slice(5), 10);
	return MONTHS_AR[m - 1] ?? ym;
};
const rateClass = (r: number | null) => r === null ? '' : r >= 60 ? 'fr-good' : r >= 45 ? 'fr-mid' : 'fr-bad';

/* شريط نسبة كسب مصغّر */
const RateBar: React.FC<{ rate: number | null }> = ({ rate }) => (
	<div className="fr-ratebar" title={pct(rate)}>
		<div className="fr-ratebar__track">
			{rate !== null && <div className={`fr-ratebar__fill ${rateClass(rate)}`} style={{ width: `${Math.min(100, rate)}%` }} />}
		</div>
		<span className={`fr-ratebar__num ${rateClass(rate)}`}>{pct(rate)}</span>
	</div>
);

/* ===================== الصفحة ===================== */

const FirmReport: React.FC = () => {
	const { data, isLoading, isFetching, error, refetch } = useQuery<FirmReportData>({
		queryKey: ['firm-report'],
		queryFn: async () => {
			const res = await apiClient.get<{ success: boolean; data: FirmReportData }>('/firm-report');
			return res.data;
		},
		staleTime: 5 * 60 * 1000,
	});

	const refresh = async () => {
		await apiClient.get('/firm-report?refresh=1');
		refetch();
	};

	const insights = useMemo(() => {
		if (!data) return [];
		const out: { icon: React.ReactNode; text: string }[] = [];
		const qualified = data.lawyers.filter(l => (l.won + l.lost) >= 10 && l.win_rate !== null);
		if (qualified.length) {
			const best = [...qualified].sort((a, b) => (b.win_rate ?? 0) - (a.win_rate ?? 0))[0];
			out.push({ icon: <Crown size={13} />, text: `أعلى نسبة كسب: ${best.name} (${pct(best.win_rate)} من ${best.won + best.lost} قضية محسومة)` });
			const worst = [...qualified].sort((a, b) => (a.win_rate ?? 0) - (b.win_rate ?? 0))[0];
			if (worst.id !== best.id) out.push({ icon: <Flame size={13} />, text: `الأكثر حاجة للدعم: ${worst.name} (${pct(worst.win_rate)})` });
		}
		const pl = data.outcomes_by_role.find(r => r.role === 'plaintiff');
		const df = data.outcomes_by_role.find(r => r.role === 'defendant');
		if (pl?.win_rate != null && df?.win_rate != null) {
			const diff = Math.abs(pl.win_rate - df.win_rate).toFixed(1);
			out.push({
				icon: <Target size={13} />,
				text: pl.win_rate >= df.win_rate
					? `أداؤكم كمدّعين (${pct(pl.win_rate)}) أقوى منه كمدّعى عليهم (${pct(df.win_rate)}) بفارق ${diff} نقطة`
					: `أداؤكم كمدّعى عليهم (${pct(df.win_rate)}) أقوى منه كمدّعين (${pct(pl.win_rate)}) بفارق ${diff} نقطة`,
			});
		}
		const types = data.outcomes_by_type.filter(t => t.win_rate !== null && (t.won + t.lost) >= 5);
		if (types.length) {
			const bt = [...types].sort((a, b) => (b.win_rate ?? 0) - (a.win_rate ?? 0))[0];
			const wt = [...types].sort((a, b) => (a.win_rate ?? 0) - (b.win_rate ?? 0))[0];
			out.push({ icon: <Trophy size={13} />, text: `أقوى تخصص: «${bt.type}» بنسبة كسب ${pct(bt.win_rate)}` });
			if (wt.type !== bt.type) out.push({ icon: <TrendingDown size={13} />, text: `أضعف تخصص: «${wt.type}» بنسبة كسب ${pct(wt.win_rate)}` });
		}
		return out;
	}, [data]);

	if (isLoading) {
		return (
			<div className="fr-page">
				<div className="fr-loading"><RefreshCw className="fr-spin" size={18} /> جارٍ تجهيز تقرير أداء الشركة…</div>
			</div>
		);
	}
	if (error || !data) {
		return (
			<div className="fr-page">
				<div className="fr-error">تعذّر تحميل التقرير — تأكد من صلاحياتك ثم أعد المحاولة.</div>
			</div>
		);
	}

	const { kpis, outcomes, sessions, wekalat, finance, team } = data;
	const o = outcomes;
	const donutTotal = Math.max(1, o.total);
	const deg = (v: number) => (v / donutTotal) * 360;
	const wonDeg = deg(o.won), lostDeg = deg(o.lost), settledDeg = deg(o.settled);
	const monthlyMax = Math.max(1, ...data.monthly.map(m => Math.max(m.filed, m.judgements)));
	const dabtPct = sessions.total > 0 ? Math.round((sessions.with_dabt / sessions.total) * 100) : 0;
	const najizMax = Math.max(1, ...data.najiz_statuses.map(s => s.count));

	return (
		<div className="fr-page" dir="rtl">
			{/* ===== الترويسة ===== */}
			<div className="fr-header">
				<div>
					<h1><Scale size={20} /> تقرير أداء الشركة</h1>
					<span className="fr-sub">
						نظرة تنفيذية شاملة · حُدِّث {new Date(data.generated_at).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })}
						· نسبة الكسب = كسب ÷ (كسب + خسارة)
					</span>
				</div>
				<button className="fr-refresh" onClick={refresh} disabled={isFetching}>
					<RefreshCw size={14} className={isFetching ? 'fr-spin' : ''} /> تحديث
				</button>
			</div>

			{/* ===== تنبيه مهل الاعتراض ===== */}
			{kpis.objection_open > 0 && (
				<div className="fr-alert">
					<ShieldAlert size={15} />
					<b>{n(kpis.objection_open)} حكماً</b> ما زال متاحاً للاعتراض عليه — راجع قائمة «مهل الاعتراض» أدناه قبل فوات المدد النظامية.
				</div>
			)}

			{/* ===== شريط المؤشرات ===== */}
			<div className="fr-kpis">
				<div className="fr-kpi"><Briefcase size={15} /><b>{n(kpis.total_cases)}</b><span>إجمالي القضايا</span></div>
				<div className="fr-kpi fr-kpi--info"><TrendingUp size={15} /><b>{n(kpis.active_cases)}</b><span>قضايا جارية</span></div>
				<div className="fr-kpi"><FileCheck size={15} /><b>{n(kpis.closed_cases)}</b><span>قضايا مغلقة</span></div>
				<div className={`fr-kpi ${kpis.win_rate !== null && kpis.win_rate >= 50 ? 'fr-kpi--good' : 'fr-kpi--warn'}`}><Trophy size={15} /><b>{pct(kpis.win_rate)}</b><span>نسبة الكسب</span></div>
				<div className="fr-kpi"><CalendarClock size={15} /><b>{n(kpis.total_sessions)}</b><span>الجلسات</span></div>
				<div className="fr-kpi"><Gavel size={15} /><b>{n(kpis.total_judgements)}</b><span>الأحكام</span></div>
				<div className={`fr-kpi ${kpis.objection_open > 0 ? 'fr-kpi--warn' : ''}`}><ShieldAlert size={15} /><b>{n(kpis.objection_open)}</b><span>مهلة اعتراض مفتوحة</span></div>
				<div className="fr-kpi"><Users size={15} /><b>{n(kpis.clients_count)}</b><span>عملاء لهم قضايا</span></div>
				<div className="fr-kpi"><Building2 size={15} /><b>{n(kpis.lawyers_count)}</b><span>محامو الفريق</span></div>
				<div className={`fr-kpi ${kpis.wekalat_expired > 0 ? 'fr-kpi--warn' : ''}`}><FileCheck size={15} /><b>{n(kpis.wekalat_total)}</b><span>وكالات ({n(kpis.wekalat_expired)} منتهية)</span></div>
			</div>

			{/* ===== قراءات ذكية ===== */}
			{insights.length > 0 && (
				<div className="fr-insights">
					{insights.map((i, idx) => <span key={idx} className="fr-insight">{i.icon}{i.text}</span>)}
				</div>
			)}

			{/* ===== الصف الأول: النتائج + الصفة + الاتجاه ===== */}
			<div className="fr-grid">
				<section className="fr-card fr-span3">
					<h2><Trophy size={14} /> حصيلة النتائج <i>{n(o.total)} قضية محسومة</i></h2>
					<div className="fr-donut-wrap">
						<div
							className="fr-donut"
							style={{
								background: `conic-gradient(
									var(--color-success) 0deg ${wonDeg}deg,
									var(--color-error) ${wonDeg}deg ${wonDeg + lostDeg}deg,
									var(--color-warning) ${wonDeg + lostDeg}deg ${wonDeg + lostDeg + settledDeg}deg,
									var(--color-gray-300) ${wonDeg + lostDeg + settledDeg}deg 360deg)`,
							}}
						>
							<div className="fr-donut__hole">
								<b className={rateClass(o.win_rate)}>{pct(o.win_rate)}</b>
								<span>نسبة الكسب</span>
							</div>
						</div>
						<div className="fr-legend">
							<div><i className="fr-dot fr-dot--won" /> كسب <b>{n(o.won)}</b>{o.won_partial > 0 && <em>منها {n(o.won_partial)} جزئي</em>}</div>
							<div><i className="fr-dot fr-dot--lost" /> خسارة <b>{n(o.lost)}</b>{o.lost_partial > 0 && <em>منها {n(o.lost_partial)} جزئي</em>}</div>
							<div><i className="fr-dot fr-dot--settled" /> تسوية / صلح <b>{n(o.settled)}</b></div>
							<div><i className="fr-dot fr-dot--dismissed" /> صرف / شطب <b>{n(o.dismissed)}</b></div>
						</div>
					</div>
				</section>

				<section className="fr-card fr-span3">
					<h2><Scale size={14} /> الأداء حسب صفة العميل</h2>
					{data.outcomes_by_role.map(r => (
						<div key={r.role} className="fr-rolecard">
							<div className="fr-rolecard__head">
								<b>{r.role === 'plaintiff' ? 'وكلاء عن المدّعي' : 'وكلاء عن المدّعى عليه'}</b>
								<span className={`fr-chip ${rateClass(r.win_rate)}`}>{pct(r.win_rate)}</span>
							</div>
							<div className="fr-stack">
								<div className="fr-stack__won" style={{ flexGrow: r.won || 0.001 }} title={`كسب ${n(r.won)}`} />
								<div className="fr-stack__lost" style={{ flexGrow: r.lost || 0.001 }} title={`خسارة ${n(r.lost)}`} />
								<div className="fr-stack__settled" style={{ flexGrow: r.settled || 0.001 }} title={`تسوية ${n(r.settled)}`} />
							</div>
							<div className="fr-rolecard__nums">كسب {n(r.won)} · خسارة {n(r.lost)} · تسوية {n(r.settled)}</div>
						</div>
					))}
					<p className="fr-note">تشمل القضايا المحسومة ذات صفة موكّل محدّدة فقط.</p>
				</section>

				<section className="fr-card fr-span6">
					<h2><TrendingUp size={14} /> الاتجاه الشهري — آخر 12 شهراً <i>قضايا مرفوعة مقابل أحكام صادرة</i></h2>
					<div className="fr-chart">
						{data.monthly.map(m => (
							<div key={m.ym} className="fr-chart__col" title={`${m.ym}: مرفوعة ${m.filed} · أحكام ${m.judgements}`}>
								<div className="fr-chart__bars">
									<div className="fr-chart__bar fr-chart__bar--filed" style={{ height: `${(m.filed / monthlyMax) * 100}%` }} />
									<div className="fr-chart__bar fr-chart__bar--judg" style={{ height: `${(m.judgements / monthlyMax) * 100}%` }} />
								</div>
								<span className="fr-chart__label">{monthLabel(m.ym)}</span>
							</div>
						))}
					</div>
					<div className="fr-chart__legend">
						<span><i className="fr-dot fr-dot--filed" /> قضايا مرفوعة</span>
						<span><i className="fr-dot fr-dot--judg" /> أحكام صادرة</span>
					</div>
				</section>
			</div>

			{/* ===== جدول المحامين ===== */}
			<section className="fr-card">
				<h2><Users size={14} /> أداء المحامين <i>مرتّب حسب حجم القضايا · النتائج على القضايا المشارك فيها</i></h2>
				<div className="fr-tablewrap">
					<table className="fr-table">
						<thead>
							<tr>
								<th>المحامي</th><th>الدور</th><th>القضايا</th><th>جارية</th>
								<th className="fr-th-won">كسب</th><th>جزئي</th><th className="fr-th-lost">خسارة</th><th>تسوية</th>
								<th style={{ minWidth: 110 }}>نسبة الكسب</th>
								<th>أبرز محكمة</th><th>يتميّز في</th><th>يتعثّر في</th>
							</tr>
						</thead>
						<tbody>
							{data.lawyers.map(l => (
								<tr key={l.id}>
									<td className="fr-td-name">{l.name}</td>
									<td><span className="fr-rolechip">{ROLE_LABELS[l.role] ?? l.role}</span></td>
									<td><b>{n(l.total)}</b></td>
									<td>{n(l.active)}</td>
									<td className="fr-td-won">{n(l.won)}</td>
									<td>{l.won_partial > 0 ? n(l.won_partial) : '—'}</td>
									<td className="fr-td-lost">{n(l.lost)}</td>
									<td>{n(l.settled)}</td>
									<td><RateBar rate={l.win_rate} /></td>
									<td className="fr-td-dim">{l.top_court ? `${l.top_court.name} (${n(l.top_court.judgements)})` : '—'}</td>
									<td className="fr-td-dim fr-td-won">{l.best_type ? `${l.best_type.name} (${n(l.best_type.won)} كسب)` : '—'}</td>
									<td className="fr-td-dim fr-td-lost">{l.worst_type ? `${l.worst_type.name} (${n(l.worst_type.lost)} خسارة)` : '—'}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>

			{/* ===== الصف الثالث: الأنواع + المحاكم + الأحكام ===== */}
			<div className="fr-grid">
				<section className="fr-card fr-span4">
					<h2><Briefcase size={14} /> نسبة الكسب حسب نوع القضية <i>الأنواع الأكثر تكراراً</i></h2>
					{data.outcomes_by_type.length === 0 && <p className="fr-empty">لا توجد نتائج محسومة بعد.</p>}
					{data.outcomes_by_type.map(t => (
						<div key={t.type} className="fr-typerow">
							<div className="fr-typerow__head">
								<span className="fr-typerow__name" title={t.type}>{t.type}</span>
								<span className="fr-typerow__nums">{n(t.won)}ك / {n(t.lost)}خ{t.settled > 0 ? ` / ${n(t.settled)}ت` : ''}</span>
								<span className={`fr-chip ${rateClass(t.win_rate)}`}>{pct(t.win_rate)}</span>
							</div>
							<div className="fr-stack fr-stack--thin">
								<div className="fr-stack__won" style={{ flexGrow: t.won || 0.001 }} />
								<div className="fr-stack__lost" style={{ flexGrow: t.lost || 0.001 }} />
								<div className="fr-stack__settled" style={{ flexGrow: t.settled || 0.001 }} />
							</div>
						</div>
					))}
				</section>

				<section className="fr-card fr-span4">
					<h2><Landmark size={14} /> المحاكم <i>من واقع {n(kpis.total_judgements)} حكماً</i></h2>
					{data.courts.length === 0 && <p className="fr-empty">لا توجد أحكام مستوردة بعد.</p>}
					<table className="fr-minitable">
						<thead><tr><th>المحكمة</th><th>أحكام</th><th>ك/خ</th><th style={{ minWidth: 90 }}>نسبة الكسب</th></tr></thead>
						<tbody>
							{data.courts.map(c => (
								<tr key={c.court}>
									<td className="fr-td-name" title={c.court}>{c.court}</td>
									<td><b>{n(c.judgements)}</b></td>
									<td><span className="fr-td-won">{n(c.won)}</span>/<span className="fr-td-lost">{n(c.lost)}</span></td>
									<td><RateBar rate={c.win_rate} /></td>
								</tr>
							))}
						</tbody>
					</table>
					<p className="fr-note">القضية ذات أحكام في أكثر من محكمة (ابتدائي ثم استئناف) تُحسب في كلتيهما.</p>
				</section>

				<section className="fr-card fr-span4">
					<h2><Gavel size={14} /> خريطة الأحكام</h2>
					{data.judgement_types.map(j => (
						<div key={j.type} className="fr-jrow">
							<span>{j.type}</span>
							<div className="fr-jrow__bar"><div style={{ width: `${(j.count / Math.max(1, kpis.total_judgements)) * 100}%` }} /></div>
							<b>{n(j.count)}</b>
						</div>
					))}
					{data.objection_judgements.length > 0 && (
						<>
							<h3 className="fr-subhead"><AlertTriangle size={12} /> أقرب مهل الاعتراض</h3>
							{data.objection_judgements.map((ob, i) => (
								<div key={i} className="fr-objrow">
									<span className="fr-objrow__file">{ob.file_number ?? `#${ob.case_id}`}</span>
									<span className="fr-objrow__court" title={ob.court ?? ''}>{ob.court ?? '—'}</span>
									<span className={`fr-chip ${ob.remaining_days !== null && ob.remaining_days <= 7 ? 'fr-bad' : 'fr-mid'}`}>
										{ob.remaining_days !== null ? `باقي ${n(ob.remaining_days)} يوم` : 'غير محدد'}
									</span>
								</div>
							))}
						</>
					)}
				</section>
			</div>

			{/* ===== الصف الرابع: ناجز + الجلسات + العملاء ===== */}
			<div className="fr-grid">
				<section className="fr-card fr-span4">
					<h2><FileCheck size={14} /> حالات القضايا في ناجز</h2>
					{data.najiz_statuses.length === 0 && <p className="fr-empty">لا توجد قضايا مستوردة من ناجز.</p>}
					{data.najiz_statuses.map(s => (
						<div key={s.status} className="fr-jrow">
							<span>{s.status}</span>
							<div className="fr-jrow__bar"><div style={{ width: `${(s.count / najizMax) * 100}%` }} /></div>
							<b>{n(s.count)}</b>
						</div>
					))}
				</section>

				<section className="fr-card fr-span4">
					<h2><CalendarClock size={14} /> الجلسات</h2>
					<div className="fr-cells">
						<div className="fr-cell"><b>{n(sessions.total)}</b><span>إجمالي الجلسات</span></div>
						<div className="fr-cell"><b>{n(sessions.upcoming)}</b><span>قادمة</span></div>
						<div className="fr-cell"><b>{sessions.avg_per_case}</b><span>متوسط لكل قضية</span></div>
						<div className="fr-cell"><b className={dabtPct >= 80 ? 'fr-good' : 'fr-mid'}>{dabtPct}%</b><span>تغطية الضبوط ({n(sessions.with_dabt)})</span></div>
					</div>
					{sessions.top_cases.length > 0 && (
						<>
							<h3 className="fr-subhead"><Flame size={12} /> الأطول تقاضياً (عدد الجلسات)</h3>
							{sessions.top_cases.map(c => (
								<div key={c.case_id} className="fr-objrow">
									<span className="fr-objrow__file">{c.file_number ?? `#${c.case_id}`}</span>
									<span className="fr-objrow__court" title={c.title ?? ''}>{c.title ?? '—'}</span>
									<span className="fr-chip fr-mid">{n(c.sessions)} جلسة</span>
								</div>
							))}
						</>
					)}
				</section>

				<section className="fr-card fr-span4">
					<h2><Handshake size={14} /> كبار العملاء <i>حسب عدد القضايا</i></h2>
					<table className="fr-minitable">
						<thead><tr><th>العميل</th><th>قضايا</th><th>جارية</th><th>كسب</th><th>خسارة</th></tr></thead>
						<tbody>
							{data.top_clients.map(c => (
								<tr key={c.name}>
									<td className="fr-td-name" title={c.name}>{c.name}</td>
									<td><b>{n(c.cases)}</b></td>
									<td>{n(c.active)}</td>
									<td className="fr-td-won">{n(c.won)}</td>
									<td className="fr-td-lost">{n(c.lost)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>
			</div>

			{/* ===== الشريط السفلي: وكالات + مالية + فريق ===== */}
			<div className="fr-grid">
				<section className="fr-card fr-span4">
					<h2><FileCheck size={14} /> الوكالات</h2>
					<div className="fr-cells">
						<div className="fr-cell"><b>{n(wekalat.total)}</b><span>إجمالي</span></div>
						<div className="fr-cell"><b className={wekalat.expired > 0 ? 'fr-bad' : 'fr-good'}>{n(wekalat.expired)}</b><span>منتهية</span></div>
						<div className="fr-cell"><b className={wekalat.expiring_30d > 0 ? 'fr-mid' : ''}>{n(wekalat.expiring_30d)}</b><span>تنتهي خلال 30 يوماً</span></div>
					</div>
				</section>
				<section className="fr-card fr-span4">
					<h2><Banknote size={14} /> مؤشرات مالية</h2>
					<div className="fr-cells">
						<div className="fr-cell"><b>{n(finance.contracts_count)}</b><span>عقود ({money(finance.contracts_value)} ر.س)</span></div>
						<div className="fr-cell"><b>{money(finance.invoices_total)}</b><span>فواتير (ر.س)</span></div>
						<div className="fr-cell"><b className="fr-good">{money(finance.invoices_paid)}</b><span>محصَّل</span></div>
						<div className="fr-cell"><b className={finance.invoices_outstanding > 0 ? 'fr-mid' : ''}>{money(finance.invoices_outstanding)}</b><span>متبقٍ</span></div>
					</div>
				</section>
				<section className="fr-card fr-span4">
					<h2><Users size={14} /> الفريق</h2>
					<div className="fr-cells">
						<div className="fr-cell"><b>{n(team.lawyers)}</b><span>محامون</span></div>
						<div className="fr-cell"><b>{n(team.legal_assistants)}</b><span>مساعدون قانونيون</span></div>
						<div className="fr-cell"><b>{n(team.admins)}</b><span>إدارة</span></div>
						<div className="fr-cell"><b>{n(team.clients)}</b><span>حسابات عملاء</span></div>
					</div>
				</section>
			</div>

			<p className="fr-footnote">
				<CircleSlash size={11} /> «الجزئي» كسب أو خسارة بحكم لصالحكم/ضدكم في جزء من الطلبات · نتائج القضايا مستخرجة آلياً من نصوص الأحكام ومراجعة حسب درجة الثقة · المحاكم مستقاة من الأحكام الصادرة فعلياً.
			</p>
		</div>
	);
};

export default FirmReport;
