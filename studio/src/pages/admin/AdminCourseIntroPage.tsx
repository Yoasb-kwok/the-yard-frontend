import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { Edit, BookOpen, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import {
  deleteCourseIntroOverrides,
  getCourseIntroOverrides,
  setCourseIntroOverrides,
  type CourseIntroLang,
  type CourseIntroOverrides,
} from '../../lib/courseIntroStorage';

const LANG_OPTIONS: Array<{ value: CourseIntroLang; label: string }> = [
  { value: 'zh-TW', label: '繁中' },
  { value: 'zh-CN', label: '简中' },
  { value: 'en', label: 'EN' },
];

interface AdminCourseIntroOption {
  /** Use class_code as stable key for overrides. */
  id: string;
  classCode: string;
  nameZhTw: string;
  nameZhCn: string;
  nameEn: string;
  intro: string;
  note: string;
}

function pickLocalizedName(course: AdminCourseIntroOption, lang: CourseIntroLang): string {
  if (lang === 'zh-CN') {
    return course.nameZhCn || course.nameZhTw || course.nameEn || course.classCode;
  }
  if (lang === 'en') {
    return course.nameEn || course.nameZhTw || course.nameZhCn || course.classCode;
  }
  return course.nameZhTw || course.nameZhCn || course.nameEn || course.classCode;
}

function toAdminCourseOptions(rows: Record<string, unknown>[]): AdminCourseIntroOption[] {
  const byCode = new Map<string, AdminCourseIntroOption>();
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const classCode = String(r.class_code ?? r.program_code ?? '').trim();
    if (!classCode) continue;
    const nameZhTw = String(r.class_name_zh_tw ?? r.name_zh_tw ?? r.class_name ?? r.name ?? '').trim();
    const nameZhCn = String(r.class_name_zh_cn ?? r.name_zh_cn ?? '').trim();
    const nameEn = String(r.class_name_en ?? r.name_en ?? '').trim();
    const intro = String(r.intro ?? r.description ?? '').trim();
    const note = String(r.trial_class_name ?? r.class_name ?? r.name ?? classCode).trim();
    if (!byCode.has(classCode)) {
      byCode.set(classCode, {
        id: classCode,
        classCode,
        nameZhTw: nameZhTw || nameZhCn || nameEn || classCode,
        nameZhCn: nameZhCn || '',
        nameEn: nameEn || '',
        intro,
        note,
      });
    }
  }
  return Array.from(byCode.values()).sort((a, b) =>
    pickLocalizedName(a, 'zh-TW').localeCompare(pickLocalizedName(b, 'zh-TW'))
  );
}

