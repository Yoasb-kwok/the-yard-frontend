import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en.json';
import zhTWTranslations from './locales/zh-TW.json';
import zhCNTranslations from './locales/zh-CN.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      'zh-TW': { translation: zhTWTranslations },
      'zh-CN': { translation: zhCNTranslations },
    },
    fallbackLng: 'zh-TW',
    supportedLngs: ['en', 'zh-TW', 'zh-CN'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// First-visit default: Traditional Chinese (繁體中文).
// Respects the user's explicit choice once they pick a language via the
// LanguageSwitcher (stored in localStorage under `i18nextLng`).
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('i18nextLng');
  if (!stored || (stored !== 'zh-TW' && stored !== 'zh-CN' && stored !== 'en')) {
    i18n.changeLanguage('zh-TW');
  }
}

export default i18n;

