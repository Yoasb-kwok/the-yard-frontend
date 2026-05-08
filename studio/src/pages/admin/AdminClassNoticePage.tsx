import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { Send, Users, MessageSquare, Maximize2, Pencil, Trash2, Save, X } from 'lucide-react';
import { api } from '../../lib/api';
import { getClassNoticePopupEnabled, setClassNoticePopupEnabled } from '../../lib/classNoticePopupSetting';

interface ClassOption {
  id: number;
  name: string;
  program_code?: string;
  start_time?: string;
  is_cancelled?: number;
}

interface AdminClassNoticeItem {
  id: number | string;
  class_id: number;
  class_name?: string;
  message?: string;
  message_zh_tw?: string;
  message_zh_cn?: string;
  message_en?: string;
  created_at?: string | null;
}

function isMissingListApiError(err: unknown): boolean {
  const msg = (err as Error)?.message || '';
  return msg.includes('Cannot GET /api/admin/class-notices');
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
  const [notices, setNotices] = useState<AdminClassNoticeItem[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [listApiUnavailable, setListApiUnavailable] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessageZhTw, setEditMessageZhTw] = useState('');
  const [editMessageZhCn, setEditMessageZhCn] = useState('');
  const [editMessageEn, setEditMessageEn] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  useEffect(() => {
    loadNotices();
  }, []);

  const hasAtLeastOneMessage = message_zh_tw.trim() !== '' || message_zh_cn.trim() !== '' || message_en.trim() !== '';
  const hasAtLeastOneEditMessage = editMessageZhTw.trim() !== '' || editMessageZhCn.trim() !== '' || editMessageEn.trim() !== '';

  function normalizeNotices(data: unknown): AdminClassNoticeItem[] {
    if (!Array.isArray(data)) return [];
    return data
      .map((n: any) => {
        const classIdRaw = n.class_id ?? n.classId;
        const classId = Number(classIdRaw);
        if (!n || (typeof n.id !== 'number' && typeof n.id !== 'string') || Number.isNaN(classId)) return null;
        return {
          id: n.id,
          class_id: classId,
          class_name: n.class_name ?? n.className ?? undefined,
          message: n.message ?? undefined,
          message_zh_tw: n.message_zh_tw ?? undefined,
          message_zh_cn: n.message_zh_cn ?? undefined,
          message_en: n.message_en ?? undefined,
          created_at: n.created_at ?? null,
        } as AdminClassNoticeItem;
      })
      .filter(Boolean) as AdminClassNoticeItem[];
  }

  async function loadNotices() {
    setLoadingNotices(true);
    setListApiUnavailable(false);
    try {
      const res = await api.get<{ success?: boolean; data?: unknown }>('/admin/class-notices');
      const rows = normalizeNotices((res as any)?.data);
      setNotices(rows.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
    } catch (e: unknown) {
      setNotices([]);
      if (isMissingListApiError(e)) {
        setListApiUnavailable(true);
      } else {
        setError((e as Error)?.message || t('common.error'));
      }
    } finally {
      setLoadingNotices(false);
    }
  }

  async function handleSend() {
    if (!selectedClassId || !hasAtLeastOneMessage) return;
    setSending(true);
    setSent(false);
    setError('');
    try {
      const tw = message_zh_tw.trim();
      const cn = message_zh_cn.trim();
      const en = message_en.trim();
      const fallbackMessage = tw || cn || en;
      const res = await api.post<{ success?: boolean; id?: number; msg?: string }>('/admin/class-notices', {
        classId: Number(selectedClassId),
        message: fallbackMessage,
        message_zh_tw: tw || undefined,
        message_zh_cn: cn || undefined,
        message_en: en || undefined,
      });
      if ((res as any).success) {
        setSent(true);
        setMessage_zh_tw('');
        setMessage_zh_cn('');
        setMessage_en('');
        await loadNotices();
      } else {
        setError((res as any).msg || t('common.error'));
      }
    } catch (e: unknown) {
      setError((e as Error)?.message || t('common.error'));
    } finally {
      setSending(false);
    }
  }

  function startEdit(n: AdminClassNoticeItem) {
    setEditingId(String(n.id));
    setEditMessageZhTw(n.message_zh_tw || '');
    setEditMessageZhCn(n.message_zh_cn || '');
    setEditMessageEn(n.message_en || '');
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditMessageZhTw('');
    setEditMessageZhCn('');
    setEditMessageEn('');
  }

  async function saveEdit(notice: AdminClassNoticeItem) {
    const id = String(notice.id);
    if (!hasAtLeastOneEditMessage) return;
    setSavingEdit(true);
    setError('');
    const fallbackMessage = editMessageZhTw.trim() || editMessageZhCn.trim() || editMessageEn.trim() || notice.message || '';
    const payload = {
      classId: notice.class_id,
      class_id: notice.class_id,
      message: fallbackMessage,
      message_zh_tw: editMessageZhTw.trim() || undefined,
      message_zh_cn: editMessageZhCn.trim() || undefined,
      message_en: editMessageEn.trim() || undefined,
    };
    try {
      await api.patch(`/admin/class-notices/${id}`, payload);
      setNotices((prev) =>
        prev.map((n) =>
          String(n.id) === id
            ? { ...n, ...payload }
            : n
        )
      );
      cancelEdit();
    } catch (e: unknown) {
      setError((e as Error)?.message || t('common.error'));
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteNotice(id: string) {
    if (!window.confirm(t('admin.classNotice.deleteConfirm', '確定要刪除此通知？'))) return;
    setDeletingId(id);
    setError('');
    try {
      await api.delete(`/admin/class-notices/${id}`);
      setNotices((prev) => prev.filter((n) => String(n.id) !== id));
    } catch (e: unknown) {
      setError((e as Error)?.message || t('common.error'));
    } finally {
      setDeletingId(null);
    }
  }

  function getClassName(n: AdminClassNoticeItem): string {
    if (n.class_name) return n.class_name;
    const c = classes.find((x) => x.id === n.class_id);
    return c?.name || `#${n.class_id}`;
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

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{t('admin.classNotice.historyTitle', '已發送全班通知')}</h2>
            <button
              type="button"
              onClick={loadNotices}
              className="text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50"
            >
              {t('common.refresh', '重新整理')}
            </button>
          </div>

          {loadingNotices ? (
            <p className="text-sm text-gray-500">{t('common.loading', '載入中...')}</p>
          ) : listApiUnavailable ? (
            <p className="text-sm text-amber-700">
              {t('admin.classNotice.listApiUnavailable', '後端尚未提供全班通知列表 API（GET /admin/class-notices）。目前可發送通知，但未能在此頁讀取歷史紀錄。')}
            </p>
          ) : notices.length === 0 ? (
            <p className="text-sm text-gray-500">{t('admin.classNotice.noNotices', '暫時未有已發送通知。')}</p>
          ) : (
            <div className="space-y-3">
              {notices.map((n) => {
                const id = String(n.id);
                const isEditing = editingId === id;
                return (
                  <div key={id} className="border border-gray-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{getClassName(n)}</p>
                        <p className="text-xs text-gray-500">
                          {n.created_at ? new Date(n.created_at).toLocaleString() : '-'}
                        </p>
                      </div>
                      {!isEditing ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(n)}
                            className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                          >
                            <Pencil className="h-4 w-4" />
                            {t('common.edit', '編輯')}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteNotice(id)}
                            disabled={deletingId === id}
                            className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t('common.delete', '刪除')}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(n)}
                            disabled={!hasAtLeastOneEditMessage || savingEdit}
                            className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
                          >
                            <Save className="h-4 w-4" />
                            {t('common.save', '儲存')}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                          >
                            <X className="h-4 w-4" />
                            {t('common.cancel', '取消')}
                          </button>
                        </div>
                      )}
                    </div>

                    {!isEditing ? (
                      <div className="text-sm text-gray-700 space-y-1">
                        {n.message_zh_tw ? <p><span className="font-medium">繁中：</span>{n.message_zh_tw}</p> : null}
                        {n.message_zh_cn ? <p><span className="font-medium">简中：</span>{n.message_zh_cn}</p> : null}
                        {n.message_en ? <p><span className="font-medium">EN：</span>{n.message_en}</p> : null}
                        {!n.message_zh_tw && !n.message_zh_cn && !n.message_en && n.message ? <p>{n.message}</p> : null}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={editMessageZhTw}
                          onChange={(e) => setEditMessageZhTw(e.target.value)}
                          placeholder="繁體中文"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                        <textarea
                          rows={2}
                          value={editMessageZhCn}
                          onChange={(e) => setEditMessageZhCn(e.target.value)}
                          placeholder="简体中文"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                        <textarea
                          rows={2}
                          value={editMessageEn}
                          onChange={(e) => setEditMessageEn(e.target.value)}
                          placeholder="English"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
