import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Layout from '../../components/Layout';
import { Save, Bell, Plus, Upload, Trash2 } from 'lucide-react';
import { getHomeAboutContent, saveHomeAboutContent } from '../../lib/homeAboutStorage';
import { api } from '../../lib/api';
import {
  createDefaultHomeAboutBlocks,
  createEmptyBlock,
  effectiveBlockLayout,
  layoutModeLabel,
  legacyContentToBlocks,
  parseHomeAboutContentField,
  serializeHomeAboutBlocks,
  type HomeAboutBlock,
  type HomeAboutBlockLayout,
} from '../../lib/homeAboutBlocks';
import { DEFAULT_UPLOAD_COMPRESSION, isLikelyImageFile, normalizeImageFileForUpload } from '../../lib/imagePrepare';

const LAYOUT_OPTIONS: { value: HomeAboutBlockLayout; label: string }[] = [
  { value: 'split-image-left', label: '左圖右文' },
  { value: 'split-image-right', label: '左文右圖' },
];

const TOKEN_REMINDER_KEY = 'the_yard_token_expiry_reminder';

/** 後端 site_content 鍵名（沿用 home-about）— 內容顯示於公開頁 /about，非首頁 */
const SITE_ABOUT_PAGE_KEY = 'home-about';

type SiteContentRow = { page_key: string; title: string; content: string };

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const [sectionTitle, setSectionTitle] = useState('');
  const [blocks, setBlocks] = useState<HomeAboutBlock[]>(() => createDefaultHomeAboutBlocks(4));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tokenExpiryReminder, setTokenExpiryReminder] = useState(() => localStorage.getItem(TOKEN_REMINDER_KEY) === 'true');

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean'],
      ],
    }),
    []
  );

  useEffect(() => {
    loadContent();
  }, [t]);

  function blocksFromStoredContent(content: string): HomeAboutBlock[] {
    const parsed = parseHomeAboutContentField(content);
    return parsed.kind === 'blocks' ? parsed.blocks : legacyContentToBlocks(parsed.legacyHtml);
  }

  async function loadContent() {
    const defaultTitle = t('about.title', '關於我們');

    try {
      const res = await api.get<SiteContentRow>(`/site-content/${SITE_ABOUT_PAGE_KEY}`);
      if (res.success && res.data && typeof res.data.title === 'string' && typeof res.data.content === 'string') {
        setSectionTitle(res.data.title);
        setBlocks(blocksFromStoredContent(res.data.content));
        setLoading(false);
        return;
      }
    } catch {
      // ignore
    }

    try {
      const res = await api.get<SiteContentRow[]>('/admin/site-content');
      if (res.success && Array.isArray(res.data)) {
        const row = res.data.find((p) => p.page_key === SITE_ABOUT_PAGE_KEY);
        if (row) {
          setSectionTitle(row.title);
          setBlocks(blocksFromStoredContent(row.content));
          setLoading(false);
          return;
        }
      }
    } catch {
      // ignore
    }

    const stored = getHomeAboutContent();
    if (stored) {
      setSectionTitle(stored.title);
      setBlocks(blocksFromStoredContent(stored.content));
    } else {
      setSectionTitle(defaultTitle);
      setBlocks(createDefaultHomeAboutBlocks(4));
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const title = sectionTitle.trim();
    const content = serializeHomeAboutBlocks(blocks);

    try {
      const response = await api.patch(`/admin/site-content/${encodeURIComponent(SITE_ABOUT_PAGE_KEY)}`, {
        title,
        content,
      });
      if (!response.success) {
        throw new Error(response.msg || 'Failed to update site content');
      }
    } catch {
      saveHomeAboutContent({ title, content });
    }

    setSectionTitle(title);
    setBlocks(blocks);
    alert(t('admin.settings.contentUpdated', 'Content updated successfully'));
    setSaving(false);
  }

  function updateBlock(index: number, patch: Partial<HomeAboutBlock>) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  async function handleBlockImage(index: number, file: File | null) {
    if (!file) return;
    if (!isLikelyImageFile(file)) {
      alert(t('admin.settings.imageTypeError', '請選擇圖片檔案（JPG、PNG、WebP、GIF 等）。'));
      return;
    }
    const prepared = await normalizeImageFileForUpload(file, DEFAULT_UPLOAD_COMPRESSION);
    const dataUrl = await readFileAsDataUrl(prepared);
    updateBlock(index, { image_url: dataUrl });
  }

  function clearBlockImage(index: number) {
    updateBlock(index, { image_url: null });
  }

  function removeBlock(index: number) {
    if (blocks.length <= 1) return;
    setBlocks((prev) => prev.filter((_, i) => i !== index));
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
            {t('nav.settingsHomeAbout', '關於我們')}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {t(
              'admin.settings.homeAboutHint',
              '編輯公開頁「關於我們」（/about）的內容與版面；首頁版面與最新消息區塊不會變動。每組可選：左圖右文、左文右圖；預設 4 組，可按「增加組別」擴充；每組可刪除（至少保留一組）。未儲存或無內容時，/about 仍顯示語系檔內建文案。'
            )}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.settings.homeAboutSectionTitle', '關於我們頁面（/about）')}
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.settings.homeAboutHeading', '區塊總標題')}
              </label>
              <input
                type="text"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-8">
              {blocks.map((block, index) => {
                const layout = effectiveBlockLayout(block, index);

                const imageCol = (
                  <div className="flex-shrink-0 space-y-2 w-full sm:w-[42%]">
                    <p className="text-xs font-medium text-gray-500">
                      {layout === 'split-image-left' ? '左：上載圖片' : '右：上載圖片'}
                    </p>
                    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center h-44">
                      {block.image_url ? (
                        <img src={block.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-400 px-2 text-center">尚未上載</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded cursor-pointer hover:bg-primary-dark">
                        <Upload className="h-3.5 w-3.5" />
                        上載
                        <input
                          type="file"
                          accept="image/*,.heic,.heif,.avif"
                          className="hidden"
                          onChange={async (e) => {
                            const input = e.currentTarget;
                            const file = input.files?.[0] || null;
                            await handleBlockImage(index, file);
                            input.value = '';
                          }}
                        />
                      </label>
                      {block.image_url && (
                        <button
                          type="button"
                          onClick={() => clearBlockImage(index)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          移除圖片
                        </button>
                      )}
                    </div>
                  </div>
                );

                const textCol = (
                  <div className="min-w-0 space-y-2 flex-1">
                    <p className="text-xs font-medium text-gray-500">
                      {layout === 'split-image-left' ? '右：文字內容' : '左：文字內容'}
                    </p>
                    <div className="site-content-quill border border-gray-200 rounded-md overflow-hidden bg-white">
                      <ReactQuill
                        theme="snow"
                        value={block.body_html}
                        onChange={(value) => updateBlock(index, { body_html: value })}
                        modules={quillModules}
                      />
                    </div>
                  </div>
                );

                return (
                  <div
                    key={block.id}
                    className="rounded-xl border border-gray-200 p-4 sm:p-5 bg-gray-50/50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">第 {index + 1} 組</p>
                        <p className="text-xs text-gray-500 mt-0.5">目前：{layoutModeLabel(layout)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBlock(index)}
                        disabled={blocks.length <= 1}
                        title={blocks.length <= 1 ? '至少保留一組' : '刪除此組'}
                        className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        刪除此組
                      </button>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-600 mb-2">版面配置</p>
                      <div className="flex flex-wrap gap-2">
                        {LAYOUT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateBlock(index, { layout: opt.value })}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                              layout === opt.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
                      {layout === 'split-image-left' ? (
                        <>
                          {imageCol}
                          {textCol}
                        </>
                      ) : (
                        <>
                          {textCol}
                          {imageCol}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setBlocks((prev) => [...prev, createEmptyBlock(prev.length)])}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-primary/40 text-primary font-medium hover:bg-primary/5 transition-colors"
            >
              <Plus className="h-5 w-5" />
              增加組別
            </button>

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

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            {t('admin.settings.reminderSection')}
          </h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={tokenExpiryReminder}
              onChange={(e) => {
                const v = e.target.checked;
                setTokenExpiryReminder(v);
                localStorage.setItem(TOKEN_REMINDER_KEY, v ? 'true' : 'false');
              }}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">{t('admin.settings.tokenExpiryReminder')}</span>
          </label>
          <p className="text-xs text-gray-500 mt-2">{t('admin.settings.tokenExpiryReminderHint')}</p>
        </div>
      </div>
    </Layout>
  );
}
