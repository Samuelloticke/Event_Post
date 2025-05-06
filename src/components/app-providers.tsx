// src/components/app-providers.tsx
"use client";

import type { ReactNode } from 'react';
import { LanguageProvider } from '@/context/language-context';
import { AppSettingsProvider } from '@/context/app-settings-context';

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <LanguageProvider>
      <AppSettingsProvider>
        {children}
      </AppSettingsProvider>
    </LanguageProvider>
  );
}
