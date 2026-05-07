import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useHolidays } from '../lib/useHolidays';
import { api } from '../lib/api';
import { getLessonDatesSkipHolidays, getLessonDates, formatDateTimeRange } from '../lib/utils';
import { getLocationInfo } from '../lib/locationInfo';
import { getFallbackUpcomingClasses, type EnrolledClass } from '../lib/studentEnrollments';
import { MapPin } from 'lucide-react';

export default function StudentSidebarSchedule() {
  const { profile } = useAuth();
  const { t, i18n } = useTranslation();
  const { holidayDatesSet } = useHolidays();
  const [enrollments, setEnrollments] = useState<EnrolledClass[]>([]);
  const [loading, setLoading] = useState(true);

  const locale = i18n.language === 'zh-TW' ? 'zh-TW' : i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US';

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<{ data?: EnrolledClass[] }>('/student/upcoming-classes')
      .then((res: { data?: EnrolledClass[] }) => {
        const data = res?.data;
        let list = Array.isArray(data) ? data : [];
        if (profile?.id && list.length > 0) {
          list = list.filter((e) => (e.profile_id || e.user_id || '') === profile.id);
        }
        if (list.length === 0) {
          list = getFallbackUpcomingClasses(profile.id, profile.full_name ?? undefined);
        }
        const sorted = [...list].sort(
          (a, b) => new Date(a.class.start_time).getTime() - new Date(b.class.start_time).getTime()
        );
        setEnrollments(sorted);
      })
      .catch(() => setEnrollments(getFallbackUpcomingClasses(profile?.id, profile?.full_name)))
      .finally(() => setLoading(false));
  }, [profile?.id, profile?.full_name]);

  /** Lesson dates per enrollment (skip holidays). */
  const lessonDatesByEnrollment = useMemo(() => {
    return enrollments.map((e) => {
      const total = e.total_lessons ?? 8;
      if (holidayDatesSet.size > 0) {
        return getLessonDatesSkipHolidays(e.class.start_time, total, holidayDatesSet);
      }
      return getLessonDates(e.class.start_time, total);
    });
  }, [enrollments, holidayDatesSet]);

  /** 下一堂：soonest future lesson across all enrollments */
  const nextLesson = useMemo(() => {
    const now = Date.now();
    let earliest: { date: Date; enrollment: EnrolledClass; lessonIndex: number } | null = null;
    lessonDatesByEnrollment.forEach((dates, idx) => {
      const e = enrollments[idx];
      if (!e) return;
      dates.forEach((d, i) => {
        if (d.getTime() > now) {
          if (!earliest || d.getTime() < earliest.date.getTime()) {
            earliest = { date: d, enrollment: e, lessonIndex: i };
          }
        }
      });
    });
    return earliest;
  }, [enrollments, lessonDatesByEnrollment]);

  /** For 接下來所有課程: each enrollment with its next upcoming lesson date (or first lesson if all past) */
  const upcomingPerEnrollment = useMemo(() => {
    const now = Date.now();
    return enrollments.map((e, idx) => {
      const dates = lessonDatesByEnrollment[idx] ?? [];
      const nextDate = dates.find((d) => d.getTime() > now) ?? dates[dates.length - 1] ?? new Date(e.class.start_time);
      const classStart = new Date(e.class.start_time);
      const classEnd = new Date(e.class.end_time);
      const durationMs = classEnd.getTime() - classStart.getTime();
      const endDate = new Date(nextDate.getTime() + durationMs);
      return { enrollment: e, nextDate, endDate };
    });
  }, [enrollments, lessonDatesByEnrollment]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  const formatDateShort = (d: Date) =>
    d.toLocaleDateString(locale, { month: 'long', day: 'numeric', weekday: 'short' });

  if (loading || !profile) return null;

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <p className="px-3 mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
        {t('schedule.sidebarLatestNotice', '最新通知')}
      </p>

      {/* 下一堂 */}
      {nextLesson && (() => {
        const loc = getLocationInfo(nextLesson.enrollment.class.location);
        return (
          <div className="px-3 mb-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5">
              {t('schedule.nextLesson', '下一堂')}
            </p>
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-sm">
              <p className="font-semibold text-gray-900">
                {formatDateShort(nextLesson.date)} {formatTime(nextLesson.date)} · {nextLesson.enrollment.class.name}
              </p>
              {loc && (
                <>
                  <p className="text-gray-700 font-medium mt-1">{loc.name}</p>
                  <p className="text-gray-600 text-xs mt-0.5">{loc.address}</p>
                  <a
                    href={loc.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1.5 text-primary font-medium hover:underline text-xs"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {t('schedule.openMap', '打開地圖')}
                  </a>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* 接下來所有課程 */}
      <p className="px-3 mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
        {t('schedule.sidebarAllUpcoming', '接下來所有課程')}
      </p>
      {upcomingPerEnrollment.length === 0 ? (
        <p className="px-3 text-sm text-gray-500">{t('schedule.noUpcomingClasses')}</p>
      ) : (
        <ul className="space-y-3 px-3 pb-4">
          {upcomingPerEnrollment.map(({ enrollment: e, nextDate, endDate }) => {
            const loc = getLocationInfo(e.class.location);
            const total = e.total_lessons ?? 8;
            const attended = e.attended_lessons ?? 0;
            return (
              <li key={e.id}>
                <Link
                  to="/schedule"
                  className="block rounded-lg border border-gray-200 bg-white p-3 text-sm hover:border-primary/30 hover:bg-primary-lighter/20 transition-colors"
                >
                  <p className="font-semibold text-gray-900">
                    {e.class.name}
                    {e.class.program_code ? ` ${e.class.program_code}` : ''}
                  </p>
                  <p className="text-gray-600 mt-0.5">{e.class.instructor}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {formatDateTimeRange(nextDate, endDate, locale)}
                  </p>
                  {loc && (
                    <p className="text-gray-600 text-xs mt-1">
                      {loc.name}
                      {' · '}
                      <a
                        href={loc.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(ev) => ev.stopPropagation()}
                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        <MapPin className="h-3 w-3" />
                        {t('schedule.openMap', '打開地圖')}
                      </a>
                    </p>
                  )}
                  <p className="text-primary font-medium text-xs mt-1.5">
                    {t('schedule.learningProgress', { current: attended, total })}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
