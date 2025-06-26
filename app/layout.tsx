import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ReplyGuy - AI-Powered Tweet Reply Generator',
  description: 'Create authentic, human-like replies to tweets using advanced AI models',
  keywords: 'AI, Twitter, X, replies, social media, GPT, Claude, tweet generator',
  authors: [{ name: 'ReplyGuy Team' }],
  openGraph: {
    title: 'ReplyGuy - AI-Powered Tweet Reply Generator',
    description: 'Create authentic, human-like replies to tweets using advanced AI models',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
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
      </body>
    </html>
  )
}