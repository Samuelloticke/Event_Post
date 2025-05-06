// src/context/language-context.tsx
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import frMessages from '@/locales/fr.json';
import enMessages from '@/locales/en.json';

type Locale = 'fr' | 'en';
type Messages = typeof frMessages;

export interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  translate: (key: keyof Messages | string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const messages: Record<Locale, Messages> = {
  fr: frMessages,
  en: enMessages,
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr'); // Default locale
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedLocale = localStorage.getItem('locale') as Locale | null;
    if (storedLocale && (storedLocale === 'fr' || storedLocale === 'en')) {
      setLocaleState(storedLocale);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (isMounted) {
      localStorage.setItem('locale', newLocale);
    }
  };
  
  const translate = (key: keyof Messages | string, params: Record<string, string | number> = {}): string => {
    // If not mounted or key is not in Messages type, return key (or key itself if it's a generic string)
    // This ensures that during SSR or initial client render before hydration,
    // it returns the key, preventing mismatch with server-rendered output.
    // Once mounted, it uses the actual locale.
    const typedKey = key as keyof Messages;
    const messageSource = messages[locale] || messages['fr'];
    
    let message = messageSource[typedKey] || key;

    if (typeof message === 'string') {
      Object.keys(params).forEach(paramKey => {
        message = (message as string).replace(new RegExp(`{${paramKey}}`, 'g'), String(params[paramKey]));
      });
    } else {
      // if message is not a string (e.g. key not found, and key itself wasn't a string initially)
      // return the original key as string
      return String(key);
    }
    return message;
  };

  // Always render the Provider.
  // The `translate` function handles returning keys if not mounted.
  // `setLocale` guards localStorage interaction with `isMounted`.
  return (
    <LanguageContext.Provider value={{ locale, setLocale, translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Extend LanguageContextType in declare module to handle dynamic keys for translate
declare module '@/context/language-context' {
  export interface LanguageContextType {
    translate(key: keyof typeof frMessages | string, params?: Record<string, string | number>): string;
  }
}
