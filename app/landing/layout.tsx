import { Metadata } from 'next';
import { Analytics } from '../components/analytics';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'ReplyGuy - AI Twitter Reply Generator | Create Free Account',
  description: 'Generate authentic, human-like Twitter replies with AI in seconds. Join creators growing 3x faster on X. No credit card required - start with 10 free replies monthly.',
  keywords: 'AI reply generator, Twitter reply generator, X reply generator, free account, Twitter growth, social media AI',
  openGraph: {
    title: 'ReplyGuy - AI Twitter Reply Generator | Create Free Account',
    description: 'Generate authentic replies that sound exactly like you. Join creators growing 3x faster on X. Start free - no credit card required.',
    url: 'https://replyguy.appendment.com/landing',
    images: [
      {
        url: '/main-interface12880x800.png',
        width: 1280,
        height: 800,
        alt: 'ReplyGuy AI Twitter Reply Generator Interface',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReplyGuy - AI Twitter Reply Generator | Create Free Account',
    description: 'Generate authentic replies that sound exactly like you. Start free - no credit card required.',
    images: ['/main-interface12880x800.png'],
  },
  alternates: {
    canonical: 'https://replyguy.appendment.com/landing',
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Minimal layout - no header navigation to avoid distractions */}
      <main className="min-h-screen bg-white">
        {children}
      </main>
      
      {/* Toast notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
      
      {/* Analytics tracking */}
      <Analytics />
    </>
  );
}