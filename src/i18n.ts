import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import pl from './locales/pl.json'

const DEFAULT_LANGUAGE = 'pl'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pl: { translation: pl },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ['en', 'pl'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
    },
    ns: ['translation'],
    defaultNS: 'translation',
  })

if (typeof window !== 'undefined') {
  const storedLanguage = window.localStorage.getItem('i18nextLng')

  if (!storedLanguage) {
    i18n.changeLanguage(DEFAULT_LANGUAGE)
  }
}

if (typeof document !== 'undefined') {
  const applyHtmlLang = (lang: string) => {
    document.documentElement.lang = lang
  }

  applyHtmlLang(i18n.resolvedLanguage ?? DEFAULT_LANGUAGE)
  i18n.on('languageChanged', applyHtmlLang)
}

export default i18n
