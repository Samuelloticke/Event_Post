import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppProviders from '@/components/app-providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Le Règne des Josias',
  description: 'Générez votre image personnalisée pour l\'événement.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AppProviders>
          <main>{children}</main>
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
