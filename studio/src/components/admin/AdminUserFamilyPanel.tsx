import { useTranslation } from 'react-i18next';
import { formatMobileForDisplay } from '../../lib/utils';
import type { AdminUserFamily } from '../../lib/adminUserFamily';
import AdminUserStudentsTable from './AdminUserStudentsTable';

interface AdminUserFamilyPanelProps {
  family: AdminUserFamily;
  hasTrialApplication?: boolean;
  tokenExpiryDate?: string | null;
  onViewTrials?: () => void;
}

export default function AdminUserFamilyPanel({
  family,
  hasTrialApplication,
  tokenExpiryDate,
  onViewTrials,
}: AdminUserFamilyPanelProps) {
  const { t } = useTranslation();
  const { parent, students } = family;

  const districtLabel = (key: string | null) => {
    if (!key) return '—';
    const tr = t(`districts.${key}`);
    return tr !== `districts.${key}` ? tr : key;
  };

  return (
    <div className="px-4 py-4 bg-slate-50 border-t border-gray-200 space-y-4 text-sm">
      <p className="text-xs text-gray-500">{t('admin.users.familyReadOnlyHint', '學員子帳戶資料由家長於前台維護；以下為檢視用途。')}</p>

      <section className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-3">
          {t('admin.users.parentAccountSection', '家長／登入帳戶')}
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
          <div>
            <dt className="text-gray-500">{t('admin.users.parentDisplayName', '帳戶顯示名')}</dt>
            <dd className="font-medium text-gray-900">{parent.account_display_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('profile.parentsName', '家長姓名')}</dt>
            <dd className="font-medium text-gray-900">{parent.parents_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('admin.users.colEmail')}</dt>
            <dd className="text-gray-900 break-all">{parent.login_email || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('admin.users.colMobile')}</dt>
            <dd className="text-gray-900">{formatMobileForDisplay(parent.login_mobile, '—')}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('profile.contactNumber', '聯絡電話')}</dt>
            <dd className="text-gray-900">{formatMobileForDisplay(parent.contact_number, '—')}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{t('profile.residentialDistrict', '居住地區')}</dt>
            <dd className="text-gray-900">{districtLabel(parent.residential_district)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-emerald-100 bg-white p-4">
        <h3 className="text-sm font-semibold text-emerald-900 mb-3">
          {t('admin.users.studentProfilesSection', '學員資料')}
          <span className="ml-2 text-xs font-normal text-gray-500">
            ({t('admin.users.studentCount', { count: students.length, defaultValue: '{{count}} 位' })})
          </span>
        </h3>
        <AdminUserStudentsTable
          students={students}
          hasTrialApplication={hasTrialApplication}
          tokenExpiryDate={tokenExpiryDate}
          onViewTrials={onViewTrials}
        />
      </section>
    </div>
  );
}
