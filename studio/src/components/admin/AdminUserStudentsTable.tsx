import { useTranslation } from 'react-i18next';
import { BookOpen, Package, Clock, Calendar } from 'lucide-react';
import { formatDateDdMmYy, getAgeFromDateOfBirth } from '../../lib/utils';
import type { AdminStudentProfile } from '../../lib/adminUserFamily';
import {
  formatSexLabel,
  formatStudentAgeLabel,
  formatStudentLevelLabel,
} from '../../lib/adminUserFamily';

export interface AdminUserStudentsTableProps {
  students: AdminStudentProfile[];
  hasTrialApplication?: boolean;
  remainingTokens?: number;
  /** 帳戶層級：最早到期且仍有餘額的代幣批次 */
  tokenExpiryDate?: string | null;
  onViewTrials?: () => void;
  onAssignTokens?: (studentProfileId: string) => void;
  onUpcomingClasses?: (studentProfileId: string) => void;
  onEditTokenExpiry?: () => void;
}

export default function AdminUserStudentsTable({
  students,
  hasTrialApplication = false,
  remainingTokens = 0,
  tokenExpiryDate = null,
  onViewTrials,
  onAssignTokens,
  onUpcomingClasses,
  onEditTokenExpiry,
}: AdminUserStudentsTableProps) {
  const { t } = useTranslation();

  const trialCell = hasTrialApplication ? (
    onViewTrials ? (
      <button
        type="button"
        onClick={onViewTrials}
        className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-primary hover:bg-primary/15"
        title={t('admin.users.viewTrialApplications')}
      >
        <BookOpen className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium">{t('common.yes')}</span>
      </button>
    ) : (
      <span className="inline-flex items-center gap-1 text-primary">
        <BookOpen className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium">{t('common.yes')}</span>
      </span>
    )
  ) : (
    <span className="inline-flex items-center gap-1 text-gray-400" title={t('admin.users.trialAppliedNo')}>
      <BookOpen className="h-3.5 w-3.5 shrink-0 opacity-40" />
      <span>{t('common.no')}</span>
    </span>
  );

  const hasStudentActions = Boolean(onAssignTokens || onUpcomingClasses || onEditTokenExpiry);

  const studentActionButtons = (
    <div className="flex flex-nowrap items-center gap-0.5">
      {onAssignTokens && students[0] && (
        <button
          type="button"
          onClick={() => onAssignTokens(students[0].id)}
          className="text-green-600 hover:text-green-800 p-0.5 inline-flex shrink-0"
          title={t('admin.users.assignTokens')}
        >
          <Package className="h-3.5 w-3.5" />
        </button>
      )}
      {onUpcomingClasses && students[0] && (
        <button
          type="button"
          onClick={() => onUpcomingClasses(students[0].id)}
          className="text-purple-600 hover:text-purple-800 p-0.5 inline-flex shrink-0"
          title={t('admin.users.upcomingClasses')}
        >
          <Clock className="h-3.5 w-3.5" />
        </button>
      )}
      {onEditTokenExpiry && (
        <button
          type="button"
          onClick={onEditTokenExpiry}
          className="text-amber-600 hover:text-amber-800 p-0.5 inline-flex shrink-0"
          title={t('admin.users.editTokenExpiryDate')}
        >
          <Calendar className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  const studentActionsCell = (studentId: string) => (
    <td className="px-3 py-2 align-middle w-0">
      <div className="flex flex-nowrap items-center gap-0.5">
        {onAssignTokens && (
          <button
            type="button"
            onClick={() => onAssignTokens(studentId)}
            className="text-green-600 hover:text-green-800 p-0.5 inline-flex shrink-0"
            title={t('admin.users.assignTokens')}
          >
            <Package className="h-3.5 w-3.5" />
          </button>
        )}
        {onUpcomingClasses && (
          <button
            type="button"
            onClick={() => onUpcomingClasses(studentId)}
            className="text-purple-600 hover:text-purple-800 p-0.5 inline-flex shrink-0"
            title={t('admin.users.upcomingClasses')}
          >
            <Clock className="h-3.5 w-3.5" />
          </button>
        )}
        {onEditTokenExpiry && (
          <button
            type="button"
            onClick={onEditTokenExpiry}
            className="text-amber-600 hover:text-amber-800 p-0.5 inline-flex shrink-0"
            title={t('admin.users.editTokenExpiryDate')}
          >
            <Calendar className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </td>
  );

  if (students.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-500 px-1">{t('admin.users.noStudentProfiles')}</p>
        {hasStudentActions && <div className="px-1">{studentActionButtons}</div>}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs border border-gray-200 rounded-md overflow-hidden bg-white">
        <thead className="bg-emerald-50 text-gray-600">
          <tr>
            <th className="px-3 py-2 text-left font-medium">{t('admin.users.colStudentName')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('admin.users.colDateOfBirth')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('admin.users.colSex')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('admin.users.colIdCardLast4')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('admin.users.colTrialApplied')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('admin.users.colRemainingTokens')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('admin.users.colTokenExpiry')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('profile.studentAge')}</th>
            <th className="px-3 py-2 text-left font-medium">{t('profile.level')}</th>
            {hasStudentActions && (
              <th className="px-3 py-2 w-0" aria-label={t('admin.users.actions')}>
                <span className="sr-only">{t('admin.users.actions')}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {students.map((s, index) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{s.full_name}</td>
              <td className="px-3 py-2 text-gray-700 whitespace-nowrap tabular-nums">
                {s.date_of_birth ? formatDateDdMmYy(s.date_of_birth) : '—'}
              </td>
              <td className="px-3 py-2 text-gray-700">{formatSexLabel(s.sex, t)}</td>
              <td className="px-3 py-2 text-gray-700 font-mono text-center">{s.id_card_last4 || '—'}</td>
              <td className="px-3 py-2">{trialCell}</td>
              <td className="px-3 py-2 text-gray-700 text-center tabular-nums">
                {s.remaining_tokens != null ? s.remaining_tokens : index === 0 ? remainingTokens : '—'}
              </td>
              <td className="px-3 py-2 text-gray-700 whitespace-nowrap tabular-nums">
                {s.token_expiry_date
                  ? formatDateDdMmYy(s.token_expiry_date)
                  : index === 0 && tokenExpiryDate
                    ? formatDateDdMmYy(tokenExpiryDate)
                    : '—'}
              </td>
              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                {formatStudentAgeLabel(s, t, getAgeFromDateOfBirth)}
              </td>
              <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                {formatStudentLevelLabel(s.level, t)}
              </td>
              {hasStudentActions && studentActionsCell(s.id)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
