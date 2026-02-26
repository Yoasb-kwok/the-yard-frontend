import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface SidebarClass {
  id: string;
  name: string;
  program_code?: string;
  start_time: string;
}

function toSidebarClasses(enrollments: { id: string; class: { name: string; program_code?: string; start_time: string } }[]): SidebarClass[] {
  return enrollments.slice(0, 5).map((e) => ({
    id: e.id,
    name: e.class.name,
    program_code: e.class.program_code,
    start_time: e.class.start_time,
  }));
}

export default function StudentSidebarSchedule() {
  const { profile } = useAuth();
  const { t, i18n } = useTranslation();
  const [classes, setClasses] = useState<SidebarClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setClasses([]);
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    api
      .get<{ data?: unknown[] }>('/student/upcoming-classes', profile?.id ? { profileId: profile.id } : undefined)
      .then((res: any) => {
        const data = res?.data;
        const list = Array.isArray(data) ? data : [];
        const sorted = [...list].sort(
          (a: { class: { start_time: string } }, b: { class: { start_time: string } }) =>
            new Date(a.class.start_time).getTime() - new Date(b.class.start_time).getTime()
        );
        setClasses(toSidebarClasses(sorted));
      })
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, [profile?.id]);

  const locale = i18n.language === 'zh-TW' ? 'zh-TW' : i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US';

  if (loading || !profile) return null;

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <p className="px-3 mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
        {t('schedule.sidebarScheduleTitle')}
      </p>
      {classes.length === 0 ? (
        <p className="px-3 text-sm text-gray-500">{t('schedule.noUpcomingClasses')}</p>
      ) : (
        <ul className="space-y-1">
          {classes.map((c) => (
            <li key={c.id}>
              <Link
                to="/schedule"
                className="block px-3 py-2 text-sm rounded-md text-gray-700 hover:bg-primary/10 hover:text-primary"
              >
                <span className="font-medium block truncate">{c.name}</span>
                <span className="text-xs text-gray-500">
                  {new Date(c.start_time).toLocaleDateString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
