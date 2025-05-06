// src/components/layout/footer.tsx
"use client";

import Link from 'next/link';
import { useLanguage } from '@/context/language-context';
import { useEffect, useState } from 'react';

export default function Footer() {
  const { translate } = useLanguage();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);
  
  return (
    <footer className="py-6 px-4 md:px-8 mt-auto border-t border-border/20">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
        <p>&copy; {currentYear ?? '...'} {translate('appTitle')}. {translate('appSubtitle')}.</p>
        <Link href="/admin" className="hover:text-primary transition-colors mt-2 sm:mt-0">
          {translate('adminLink')}
        </Link>
      </div>
    </footer>
  );
}
