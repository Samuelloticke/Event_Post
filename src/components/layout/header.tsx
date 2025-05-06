// src/components/layout/header.tsx
"use client";

import Link from 'next/link';
import { useLanguage } from '@/context/language-context';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export default function Header() {
  const { locale, setLocale, translate } = useLanguage();

  const toggleLanguage = () => {
    setLocale(locale === 'fr' ? 'en' : 'fr');
  };

  return (
    <header className="py-6 px-4 md:px-8 shadow-md bg-background sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl md:text-3xl font-bold text-foreground hover:text-primary transition-colors">
          {translate('appTitle')}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLanguage}
          aria-label={locale === 'fr' ? 'Switch to English' : 'Passer en Français'}
          className="text-foreground hover:text-primary"
        >
          <Globe className="h-6 w-6" />
          <span className="ml-2 font-semibold">{locale === 'fr' ? 'EN' : 'FR'}</span>
        </Button>
      </div>
    </header>
  );
}
