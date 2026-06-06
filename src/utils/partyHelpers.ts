// مساعدات عرض أطراف القضية.

/**
 * يُرجع اسم الخصم الأول فقط عند وجود أكثر من خصم.
 * يفصل على الفواصل الشائعة (، , ؛ ; / و الأسطر الجديدة) دون الفصل على حرف العطف "و"
 * تجنباً لقطع الأسماء المركّبة. يُعيد سلسلة فارغة إن لم يوجد اسم.
 */
export const firstOpponent = (name?: string | null): string => {
	if (!name) return '';
	const first = name.split(/[،,؛;/\n]/)[0]?.trim() ?? '';
	return first || name.trim();
};

interface OpponentSource {
	client_role?: string | null;
	plaintiff_name?: string | null;
	opponent_name?: string | null;
}

/**
 * يُرجع اسم الخصم = الطرف المقابل لموقع العميل في القضية.
 * - العميل مدعى عليه  ⇒ الخصم هو المدعي (plaintiff_name)
 * - العميل مدعٍ أو غير معروف ⇒ الخصم هو المدعى عليه (opponent_name)
 *
 * مهم: عمود opponent_name يُملأ دائماً بالمدعى عليه وقت الاستيراد من ناجز، فلو
 * كان العميل نفسه هو المدعى عليه فعرضه مباشرةً يُظهر العميل كخصم — لذا نشتقّه هنا.
 * يعرض الأول فقط عند تعدد الخصوم.
 */
export const resolveOpponent = (c?: OpponentSource | null): string => {
	if (!c) return '';
	if (c.client_role === 'defendant') return firstOpponent(c.plaintiff_name);
	return firstOpponent(c.opponent_name);
};

export default firstOpponent;
