import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { Send, Users, MessageSquare } from 'lucide-react';

const DEMO_CLASSES = [
  { id: 'c1', name: '兒童芭蕾 A', programCode: 'KB-A' },
  { id: 'c2', name: '兒童爵士 B', programCode: 'KJ-B' },
  { id: 'c3', name: '青少年街舞', programCode: 'THH' },
  { id: 'c4', name: '幼兒律動', programCode: 'YM' },
];

export default function AdminClassNoticePage() {
  const { t } = useTranslation();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!selectedClassId || !message.trim()) return;
    setSending(true);
    setSent(false);
    await new Promise((r) => setTimeout(r, 800));
    setSending(false);
    setSent(true);
    setMessage('');
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
              {DEMO_CLASSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.programCode})
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
