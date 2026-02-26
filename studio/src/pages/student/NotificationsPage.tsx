import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { buildNotification, buildPendingLeaveNotifications, type ApiNotification, type NotificationItem } from '../../lib/studentNotifications';
import type { EnrolledClass } from '../../lib/studentEnrollments';
import { Bell, CheckCircle, User, Clock } from 'lucide-react';

export default function NotificationsPage() {
  const { profile } = useAuth();
  const { t, i18n } = useTranslation();
  const [rawNotifications, setRawNotifications] = useState<ApiNotification[]>([]);
  const [enrollments, setEnrollments] = useState<EnrolledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const getLocale = () => (i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US');

  /** 只顯示訊息中心內容（全班消息、個人課堂、代幣、請假），不顯示首頁「最新消息」；並加入「請假申請待定中」*/
  const notifications = useMemo(
    () => {
      const fromApi = rawNotifications
        .filter((n) => n.type !== 'news')
        .map((n) => buildNotification(n, t));
      const pendingLeave = buildPendingLeaveNotifications(enrollments, t);
      const combined = [...fromApi, ...pendingLeave].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      return combined;
    },
    [rawNotifications, enrollments, t, i18n.language]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get<{ data?: ApiNotification[] }>('/student/notifications'),
      api.get<{ data?: EnrolledClass[] }>('/student/upcoming-classes'),
    ])
      .then(([notifRes, classesRes]) => {
        if (cancelled) return;
        const data = notifRes.data ?? [];
        setRawNotifications(data);
        let list = Array.isArray(classesRes.data) ? classesRes.data : [];
        if (profile?.id && list.length > 0) {
          list = list.filter((e) => (e.profile_id || e.user_id || '') === profile.id);
        }
        setEnrollments(list);
      })
      .catch(() => {
        if (!cancelled) {
          setRawNotifications([]);
          setEnrollments([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [profile?.id]);

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="h-7 w-7 text-primary" />
          {t('notifications.title', '訊息中心')}
        </h1>
        <p className="text-gray-600 text-sm">{t('notifications.subtitleStudent', '全班消息、個人課堂、代幣、請假／改期通知。')}</p>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          {loading ? (
            <p className="text-gray-500 py-4">{t('common.loading', '載入中...')}</p>
          ) : (
            <ul className="space-y-3">
              {notifications.length === 0 ? (
                <li className="py-8 text-center text-gray-500">{t('notifications.noNotifications', '暫無通知')}</li>
              ) : (
                notifications.map((n) => (
                  <li key={n.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    {n.type === 'leave_pending' ? (
                      <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" aria-hidden />
                    )}
                    <div className="flex-1 min-w-0">
                      {n.studentName && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <User className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {t('notifications.forStudent', { studentName: n.studentName }, `有關：${n.studentName}`)}
                          </span>
                        </div>
                      )}
                      <div className="font-medium text-gray-900">{n.title}</div>
                      <div className="text-sm text-gray-600 mt-1">{n.message}</div>
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(n.date).toLocaleDateString(getLocale(), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <p className="text-sm text-gray-500">
          <Link to="/news" className="text-primary hover:underline">{t('notifications.latestNewsOnHome', '中心公告、優惠與活動請瀏覽首頁「最新消息」。')}</Link>
        </p>
      </div>
    </Layout>
  );
}
