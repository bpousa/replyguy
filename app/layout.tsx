import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { Providers } from './providers'
import { PerformanceMonitor } from './components/performance-monitor'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ReplyGuy - AI Twitter Reply Generator | Write Like You',
  description: 'Generate authentic, human-like Twitter replies with AI. Our Chrome extension helps you craft engaging X replies that sound genuinely like you. 10 free replies monthly, no credit card required.',
  keywords: [
    'AI reply generator',
    'Twitter reply generator', 
    'X reply generator',
    'AI Twitter replies',
    'Chrome extension Twitter',
    'human-like replies',
    'Twitter engagement',
    'X engagement tool',
    'social media AI',
    'Twitter automation',
    'reply bot',
    'Twitter marketing',
    'social media management'
  ].join(', '),
  authors: [{ name: 'ReplyGuy Team' }],
  creator: 'ReplyGuy',
  publisher: 'ReplyGuy',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16' },
      { url: '/replyguy16.png', sizes: '16x16' },
      { url: '/replyguy48.png', sizes: '48x48' },
      { url: '/replyguy128.png', sizes: '128x128' },
    ],
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'ReplyGuy - AI Twitter Reply Generator | Write Like You',
    description: 'Generate authentic, human-like Twitter replies with AI. Our Chrome extension helps you craft engaging X replies that sound genuinely like you. 10 free replies monthly.',
    url: 'https://replyguy.com',
    siteName: 'ReplyGuy',
    images: [
      {
        url: '/main-interface12880x800.png',
        width: 1280,
        height: 800,
        alt: 'ReplyGuy AI Twitter Reply Generator Interface',
      },
      {
        url: '/feature-showcase640x400.png', 
        width: 640,
        height: 400,
        alt: 'ReplyGuy Features Showcase',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReplyGuy - AI Twitter Reply Generator',
    description: 'Generate authentic, human-like Twitter replies with AI. Chrome extension included. 10 free replies monthly.',
    images: ['/main-interface12880x800.png'],
    creator: '@replyguyai',
    site: '@replyguyai',
  },
  alternates: {
    canonical: 'https://replyguy.com',
  },
  category: 'Social Media Tools',
  classification: 'AI-powered social media management tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://replyguy.com/#organization",
        "name": "ReplyGuy",
        "url": "https://replyguy.com",
        "logo": {
          "@type": "ImageObject",
          "url": "https://replyguy.com/reply_guy_logo.png",
          "width": 512,
          "height": 512
        },
        "foundingDate": "2024",
        "description": "AI-powered Twitter reply generator that creates authentic, human-like responses",
        "sameAs": [
          "https://twitter.com/replyguyai",
          "https://chromewebstore.google.com/detail/reply-guy-for-x-twitter/ggdieefnnmcgnmonbkngnmonoifdgmje"
        ]
      },
      {
        "@type": "WebApplication",
        "@id": "https://replyguy.com/#webapp",
        "name": "ReplyGuy",
        "description": "AI-powered Twitter reply generator with Chrome extension for authentic, human-like replies",
        "url": "https://replyguy.com",
        "applicationCategory": "SocialNetworkingApplication",
        "operatingSystem": "Web Browser, Chrome Extension",
        "browserRequirements": "Requires JavaScript enabled",
        "offers": [
          {
            "@type": "Offer",
            "name": "Free Plan",
            "price": "0",
            "priceCurrency": "USD",
            "description": "10 free replies per month, no credit card required"
          },
          {
            "@type": "Offer", 
            "name": "X Basic",
            "price": "19",
            "priceCurrency": "USD",
            "billingIncrement": "P1M",
            "description": "300 replies, 10 memes, 50 AI suggestions monthly"
          }
        ],
        "featureList": [
          "AI-powered reply generation",
          "Chrome extension integration", 
          "Human-like writing style",
          "Write Like Me personalization",
          "Anti-AI detection technology",
          "Real-time fact checking"
        ],
        "screenshot": "https://replyguy.com/main-interface12880x800.png"
      },
      {
        "@type": "WebSite",
        "@id": "https://replyguy.com/#website",
        "url": "https://replyguy.com",
        "name": "ReplyGuy - AI Twitter Reply Generator",
        "description": "Generate authentic, human-like Twitter replies with AI",
        "publisher": {
          "@id": "https://replyguy.com/#organization"
        },
        "inLanguage": "en-US"
      }
    ]
  };

  return (
    <html lang="en" className={inter.className}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="relative">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
            <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
          </div>
          
          {/* Main content */}
          <div className="relative z-10 min-h-screen flex flex-col">
            <Providers>
              {children}
            </Providers>
          </div>
        </div>
        
        <Toaster
          position="bottom-center"
          toastOptions={{
            className: 'font-medium',
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <PerformanceMonitor />
      </body>
    </html>
  )
}