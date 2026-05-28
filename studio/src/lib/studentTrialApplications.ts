export type TrialStatus =
  | 'pending'
  | 'assigned'
  | 'confirmed'
  | 'contacted'
  | 'attended_trial'
  | 'converted'
  | 'cancelled'
  | 'could_not_assign';

export interface TrialApplicationItem {
  id: string;
  class_name: string;
  status: TrialStatus;
  applied_date?: string;
  assigned_class_name?: string | null;
  profile_id?: string;
  student_name?: string;
  user_id?: string;
}

export const FALLBACK_TRIAL_APPLICATIONS: TrialApplicationItem[] = [
  {
    id: 't1',
    class_name: '兒童芭蕾試堂',
    status: 'assigned',
    applied_date: new Date().toISOString(),
    assigned_class_name: '兒童芭蕾 A',
  },
  {
    id: 't2',
    class_name: '兒童爵士試堂',
    status: 'pending',
    applied_date: new Date().toISOString(),
  },
];

export function getTrialStatusLabel(status: TrialStatus, t: (k: string, d?: string) => string): string {
  switch (status) {
    case 'assigned':
    case 'confirmed':
    case 'contacted':
    case 'attended_trial':
      return t('dashboard.trialStatusConfirmed', '已確認');
    case 'converted':
      return t('dashboard.trialStatusConverted', '已轉正式');
    case 'cancelled':
      return t('dashboard.trialStatusCancelled', '已取消');
    case 'could_not_assign':
      return t('dashboard.trialStatusCouldNotAssign', '未能安排');
    case 'pending':
    default:
      return t('dashboard.trialStatusPending', '待確認');
  }
}

export function getTrialBadgeClass(status: TrialStatus): string {
  switch (status) {
    case 'assigned':
    case 'confirmed':
    case 'contacted':
    case 'attended_trial':
      return 'bg-green-100 text-green-800';
    case 'converted':
      return 'bg-blue-100 text-blue-800';
    case 'cancelled':
      return 'bg-gray-200 text-gray-600';
    case 'could_not_assign':
      return 'bg-red-100 text-red-700';
    case 'pending':
    default:
      return 'bg-amber-100 text-amber-800';
  }
}
