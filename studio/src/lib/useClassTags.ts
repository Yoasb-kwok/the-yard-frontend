/**
 * useClassTags
 *
 * Loads the public Class Tag Catalog (`/api/tag-types` + `/api/tags`) and
 * exposes the active tag types and their tag rows to React components.
 *
 * Module-level promise cache so multiple components on the same page share
 * a single network round-trip. Pages that need fresh data after admin
 * edits should call `invalidateClassTagsCache()`.
 *
 * If the backend isn't available (404 / network error / not yet
 * implemented), we fall back to the same seed values shipped in
 * `studio/docs/TAGS_CMS_SPEC.md` so the existing UI keeps working with no
 * regression. This is intentional: the page should never break just
 * because the backend is mid-deploy.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchPublicTagTypes,
  fetchPublicTags,
  type TagRow,
  type TagType,
  type TagTypeRow,
} from './tagCatalog';

export interface ClassTagsState {
  tagTypes: TagTypeRow[];
  tagsByType: Record<TagType, TagRow[]>;
}

const FALLBACK_STATE: ClassTagsState = {
  tagTypes: [
    { id: 'fallback-level',    code: 'level',    label_zh_tw: '程度',     label_zh_cn: '程度',     label_en: 'Level',    sort_order: 1, is_active: true, is_system: true },
    { id: 'fallback-age',      code: 'age',      label_zh_tw: '年齡',     label_zh_cn: '年龄',     label_en: 'Age',      sort_order: 2, is_active: true, is_system: true },
    { id: 'fallback-category', code: 'category', label_zh_tw: '課程分類', label_zh_cn: '课程分类', label_en: 'Category', sort_order: 3, is_active: true, is_system: true },
  ],
  tagsByType: {
    level: [
      { id: 'fb-level-entry',        type: 'level', code: 'entry',        label_zh_tw: '入門', label_zh_cn: '入门', label_en: 'Entry',        sort_order: 1, is_active: true },
      { id: 'fb-level-intermediate', type: 'level', code: 'intermediate', label_zh_tw: '中級', label_zh_cn: '中级', label_en: 'Intermediate', sort_order: 2, is_active: true },
      { id: 'fb-level-advanced',     type: 'level', code: 'advanced',     label_zh_tw: '高級', label_zh_cn: '高级', label_en: 'Advanced',     sort_order: 3, is_active: true },
    ],
    age: [
      { id: 'fb-age-1', type: 'age', code: '5-8',   label_zh_tw: '5-8 歲',   label_zh_cn: '5-8 岁',   label_en: 'Age 5-8',   sort_order: 1, is_active: true },
      { id: 'fb-age-2', type: 'age', code: '9-12',  label_zh_tw: '9-12 歲',  label_zh_cn: '9-12 岁',  label_en: 'Age 9-12',  sort_order: 2, is_active: true },
      { id: 'fb-age-3', type: 'age', code: '13-16', label_zh_tw: '13-16 歲', label_zh_cn: '13-16 岁', label_en: 'Age 13-16', sort_order: 3, is_active: true },
    ],
    category: [
      { id: 'fb-cat-1', type: 'category', code: 'regular',    label_zh_tw: '常規班', label_zh_cn: '常规班', label_en: 'Regular Term', sort_order: 1, is_active: true },
      { id: 'fb-cat-2', type: 'category', code: 'summer',     label_zh_tw: '暑假班', label_zh_cn: '暑假班', label_en: 'Summer Term',  sort_order: 2, is_active: true },
      { id: 'fb-cat-3', type: 'category', code: 'short_term', label_zh_tw: '短期班', label_zh_cn: '短期班', label_en: 'Short Course', sort_order: 3, is_active: true },
      { id: 'fb-cat-4', type: 'category', code: 'workshop',   label_zh_tw: '工作坊', label_zh_cn: '工作坊', label_en: 'Workshop',     sort_order: 4, is_active: true },
    ],
  },
};

let cachedPromise: Promise<ClassTagsState> | null = null;

async function loadFromBackend(): Promise<ClassTagsState> {
  // Backend not ready → use fallback.
  let types: TagTypeRow[];
  try {
    types = await fetchPublicTagTypes();
  } catch {
    return FALLBACK_STATE;
  }
  if (types.length === 0) return FALLBACK_STATE;

  const tagsByType: Record<TagType, TagRow[]> = {};
  await Promise.all(
    types.map(async (tt) => {
      try {
        tagsByType[tt.code] = await fetchPublicTags(tt.code);
      } catch {
        tagsByType[tt.code] = [];
      }
    }),
  );

  // Backfill anything the backend forgot (e.g. system type returned with no tags)
  // from the fallback values, so the UI never renders an empty system filter.
  for (const code of ['level', 'age', 'category'] as const) {
    if (!tagsByType[code] || tagsByType[code].length === 0) {
      const fb = FALLBACK_STATE.tagsByType[code];
      if (fb && fb.length > 0) tagsByType[code] = fb;
    }
  }

  return { tagTypes: types, tagsByType };
}

function getCachedPromise(): Promise<ClassTagsState> {
  if (!cachedPromise) cachedPromise = loadFromBackend();
  return cachedPromise;
}

/** Drop the in-memory cache so the next `useClassTags()` will refetch. */
export function invalidateClassTagsCache(): void {
  cachedPromise = null;
}

/** Pick the best-available label for the current locale; falls back to zh-TW, then code. */
export function localizeTagLabel(
  row: { code: string; label_zh_tw: string; label_zh_cn: string; label_en: string } | null | undefined,
  lang: string,
): string {
  if (!row) return '';
  const normalized = (lang || '').toLowerCase();
  if (normalized.startsWith('zh-cn') || normalized === 'zh-hans') {
    return row.label_zh_cn || row.label_zh_tw || row.label_en || row.code;
  }
  if (normalized.startsWith('en')) {
    return row.label_en || row.label_zh_tw || row.code;
  }
  return row.label_zh_tw || row.label_en || row.code;
}

export interface UseClassTagsResult {
  tagTypes: TagTypeRow[];
  tagsByType: Record<TagType, TagRow[]>;
  loading: boolean;
  /** Convenience: localized label for `(typeCode, tagCode)`; returns the raw code if not found. */
  getTagLabel: (typeCode: TagType, tagCode: string | null | undefined) => string;
  /** Convenience: localized label for a tag type code itself. */
  getTypeLabel: (typeCode: TagType) => string;
  /** Force a refetch (e.g. after admin save). */
  refetch: () => Promise<void>;
}

export function useClassTags(): UseClassTagsResult {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'zh-TW';

  const [state, setState] = useState<ClassTagsState>(FALLBACK_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCachedPromise()
      .then((next) => {
        if (cancelled) return;
        setState(next);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    tagTypes: state.tagTypes,
    tagsByType: state.tagsByType,
    loading,
    getTagLabel: (typeCode, tagCode) => {
      if (!tagCode) return '';
      const list = state.tagsByType[typeCode];
      const row = list?.find((r) => r.code === tagCode);
      return row ? localizeTagLabel(row, lang) : tagCode;
    },
    getTypeLabel: (typeCode) => {
      const tt = state.tagTypes.find((t) => t.code === typeCode);
      return tt ? localizeTagLabel(tt, lang) : typeCode;
    },
    refetch: async () => {
      invalidateClassTagsCache();
      setLoading(true);
      try {
        const next = await getCachedPromise();
        setState(next);
      } finally {
        setLoading(false);
      }
    },
  };
}
