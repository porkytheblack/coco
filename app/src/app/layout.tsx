import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Coco - Blockchain Development Workstation',
  description: 'Your blockchain development workstation. Organize chains, wallets, and contracts.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-coco-bg-primary antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
