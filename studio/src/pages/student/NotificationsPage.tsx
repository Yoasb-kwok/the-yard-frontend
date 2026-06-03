import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import {
  collectStudentNotifications,
  matchesActiveProfile,
  normalizeApiNotification,
  type NotificationItem,
  type StudentNotificationCategory,
  type StudentRequestRow,
} from '../../lib/studentNotifications';
import type { TrialApplicationItem } from '../../lib/studentTrialApplications';
import { type EnrolledClass } from '../../lib/studentEnrollments';
import { fetchStudentUpcomingClasses } from '../../lib/studentUpcomingClasses';
import {
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle,
  Clock,
  RefreshCw,
  User,
  XCircle,
} from 'lucide-react';

type CategoryFilter = 'all' | StudentNotificationCategory;

function NotificationIcon({ item }: { item: NotificationItem }) {
  if (item.category === 'trial') {
    return <BookOpen className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" aria-hidden />;
  }
  if (item.type.includes('pending')) {
    return <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden />;
  }
  if (item.type.includes('rejected') || item.type.includes('cancelled') || item.type.includes('could_not')) {
    return <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden />;
  }
  if (item.category === 'class') {
    return <CalendarClock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden />;
  }
  if (item.category === 'extension') {
    return <RefreshCw className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" aria-hidden />;
  }
  if (item.type.includes('approved') || item.type.includes('confirmed')) {
    return <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" aria-hidden />;
  }
  return <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" aria-hidden />;
}

