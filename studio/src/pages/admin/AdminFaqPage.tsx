import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Layout from '../../components/Layout';
import { Save, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import {
  createDefaultFaqContent,
  createEmptyFaqItem,
  loadAdminFaq,
  saveAdminFaq,
  type FaqContent,
  type FaqItem,
} from '../../lib/faqContent';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function plaintextToHtml(text: string): string {
  if (!text) return '';
  return `<p>${escapeHtml(text).replace(/\n/g, '<br/>')}</p>`;
}

/**
 * Build a default FAQ content payload from the i18n `faq.*` bundle so that
 * the admin editor shows current public-page content the first time it is
 * opened (before anything has been saved to the backend).
 */
function buildFallbackFromI18n(t: (k: string, def?: string) => string): FaqContent {
  const items: FaqItem[] = [];
  for (let i = 1; i <= 100; i++) {
    const question = t(`faq.questions.${i}.question`, '');
    const answer = t(`faq.questions.${i}.answer`, '');
    if (!question || !answer) break;
    items.push({
      id: `faq-seed-${i}`,
      question,
      answer_html: plaintextToHtml(answer),
      is_active: true,
    });
  }
  return {
    title: t('faq.title', 'FAQ'),
    intro: t('faq.subtitle', ''),
    items,
  };
}

export default function AdminFaqPage() {
  const { t } = useTranslation();
  const [content, setContent] = useState<FaqContent>(() => createDefaultFaqContent());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [3, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link'],
        ['clean'],
      ],
    }),
    []
  );

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      const stored = await loadAdminFaq();
      if (stored.items.length > 0 || stored.title.trim() !== '' || stored.intro.trim() !== '') {
        setContent(stored);
      } else {
        setContent(buildFallbackFromI18n(t));
      }
    } catch (err) {
      console.warn('Failed to load FAQ content', err);
      setContent(buildFallbackFromI18n(t));
    } finally {
      setLoading(false);
    }
  }

  function updateField<K extends keyof FaqContent>(key: K, value: FaqContent[K]) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  function updateItem(index: number, patch: Partial<FaqItem>) {
    setContent((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));
  }

  function addItem() {
    setContent((prev) => ({ ...prev, items: [...prev.items, createEmptyFaqItem()] }));
  }

  function removeItem(index: number) {
    setContent((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }

  function moveItem(index: number, direction: -1 | 1) {
    setContent((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.items.length) return prev;
      const next = prev.items.slice();
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return { ...prev, items: next };
    });
  }

  async function handleSave() {
    if (!content.title.trim()) {
      alert(t('admin.faq.missingTitle', '請先輸入頁面標題'));
      return;
    }
    const emptyCount = content.items.filter((it) => !it.question.trim()).length;
    if (emptyCount > 0) {
      const ok = window.confirm(
        t(
          'admin.faq.confirmEmptyQuestions',
          '有未填問題的項目，將一併儲存。是否繼續？'
        )
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      const fresh = await saveAdminFaq(content);
      setContent(fresh);
      alert(t('admin.settings.contentUpdated', 'Content updated successfully'));
    } catch (err) {
      console.error(err);
      alert((err as Error).message || t('common.error', 'Something went wrong.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('admin.faq.heading', '常見問題')}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {t(
              'admin.faq.description',
              '編輯公開頁「常見問題」(/faq) 的標題、簡介及 Q&A 清單。可新增、刪除、調整順序，每題答案支援格式化文字。'
            )}
          </p>
        </div>

        {/* Page-level fields */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('admin.faq.pageSection', '頁面標題與簡介')}
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.faq.pageTitle', '頁面標題')}
            </label>
            <input
              type="text"
              value={content.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.faq.pageIntro', '頁面簡介（顯示於標題下方）')}
            </label>
            <textarea
              value={content.intro}
              onChange={(e) => updateField('intro', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Items list */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('admin.faq.itemsSection', '問題清單')}
            </h2>
            <span className="text-xs text-gray-500">
              {t('admin.faq.itemsCount', '共 {{count}} 題', { count: content.items.length })}
            </span>
          </div>

          {content.items.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
              {t('admin.faq.emptyList', '尚未有任何問題，按下方按鈕新增。')}
            </div>
          )}

          <div className="space-y-6">
            {content.items.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 sm:p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800">
                    {t('admin.faq.itemLabel', '第 {{n}} 題', { n: index + 1 })}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      title={t('admin.faq.moveUp', '上移')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                      {t('admin.faq.moveUp', '上移')}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 1)}
                      disabled={index === content.items.length - 1}
                      title={t('admin.faq.moveDown', '下移')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                      {t('admin.faq.moveDown', '下移')}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('admin.faq.remove', '刪除')}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.faq.question', '問題')}
                  </label>
                  <input
                    type="text"
                    value={item.question}
                    onChange={(e) => updateItem(index, { question: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.faq.answer', '答案')}
                  </label>
                  <div className="site-content-quill border border-gray-200 rounded-md overflow-hidden bg-white">
                    <ReactQuill
                      theme="snow"
                      value={item.answer_html}
                      onChange={(value) => updateItem(index, { answer_html: value })}
                      modules={quillModules}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-primary/40 text-primary font-medium hover:bg-primary/5 transition-colors"
          >
            <Plus className="h-5 w-5" />
            {t('admin.faq.addItem', '新增問題')}
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark flex items-center disabled:opacity-50"
          >
            <Save className="h-5 w-5 mr-2" />
            {saving ? t('admin.settings.saving') : t('admin.settings.saveChanges')}
          </button>
        </div>
      </div>
    </Layout>
  );
}
