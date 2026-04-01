import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';

import '@/app/globals.css';
import { appConfig } from '@/lib/app-config';

const bodyFont = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const labelFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-label',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(appConfig.appUrl),
  title: 'BishopTech Voice',
  description: 'Managed AI voice operations platform for onboarding, demos, call visibility, outbound campaigns, and live reporting without agency-sized retainers.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${labelFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
