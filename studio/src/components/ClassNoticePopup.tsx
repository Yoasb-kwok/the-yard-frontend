/**
 * Shows a popup modal for class notices (全班通知) when the student has unread notices.
 * Dismissed notice IDs are stored in localStorage so we don't show again.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, X } from 'lucide-react';
import { api } from '../lib/api';

const STORAGE_KEY = 'classNoticeDismissed';

export interface ClassNoticeItem {
  id: string;
  class_id: number;
  class_name: string;
  message: string;
  created_at: string | null;
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

export default function ClassNoticePopup() {
  const { t } = useTranslation();
  const [notices, setNotices] = useState<ClassNoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get<{ success?: boolean; data?: ClassNoticeItem[] }>('/student/class-notices')
      .then((res) => {
        const data = (res as any).data;
        if (!Array.isArray(data)) {
          setNotices([]);
          return;
        }
        const dismissed = getDismissedIds();
        const unseen = data.filter((n) => !dismissed.includes(String(n.id)));
        setNotices(unseen);
        setOpen(unseen.length > 0);
        setCurrentIndex(0);
      })
      .catch(() => setNotices([]))
      .finally(() => setLoading(false));
  }, []);

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
          <p className="text-gray-800 whitespace-pre-wrap">{current.message}</p>
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
