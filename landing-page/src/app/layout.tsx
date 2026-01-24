import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Coco - Everything in One Place',
  description: 'Your blockchain development workstation. Organize chains, wallets, and contracts. Track every transaction. Built for EVM, Solana, and Aptos.',
  keywords: ['blockchain', 'development', 'ethereum', 'solana', 'aptos', 'smart contracts', 'web3', 'developer tools'],
  openGraph: {
    title: 'Coco - Everything in One Place',
    description: 'Your blockchain development workstation. Organize chains, wallets, and contracts. Track every transaction.',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Coco - Your Blockchain Development Workstation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coco - Everything in One Place',
    description: 'Your blockchain development workstation. Organize chains, wallets, and contracts. Track every transaction.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/brand/coco-paw.png" type="image/png" />
      </head>
      <body className="min-h-screen bg-coco-bg-primary antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
