import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import {
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Tag as TagIcon,
  RotateCcw,
  Settings,
  X,
  Lock,
} from 'lucide-react';
import {
  createEmptyTag,
  createEmptyTagType,
  createTag,
  createTagType,
  deleteTag,
  deleteTagType,
  fetchAdminTagTypes,
  fetchAdminTagsByType,
  reorderTagTypes,
  reorderTags,
  updateTag,
  updateTagType,
  validateTagDraft,
  validateTagTypeDraft,
  type TagRow,
  type TagType,
  type TagTypeRow,
} from '../../lib/tagCatalog';
import { invalidateClassTagsCache } from '../../lib/useClassTags';

type TagsByType = Record<string, TagRow[]>;

function cloneTags(map: TagsByType): TagsByType {
  const out: TagsByType = {};
  for (const key of Object.keys(map)) {
    out[key] = map[key].map((r) => ({ ...r }));
  }
  return out;
}

function cloneTypes(rows: TagTypeRow[]): TagTypeRow[] {
  return rows.map((r) => ({ ...r }));
}

function rowsEqual(a: TagRow, b: TagRow): boolean {
  return (
    a.code === b.code &&
    a.label_zh_tw === b.label_zh_tw &&
    a.label_zh_cn === b.label_zh_cn &&
    a.label_en === b.label_en &&
    a.is_active === b.is_active &&
    a.sort_order === b.sort_order
  );
}

function typeRowsEqual(a: TagTypeRow, b: TagTypeRow): boolean {
  return (
    a.code === b.code &&
    a.label_zh_tw === b.label_zh_tw &&
    a.label_zh_cn === b.label_zh_cn &&
    a.label_en === b.label_en &&
    a.is_active === b.is_active &&
    a.sort_order === b.sort_order
  );
}

/** Pick the best-available label for the current locale, falling back to zh-TW. */
function localizeLabel(row: { label_zh_tw: string; label_zh_cn: string; label_en: string }, lang: string): string {
  const normalized = lang.toLowerCase();
  if (normalized.startsWith('zh-cn') || normalized === 'zh-hans') {
    return row.label_zh_cn || row.label_zh_tw || row.label_en;
  }
  if (normalized.startsWith('en')) {
    return row.label_en || row.label_zh_tw;
  }
  return row.label_zh_tw || row.label_en;
}

