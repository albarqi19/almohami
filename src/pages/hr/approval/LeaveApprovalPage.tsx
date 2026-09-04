import React from 'react';

import { LeaveApprovalQueue } from './LeaveApprovalQueue';

/**
 * **صفحةُ الاعتماد** `/hr/leave/approvals` — الطابورُ ولوحُ التعارض على مسارٍ خاصٍّ بهما.
 *
 * ✅ **وقد وُصل**: `LeavePage` صار له تبويبٌ رابعٌ (`?tab=approvals`) يركّب `LeaveApprovalQueue`
 * نفسَه. وهذا المسارُ يبقى — **سطحان لا نسخَتان**: مكوّنٌ واحدٌ وخطّافٌ واحدٌ وكاشفٌ واحد،
 * وما يُصلَح في أحدهما يظهر في الآخر بالضرورة لا بالتذكّر. وفائدةُ بقائه رابطٌ عميقٌ يُرسَل
 * لمعتمِدٍ بلا أن يهبط وسطَ شاشةِ إدارةٍ كاملة.
 * ولا شيءَ في هذا الملفّ ولا في مكوّناته يعتمد على شيءٍ من `LeavePage` — فالوصلُ لا ينقض.
 *
 * القراءةُ محروسةٌ بـ`hr.view` في المُوجِّه، والقرارُ محروسٌ بـ`hr.leave.manage` في الخادم
 * على مسارَي `approve`/`reject` — فمن يرى الطابورَ قد لا يملك القرار، والخادمُ يحكم.
 */
export const LeaveApprovalPage: React.FC = () => (
  <div className="hrl-page">
    <main className="hrl-stage">
      <header className="hrl-head">
        <div className="hrl-head__id">
          <h1 className="hrl-h1">اعتماد الإجازات</h1>
          <p className="hrl-sub">
            ما يقع في مدة كل طلب (جلسات ومهام وغيابات متداخلة) يظهر قبل القرار.
            ولا يمنع أي منها الاعتماد.
          </p>
        </div>
      </header>

      <LeaveApprovalQueue />
    </main>
  </div>
);

export default LeaveApprovalPage;
