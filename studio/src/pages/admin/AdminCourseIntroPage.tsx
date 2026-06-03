import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { Edit, BookOpen, Plus, Trash2 } from 'lucide-react';
import { ApiError, api } from '../../lib/api';
import {
  clearLegacyCourseIntroLocalStorage,
  collectClassCodesFromScheduleRows,
  createCourseIntro,
  deleteCourseIntro,
  emptyCourseIntroForm,
  fetchAdminCourseIntros,
  getCourseIntroName,
  getCourseIntroText,
  hasCourseIntroContent,
  isCourseIntroApiUnavailable,
  recordToFormFields,
  updateCourseIntro,
  type CourseIntroFormFields,
  type CourseIntroLang,
  type CourseIntroRecord,
} from '../../lib/courseIntroApi';

const LANG_OPTIONS: Array<{ value: CourseIntroLang; label: string }> = [
  { value: 'zh-TW', label: '繁中' },
  { value: 'zh-CN', label: '简中' },
  { value: 'en', label: 'EN' },
];

function formValue(
  form: CourseIntroFormFields,
  field: 'title' | 'content' | 'note',
  lang: CourseIntroLang,
): string {
  if (field === 'title') {
    if (lang === 'zh-TW') return form.name_zh_tw;
    if (lang === 'zh-CN') return form.name_zh_cn;
    return form.name_en;
  }
  if (field === 'content') {
    if (lang === 'zh-TW') return form.intro_zh_tw;
    if (lang === 'zh-CN') return form.intro_zh_cn;
    return form.intro_en;
  }
  if (lang === 'zh-TW') return form.trial_class_name_zh_tw;
  if (lang === 'zh-CN') return form.trial_class_name_zh_cn;
  return form.trial_class_name_en;
}

function setFormField(
  prev: CourseIntroFormFields,
  field: 'title' | 'content' | 'note',
  lang: CourseIntroLang,
  value: string,
): CourseIntroFormFields {
  if (field === 'title') {
    if (lang === 'zh-TW') return { ...prev, name_zh_tw: value };
    if (lang === 'zh-CN') return { ...prev, name_zh_cn: value };
    return { ...prev, name_en: value };
  }
  if (field === 'content') {
    if (lang === 'zh-TW') return { ...prev, intro_zh_tw: value };
    if (lang === 'zh-CN') return { ...prev, intro_zh_cn: value };
    return { ...prev, intro_en: value };
  }
  if (lang === 'zh-TW') return { ...prev, trial_class_name_zh_tw: value };
  if (lang === 'zh-CN') return { ...prev, trial_class_name_zh_cn: value };
  return { ...prev, trial_class_name_en: value };
}

