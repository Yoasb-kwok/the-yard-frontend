import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Layout from '../../components/Layout';
import { Save } from 'lucide-react';
import {
  getSitePageContentForLocaleExact,
  loadSimpleSitePage,
  saveSimpleSitePage,
  setSitePageContentForLocale,
  type SimpleSitePageContent,
  type SitePageLocale,
} from '../../lib/sitePageContent';

interface Props {
  /** site_content page_key, e.g. "terms" / "privacy" */
  pageKey: string;
  /** Page heading shown at the top of the admin page */
  heading: string;
  /** Short description text shown under the heading */
  description: string;
  /** Fallback title when nothing is stored (e.g. localized "Terms and Conditions") */
  fallbackTitle: string;
  /** Fallback HTML when nothing is stored (e.g. localized legacy content) */
  fallbackContentHtml: string;
  /** Optional label for the title input */
  titleLabel?: string;
  /** Whether to show the editable title input (default: true). */
  showTitleField?: boolean;
  /** Enable one-click language switching for content editor. */
  enableContentLanguageSwitch?: boolean;
}

/**
 * Reusable admin editor for simple CMS pages that consist of a title plus
 * rich-text HTML body (Terms, Privacy, etc.).
 */
export default function AdminSimpleSitePage({
  pageKey,
  heading,
  description,
  fallbackTitle,
  fallbackContentHtml,
  titleLabel,
  showTitleField = true,
  enableContentLanguageSwitch = false,
}: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeLang, setActiveLang] = useState<SitePageLocale>('zh-TW');

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [2, 3, false] }],
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
  }, [pageKey]);

  async function load() {
    setLoading(true);
    try {
      const data = await loadSimpleSitePage(pageKey);
      if (data && (data.title || data.contentHtml)) {
        setTitle(data.title || fallbackTitle);
        setContentHtml(data.contentHtml || fallbackContentHtml);
      } else {
        setTitle(fallbackTitle);
        setContentHtml(fallbackContentHtml);
      }
    } catch (err) {
      console.warn(`Failed to load site page "${pageKey}"`, err);
      setTitle(fallbackTitle);
      setContentHtml(fallbackContentHtml);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (showTitleField && !trimmedTitle) {
      alert(
        t(
          'admin.sitePage.missingTitle',
          '請先輸入頁面標題'
        )
      );
      return;
    }
    setSaving(true);
    const payload: SimpleSitePageContent = {
      title: (trimmedTitle || fallbackTitle).trim(),
      contentHtml,
    };
    try {
      await saveSimpleSitePage(pageKey, payload);
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
          <h1 className="text-3xl font-bold text-gray-900">{heading}</h1>
          {description.trim() !== '' && <p className="mt-1 text-sm text-gray-600">{description}</p>}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {showTitleField && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {titleLabel || t('admin.sitePage.pageTitle', '頁面標題')}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('admin.sitePage.body', '頁面內容')}
              </label>
              {enableContentLanguageSwitch && (
                <div className="inline-flex items-center rounded-md border border-gray-200 p-0.5 bg-white">
                  {(['zh-TW', 'zh-CN', 'en'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setActiveLang(lang)}
                      className={`px-2.5 py-1 text-xs rounded ${
                        activeLang === lang
                          ? 'bg-primary text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {lang === 'zh-TW' ? '繁中' : lang === 'zh-CN' ? '简中' : 'EN'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="site-content-quill border border-gray-200 rounded-md overflow-hidden bg-white">
              <ReactQuill
                key={enableContentLanguageSwitch ? activeLang : 'default'}
                theme="snow"
                value={
                  enableContentLanguageSwitch
                    ? getSitePageContentForLocaleExact(contentHtml, activeLang)
                    : contentHtml
                }
                onChange={(value) => {
                  if (!enableContentLanguageSwitch) {
                    setContentHtml(value);
                    return;
                  }
                  setContentHtml((prev) => setSitePageContentForLocale(prev, activeLang, value));
                }}
                modules={quillModules}
              />
            </div>
          </div>

          <div className="pt-2">
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
      </div>
    </Layout>
  );
}