export default function NotificationsPage() {
  const { profile, profiles } = useAuth();
  const { t, i18n } = useTranslation();
  const [apiNotifications, setApiNotifications] = useState<ReturnType<typeof normalizeApiNotification>[]>([]);
  const [trials, setTrials] = useState<TrialApplicationItem[]>([]);
  const [enrollments, setEnrollments] = useState<EnrolledClass[]>([]);
  const [studentRequests, setStudentRequests] = useState<StudentRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const getLocale = () => (i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US');
  const primaryProfileId = profiles?.[0]?.id;
  const isMasterView = !!primaryProfileId && profile?.id === primaryProfileId;
  const singleProfileAccount = (profiles?.length ?? 0) <= 1;

  const studentDisplayName = profile?.full_name || profiles?.[0]?.full_name || '';

  const notifications = useMemo(
    () =>
      collectStudentNotifications({
        apiNotifications: apiNotifications.filter((n): n is NonNullable<typeof n> => n !== null),
        trials,
        enrollments,
        studentRequests,
        studentName: studentDisplayName,
        t,
      }),
    [apiNotifications, trials, enrollments, studentRequests, studentDisplayName, t, i18n.language],
  );

  const visibleNotifications = useMemo(() => {
    if (isMasterView) return notifications;
    return notifications.filter((n) => n.category === 'trial' || n.category === 'leave' || n.category === 'extension');
  }, [isMasterView, notifications]);

  const filteredNotifications = useMemo(() => {
    if (categoryFilter === 'all') return visibleNotifications;
    return visibleNotifications.filter((n) => n.category === categoryFilter);
  }, [visibleNotifications, categoryFilter]);

  const categoryFilters: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: t('notifications.filterAll', '全部') },
    { key: 'trial', label: t('notifications.filterTrial', '試堂') },
    { key: 'leave', label: t('notifications.filterLeave', '請假') },
    { key: 'extension', label: t('notifications.filterExtension', '改期') },
  ];

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('token');
    if (!token) {
      setApiNotifications([]);
      setTrials([]);
      setEnrollments([]);
      setStudentRequests([]);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    Promise.all([
      api.get<unknown[]>('/student/notifications').catch(() => ({ success: false, data: [] })),
      api
        .get<{ data?: TrialApplicationItem[] }>('/student/trial-applications')
        .catch(() => ({ success: false, data: [] })),
      fetchStudentUpcomingClasses(profile?.id, { singleProfileAccount }).catch(() => []),
      api.get<StudentRequestRow[]>('/student/application-requests').catch(() => ({ success: false, data: [] })),
    ])
      .then(([notifRes, trialRes, classesRes, requestsRes]) => {
        if (cancelled) return;

        const rawNotifs = Array.isArray(notifRes.data) ? notifRes.data : [];
        const normalized = rawNotifs
          .map((row) => normalizeApiNotification(row as Record<string, unknown>))
          .filter((n): n is NonNullable<typeof n> => n !== null);
        const scopedNotifs = isMasterView
          ? normalized
          : normalized.filter((n) => matchesActiveProfile(n, profile?.id));
        setApiNotifications(scopedNotifs);

        const trialData = (trialRes as { data?: TrialApplicationItem[] }).data;
        let trialList = Array.isArray(trialData) ? trialData : [];
        if (!isMasterView && profile?.id) {
          const profileName = String(profile.full_name ?? '').trim().toLowerCase();
          trialList = trialList.filter((item) => {
            const targetId = item.profile_id || item.user_id || '';
            if (targetId) return targetId === profile.id;
            const trialStudentName = String(item.student_name ?? '').trim().toLowerCase();
            if (trialStudentName && profileName) return trialStudentName === profileName;
            // If the row has no profile/user/name hint, hide it in sub-account view
            // to avoid showing sibling applications.
            return false;
          });
        }
        setTrials(trialList);

        const classList = Array.isArray(classesRes) ? classesRes : [];
        setEnrollments(isMasterView ? [] : classList);

        let reqData = Array.isArray(requestsRes.data) ? requestsRes.data : [];
        if (!isMasterView && profile?.id && reqData.length > 0) {
          reqData = reqData.filter((r) => {
            const targetId = r.profile_id || r.student_profile_id || r.user_id || '';
            return !targetId || targetId === profile.id;
          });
        }
        setStudentRequests(reqData);
      })
      .catch(() => {
        if (!cancelled) {
          setApiNotifications([]);
          setTrials([]);
          setEnrollments([]);
          setStudentRequests([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isMasterView, profile?.id, profile?.full_name]);

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="h-7 w-7 text-primary" />
          {t('notifications.title', '訊息中心')}
        </h1>
        <p className="text-gray-600 text-sm">
          {t(
            'notifications.subtitleStudent',
            '試堂申請狀態、課堂變動、請假與改期申請，以及 admin 批准結果。',
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          {categoryFilters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategoryFilter(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                categoryFilter === key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          {loading ? (
            <p className="text-gray-500 py-4">{t('common.loading', '載入中...')}</p>
          ) : (
            <ul className="space-y-3">
              {filteredNotifications.length === 0 ? (
                <li className="py-8 text-center text-gray-500">{t('notifications.noNotifications', '暫無通知')}</li>
              ) : (
                filteredNotifications.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <NotificationIcon item={n} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {t(`notifications.category.${n.category}`, {
                            defaultValue:
                              n.category === 'trial'
                                ? '試堂'
                                : n.category === 'leave'
                                  ? '請假'
                                  : n.category === 'extension'
                                    ? '改期'
                                    : n.category === 'class'
                                      ? '課堂'
                                      : '其他',
                          })}
                        </span>
                        {n.studentName && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                            <User className="h-3 w-3" aria-hidden />
                            {t('notifications.forStudent', { studentName: n.studentName }, `有關：${n.studentName}`)}
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-gray-900">{n.title}</div>
                      <div className="text-sm text-gray-600 mt-1">{n.message}</div>
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(n.date).toLocaleDateString(getLocale(), {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <p className="text-sm text-gray-500">
          <Link to="/news" className="text-primary hover:underline">
            {t('notifications.latestNewsOnHome', '中心公告、優惠與活動請瀏覽首頁「最新消息」。')}
          </Link>
        </p>
      </div>
    </Layout>
  );
}
