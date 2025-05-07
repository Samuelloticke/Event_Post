// src/components/layout/footer.tsx
"use client";

import Link from 'next/link';
import { useLanguage } from '@/context/language-context';
import { useEffect, useState } from 'react';
import { useAppSettings } from '@/context/app-settings-context';

export default function Footer() {
  const { translate } = useLanguage();
  const { settings } = useAppSettings();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);
  
  return (
    <footer 
      className="py-6 px-4 md:px-8 mt-auto border-t"
      style={{ 
        backgroundColor: settings.uiTheme.backgroundColor, 
        borderColor: settings.uiTheme.primaryColor ? `${settings.uiTheme.primaryColor}33` : 'var(--border)' // Use primary color with opacity for border
      }}
    >
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center text-sm">
        <p style={{ color: settings.uiTheme.primaryColor, opacity: 0.7 }}>
          &copy; {currentYear ?? '...'} {translate('appTitle')}. {translate('appSubtitle')}.
        </p>
        <Link 
          href="/admin" 
          className="hover:opacity-80 transition-opacity mt-2 sm:mt-0"
          style={{ color: settings.uiTheme.primaryColor }}
        >
          {translate('adminLink')}
        </Link>
      </div>
    </footer>
  );
}
