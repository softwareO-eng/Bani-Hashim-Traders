import React, { createContext, useContext, useState, useEffect } from 'react';
import enTranslations from '../locales/en.json';
import urTranslations from '../locales/ur.json';

export type Language = 'en' | 'ur';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isRTL: boolean;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
  formatPKR: (amount: number) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('pakmobile_lang');
    return (saved === 'ur' || saved === 'en') ? saved : 'en';
  });

  const isRTL = language === 'ur';

  useEffect(() => {
    localStorage.setItem('pakmobile_lang', language);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState(prev => prev === 'en' ? 'ur' : 'en');
  };

  const t = (keyPath: string, params?: Record<string, string | number>): string => {
    const currentDict = language === 'ur' ? urTranslations : enTranslations;
    const fallbackDict = enTranslations;

    const keys = keyPath.split('.');
    
    // Attempt lookup in current dictionary
    let value: any = currentDict;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        value = undefined;
        break;
      }
    }

    // Fallback to English if not found
    if (value === undefined) {
      let fb: any = fallbackDict;
      for (const key of keys) {
        if (fb && typeof fb === 'object' && key in fb) {
          fb = fb[key];
        } else {
          fb = undefined;
          break;
        }
      }
      value = fb;
    }

    if (typeof value !== 'string') {
      return keyPath;
    }

    if (params) {
      return Object.entries(params).reduce((str, [k, v]) => {
        return str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }, value);
    }

    return value;
  };

  const formatPKR = (amount: number): string => {
    const rounded = Math.round(Number.isFinite(amount) ? amount : 0);
    const formattedNum = new Intl.NumberFormat('en-PK').format(rounded);
    const prefix = language === 'ur' ? 'روپے' : 'Rs';
    return `${prefix} ${formattedNum}`;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, isRTL, t, formatPKR }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
