/**
 * About page content (關於我們). Stored in localStorage for demo.
 * Admin Settings can edit "about" page; public AboutPage reads from here when set.
 */

export interface AboutContent {
  title: string;
  content: string;
}

const STORAGE_KEY = 'the_yard_about_content';

function getStored(): AboutContent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AboutContent;
    if (parsed && typeof parsed.title === 'string' && typeof parsed.content === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function setStored(data: AboutContent): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save about content to localStorage', e);
  }
}

/** Get about page content saved by admin. Returns null if never set. */
export function getAboutContent(): AboutContent | null {
  return getStored();
}

/** Save about page content (from Admin Settings). */
export function saveAboutContent(data: AboutContent): void {
  setStored({ title: data.title.trim(), content: data.content.trim() });
}
