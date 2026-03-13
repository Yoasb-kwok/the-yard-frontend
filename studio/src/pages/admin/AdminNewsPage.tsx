import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { formatDate } from '../../lib/utils';
import { api } from '../../lib/api';
import {
  getStoredNewsPosts,
  saveStoredNewsPosts,
  createStoredNewsPost,
  updateStoredNewsPost,
  deleteStoredNewsPost,
  type StoredNewsPost,
} from '../../lib/newsStorage';
import { Plus, Edit, Trash2, Newspaper, Image as ImageIcon } from 'lucide-react';
import { useModalA11y } from '../../lib/useModalA11y';

/** Normalize API or stored post to list item shape (published_at may be ISO or date-only) */
function toPostItem(p: { id: string; title: string; content: string; image_url: string | null; published_at: string; created_at?: string; show_as_popup?: boolean }): StoredNewsPost {
  return {
    id: String(p.id),
    title: p.title || '',
    content: p.content || '',
    image_url: p.image_url || null,
    published_at: p.published_at || new Date().toISOString(),
    created_at: p.created_at || p.published_at || new Date().toISOString(),
    show_as_popup: p.show_as_popup ?? false,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminNewsPage() {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState<StoredNewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<StoredNewsPost | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    image_url: null as string | null,
    published_at: new Date().toISOString().slice(0, 10),
    show_as_popup: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingPost(null);
    setImageFile(null);
  }, []);
  useModalA11y(showModal, closeModal, modalContentRef);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    setLoading(true);
    try {
      const res = await api.get<StoredNewsPost[]>('/admin/news');
      if (res.success && Array.isArray(res.data) && res.data.length >= 0) {
        setPosts(res.data.map(toPostItem));
        setLoading(false);
        return;
      }
    } catch {
      // API unavailable: use localStorage demo
    }
    setPosts(getStoredNewsPosts());
    setLoading(false);
  }

  function openCreate() {
    setEditingPost(null);
    setForm({
      title: '',
      content: '',
      image_url: null,
      published_at: new Date().toISOString().slice(0, 10),
      show_as_popup: false,
    });
    setImageFile(null);
    setShowModal(true);
  }

  function openEdit(post: StoredNewsPost) {
    setEditingPost(post);
    setForm({
      title: post.title,
      content: post.content,
      image_url: post.image_url,
      published_at: post.published_at.slice(0, 10),
      show_as_popup: post.show_as_popup ?? false,
    });
    setImageFile(null);
    setShowModal(true);
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setForm((f) => ({ ...f, image_url: dataUrl }));
    } catch (err) {
      console.error('Failed to read image', err);
    }
  }

  function clearImage() {
    setImageFile(null);
    setForm((f) => ({ ...f, image_url: null }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const published_at = form.published_at ? `${form.published_at}T12:00:00.000Z` : new Date().toISOString();
    const body = { title: form.title.trim(), content: form.content.trim(), image_url: form.image_url, published_at, show_as_popup: form.show_as_popup };
    try {
      try {
        if (editingPost) {
          const res = await api.patch(`/admin/news/${editingPost.id}`, body);
          if (res.success) {
            await loadPosts();
            closeModal();
            return;
          }
        } else {
          const res = await api.post('/admin/news', body);
          if (res.success) {
            await loadPosts();
            closeModal();
            return;
          }
        }
      } catch {
        // Fallback to localStorage when API fails
      }
      if (editingPost) {
        updateStoredNewsPost(editingPost.id, { title: body.title, content: body.content, image_url: body.image_url, published_at, show_as_popup: body.show_as_popup });
      } else {
        const created = createStoredNewsPost(body);
        const next = [...getStoredNewsPosts()];
        next.unshift(created);
        saveStoredNewsPosts(next);
      }
      await loadPosts();
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(post: StoredNewsPost) {
    if (!window.confirm(t('admin.news.confirmDelete', '確定刪除此則消息？'))) return;
    try {
      await api.delete(`/admin/news/${post.id}`);
      await loadPosts();
      return;
    } catch {
      // Fallback to localStorage
    }
    deleteStoredNewsPost(post.id);
    loadPosts();
  }

  const locale = i18n.language === 'zh-TW' || i18n.language === 'zh-CN' ? 'zh-TW' : 'en-US';

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Newspaper className="h-7 w-7 text-primary" />
            {t('admin.news.title', '最新消息管理')}
          </h1>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
          >
            <Plus className="h-5 w-5" />
            {t('admin.news.add', '新增消息')}
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          {t('admin.news.hint', '此處新增或編輯的消息會顯示於前台「最新消息」頁。後端連線時會同步至資料庫，離線時儲存於瀏覽器本地。')}
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            <Newspaper className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>{t('admin.news.noPosts', '尚未有任何消息')}</p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 text-primary font-medium hover:underline"
            >
              {t('admin.news.addFirst', '新增第一則')}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {posts.map((post) => (
                <li key={post.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-gray-50">
                  <div className="w-full sm:w-24 h-16 sm:h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {post.image_url ? (
                      <img
                        src={post.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 truncate">{post.title}</h2>
                    <p className="text-sm text-gray-500">
                      {formatDate(post.published_at, locale)}
                      {post.show_as_popup && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                          {t('admin.news.popupBadge', '彈窗')}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(post)}
                      className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                      title={t('common.edit', '編輯')}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(post)}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      title={t('common.delete', '刪除')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={closeModal}
              aria-hidden
            />
            <div ref={modalContentRef} className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="admin-news-modal-title">
              <div className="p-6">
                <h2 id="admin-news-modal-title" className="text-xl font-bold text-gray-900 mb-4">
                  {editingPost ? t('admin.news.edit', '編輯消息') : t('admin.news.add', '新增消息')}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.news.titleLabel', '標題')} <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder={t('admin.news.titlePlaceholder', '例如：新課程時間表已推出')}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.news.contentLabel', '內文')}
                    </label>
                    <textarea
                      value={form.content}
                      onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                      rows={5}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary resize-y"
                      placeholder={t('admin.news.contentPlaceholder', '輸入消息內容…')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.news.imageLabel', '封面圖片')}
                    </label>
                    <div className="flex flex-col gap-2">
                      {form.image_url ? (
                        <div className="relative">
                          <img
                            src={form.image_url}
                            alt=""
                            className="w-full h-40 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={clearImage}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-dark"
                      />
                      <p className="text-xs text-gray-500">
                        {t('admin.news.imageHint', 'Demo 會將圖片存於瀏覽器本地，建議使用 JPG/PNG。')}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('admin.news.publishedAtLabel', '發佈日期')}
                    </label>
                    <input
                      type="date"
                      value={form.published_at}
                      onChange={(e) => setForm((f) => ({ ...f, published_at: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="news-show-as-popup"
                      checked={form.show_as_popup}
                      onChange={(e) => setForm((f) => ({ ...f, show_as_popup: e.target.checked }))}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="news-show-as-popup" className="text-sm font-medium text-gray-700">
                      {t('admin.news.showAsPopup', '作為進入頁面彈窗顯示')}
                    </label>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      {t('common.cancel', '取消')}
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !form.title.trim()}
                      className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? t('common.saving', '儲存中…') : (editingPost ? t('common.save', '儲存') : t('admin.news.add', '新增消息'))}
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
