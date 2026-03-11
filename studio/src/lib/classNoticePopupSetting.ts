/**
 * 全班通知彈窗開關：admin 可關閉/開啟「學生登入時彈出全班通知」。
 * 目前存於 localStorage；之後可改為後端 API。
 */
const STORAGE_KEY = 'classNoticePopupEnabled';

export function getClassNoticePopupEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true; // 預設開啟
    return raw === 'true';
  } catch {
    return true;
  }
}

export function setClassNoticePopupEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // ignore
  }
}
