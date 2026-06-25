import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Layout from '../../components/Layout';
import { Save, Plus, Trash2 } from 'lucide-react';
import { getHomeAboutContent, saveHomeAboutContent } from '../../lib/homeAboutStorage';
import { api } from '../../lib/api';
import { resolveUploadUrl, uploadImage } from '../../lib/uploads';
import {
  createDefaultHomeAboutBlocks,
  createEmptyBlock,
  effectiveBlockLayout,
  legacyContentToBlocks,
  parseHomeAboutContentField,
  serializeHomeAboutBlocks,
  type HomeAboutBlock,
  type HomeAboutLang,
  type HomeAboutBlockLayout,
} from '../../lib/homeAboutBlocks';
import { isLikelyImageFile } from '../../lib/imagePrepare';

const LAYOUT_OPTIONS: { value: HomeAboutBlockLayout; label: string }[] = [
  { value: 'split-image-left', label: '左圖右文' },
  { value: 'split-image-right', label: '左文右圖' },
];

const BLOCK_EDITOR_DEFAULT_LANG: HomeAboutLang = 'zh-TW';
const BLOCK_LANG_OPTIONS: Array<{ value: HomeAboutLang; label: string }> = [
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
];

type AboutRow = { title?: string; content?: string; updated_at?: string };

