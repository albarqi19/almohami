export interface LawyerReportData {
  id: number;
  name: string;
  avatar: string | null;
  role: string;
  total_cases: number;
  active_cases: number;
  won_cases: number;
  win_rate: number;
  total_tasks: number;
  completed_tasks: number;
  task_completion_rate: number;
  overdue_tasks: number;
  next_hearing_date: string | null;
  contract_value_total: number;
}

export interface CaseData {
  id: number;
  file_number: string;
  title: string;
  status: string;
  outcome: string | null;
  client_name: string;
  case_type: string;
  priority: string;
  filing_date: string;
  next_hearing: string | null;
  contract_value: number;
}

export interface TaskStats {
  total: number;
  completed: number;
  in_progress: number;
  overdue: number;
  completion_rate: number;
}

export interface WinRateStats {
  percentage: number;
  won: number;
  lost: number;
  settled: number;
  total_closed: number;
}

export interface MonthlyPerformance {
  month: string;
  cases: number;
  tasks_completed: number;
}

export interface LawyerDetailData {
  lawyer: {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
  };
  cases: CaseData[];
  active_cases: CaseData[];
  task_stats: TaskStats;
  win_rate: WinRateStats;
  monthly_performance: MonthlyPerformance[];
}

export interface DateFilter {
  period: 'current_month' | 'last_3_months' | 'this_year' | 'custom';
  start_date?: string;
  end_date?: string;
}