export default function AdminCourseIntroPage() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<AdminCourseIntroOption[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesLoadFailed, setCoursesLoadFailed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [form, setForm] = useState<CourseIntroOverrides>({});
  const [activeLang, setActiveLang] = useState<CourseIntroLang>('zh-TW');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCoursesLoading(true);
      setCoursesLoadFailed(false);
      try {
        const adminRes = await api.get<Record<string, unknown>[]>('/admin/classes');
        const rows = adminRes.success && Array.isArray(adminRes.data) ? adminRes.data : [];
        if (!cancelled && rows.length > 0) {
          setCourses(toAdminCourseOptions(rows));
        } else {
          const res = await api.get<Record<string, unknown>[]>('/classes');
          if (cancelled) return;
          const fallbackRows = res.success && Array.isArray(res.data) ? res.data : [];
          setCourses(toAdminCourseOptions(fallbackRows));
          if (fallbackRows.length === 0) setCoursesLoadFailed(true);
        }
      } catch {
        if (!cancelled) {
          setCourses([]);
          setCoursesLoadFailed(true);
        }
      }
      if (!cancelled) setCoursesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function getFormValue(field: 'title' | 'content' | 'note', lang: CourseIntroLang): string {
    if (field === 'title') {
      if (lang === 'zh-TW') return form.name_zh_tw ?? '';
      if (lang === 'zh-CN') return form.name_zh_cn ?? '';
      return form.name_en ?? '';
    }
    if (field === 'content') {
      if (lang === 'zh-TW') return form.intro_zh_tw ?? '';
      if (lang === 'zh-CN') return form.intro_zh_cn ?? '';
      return form.intro_en ?? '';
    }
    if (lang === 'zh-TW') return form.trial_class_name_zh_tw ?? '';
    if (lang === 'zh-CN') return form.trial_class_name_zh_cn ?? '';
    return form.trial_class_name_en ?? '';
  }

  function setFormValue(field: 'title' | 'content' | 'note', lang: CourseIntroLang, value: string) {
    setForm((prev) => {
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
    });
  }

  function openCreate() {
    setSelectedCourseId('');
    setForm({});
    setActiveLang('zh-TW');
    setShowModal(true);
  }

  function openEdit(course: AdminCourseIntroOption) {
    setSelectedCourseId(course.id);
    const overrides = getCourseIntroOverrides(course.id) || {};
    setForm({
      name_zh_tw: overrides.name_zh_tw ?? course.nameZhTw,
      name_zh_cn: overrides.name_zh_cn ?? course.nameZhCn,
      name_en: overrides.name_en ?? course.nameEn,
      intro_zh_tw: overrides.intro_zh_tw ?? course.intro,
      intro_zh_cn: overrides.intro_zh_cn ?? '',
      intro_en: overrides.intro_en ?? '',
      trial_class_name_zh_tw: overrides.trial_class_name_zh_tw ?? course.note,
      trial_class_name_zh_cn: overrides.trial_class_name_zh_cn ?? '',
      trial_class_name_en: overrides.trial_class_name_en ?? '',
    });
    setActiveLang('zh-TW');
    setShowModal(true);
  }

  function handleDelete(course: AdminCourseIntroOption) {
    const ok = window.confirm(
      t('admin.courseIntro.confirmDelete', '確定刪除此課程介紹內容？')
    );
    if (!ok) return;
    deleteCourseIntroOverrides(course.id);
  }

  function closeModal() {
    setShowModal(false);
    setSelectedCourseId('');
    setForm({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourseId) return;
    setCourseIntroOverrides(selectedCourseId, {
      name_zh_tw: form.name_zh_tw?.trim() || undefined,
      name_zh_cn: form.name_zh_cn?.trim() || undefined,
      name_en: form.name_en?.trim() || undefined,
      intro_zh_tw: form.intro_zh_tw?.trim() || undefined,
      intro_zh_cn: form.intro_zh_cn?.trim() || undefined,
      intro_en: form.intro_en?.trim() || undefined,
      trial_class_name_zh_tw: form.trial_class_name_zh_tw?.trim() || undefined,
      trial_class_name_zh_cn: form.trial_class_name_zh_cn?.trim() || undefined,
      trial_class_name_en: form.trial_class_name_en?.trim() || undefined,
    });
    closeModal();
  }

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) || null;

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
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t('common.add', '新增')}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {coursesLoading ? (
            <div className="p-6 text-sm text-gray-500">{t('common.loading', '載入中…')}</div>
          ) : courses.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              {coursesLoadFailed
                ? t('admin.courseIntro.loadFailed', '無法從 API 載入課程資料，請稍後再試。')
                : t('admin.courseIntro.empty', '目前沒有可用課程資料。')}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {courses.map((course) => (
                <li key={course.id} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{pickLocalizedName(course, 'zh-TW')}</p>
                    <p className="text-sm text-gray-500 truncate">{course.classCode}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(course)}
                      className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                      title={t('common.edit', '編輯')}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(course)}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      title={t('common.delete', '刪除')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={closeModal} aria-hidden />
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
              <div className="p-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <h2 className="text-xl font-bold text-gray-900">
                    {t('common.add', '新增')} · {t('admin.courseIntro.title', '課堂介紹')}
                  </h2>
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
                      {t('admin.courseIntro.courseName', '課程名稱')}
                    </label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                      required
                    >
                      <option value="">{t('admin.classNotice.selectClass', '請選擇')}</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {pickLocalizedName(course, activeLang)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('common.courseCode', '課程 Code')}
                    </label>
                    <input
                      type="text"
                      value={selectedCourse?.classCode ?? ''}
                      readOnly
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.courseIntro.intro', '內文')}
                    </label>
                    <textarea
                      rows={4}
                      value={getFormValue('content', activeLang)}
                      onChange={(e) => setFormValue('content', activeLang, e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                      {t('common.cancel', '取消')}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50"
                      disabled={!selectedCourseId}
                    >
                      {t('common.save', '儲存')}
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
