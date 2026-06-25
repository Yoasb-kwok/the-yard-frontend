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
  preferred_datetime?: string | null;
  class_end_time?: string | null;
  class_location?: string | null;
  assigned_class_name?: string | null;
  profile_id?: string;
  student_name?: string;
  user_id?: string;
}

export function getTrialBranchLabel(
  location: string | null | undefined,
  t: (key: string, fallback?: string) => string,
): string {
  const key = String(location || '').trim().toLowerCase();
  if (!key) return '';
  const translated = t(`home.locations.${key}`, '');
  return translated || key;
}

export function formatTrialClassSchedule(
  trial: Pick<TrialApplicationItem, 'preferred_datetime' | 'class_end_time'>,
  locale: string,
  formatDateTimeRange: (start: string | Date, end: string | Date, locale?: string) => string,
  formatDateTime: (date: string | Date, locale?: string) => string,
): string {
  const start = trial.preferred_datetime;
  if (!start) return '';
  const end = trial.class_end_time;
  if (end) return formatDateTimeRange(start, end, locale);
  return formatDateTime(start, locale);
}

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