export default function AdminTagsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'zh-TW';

  const [types, setTypes] = useState<TagTypeRow[]>([]);
  const [originalTypes, setOriginalTypes] = useState<TagTypeRow[]>([]);
  const [tagsByType, setTagsByType] = useState<TagsByType>({});
  const [originalByType, setOriginalByType] = useState<TagsByType>({});
  const [activeTab, setActiveTab] = useState<TagType>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Manage-types modal
  const [typesModalOpen, setTypesModalOpen] = useState(false);
  const [draftTypes, setDraftTypes] = useState<TagTypeRow[]>([]);
  const [savingTypes, setSavingTypes] = useState(false);
  const [typesErrorMsg, setTypesErrorMsg] = useState<string>('');

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setErrorMsg('');
    try {
      const typeRows = await fetchAdminTagTypes().catch(() => [] as TagTypeRow[]);

      const byType: TagsByType = {};
      await Promise.all(
        typeRows.map(async (tr) => {
          const rows = await fetchAdminTagsByType(tr.code).catch(() => [] as TagRow[]);
          byType[tr.code] = rows;
        }),
      );

      setTypes(cloneTypes(typeRows));
      setOriginalTypes(cloneTypes(typeRows));
      setTagsByType(cloneTags(byType));
      setOriginalByType(cloneTags(byType));

      setActiveTab((prev) => {
        if (prev && typeRows.some((tr) => tr.code === prev)) return prev;
        return typeRows[0]?.code ?? '';
      });
    } finally {
      setLoading(false);
    }
  }

  const currentRows: TagRow[] = tagsByType[activeTab] ?? [];

  const hasChanges = useMemo(() => {
    for (const type of types) {
      const a = tagsByType[type.code] ?? [];
      const b = originalByType[type.code] ?? [];
      if (a.length !== b.length) return true;
      for (let i = 0; i < a.length; i++) {
        const rowA = a[i];
        const rowB = b.find((r) => r.id === rowA.id);
        if (!rowB) return true;
        if (!rowsEqual(rowA, rowB)) return true;
        if (b[i]?.id !== rowA.id) return true;
      }
    }
    return false;
  }, [tagsByType, originalByType, types]);

  /* ------------------------------------------------------------------------ */
  /* Tag row editing                                                          */
  /* ------------------------------------------------------------------------ */

  function updateRow(type: TagType, id: TagRow['id'], patch: Partial<TagRow>) {
    setTagsByType((prev) => ({
      ...prev,
      [type]: (prev[type] ?? []).map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  }

  function removeRow(type: TagType, id: TagRow['id']) {
    setTagsByType((prev) => ({
      ...prev,
      [type]: (prev[type] ?? []).filter((row) => row.id !== id),
    }));
  }

  function moveRow(type: TagType, id: TagRow['id'], direction: -1 | 1) {
    setTagsByType((prev) => {
      const rows = [...(prev[type] ?? [])];
      const idx = rows.findIndex((r) => r.id === id);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= rows.length) return prev;
      const tmp = rows[idx];
      rows[idx] = rows[target];
      rows[target] = tmp;
      return { ...prev, [type]: rows.map((r, i) => ({ ...r, sort_order: i + 1 })) };
    });
  }

  function addRow(type: TagType) {
    setTagsByType((prev) => {
      const sortOrder = (prev[type]?.length ?? 0) + 1;
      return { ...prev, [type]: [...(prev[type] ?? []), createEmptyTag(type, sortOrder)] };
    });
  }

  function validateBeforeSave(): string | null {
    for (const type of types) {
      const rows = tagsByType[type.code] ?? [];
      for (const row of rows) {
        const err = validateTagDraft(row, rows, row.id);
        if (err) {
          const typeLabel = localizeLabel(type, lang);
          const errMsg = t(`admin.tags.error.${err}`, err);
          return `[${typeLabel}] ${errMsg}`;
        }
      }
    }
    return null;
  }

  async function handleSave() {
    const validationErr = validateBeforeSave();
    if (validationErr) {
      setErrorMsg(validationErr);
      alert(validationErr);
      return;
    }
    setSaving(true);
    setErrorMsg('');

    try {
      const next: TagsByType = cloneTags(tagsByType);

      for (const type of types) {
        const key = type.code;
        const baseline = originalByType[key] ?? [];
        const current = next[key] ?? [];

        // 1. Deletions
        const currentIds = new Set(current.map((r) => r.id));
        const toDelete = baseline.filter(
          (r) => typeof r.id === 'number' && !currentIds.has(r.id),
        );
        for (const row of toDelete) {
          await deleteTag(row.id as number);
        }

        // 2. Creations (client-side string ids)
        for (let i = 0; i < current.length; i++) {
          const row = current[i];
          if (typeof row.id === 'string') {
            const newId = await createTag({
              type: row.type,
              code: row.code,
              label_zh_tw: row.label_zh_tw,
              label_zh_cn: row.label_zh_cn,
              label_en: row.label_en,
              sort_order: i + 1,
              is_active: row.is_active,
            });
            current[i] = { ...row, id: newId, sort_order: i + 1 };
          }
        }

        // 3. Updates
        for (let i = 0; i < current.length; i++) {
          const row = current[i];
          if (typeof row.id !== 'number') continue;
          const base = baseline.find((r) => r.id === row.id);
          if (!base) continue;
          const patch: Partial<Omit<TagRow, 'id' | 'type'>> = {};
          if (base.code !== row.code) patch.code = row.code;
          if (base.label_zh_tw !== row.label_zh_tw) patch.label_zh_tw = row.label_zh_tw;
          if (base.label_zh_cn !== row.label_zh_cn) patch.label_zh_cn = row.label_zh_cn;
          if (base.label_en !== row.label_en) patch.label_en = row.label_en;
          if (base.is_active !== row.is_active) patch.is_active = row.is_active;
          if (Object.keys(patch).length > 0) {
            await updateTag(row.id, patch);
          }
        }

        // 4. Reorder
        const numericOrder = current.map((r) => r.id as number);
        const baselineOrder = baseline.map((r) => r.id as number);
        const orderChanged =
          numericOrder.length !== baselineOrder.length ||
          numericOrder.some((id, i) => id !== baselineOrder[i]);
        if (orderChanged && numericOrder.length > 0) {
          await reorderTags(key, numericOrder);
        }

        next[key] = current.map((r, i) => ({ ...r, sort_order: i + 1 }));
      }

      setTagsByType(cloneTags(next));
      setOriginalByType(cloneTags(next));
      invalidateClassTagsCache();
      alert(t('admin.tags.saved', '已儲存'));
    } catch (err) {
      console.error('Failed to save tags:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      alert(t('admin.tags.saveFailed', '儲存失敗：{{msg}}', { msg }));
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (!hasChanges) return;
    if (!confirm(t('admin.tags.confirmReset', '放棄所有未儲存的變更？'))) return;
    setTagsByType(cloneTags(originalByType));
    setErrorMsg('');
  }

  /* ------------------------------------------------------------------------ */
  /* Manage-types modal                                                       */
  /* ------------------------------------------------------------------------ */

  function openTypesModal() {
    setDraftTypes(cloneTypes(types));
    setTypesErrorMsg('');
    setTypesModalOpen(true);
  }

  function closeTypesModal() {
    if (savingTypes) return;
    setTypesModalOpen(false);
  }

  const typesHaveChanges = useMemo(() => {
    if (draftTypes.length !== originalTypes.length) return true;
    for (let i = 0; i < draftTypes.length; i++) {
      const cur = draftTypes[i];
      const base = originalTypes.find((r) => r.id === cur.id);
      if (!base) return true;
      if (!typeRowsEqual(cur, base)) return true;
      if (originalTypes[i]?.id !== cur.id) return true;
    }
    return false;
  }, [draftTypes, originalTypes]);

  function updateDraftType(id: TagTypeRow['id'], patch: Partial<TagTypeRow>) {
    setDraftTypes((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeDraftType(id: TagTypeRow['id']) {
    const row = draftTypes.find((r) => r.id === id);
    if (!row) return;
    if (row.is_system) {
      alert(t('admin.tags.cannotDeleteSystem', '系統內建主題無法刪除，僅可停用或重新命名'));
      return;
    }
    const tagCount = (tagsByType[row.code] ?? []).length;
    if (tagCount > 0) {
      const ok = confirm(
        t('admin.tags.confirmDeleteTypeWithTags', {
          defaultValue: '主題「{{name}}」底下仍有 {{count}} 個標籤，刪除主題會一併把這些標籤刪除。仍要繼續？',
          name: localizeLabel(row, lang),
          count: tagCount,
        }),
      );
      if (!ok) return;
    }
    setDraftTypes((prev) => prev.filter((r) => r.id !== id));
  }

  function moveDraftType(id: TagTypeRow['id'], direction: -1 | 1) {
    setDraftTypes((prev) => {
      const rows = [...prev];
      const idx = rows.findIndex((r) => r.id === id);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= rows.length) return prev;
      const tmp = rows[idx];
      rows[idx] = rows[target];
      rows[target] = tmp;
      return rows.map((r, i) => ({ ...r, sort_order: i + 1 }));
    });
  }

  function addDraftType() {
    setDraftTypes((prev) => [...prev, createEmptyTagType(prev.length + 1)]);
  }

  function validateTypesBeforeSave(): string | null {
    for (const row of draftTypes) {
      const err = validateTagTypeDraft(row, draftTypes, row.id);
      if (err) {
        return t(`admin.tags.error.${err}`, err);
      }
    }
    return null;
  }

  async function handleSaveTypes() {
    const validationErr = validateTypesBeforeSave();
    if (validationErr) {
      setTypesErrorMsg(validationErr);
      return;
    }
    setSavingTypes(true);
    setTypesErrorMsg('');

    try {
      const baseline = originalTypes;
      const current = cloneTypes(draftTypes);
      const currentIds = new Set(current.map((r) => r.id));

      // 1. Deletions
      const toDelete = baseline.filter(
        (r) => typeof r.id === 'number' && !currentIds.has(r.id) && !r.is_system,
      );
      for (const row of toDelete) {
        // Cascade delete: remove all tags under this type before deleting the type.
        const existingTags = await fetchAdminTagsByType(row.code).catch(() => [] as TagRow[]);
        for (const tag of existingTags) {
          if (typeof tag.id === 'number') {
            await deleteTag(tag.id);
          }
        }
        await deleteTagType(row.id as number);
      }

      // 2. Creations
      for (let i = 0; i < current.length; i++) {
        const row = current[i];
        if (typeof row.id === 'string') {
          const newId = await createTagType({
            code: row.code,
            label_zh_tw: row.label_zh_tw,
            label_zh_cn: row.label_zh_cn,
            label_en: row.label_en,
            sort_order: i + 1,
            is_active: row.is_active,
          });
          current[i] = { ...row, id: newId, sort_order: i + 1 };
        }
      }

      // 3. Updates
      for (let i = 0; i < current.length; i++) {
        const row = current[i];
        if (typeof row.id !== 'number') continue;
        const base = baseline.find((r) => r.id === row.id);
        if (!base) continue;
        const patch: Partial<Omit<TagTypeRow, 'id' | 'is_system'>> = {};
        if (base.code !== row.code) patch.code = row.code;
        if (base.label_zh_tw !== row.label_zh_tw) patch.label_zh_tw = row.label_zh_tw;
        if (base.label_zh_cn !== row.label_zh_cn) patch.label_zh_cn = row.label_zh_cn;
        if (base.label_en !== row.label_en) patch.label_en = row.label_en;
        if (base.is_active !== row.is_active) patch.is_active = row.is_active;
        if (Object.keys(patch).length > 0) {
          await updateTagType(row.id, patch);
        }
      }

      // 4. Reorder
      const numericOrder = current.map((r) => r.id as number);
      const baselineOrder = baseline.map((r) => r.id as number);
      const orderChanged =
        numericOrder.length !== baselineOrder.length ||
        numericOrder.some((id, i) => id !== baselineOrder[i]);
      if (orderChanged && numericOrder.length > 0) {
        await reorderTagTypes(numericOrder);
      }

      setTypesModalOpen(false);
      invalidateClassTagsCache();
      await load();
      alert(t('admin.tags.typesSaved', '主題已更新'));
    } catch (err) {
      console.error('Failed to save tag types:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setTypesErrorMsg(msg);
      alert(t('admin.tags.saveFailed', '儲存失敗：{{msg}}', { msg }));
    } finally {
      setSavingTypes(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  const activeType = types.find((tr) => tr.code === activeTab) ?? null;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <TagIcon className="h-7 w-7 text-primary" />
            {t('admin.tags.title', '標籤管理')}
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openTypesModal}
              disabled={saving}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Settings className="h-4 w-4" />
              {t('admin.tags.manageTypes', '管理主題')}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={!hasChanges || saving}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-4 w-4" />
              {t('admin.tags.reset', '還原')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {saving ? t('common.saving', '儲存中…') : t('common.save', '儲存')}
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-600">
          {t(
            'admin.tags.description',
            '在此管理課程的標籤分類。修改後需要按「儲存」才會套用到所有前端頁面。'
          )}
        </p>

        {types.length === 0 ? (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
            {t(
              'admin.tags.noTypes',
              '目前沒有任何標籤主題。請按「管理主題」新增第一個主題。'
            )}
          </div>
        ) : (
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap gap-2 -mb-px" aria-label="Tag type tabs">
              {types.map((type) => {
                const count = (tagsByType[type.code] ?? []).length;
                const inactive = !type.is_active;
                return (
                  <button
                    key={String(type.id)}
                    type="button"
                    onClick={() => setActiveTab(type.code)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                      activeTab === type.code
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span>{localizeLabel(type, lang)}</span>
                    {inactive && (
                      <span className="inline-flex items-center text-[10px] uppercase tracking-wide text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {t('admin.tags.inactive', '停用')}
                      </span>
                    )}
                    <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {activeType && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2 w-16">{t('admin.tags.col.order', '順序')}</th>
                    <th className="px-3 py-2">{t('admin.tags.col.code', '代碼')}</th>
                    <th className="px-3 py-2">{t('admin.tags.col.labelZhTw', '繁體中文')}</th>
                    <th className="px-3 py-2">{t('admin.tags.col.labelZhCn', '簡體中文')}</th>
                    <th className="px-3 py-2">{t('admin.tags.col.labelEn', 'English')}</th>
                    <th className="px-3 py-2 w-24 text-center">{t('admin.tags.col.active', '啟用')}</th>
                    <th className="px-3 py-2 w-28 text-right">{t('admin.tags.col.actions', '操作')}</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                        {t('admin.tags.empty', '此分類暫無標籤，請新增')}
                      </td>
                    </tr>
                  ) : (
                    currentRows.map((row, i) => (
                      <tr key={String(row.id)} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400 w-6">{i + 1}</span>
                            <button
                              type="button"
                              onClick={() => moveRow(activeTab, row.id, -1)}
                              disabled={i === 0 || saving}
                              className="p-1 text-gray-500 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label={t('admin.tags.moveUp', '上移')}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveRow(activeTab, row.id, 1)}
                              disabled={i === currentRows.length - 1 || saving}
                              className="p-1 text-gray-500 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label={t('admin.tags.moveDown', '下移')}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.code}
                            onChange={(e) => updateRow(activeTab, row.id, { code: e.target.value })}
                            placeholder="entry"
                            className="w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.label_zh_tw}
                            onChange={(e) => updateRow(activeTab, row.id, { label_zh_tw: e.target.value })}
                            placeholder="入門"
                            className="w-full rounded border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.label_zh_cn}
                            onChange={(e) => updateRow(activeTab, row.id, { label_zh_cn: e.target.value })}
                            placeholder="入门"
                            className="w-full rounded border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.label_en}
                            onChange={(e) => updateRow(activeTab, row.id, { label_en: e.target.value })}
                            placeholder="Entry"
                            className="w-full rounded border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={row.is_active}
                              onChange={(e) =>
                                updateRow(activeTab, row.id, { is_active: e.target.checked })
                              }
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </label>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeRow(activeTab, row.id)}
                            disabled={saving}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label={t('admin.tags.deleteRow', '刪除')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <button
                type="button"
                onClick={() => addRow(activeTab)}
                disabled={saving}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                {t('admin.tags.add', '新增標籤')}
              </button>
            </div>
          </div>
        )}

        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 space-y-1">
          <p className="font-semibold">{t('admin.tags.hintTitle', '使用提示')}</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>{t('admin.tags.hint.code', '代碼 (code) 是課程資料儲存用的穩定識別字，建議使用英文小寫、數字、- 或 _。')}</li>
            <li>{t('admin.tags.hint.active', '停用 (取消啟用) 會把標籤從前台選單隱藏，但仍保留在已有課程上。')}</li>
            <li>{t('admin.tags.hint.delete', '若標籤已被課程使用，後端會拒絕刪除；請改為停用。')}</li>
            <li>{t('admin.tags.hint.types', '需要更多主題 (例如舞種、難度)？請按右上角「管理主題」新增。')}</li>
          </ul>
        </div>
      </div>

      {typesModalOpen && (
        <ManageTypesModal
          draftTypes={draftTypes}
          typesErrorMsg={typesErrorMsg}
          savingTypes={savingTypes}
          hasChanges={typesHaveChanges}
          tagsByType={tagsByType}
          lang={lang}
          onClose={closeTypesModal}
          onSave={handleSaveTypes}
          onReset={() => {
            setDraftTypes(cloneTypes(originalTypes));
            setTypesErrorMsg('');
          }}
          onUpdateType={updateDraftType}
          onRemoveType={removeDraftType}
          onMoveType={moveDraftType}
          onAddType={addDraftType}
        />
      )}
    </Layout>
  );
}

/* -------------------------------------------------------------------------- */
/* Manage-types modal (sub-component)                                         */
/* -------------------------------------------------------------------------- */

interface ManageTypesModalProps {
  draftTypes: TagTypeRow[];
  typesErrorMsg: string;
  savingTypes: boolean;
  hasChanges: boolean;
  tagsByType: TagsByType;
  lang: string;
  onClose: () => void;
  onSave: () => void;
  onReset: () => void;
  onUpdateType: (id: TagTypeRow['id'], patch: Partial<TagTypeRow>) => void;
  onRemoveType: (id: TagTypeRow['id']) => void;
  onMoveType: (id: TagTypeRow['id'], direction: -1 | 1) => void;
  onAddType: () => void;
}

function ManageTypesModal({
  draftTypes,
  typesErrorMsg,
  savingTypes,
  hasChanges,
  tagsByType,
  onClose,
  onSave,
  onReset,
  onUpdateType,
  onRemoveType,
  onMoveType,
  onAddType,
}: ManageTypesModalProps) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {t('admin.tags.typesModalTitle', '標籤主題管理')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={savingTypes}
            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-40"
            aria-label={t('common.close', '關閉')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-3 text-sm text-gray-600 border-b border-gray-100">
          {t(
            'admin.tags.typesModalDescription',
            '新增、重新命名、停用或刪除標籤主題。系統內建主題（程度、年齡、課程分類）僅可重新命名或停用，無法刪除。'
          )}
        </div>

        {typesErrorMsg && (
          <div className="mx-5 mt-3 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {typesErrorMsg}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-gray-600">
                <th className="px-3 py-2 w-20">{t('admin.tags.col.order', '順序')}</th>
                <th className="px-3 py-2">{t('admin.tags.col.code', '代碼')}</th>
                <th className="px-3 py-2">{t('admin.tags.col.labelZhTw', '繁體中文')}</th>
                <th className="px-3 py-2">{t('admin.tags.col.labelZhCn', '簡體中文')}</th>
                <th className="px-3 py-2">{t('admin.tags.col.labelEn', 'English')}</th>
                <th className="px-3 py-2 w-20 text-center">{t('admin.tags.col.active', '啟用')}</th>
                <th className="px-3 py-2 w-28 text-right">{t('admin.tags.col.actions', '操作')}</th>
              </tr>
            </thead>
            <tbody>
              {draftTypes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                    {t('admin.tags.noTypes', '目前沒有任何標籤主題。請按「管理主題」新增第一個主題。')}
                  </td>
                </tr>
              ) : (
                draftTypes.map((row, i) => {
                  const tagCount = (tagsByType[row.code] ?? []).length;
                  return (
                    <tr key={String(row.id)} className="border-b border-gray-100 last:border-0 align-top">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400 w-6">{i + 1}</span>
                          <button
                            type="button"
                            onClick={() => onMoveType(row.id, -1)}
                            disabled={i === 0 || savingTypes}
                            className="p-1 text-gray-500 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={t('admin.tags.moveUp', '上移')}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoveType(row.id, 1)}
                            disabled={i === draftTypes.length - 1 || savingTypes}
                            className="p-1 text-gray-500 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={t('admin.tags.moveDown', '下移')}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={row.code}
                            onChange={(e) => onUpdateType(row.id, { code: e.target.value })}
                            placeholder="dance_style"
                            className="w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          {row.is_system && (
                            <span
                              title={t('admin.tags.systemBadge', '系統內建')}
                              className="inline-flex items-center text-gray-400"
                            >
                              <Lock className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        {tagCount > 0 && (
                          <div className="text-[11px] text-gray-400 mt-1">
                            {t('admin.tags.tagCount', '{{count}} 個標籤', { count: tagCount })}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.label_zh_tw}
                          onChange={(e) => onUpdateType(row.id, { label_zh_tw: e.target.value })}
                          placeholder="舞種"
                          className="w-full rounded border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.label_zh_cn}
                          onChange={(e) => onUpdateType(row.id, { label_zh_cn: e.target.value })}
                          placeholder="舞种"
                          className="w-full rounded border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.label_en}
                          onChange={(e) => onUpdateType(row.id, { label_en: e.target.value })}
                          placeholder="Dance Style"
                          className="w-full rounded border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.is_active}
                            onChange={(e) => onUpdateType(row.id, { is_active: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </label>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => onRemoveType(row.id)}
                          disabled={savingTypes || row.is_system}
                          title={
                            row.is_system
                              ? t('admin.tags.cannotDeleteSystem', '系統內建主題無法刪除，僅可停用或重新命名')
                              : undefined
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label={t('admin.tags.deleteRow', '刪除')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="pt-3">
            <button
              type="button"
              onClick={onAddType}
              disabled={savingTypes}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              {t('admin.tags.addType', '新增主題')}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="text-xs text-gray-500">
            {t(
              'admin.tags.typesModalHint',
              '主題 code 作為資料庫鍵值 (例如 level / age / dance_style)，建議使用英文小寫、數字、- 或 _。'
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              disabled={!hasChanges || savingTypes}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-4 w-4" />
              {t('admin.tags.reset', '還原')}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={savingTypes}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('common.close', '關閉')}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!hasChanges || savingTypes}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {savingTypes ? t('common.saving', '儲存中…') : t('common.save', '儲存')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