export default function SettingsPage() {
  const { t } = useTranslation();
  const [sectionTitle, setSectionTitle] = useState('');
  const [blocks, setBlocks] = useState<HomeAboutBlock[]>(() => createDefaultHomeAboutBlocks(4));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blockEditorLang, setBlockEditorLang] = useState<Record<string, HomeAboutLang>>({});

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
      const res = await api.get<AboutRow>('/about');
      if (
        res.success &&
        res.data &&
        typeof res.data.title === 'string' &&
        typeof res.data.content === 'string'
      ) {
        setSectionTitle(res.data.title);
        setBlocks(blocksFromStoredContent(res.data.content));
        setLoading(false);
        return;
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
    const readEditorHtml = (blockId: string): string | null => {
      const root = document.querySelector(
        `[data-about-block-id="${blockId}"] .ql-editor`
      ) as HTMLElement | null;
      if (!root) return null;
      const html = root.innerHTML ?? '';
      const compact = html.replace(/\s+/g, '').toLowerCase();
      return compact === '<p><br></p>' || compact === '<p></p>' ? '' : html;
    };

    const blocksForSave = blocks.map((block) => {
      const lang = getBlockEditorLang(block.id);
      const liveHtml = readEditorHtml(block.id);
      if (liveHtml == null) return block;
      if (lang === 'zh-TW') {
        return { ...block, body_html_zh_tw: liveHtml, body_html: liveHtml };
      }
      if (lang === 'zh-CN') {
        return { ...block, body_html_zh_cn: liveHtml };
      }
      return { ...block, body_html_en: liveHtml };
    });

    setSaving(true);
    const title = sectionTitle.trim() || t('about.title', '關於我們');

    const dataUrlToFile = async (dataUrl: string, baseName: string): Promise<File> => {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const mime = blob.type || 'image/png';
      const ext = mime.includes('/') ? mime.split('/')[1] : 'png';
      return new File([blob], `${baseName}.${ext}`, { type: mime });
    };

    const normalizedBlocks: HomeAboutBlock[] = [];
    try {
      for (let i = 0; i < blocksForSave.length; i += 1) {
        const block = blocksForSave[i];
        if (typeof block.image_url === 'string' && block.image_url.startsWith('data:')) {
          const file = await dataUrlToFile(block.image_url, `about-block-${i + 1}`);
          const uploadedUrl = await uploadImage(file, 'about');
          normalizedBlocks.push({ ...block, image_url: uploadedUrl });
        } else {
          normalizedBlocks.push(block);
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t('admin.settings.imageUploadError', '圖片上傳失敗');
      alert(msg);
      setSaving(false);
      return;
    }

    const content = serializeHomeAboutBlocks(normalizedBlocks);

    try {
      const response = await api.patch('/admin/about', {
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
    setBlocks(normalizedBlocks);
    alert(t('admin.settings.contentUpdated', 'Content updated successfully'));
    setSaving(false);
  }

  function updateBlock(index: number, patch: Partial<HomeAboutBlock>) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function getBlockEditorLang(id: string): HomeAboutLang {
    return blockEditorLang[id] || BLOCK_EDITOR_DEFAULT_LANG;
  }

  function setBlockBodyForLang(index: number, lang: HomeAboutLang, value: string) {
    if (lang === 'zh-TW') {
      updateBlock(index, { body_html_zh_tw: value, body_html: value });
      return;
    }
    if (lang === 'zh-CN') {
      updateBlock(index, { body_html_zh_cn: value });
      return;
    }
    updateBlock(index, { body_html_en: value });
  }

  function switchBlockLang(blockId: string, nextLang: HomeAboutLang) {
    const root = document.querySelector(
      `[data-about-block-id="${blockId}"] .ql-editor`
    ) as HTMLElement | null;
    const html = root?.innerHTML ?? null;
    if (html != null) {
      const compact = html.replace(/\s+/g, '').toLowerCase();
      const normalized = compact === '<p><br></p>' || compact === '<p></p>' ? '' : html;
      const currentLang = getBlockEditorLang(blockId);
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== blockId) return b;
          if (currentLang === 'zh-TW') return { ...b, body_html_zh_tw: normalized, body_html: normalized };
          if (currentLang === 'zh-CN') return { ...b, body_html_zh_cn: normalized };
          return { ...b, body_html_en: normalized };
        })
      );
    }
    setTimeout(() => {
      setBlockEditorLang((prev) => ({ ...prev, [blockId]: nextLang }));
    }, 0);
  }

  function getBlockBodyForEditor(block: HomeAboutBlock, lang: HomeAboutLang): string {
    if (lang === 'zh-TW') return block.body_html_zh_tw ?? '';
    if (lang === 'zh-CN') return block.body_html_zh_cn ?? '';
    return block.body_html_en ?? '';
  }

  async function handleBlockImage(index: number, file: File | null) {
    if (!file) return;
    if (!isLikelyImageFile(file)) {
      alert(t('admin.settings.imageTypeError', '請選擇圖片檔案（JPG、PNG、WebP、GIF 等）。'));
      return;
    }
    try {
      const url = await uploadImage(file, 'about');
      updateBlock(index, { image_url: url });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t('admin.settings.imageUploadError', '圖片上傳失敗');
      alert(msg);
    }
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
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="space-y-6">
            <div className="space-y-8">
              {blocks.map((block, index) => {
                const layout = effectiveBlockLayout(block, index);

                const imageCol = (
                  <div className="flex-shrink-0 w-full sm:w-[42%] sm:self-stretch">
                    <label className="block cursor-pointer">
                      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center h-[320px] sm:h-[360px] hover:border-primary/40 transition-colors">
                        {block.image_url ? (
                          <img src={resolveUploadUrl(block.image_url)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-gray-400 px-2 text-center">點擊上載</span>
                        )}
                      </div>
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
                    <div className="flex flex-wrap gap-2 mt-2">
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
                  <div className="min-w-0 flex-1 sm:self-stretch">
                    <div
                      className="site-content-quill about-block-quill border border-gray-200 rounded-md overflow-hidden bg-white h-[320px] sm:h-[360px]"
                      data-about-block-id={block.id}
                    >
                      <ReactQuill
                        key={`${block.id}-${getBlockEditorLang(block.id)}`}
                        theme="snow"
                        value={getBlockBodyForEditor(block, getBlockEditorLang(block.id))}
                        onChange={(value) =>
                          setBlockBodyForLang(index, getBlockEditorLang(block.id), value)
                        }
                        onBlur={(_prevRange, _source, editor) =>
                          setBlockBodyForLang(index, getBlockEditorLang(block.id), editor.getHTML())
                        }
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

                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {BLOCK_LANG_OPTIONS.map((opt) => {
                          const activeLang = getBlockEditorLang(block.id);
                          const isActive = activeLang === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => switchBlockLang(block.id, opt.value)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                                isActive
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
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
      </div>
    </Layout>
  );
}
