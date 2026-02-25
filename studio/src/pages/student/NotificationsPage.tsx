import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { Bell, Newspaper, CheckCircle } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: string;
  type?: 'personal' | 'class' | 'system';
}

const DEMO_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', title: '試堂已確認', message: '你的兒童芭蕾試堂已確認，請按時上課。', date: new Date().toISOString(), type: 'personal' },
  { id: 'n2', title: '代幣即將到期', message: '部分代幣將於 30 日內到期，請盡快使用。', date: new Date().toISOString(), type: 'system' },
  { id: 'n3', title: '病假已批准', message: '你的病假申請已批准，已安排補堂日期。', date: new Date(Date.now() - 86400000).toISOString(), type: 'personal' },
  { id: 'n4', title: '下堂提醒', message: '下堂 2 月 25 日 14:00 兒童芭蕾 A，請準時到新蒲崗分店。', date: new Date().toISOString(), type: 'personal' },
  { id: 'n5', title: '全班通知', message: '因惡劣天氣，本週六 10:00 兒童芭蕾 A 停課，補課日期另行通知。', date: new Date(Date.now() - 2 * 86400000).toISOString(), type: 'class' },
];

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const [notifications] = useState<NotificationItem[]>(DEMO_NOTIFICATIONS);
  const getLocale = () => (i18n.language === 'zh-CN' ? 'zh-CN' : i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US');

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="h-7 w-7 text-primary" />
          {t('notifications.title', '訊息中心')}
        </h1>
        <p className="text-gray-600 text-sm">{t('notifications.subtitle', '個人化通知：病假、下堂提醒、全班通知等。')}</p>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <ul className="space-y-3">
            {notifications.map((n) => (
              <li key={n.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{n.title}</div>
                  <div className="text-sm text-gray-600 mt-1">{n.message}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(n.date).toLocaleDateString(getLocale(), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-primary-lighter/30 rounded-lg p-4 border border-primary/20">
          <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            {t('notifications.latestNews', '最新消息')}
          </h2>
          <p className="text-sm text-gray-600 mb-3">{t('notifications.latestNewsDesc', '查看中心最新公告、優惠與活動。')}</p>
          <Link to="/news" className="inline-flex items-center gap-2 text-primary font-medium hover:underline text-sm">
            {t('nav.news')}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
