import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTimeRange } from '../lib/utils';
import { getLocationInfo } from '../lib/locationInfo';
import {
  buildLessonDatesByEnrollmentId,
  groupEnrollmentsByCourse,
  type EnrolledClass,
  type GroupedCourseEnrollment,
} from '../lib/studentEnrollments';
import { fetchStudentUpcomingClasses } from '../lib/studentUpcomingClasses';
import { MapPin } from 'lucide-react';

export default function StudentSidebarSchedule() {
  const { profile, profiles } = useAuth();
  const singleProfileAccount = (profiles?.length ?? 0) <= 1;
  const { t, i18n } = useTranslation();
  const [enrollments, setEnrollments] = useState<EnrolledClass[]>([]);
  const [loading, setLoading] = useState(true);

  const locale = i18n.language === 'zh-TW' ? 'zh-TW' : i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US';

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setEnrollments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchStudentUpcomingClasses(profile.id, { singleProfileAccount })
      .then((list) => {
        const sorted = [...list].sort(
          (a, b) => new Date(a.class.start_time).getTime() - new Date(b.class.start_time).getTime(),
        );
        setEnrollments(sorted);
      })
      .catch(() => setEnrollments([]))
      .finally(() => setLoading(false));
  }, [profile?.id, profile?.full_name, singleProfileAccount]);

  const lessonDatesByEnrollmentId = useMemo(
    () => buildLessonDatesByEnrollmentId(enrollments),
    [enrollments],
  );

  const lessonDatesByEnrollment = useMemo(() => {
    return enrollments.map((e) => lessonDatesByEnrollmentId.get(e.id) ?? []);
  }, [enrollments, lessonDatesByEnrollmentId]);

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

  const enrollmentIndexById = useMemo(() => {
    const m = new Map<string, number>();
    enrollments.forEach((e, i) => m.set(e.id, i));
    return m;
  }, [enrollments]);

  const courseGroups = useMemo(() => groupEnrollmentsByCourse(enrollments), [enrollments]);

  /** 接下來所有課程：同 program 合併為一列，顯示最近一堂 */
  const upcomingPerCourse = useMemo(() => {
    const now = Date.now();
    return courseGroups
      .map((group) => {
        let best: { enrollment: EnrolledClass; nextDate: Date; endDate: Date } | null = null;
        for (const e of group.enrollments) {
          const idx = enrollmentIndexById.get(e.id);
          if (idx == null) continue;
          const dates = lessonDatesByEnrollment[idx] ?? [];
          const nextDate =
            dates.find((d) => d.getTime() > now) ?? dates[dates.length - 1] ?? new Date(e.class.start_time);
          const classStart = new Date(e.class.start_time);
          const classEnd = new Date(e.class.end_time);
          const durationMs = classEnd.getTime() - classStart.getTime();
          const endDate = new Date(nextDate.getTime() + durationMs);
          if (!best || nextDate.getTime() < best.nextDate.getTime()) {
            best = { enrollment: e, nextDate, endDate };
          }
        }
        if (!best) return null;
        return { group, ...best };
      })
      .filter((row): row is { group: GroupedCourseEnrollment; enrollment: EnrolledClass; nextDate: Date; endDate: Date } => row != null);
  }, [courseGroups, enrollmentIndexById, lessonDatesByEnrollment]);

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
      {upcomingPerCourse.length === 0 ? (
        <p className="px-3 text-sm text-gray-500">{t('schedule.noUpcomingClasses')}</p>
      ) : (
        <ul className="space-y-3 px-3 pb-4">
          {upcomingPerCourse.map(({ group, enrollment: e, nextDate, endDate }) => {
            const loc = getLocationInfo(group.location ?? e.class.location);
            const title = group.programCode ? `${group.name} (${group.programCode})` : group.name;
            return (
              <li key={group.key}>
                <Link
                  to="/schedule"
                  className="block rounded-lg border border-gray-200 bg-white p-3 text-sm hover:border-primary/30 hover:bg-primary-lighter/20 transition-colors"
                >
                  <p className="font-semibold text-gray-900">{title}</p>
                  <p className="text-gray-600 mt-0.5">{group.instructor}</p>
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
                    {t('schedule.learningProgress', { current: group.attendedLessons, total: group.bookedLessons })}
                    {' · '}
                    {t('dashboard.lessonsLeft', { count: group.remainingLessons })}
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
