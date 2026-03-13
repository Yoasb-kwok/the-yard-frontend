import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { Send, Users, MessageSquare, Maximize2 } from 'lucide-react';
import { api } from '../../lib/api';
import { getClassNoticePopupEnabled, setClassNoticePopupEnabled } from '../../lib/classNoticePopupSetting';

interface ClassOption {
  id: number;
  name: string;
  program_code?: string;
  start_time?: string;
  is_cancelled?: number;
}

export default function AdminClassNoticePage() {
  const { t } = useTranslation();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [message_zh_tw, setMessage_zh_tw] = useState('');
  const [message_zh_cn, setMessage_zh_cn] = useState('');
  const [message_en, setMessage_en] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [popupEnabled, setPopupEnabled] = useState(true);

  useEffect(() => {
    setPopupEnabled(getClassNoticePopupEnabled());
  }, []);

  useEffect(() => {
    api.get<{ success?: boolean; data?: ClassOption[] }>('/admin/classes')
      .then((res) => {
        const data = (res as any).data;
        if (Array.isArray(data)) {
          setClasses(data.filter((c: ClassOption) => !c.is_cancelled));
        }
      })
      .catch(() => setClasses([]));
  }, []);

  const hasAtLeastOneMessage = message_zh_tw.trim() !== '' || message_zh_cn.trim() !== '' || message_en.trim() !== '';

  async function handleSend() {
    if (!selectedClassId || !hasAtLeastOneMessage) return;
    setSending(true);
    setSent(false);
    setError('');
    try {
      const res = await api.post<{ success?: boolean; id?: number; msg?: string }>('/admin/class-notice', {
        classId: Number(selectedClassId),
        message_zh_tw: message_zh_tw.trim() || undefined,
        message_zh_cn: message_zh_cn.trim() || undefined,
        message_en: message_en.trim() || undefined,
      });
      if ((res as any).success) {
        setSent(true);
        setMessage_zh_tw('');
        setMessage_zh_cn('');
        setMessage_en('');
      } else {
        setError((res as any).msg || t('common.error'));
      }
    } catch (e: unknown) {
      setError((e as Error)?.message || t('common.error'));
    } finally {
      setSending(false);
    }
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-7 w-7 text-primary" />
          {t('admin.classNotice.title', '全班通知')}
        </h1>
        <p className="text-gray-600 text-sm">
          {t('admin.classNotice.description', '發送通知給該班已報讀學生（如惡劣天氣停課）。只發給該班學生。')}
        </p>

        {/* 彈窗開關 */}
        <div className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Maximize2 className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-gray-700">
              {t('admin.classNotice.popupToggle', '學生登入時彈出全班通知')}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={popupEnabled}
            onClick={() => {
              const next = !popupEnabled;
              setClassNoticePopupEnabled(next);
              setPopupEnabled(next);
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              popupEnabled ? 'bg-primary' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                popupEnabled ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div>
            <label htmlFor="class" className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.classNotice.selectClass', '選擇班別')}
            </label>
            <select
              id="class"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{t('admin.classNotice.chooseClass', '請選擇')}</option>
              {classes.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}{c.program_code ? ` (${c.program_code})` : ''}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-gray-500">{t('admin.classNotice.multilangHint', '請輸入三種語言的通知內容，學生端將依其語言設定顯示。至少填寫一種。')}</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">繁體中文</label>
              <textarea
                rows={2}
                value={message_zh_tw}
                onChange={(e) => setMessage_zh_tw(e.target.value)}
                placeholder={t('admin.classNotice.messagePlaceholder', '例如：因惡劣天氣，本週六 10:00 課堂停課，補課日期另行通知。')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">简体中文</label>
              <textarea
                rows={2}
                value={message_zh_cn}
                onChange={(e) => setMessage_zh_cn(e.target.value)}
                placeholder="例如：因恶劣天气，本周六 10:00 课堂停课，补课日期另行通知。"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">English</label>
              <textarea
                rows={2}
                value={message_en}
                onChange={(e) => setMessage_en(e.target.value)}
                placeholder="e.g. Due to bad weather, this Saturday 10:00 class is cancelled. Make-up date TBC."
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            {error && <span className="text-sm text-red-600">{error}</span>}
            <button
              type="button"
              onClick={handleSend}
              disabled={!selectedClassId || !hasAtLeastOneMessage || sending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              {sending ? t('common.sending', '發送中...') : t('admin.classNotice.send', '發送全班通知')}
            </button>
            {sent && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Users className="h-4 w-4" />
                {t('admin.classNotice.sent', '已發送給該班學生')}
              </span>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
