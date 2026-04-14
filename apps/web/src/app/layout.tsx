import type { Metadata } from 'next';
import { Manrope, Sora, Geist } from 'next/font/google';
import type { ReactNode } from 'react';

import '@/app/globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { appConfig } from '@/lib/app-config';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const bodyFont = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const labelFont = Sora({
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
    <html lang="en" className={cn(bodyFont.variable, labelFont.variable, geist.variable, 'dark font-sans')}>
      <body className="bg-background text-foreground antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
