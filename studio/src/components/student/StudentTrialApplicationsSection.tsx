import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import {
  getTrialBadgeClass,
  getTrialStatusLabel,
  type TrialApplicationItem,
} from '../../lib/studentTrialApplications';

interface StudentTrialApplicationsSectionProps {
  profileId?: string;
}

export default function StudentTrialApplicationsSection({ profileId }: StudentTrialApplicationsSectionProps) {
  const { t, i18n } = useTranslation();
  const [trialApplications, setTrialApplications] = useState<TrialApplicationItem[]>([]);
  const [trialApplicationsLoaded, setTrialApplicationsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const getLocale = (): string => {
    const langMap: Record<string, string> = { en: 'en-US', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW' };
    return langMap[i18n.language] || i18n.language || 'en-US';
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        if (!cancelled) {
          setTrialApplications([]);
          setTrialApplicationsLoaded(false);
          setLoading(false);
        }
        return;
      }
      try {
        const trialRes = await api
          .get<{ success?: boolean; data?: TrialApplicationItem[] }>('/student/trial-applications')
          .catch(() => ({ success: false, data: [] }));
        const trialData = (trialRes as { data?: TrialApplicationItem[] }).data;
        let list = Array.isArray(trialData) ? trialData : [];
        if (profileId) {
          const filtered = list.filter((item) => !item.profile_id || item.profile_id === profileId);
          if (filtered.length > 0) list = filtered;
        }
        if (!cancelled) {
          setTrialApplications(list);
          setTrialApplicationsLoaded((trialRes as { success?: boolean }).success === true);
        }
      } catch {
        if (!cancelled) {
          setTrialApplications([]);
          setTrialApplicationsLoaded(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6 animate-pulse">
        <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
        <div className="h-4 w-full bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        {t('dashboard.myTrialApplications')}
      </h2>
      {!trialApplicationsLoaded || trialApplications.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">{t('dashboard.noTrialApplications', '暫無試堂申請')}</p>
      ) : (
        <ul className="space-y-2">
          {trialApplications.map((trial) => (
            <li key={trial.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 gap-3">
              <div className="min-w-0">
                <span className="font-medium text-gray-900">{trial.class_name}</span>
                {trial.assigned_class_name && (
                  <span className="block text-xs text-green-700 mt-0.5">
                    {t('dashboard.trialAssignedTo', '已安排：{{name}}', { name: trial.assigned_class_name })}
                  </span>
                )}
                {trial.applied_date && (
                  <span className="block text-xs text-gray-500 mt-0.5">{formatDate(trial.applied_date, getLocale())}</span>
                )}
              </div>
              <span className={`flex-shrink-0 text-sm font-medium px-2 py-0.5 rounded ${getTrialBadgeClass(trial.status)}`}>
                {getTrialStatusLabel(trial.status, t)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
