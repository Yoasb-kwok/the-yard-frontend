import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { Send, Users, MessageSquare } from 'lucide-react';
import { api } from '../../lib/api';

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
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

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

  async function handleSend() {
    if (!selectedClassId || !message.trim()) return;
    setSending(true);
    setSent(false);
    setError('');
    try {
      const res = await api.post<{ success?: boolean; id?: number; msg?: string }>('/admin/class-notice', {
        classId: Number(selectedClassId),
        message: message.trim(),
      });
      if ((res as any).success) {
        setSent(true);
        setMessage('');
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
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.classNotice.message', '通知內容')}
            </label>
            <textarea
              id="message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('admin.classNotice.messagePlaceholder', '例如：因惡劣天氣，本週六 10:00 課堂停課，補課日期另行通知。')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            {error && <span className="text-sm text-red-600">{error}</span>}
            <button
              type="button"
              onClick={handleSend}
              disabled={!selectedClassId || !message.trim() || sending}
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
