import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { Save, Plus, Trash2, Upload, ArrowUp, ArrowDown, MapPin } from 'lucide-react';
import {
  buildMapEmbedUrl,
  createDefaultContactContent,
  createEmptyBranch,
  loadAdminContact,
  saveAdminContact,
  type ContactBranch,
  type ContactContent,
} from '../../lib/contactContent';
import { resolveUploadUrl, uploadImage } from '../../lib/uploads';

const MAX_IMAGE_MB = 5;

export default function AdminContactPage() {
  const { t } = useTranslation();
  const [content, setContent] = useState<ContactContent>(() => createDefaultContactContent());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await loadAdminContact();
      setContent(data);
    } catch (err) {
      console.warn('Failed to load contact content, using default.', err);
      setContent(createDefaultContactContent());
    } finally {
      setLoading(false);
    }
  }

  function updateField<K extends keyof ContactContent>(key: K, value: ContactContent[K]) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  function updateBranch(index: number, patch: Partial<ContactBranch>) {
    setContent((prev) => ({
      ...prev,
      branches: prev.branches.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    }));
  }

  function addBranch() {
    setContent((prev) => ({ ...prev, branches: [...prev.branches, createEmptyBranch()] }));
  }

  function removeBranch(index: number) {
    setContent((prev) => {
      if (prev.branches.length <= 1) return prev;
      return { ...prev, branches: prev.branches.filter((_, i) => i !== index) };
    });
  }

  function moveBranch(index: number, direction: -1 | 1) {
    setContent((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.branches.length) return prev;
      const next = prev.branches.slice();
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return { ...prev, branches: next };
    });
  }

  async function handleBranchImage(index: number, file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert(t('admin.contact.imageTypeError', 'Please choose an image file'));
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      alert(
        t('admin.contact.imageSizeError', 'Image must be smaller than {{size}} MB', {
          size: MAX_IMAGE_MB,
        })
      );
      return;
    }
    try {
      const url = await uploadImage(file, 'contact');
      updateBranch(index, { image_url: url });
    } catch (err) {
      console.error('Upload failed', err);
      alert(
        err instanceof Error
          ? err.message
          : t('admin.contact.uploadError', 'Failed to upload image')
      );
    }
  }

  async function handleSave() {
    const hasEmptyBranch = content.branches.some(
      (b) => !b.name.trim() && !b.address.trim() && !b.hours.trim() && !b.map_query.trim() && !b.image_url
    );
    if (hasEmptyBranch) {
      const confirmed = window.confirm(
        t(
          'admin.contact.confirmEmptyBranch',
          'One or more branches are completely empty. Save anyway?'
        )
      );
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      const fresh = await saveAdminContact(content);
      setContent(fresh);
      alert(t('admin.contact.saved', 'Contact page updated'));
    } catch (err) {
      console.error('Save contact content failed:', err);
      alert(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="h-7 w-7 text-primary" />
              {t('admin.contact.title', 'Contact Page')}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {t(
                'admin.contact.subtitle',
                'Manage branches shown on the public Contact page. Each branch displays an address, opening hours, photo and Google Map.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center justify-center disabled:opacity-60"
          >
            <Save className="h-5 w-5 mr-2" />
            {saving
              ? t('admin.settings.saving', 'Saving...')
              : t('admin.contact.saveChanges', 'Save Changes')}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('admin.contact.pageSection', 'Page Heading')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.contact.pageTitle', 'Page Title')}
              </label>
              <input
                type="text"
                value={content.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder={t('contact.title', 'Contact Us')}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('admin.contact.pageTitleHint', 'Leave empty to use the default translation.')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.contact.pageIntro', 'Intro Text')}
              </label>
              <input
                type="text"
                value={content.intro}
                onChange={(e) => updateField('intro', e.target.value)}
                placeholder={t(
                  'admin.contact.pageIntroPlaceholder',
                  'Short message shown above the branch list (optional)'
                )}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t('admin.contact.branchesSection', 'Branches')}
              </h2>
              <p className="text-sm text-gray-600">
                {t(
                  'admin.contact.branchesHint',
                  'Each card corresponds to one branch displayed on the public page.'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={addBranch}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('admin.contact.addBranch', 'Add Branch')}
            </button>
          </div>

          {content.branches.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">
              {t('admin.contact.noBranches', 'No branches yet. Add the first branch to get started.')}
            </p>
          ) : (
            <div className="space-y-6">
              {content.branches.map((branch, index) => {
                const embedUrl = buildMapEmbedUrl(branch.map_query);
                return (
                  <div
                    key={branch.id}
                    className="rounded-xl border border-gray-200 p-4 sm:p-5 bg-gray-50/50 space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {t('admin.contact.branchNumber', 'Branch {{n}}', { n: index + 1 })}
                        </p>
                        {branch.name.trim() && (
                          <p className="text-xs text-gray-500 mt-0.5">{branch.name.trim()}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveBranch(index, -1)}
                          disabled={index === 0}
                          className="p-1.5 text-gray-500 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={t('admin.contact.moveUp', 'Move up')}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBranch(index, 1)}
                          disabled={index === content.branches.length - 1}
                          className="p-1.5 text-gray-500 hover:text-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={t('admin.contact.moveDown', 'Move down')}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBranch(index)}
                          disabled={content.branches.length <= 1}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={t('admin.contact.removeBranch', 'Remove branch')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t('admin.contact.remove', 'Remove')}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('admin.contact.branchName', 'Branch Name')}
                          </label>
                          <input
                            type="text"
                            value={branch.name}
                            onChange={(e) => updateBranch(index, { name: e.target.value })}
                            placeholder={t(
                              'admin.contact.branchNamePlaceholder',
                              'e.g. San Po Kong HQ'
                            )}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('admin.contact.branchAddress', 'Address')}
                          </label>
                          <textarea
                            rows={3}
                            value={branch.address}
                            onChange={(e) => updateBranch(index, { address: e.target.value })}
                            placeholder={t(
                              'admin.contact.branchAddressPlaceholder',
                              'Full address (supports multiple lines)'
                            )}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('admin.contact.branchHours', 'Opening Hours')}
                          </label>
                          <textarea
                            rows={3}
                            value={branch.hours}
                            onChange={(e) => updateBranch(index, { hours: e.target.value })}
                            placeholder={t(
                              'admin.contact.branchHoursPlaceholder',
                              'e.g.\nMon–Fri: 4pm – 11pm\nSat, Sun & Public Holiday: 12nn – 11pm'
                            )}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('admin.contact.branchMap', 'Google Map')}
                          </label>
                          <input
                            type="text"
                            value={branch.map_query}
                            onChange={(e) => updateBranch(index, { map_query: e.target.value })}
                            placeholder={t(
                              'admin.contact.branchMapPlaceholder',
                              'Google Maps embed URL, share URL, or plain address'
                            )}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            {t(
                              'admin.contact.branchMapHint',
                              'Accepts an iframe embed URL, a google.com/maps share link, or a plain-text address.'
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('admin.contact.branchImage', 'Branch Photo')}
                          </label>
                          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white overflow-hidden flex items-center justify-center h-48">
                            {branch.image_url ? (
                              <img
                                src={resolveUploadUrl(branch.image_url)}
                                alt={branch.name || t('admin.contact.branchImage', 'Branch Photo')}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs text-gray-400 px-2 text-center">
                                {t('admin.contact.noImage', 'No image uploaded')}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded cursor-pointer hover:bg-primary-dark">
                              <Upload className="h-3.5 w-3.5" />
                              {t('admin.contact.uploadImage', 'Upload')}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const input = e.currentTarget;
                                  const file = input.files?.[0] || null;
                                  await handleBranchImage(index, file);
                                  input.value = '';
                                }}
                              />
                            </label>
                            {branch.image_url && (
                              <button
                                type="button"
                                onClick={() => updateBranch(index, { image_url: null })}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {t('admin.contact.removeImage', 'Remove image')}
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {t('admin.contact.imageHint', 'Up to {{size}} MB. Recommended 16:9 ratio.', {
                              size: MAX_IMAGE_MB,
                            })}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">
                            {t('admin.contact.mapPreview', 'Map Preview')}
                          </p>
                          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden h-48">
                            {embedUrl ? (
                              <iframe
                                src={embedUrl}
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title={`Map preview ${index + 1}`}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-xs text-gray-400 px-3 text-center">
                                {t(
                                  'admin.contact.mapPreviewEmpty',
                                  'Enter a Google Map URL or address to preview here.'
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4 mt-6 border-t border-gray-200 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-60"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving
                ? t('admin.settings.saving', 'Saving...')
                : t('admin.contact.saveChanges', 'Save Changes')}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
