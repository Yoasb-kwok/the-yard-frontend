/**
 * Shows a popup modal for class notices (全班通知) when the student has unread notices.
 * Only runs for students; when they log in, fetches notices for classes they're enrolled in.
 * Dismissed notice IDs are stored in localStorage so we don't show again.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { getClassNoticePopupEnabled } from '../lib/classNoticePopupSetting';

const STORAGE_KEY = 'classNoticeDismissed';

export interface ClassNoticeItem {
  id: string;
  class_id: number;
  class_name: string;
  message: string;
  message_zh_tw?: string;
  message_zh_cn?: string;
  message_en?: string;
  created_at: string | null;
}

function getMessageForLocale(item: ClassNoticeItem, lang: string): string {
  const l = lang === 'zh-CN' ? 'zh-CN' : lang === 'en' || lang.startsWith('en') ? 'en' : 'zh-TW';
  const text = l === 'zh-TW' ? item.message_zh_tw : l === 'zh-CN' ? item.message_zh_cn : item.message_en;
  return (text && text.trim()) || item.message || '';
}

function getDismissedIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function addDismissedId(id: string) {
  const ids = getDismissedIds();
  if (ids.includes(id)) return;
  ids.push(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

/** Demo notice when API is unavailable (e.g. no backend) so the popup can be tested. */
function getDemoClassNotices(): ClassNoticeItem[] {
  return [
    {
      id: 'demo-class-notice-1',
      class_id: 0,
      class_name: '兒童芭蕾 A',
      message: '本週六因場地維修，原定 10:00 課堂改為 14:00 上課，請準時出席。',
      created_at: new Date().toISOString(),
    },
  ];
}

export default function ClassNoticePopup() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [notices, setNotices] = useState<ClassNoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'student') {
      setLoading(false);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setNotices([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    if (!getClassNoticePopupEnabled()) {
      setLoading(false);
      return;
    }
    api.get<{ success?: boolean; data?: ClassNoticeItem[] }>('/student/class-notices')
      .then((res) => {
        const data = (res as any).data;
        if (!Array.isArray(data)) {
          const demo = getDemoClassNotices();
          const dismissed = getDismissedIds();
          const unseen = demo.filter((n) => !dismissed.includes(String(n.id)));
          setNotices(unseen);
          setOpen(unseen.length > 0);
          setCurrentIndex(0);
          return;
        }
        const dismissed = getDismissedIds();
        const unseen = data.filter((n) => !dismissed.includes(String(n.id)));
        setNotices(unseen);
        setOpen(unseen.length > 0);
        setCurrentIndex(0);
      })
      .catch(() => {
        const demo = getDemoClassNotices();
        const dismissed = getDismissedIds();
        const unseen = demo.filter((n) => !dismissed.includes(String(n.id)));
        setNotices(unseen);
        setOpen(unseen.length > 0);
        setCurrentIndex(0);
      })
      .finally(() => setLoading(false));
  }, [profile]);

  const current = notices[currentIndex];
  const hasNext = currentIndex < notices.length - 1;

  function handleDismiss() {
    if (current) {
      addDismissedId(String(current.id));
      if (hasNext) {
        setCurrentIndex((i) => i + 1);
      } else {
        setOpen(false);
        setNotices([]);
      }
    } else {
      setOpen(false);
    }
  }

  function handleClose() {
    if (current) addDismissedId(String(current.id));
    if (hasNext) {
      setCurrentIndex((i) => i + 1);
    } else {
      setOpen(false);
      setNotices([]);
    }
  }

  if (loading || !open || !current) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="class-notice-title">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 id="class-notice-title" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {t('notifications.typeClassAnnouncement', '全班通知')}
            {current.class_name && (
              <span className="text-sm font-normal text-gray-600">· {current.class_name}</span>
            )}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">
          <p className="text-gray-800 whitespace-pre-wrap">{getMessageForLocale(current, i18n.language)}</p>
          {current.created_at && (
            <p className="mt-3 text-xs text-gray-500">
              {new Date(current.created_at).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="text-sm text-gray-500">
            {notices.length > 1 && (
              <span>{currentIndex + 1} / {notices.length}</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark"
          >
            {hasNext ? t('notifications.nextNotice', '下一則') : t('notifications.gotIt', '知道了')}
          </button>
        </div>
      </div>
    </div>
  );
}