export default function AdminCourseIntroPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<CourseIntroRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [scheduleClassCodes, setScheduleClassCodes] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CourseIntroRecord | null>(null);
  const [selectedClassCode, setSelectedClassCode] = useState('');
  const [form, setForm] = useState<CourseIntroFormFields>(emptyCourseIntroForm());
  const [activeLang, setActiveLang] = useState<CourseIntroLang>('zh-TW');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'success' | 'info'>('info');

  const showStatus = useCallback((message: string, kind: 'success' | 'info') => {
    setStatusKind(kind);
    setStatusMessage(message);
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setApiUnavailable(false);
    try {
      const rows = await fetchAdminCourseIntros();
      setItems(rows);
    } catch (err) {
      setItems([]);
      if (isCourseIntroApiUnavailable(err)) {
        setApiUnavailable(true);
      } else {
        const msg = err instanceof Error ? err.message : t('admin.courseIntro.loadFailed', '無法從 API 載入課程資料，請稍後再試。');
        showStatus(msg, 'info');
      }
    } finally {
      setLoading(false);
    }
  }, [showStatus, t]);

  const loadScheduleCodes = useCallback(async () => {
    try {
      const adminRes = await api.get<Record<string, unknown>[]>('/admin/classes');
      const rows = adminRes.success && Array.isArray(adminRes.data) ? adminRes.data : [];
      if (rows.length > 0) {
        setScheduleClassCodes(collectClassCodesFromScheduleRows(rows));
        return;
      }
      const res = await api.get<Record<string, unknown>[]>('/classes');
      const fallback = res.success && Array.isArray(res.data) ? res.data : [];
      setScheduleClassCodes(collectClassCodesFromScheduleRows(fallback));
    } catch {
      setScheduleClassCodes([]);
    }
  }, []);

  useEffect(() => {
    clearLegacyCourseIntroLocalStorage();
    void loadItems();
    void loadScheduleCodes();
  }, [loadItems, loadScheduleCodes]);

  const usedClassCodes = useMemo(() => new Set(items.map((i) => i.class_code)), [items]);

  const availableClassCodes = useMemo(() => {
    if (editing) return [editing.class_code];
    return scheduleClassCodes.filter((code) => !usedClassCodes.has(code));
  }, [editing, scheduleClassCodes, usedClassCodes]);

  function openCreate() {
    setEditing(null);
    setSelectedClassCode(availableClassCodes[0] ?? '');
    setForm(emptyCourseIntroForm());
    setActiveLang('zh-TW');
    setShowModal(true);
  }

  function openEdit(record: CourseIntroRecord) {
    setEditing(record);
    setSelectedClassCode(record.class_code);
    setForm(recordToFormFields(record));
    setActiveLang('zh-TW');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setSelectedClassCode('');
    setForm(emptyCourseIntroForm());
  }

  async function handleDelete(record: CourseIntroRecord) {
    const ok = window.confirm(
      t(
        'admin.courseIntro.confirmDeleteEntry',
        '確定刪除此課堂介紹？刪除後將從列表移除，前台不再套用此自訂內容。',
      ),
    );
    if (!ok) return;
    try {
      await deleteCourseIntro(record.id);
      await loadItems();
      showStatus(t('admin.courseIntro.deleted', '已刪除課堂介紹。'), 'success');
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : t('admin.courseIntro.deleteFailed', '刪除失敗，請重新整理頁面後再試。');
      showStatus(msg, 'info');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const classCode = (editing?.class_code ?? selectedClassCode).trim();
    if (!classCode) return;
    if (!hasCourseIntroContent(form)) {
      showStatus(
        t('admin.courseIntro.validationRequired', '請至少填寫一種語言的課程名稱或簡介。'),
        'info',
      );
      return;
    }
    setSaving(true);
    try {
      const payload = { class_code: classCode, ...form };
      if (editing) {
        await updateCourseIntro(editing.id, payload);
      } else {
        await createCourseIntro(payload);
      }
      await loadItems();
      await loadScheduleCodes();
      showStatus(t('admin.courseIntro.saved', '已儲存至伺服器。'), 'success');
      closeModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.saveFailed', '儲存失敗');
      showStatus(msg, 'info');
    } finally {
      setSaving(false);
    }
  }

  const modalTitle = editing
    ? t('admin.courseIntro.editTitle', '編輯課堂介紹')
    : t('admin.courseIntro.addTitle', '新增課堂介紹');

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            {t('admin.courseIntro.title', '課堂介紹')}
          </h1>
          <button
            type="button"
            onClick={openCreate}
            disabled={apiUnavailable}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {t('common.add', '新增')}
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          {t(
            'admin.courseIntro.apiHint',
            '資料儲存於後端 course_intros。刪除會移除整筆記錄；前台依 class_code 合併至課程介紹頁。',
          )}
        </p>

        {apiUnavailable && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t(
              'admin.courseIntro.apiUnavailable',
              '後端尚未提供課堂介紹 API（GET /api/admin/course-intros）。請依 studio/docs/COURSE_INTRO_CMS_SPEC.md 實作後再使用此頁。',
            )}
          </div>
        )}

        {statusMessage && (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm flex items-start justify-between gap-3 ${
              statusKind === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
            role="status"
          >
            <span>{statusMessage}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="shrink-0 text-current opacity-70 hover:opacity-100"
              aria-label={t('common.close', '關閉')}
            >
              ×
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">{t('common.loading', '載入中…')}</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>{t('admin.courseIntro.empty', '尚未建立任何課堂介紹。')}</p>
              {!apiUnavailable && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-4 text-primary font-medium hover:underline"
                >
                  {t('admin.courseIntro.addFirst', '新增第一筆')}
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {items.map((record) => {
                const nameZhTw = getCourseIntroName(record, 'zh-TW');
                const introZhTw = getCourseIntroText(record, 'zh-TW');
                return (
                  <li
                    key={record.id}
                    className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <p className="font-semibold text-gray-900 truncate">{nameZhTw || record.class_code}</p>
                        {!record.is_active && (
                          <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                            {t('admin.courseIntro.inactiveBadge', '已停用')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{record.class_code}</p>
                      {introZhTw && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{introZhTw}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(record)}
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                        title={t('common.edit', '編輯')}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(record)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                        title={t('common.delete', '刪除')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={closeModal} aria-hidden />
            <div
              className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              role="dialog"
              aria-modal="true"
            >
              <div className="p-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <h2 className="text-xl font-bold text-gray-900">{modalTitle}</h2>
                  <div className="inline-flex items-center rounded-md border border-gray-200 p-0.5 bg-white">
                    {LANG_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setActiveLang(option.value)}
                        className={`px-2.5 py-1 text-xs rounded ${
                          activeLang === option.value
                            ? 'bg-primary text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('common.courseCode', '課程 Code')}
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={editing.class_code}
                        readOnly
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-600"
                      />
                    ) : (
                      <select
                        value={selectedClassCode}
                        onChange={(e) => setSelectedClassCode(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                        required
                      >
                        <option value="">{t('admin.classNotice.selectClass', '請選擇')}</option>
                        {availableClassCodes.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    )}
                    {!editing && availableClassCodes.length === 0 && (
                      <p className="mt-1 text-xs text-amber-700">
                        {t(
                          'admin.courseIntro.noClassCodes',
                          '班表內沒有可用的課程 Code，或已全部建立介紹。',
                        )}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.courseIntro.courseName', '課程名稱')}
                    </label>
                    <input
                      type="text"
                      value={formValue(form, 'title', activeLang)}
                      onChange={(e) =>
                        setForm((prev) => setFormField(prev, 'title', activeLang, e.target.value))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.courseIntro.intro', '內文')}
                    </label>
                    <textarea
                      rows={4}
                      value={formValue(form, 'content', activeLang)}
                      onChange={(e) =>
                        setForm((prev) => setFormField(prev, 'content', activeLang, e.target.value))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.courseIntro.trialClassName', '試堂名稱')}
                    </label>
                    <input
                      type="text"
                      value={formValue(form, 'note', activeLang)}
                      onChange={(e) =>
                        setForm((prev) => setFormField(prev, 'note', activeLang, e.target.value))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    {t('admin.courseIntro.activeLabel', '前台顯示')}
                  </label>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      {t('common.cancel', '取消')}
                    </button>
                    <button
                      type="submit"
                      disabled={saving || (!editing && !selectedClassCode)}
                      className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50"
                    >
                      {saving ? t('common.saving', '儲存中…') : t('common.save', '儲存')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
