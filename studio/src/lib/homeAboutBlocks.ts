export const HOME_ABOUT_SCHEMA_VERSION = 1 as const;

/** 左圖右文 | 左文右圖（已取消全圖／全文字；舊 JSON 讀入時會改為依序交錯） */
export type HomeAboutBlockLayout = 'split-image-left' | 'split-image-right';

const VALID_LAYOUTS: HomeAboutBlockLayout[] = ['split-image-left', 'split-image-right'];

export function isHomeAboutBlockLayout(v: unknown): v is HomeAboutBlockLayout {
  return typeof v === 'string' && (VALID_LAYOUTS as string[]).includes(v);
}

function readLayoutField(raw: unknown): HomeAboutBlockLayout | undefined {
  if (raw === 'split-image-left' || raw === 'split-image-right') return raw;
  return undefined;
}

export interface HomeAboutBlock {
  id: string;
  image_url: string | null;
  body_html: string;
  body_html_zh_tw?: string;
  body_html_zh_cn?: string;
  body_html_en?: string;
  /** 未設定時依組別 index 交錯：偶數左圖右文、奇數左文右圖 */
  layout?: HomeAboutBlockLayout;
}

export interface HomeAboutBlocksPayload {
  schemaVersion: typeof HOME_ABOUT_SCHEMA_VERSION;
  blocks: HomeAboutBlock[];
}

function newBlockId(): string {
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultLayoutForIndex(index: number): HomeAboutBlockLayout {
  return index % 2 === 0 ? 'split-image-left' : 'split-image-right';
}

export function createEmptyBlock(index?: number): HomeAboutBlock {
  const i = typeof index === 'number' ? index : 0;
  return {
    id: newBlockId(),
    image_url: null,
    body_html: '<p></p>',
    body_html_zh_tw: '<p></p>',
    body_html_zh_cn: '<p></p>',
    body_html_en: '<p></p>',
    layout: defaultLayoutForIndex(i),
  };
}

/** 預設 4 組，交錯版面 */
export function createDefaultHomeAboutBlocks(count = 4): HomeAboutBlock[] {
  return Array.from({ length: count }, (_, i) => createEmptyBlock(i));
}

export function effectiveBlockLayout(block: HomeAboutBlock, index: number): HomeAboutBlockLayout {
  if (block.layout && isHomeAboutBlockLayout(block.layout)) {
    return block.layout;
  }
  return defaultLayoutForIndex(index);
}

export function layoutModeLabel(layout: HomeAboutBlockLayout): string {
  switch (layout) {
    case 'split-image-left':
      return '左圖右文';
    case 'split-image-right':
      return '左文右圖';
    default:
      return '';
  }
}

function normalizeBlocks(raw: unknown): HomeAboutBlock[] {
  if (!Array.isArray(raw)) return createDefaultHomeAboutBlocks(4);
  const out: HomeAboutBlock[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' && o.id.trim() !== '' ? o.id : newBlockId();
    const image_url =
      typeof o.image_url === 'string' && o.image_url.trim() !== '' ? o.image_url.trim() : null;
    const body_html = typeof o.body_html === 'string' ? o.body_html : '<p></p>';
    const body_html_zh_tw = typeof o.body_html_zh_tw === 'string' ? o.body_html_zh_tw : undefined;
    const body_html_zh_cn = typeof o.body_html_zh_cn === 'string' ? o.body_html_zh_cn : undefined;
    const body_html_en = typeof o.body_html_en === 'string' ? o.body_html_en : undefined;
    const layout = readLayoutField(o.layout);
    out.push({ id, image_url, body_html, body_html_zh_tw, body_html_zh_cn, body_html_en, layout });
  }
  return out.length > 0 ? out : createDefaultHomeAboutBlocks(4);
}

export type ParsedHomeAboutContent =
  | { kind: 'blocks'; blocks: HomeAboutBlock[] }
  | { kind: 'legacy'; legacyHtml: string };

export function parseHomeAboutContentField(content: string): ParsedHomeAboutContent {
  const t = (content || '').trim();
  if (!t) {
    return { kind: 'blocks', blocks: createDefaultHomeAboutBlocks(4) };
  }
  if (t.startsWith('{')) {
    try {
      const parsed = JSON.parse(t) as Partial<HomeAboutBlocksPayload>;
      if (parsed.schemaVersion === HOME_ABOUT_SCHEMA_VERSION && Array.isArray(parsed.blocks)) {
        return { kind: 'blocks', blocks: normalizeBlocks(parsed.blocks) };
      }
    } catch {
      // fall through to legacy
    }
  }
  return { kind: 'legacy', legacyHtml: content };
}

export function serializeHomeAboutBlocks(blocks: HomeAboutBlock[]): string {
  const payload: HomeAboutBlocksPayload = {
    schemaVersion: HOME_ABOUT_SCHEMA_VERSION,
    blocks: blocks.map((b, i) => ({
      id: b.id,
      image_url: b.image_url && b.image_url.trim() !== '' ? b.image_url.trim() : null,
      body_html: typeof b.body_html === 'string' ? b.body_html : '',
      // Backend validates these as string fields (empty string allowed).
      body_html_zh_tw: typeof b.body_html_zh_tw === 'string' ? b.body_html_zh_tw : '',
      body_html_zh_cn: typeof b.body_html_zh_cn === 'string' ? b.body_html_zh_cn : '',
      body_html_en: typeof b.body_html_en === 'string' ? b.body_html_en : '',
      layout: effectiveBlockLayout(b, i),
    })),
  };
  return JSON.stringify(payload);
}

export type HomeAboutLang = 'zh-TW' | 'zh-CN' | 'en';

export function getHomeAboutBlockBodyByLang(block: HomeAboutBlock, lang: HomeAboutLang): string {
  if (lang === 'zh-TW') {
    return block.body_html_zh_tw || block.body_html || '<p></p>';
  }
  if (lang === 'zh-CN') {
    return block.body_html_zh_cn || block.body_html_zh_tw || block.body_html || '<p></p>';
  }
  return block.body_html_en || block.body_html_zh_tw || block.body_html || '<p></p>';
}

/** 將舊版整段 HTML／純文字轉成區塊（整段放第一組，其餘組空白） */
export function legacyContentToBlocks(legacy: string): HomeAboutBlock[] {
  const blocks = createDefaultHomeAboutBlocks(4);
  const trimmed = legacy.trim();
  if (!trimmed) return blocks;
  if (trimmed.startsWith('<') || /<[a-z][\s\S]*>/i.test(trimmed)) {
    blocks[0] = { ...blocks[0], body_html: trimmed };
    return blocks;
  }
  const escaped = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  blocks[0] = { ...blocks[0], body_html: `<p>${escaped.replace(/\n/g, '<br/>')}</p>` };
  return blocks;
}

/** 後台「關於我們」／獨立 /about 頁：有標題或任一組有圖／文字即視為已設定 */
export function siteAboutHasVisibleContent(title: string, blocks: HomeAboutBlock[]): boolean {
  if (title.trim() !== '') return true;
  return blocks.some((b) => {
    const hasImg = !!(b.image_url && b.image_url.trim());
    const texts = [b.body_html, b.body_html_zh_tw, b.body_html_zh_cn, b.body_html_en]
      .map((v) => (v || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim());
    return hasImg || texts.some((v) => v !== '');
  });
}
