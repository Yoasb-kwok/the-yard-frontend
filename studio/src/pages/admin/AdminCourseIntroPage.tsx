import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { Edit, BookOpen, Image } from 'lucide-react';
import { ALL_COURSES, type CourseItem } from '../../lib/coursesData';
import {
  getCourseIntroOverrides,
  setCourseIntroOverrides,
  type CourseIntroOverrides,
} from '../../lib/courseIntroStorage';
import {
  getCoursesPageHero,
  setCoursesPageHero,
  type CoursesPageHero,
} from '../../lib/coursesPageHeroStorage';

export default function AdminCourseIntroPage() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<CourseItem[]>(ALL_COURSES);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  const [form, setForm] = useState<CourseIntroOverrides>({});
  const [heroForm, setHeroForm] = useState<CoursesPageHero>({});
  const [heroSaved, setHeroSaved] = useState(false);

  useEffect(() => {
    setHeroForm(getCoursesPageHero());
  }, []);

  useEffect(() => {
    setCourses(ALL_COURSES);
  }, []);

  function openEdit(course: CourseItem) {
    setEditingCourse(course);
    const overrides = getCourseIntroOverrides(course.id) || {};
    setForm({
      name_zh_tw: overrides.name_zh_tw ?? course.name,
      name_zh_cn: overrides.name_zh_cn ?? '',
      name_en: overrides.name_en ?? '',
      intro_zh_tw: overrides.intro_zh_tw ?? course.intro,
      intro_zh_cn: overrides.intro_zh_cn ?? '',
      intro_en: overrides.intro_en ?? '',
      trial_class_name_zh_tw: overrides.trial_class_name_zh_tw ?? course.trial_class_name,
      trial_class_name_zh_cn: overrides.trial_class_name_zh_cn ?? '',
      trial_class_name_en: overrides.trial_class_name_en ?? '',
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingCourse(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCourse) return;
    setCourseIntroOverrides(editingCourse.id, {
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

  function saveHero(e: React.FormEvent) {
    e.preventDefault();
    setCoursesPageHero(heroForm);
    setHeroSaved(true);
    setTimeout(() => setHeroSaved(false), 2000);
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-2">
          <BookOpen className="h-7 w-7 text-primary" />
          {t('admin.courseIntro.title', '課堂介紹（課程介紹）')}
        </h1>
        <p className="text-gray-600 text-sm mb-6">
          {t('admin.courseIntro.hint', '編輯各課程的名稱、簡介與試堂名稱，請輸入三種語言。前台「課程介紹」頁將依使用者語言顯示。')}
        </p>

        {/* 課程介紹頁頂部區塊：圖片 + 晉升流程文字 */}
        <form onSubmit={saveHero} className="mb-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
            <Image className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-gray-900">
              {t('admin.courseIntro.heroBlockTitle', '課程介紹頁頂部區塊（晉升流程）')}
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-500">
              {t('admin.courseIntro.heroBlockHint', '設定前台「課程介紹」頁最頂的圖片與左側說明文字。圖片建議比例 16:9 或 4:3，寬度 800–1200px；過大會自動縮小顯示，不會裁切。')}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.courseIntro.heroImageUrl', '圖片網址')}
              </label>
              <input
                type="text"
                value={heroForm.image_url ?? ''}
                onChange={(e) => setHeroForm((f) => ({ ...f, image_url: e.target.value || undefined }))}
                placeholder="/images/Upgrade.png 或完整 URL"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{t('admin.courseIntro.heroTitle', '標題（三語）')}</p>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">繁體中文</label>
                  <input type="text" value={heroForm.title_zh_tw ?? ''} onChange={(e) => setHeroForm((f) => ({ ...f, title_zh_tw: e.target.value || undefined }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="舞蹈等級晉升流程（示意）" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">简体中文</label>
                  <input type="text" value={heroForm.title_zh_cn ?? ''} onChange={(e) => setHeroForm((f) => ({ ...f, title_zh_cn: e.target.value || undefined }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">English</label>
                  <input type="text" value={heroForm.title_en ?? ''} onChange={(e) => setHeroForm((f) => ({ ...f, title_en: e.target.value || undefined }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{t('admin.courseIntro.heroDesc', '說明內文（三語）')}</p>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">繁體中文</label>
                  <textarea rows={2} value={heroForm.desc_zh_tw ?? ''} onChange={(e) => setHeroForm((f) => ({ ...f, desc_zh_tw: e.target.value || undefined }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y" placeholder="學生完成指定堂數及達到導師評核標準後…" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">简体中文</label>
                  <textarea rows={2} value={heroForm.desc_zh_cn ?? ''} onChange={(e) => setHeroForm((f) => ({ ...f, desc_zh_cn: e.target.value || undefined }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">English</label>
                  <textarea rows={2} value={heroForm.desc_en ?? ''} onChange={(e) => setHeroForm((f) => ({ ...f, desc_en: e.target.value || undefined }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y" />
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{t('admin.courseIntro.heroNote', '備註（三語，選填）')}</p>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">繁體中文</label>
                  <input type="text" value={heroForm.note_zh_tw ?? ''} onChange={(e) => setHeroForm((f) => ({ ...f, note_zh_tw: e.target.value || undefined }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="以上為示意說明；實際晉升準則以中心最新安排為準。" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">简体中文</label>
                  <input type="text" value={heroForm.note_zh_cn ?? ''} onChange={(e) => setHeroForm((f) => ({ ...f, note_zh_cn: e.target.value || undefined }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">English</label>
                  <input type="text" value={heroForm.note_en ?? ''} onChange={(e) => setHeroForm((f) => ({ ...f, note_en: e.target.value || undefined }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark">
                {heroSaved ? t('common.saved', '已儲存') : t('common.save', '儲存')}
              </button>
            </div>
          </div>
        </form>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {courses.map((course) => (
              <li key={course.id} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">{course.name}</p>
                  <p className="text-sm text-gray-500 truncate">{course.program_code} · {course.trial_class_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(course)}
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                  title={t('common.edit', '編輯')}
                >
                  <Edit className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {showModal && editingCourse && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={closeModal} aria-hidden />
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {t('admin.courseIntro.editTitle', '編輯課堂介紹')} · {editingCourse.name}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 課程名稱 */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">{t('admin.courseIntro.courseName', '課程名稱')}</p>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">繁體中文</label>
                        <input type="text" value={form.name_zh_tw ?? ''} onChange={(e) => setForm((f) => ({ ...f, name_zh_tw: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">简体中文</label>
                        <input type="text" value={form.name_zh_cn ?? ''} onChange={(e) => setForm((f) => ({ ...f, name_zh_cn: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">English</label>
                        <input type="text" value={form.name_en ?? ''} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                  {/* 課程簡介 */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">{t('admin.courseIntro.intro', '課程簡介')}</p>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">繁體中文</label>
                        <textarea rows={3} value={form.intro_zh_tw ?? ''} onChange={(e) => setForm((f) => ({ ...f, intro_zh_tw: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">简体中文</label>
                        <textarea rows={3} value={form.intro_zh_cn ?? ''} onChange={(e) => setForm((f) => ({ ...f, intro_zh_cn: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">English</label>
                        <textarea rows={3} value={form.intro_en ?? ''} onChange={(e) => setForm((f) => ({ ...f, intro_en: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y" />
                      </div>
                    </div>
                  </div>
                  {/* 試堂名稱 */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">{t('admin.courseIntro.trialClassName', '試堂名稱')}</p>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">繁體中文</label>
                        <input type="text" value={form.trial_class_name_zh_tw ?? ''} onChange={(e) => setForm((f) => ({ ...f, trial_class_name_zh_tw: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">简体中文</label>
                        <input type="text" value={form.trial_class_name_zh_cn ?? ''} onChange={(e) => setForm((f) => ({ ...f, trial_class_name_zh_cn: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">English</label>
                        <input type="text" value={form.trial_class_name_en ?? ''} onChange={(e) => setForm((f) => ({ ...f, trial_class_name_en: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                      {t('common.cancel', '取消')}
                    </button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark">
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
