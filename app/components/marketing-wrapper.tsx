'use client';

import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Footer } from '@/app/components/footer';
import { Sparkles, ChevronDown, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function MarketingWrapper({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const replyGeneratorTools = [
    { name: 'AI Reply Generator', href: '/ai-reply-generator', description: 'Generate smart replies with AI' },
    { name: 'Twitter Reply Generator', href: '/twitter-reply-generator', description: 'Twitter-specific reply tool' },
    { name: 'X Reply Generator', href: '/x-reply-generator', description: 'Modern X platform replies' },
    { name: 'Write Like Me™', href: '/write-like-me', description: 'Personalized writing style' },
  ];

  const resources = [
    { name: 'Blog', href: '/blog', description: 'Latest tips and strategies' },
    { name: 'Reply Templates', href: '/blog/10-twitter-reply-templates-that-actually-get-engagement', description: '10 proven engagement templates' },
    { name: 'AI vs Human Writing', href: '/blog/ai-writing-tools-vs-human-writers-future-social-media', description: 'Future of content creation' },
    { name: 'Personal Branding', href: '/blog/building-personal-brand-twitter-reply-strategy', description: 'Build your Twitter brand' },
    { name: 'Chrome Extensions', href: '/blog/chrome-extensions-every-twitter-marketer-needs', description: 'Essential browser tools' },
    { name: 'How It Works', href: '/how-it-works', description: 'Learn about our AI technology' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <span className="text-xl font-bold text-gray-900">ReplyGuy</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Home
              </Link>

              {/* Tools Dropdown */}
              <div 
                className="relative group"
                onMouseEnter={() => setToolsOpen(true)}
                onMouseLeave={() => setToolsOpen(false)}
              >
                <button className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors py-2">
                  Reply Tools <ChevronDown className="w-4 h-4 ml-1" />
                </button>
                {toolsOpen && (
                  <div className="absolute left-0 top-full w-72 bg-white rounded-lg shadow-lg border z-50 mt-0">
                    <div className="p-2">
                      {replyGeneratorTools.map((tool) => (
                        <Link
                          key={tool.name}
                          href={tool.href}
                          className="block px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="text-sm font-medium text-gray-900">{tool.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{tool.description}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Resources Dropdown */}
              <div 
                className="relative group"
                onMouseEnter={() => setResourcesOpen(true)}
                onMouseLeave={() => setResourcesOpen(false)}
              >
                <button className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors py-2">
                  Resources <ChevronDown className="w-4 h-4 ml-1" />
                </button>
                {resourcesOpen && (
                  <div className="absolute left-0 top-full w-80 bg-white rounded-lg shadow-lg border z-50 mt-0">
                    <div className="p-2">
                      {resources.map((resource) => (
                        <Link
                          key={resource.name}
                          href={resource.href}
                          className="block px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="text-sm font-medium text-gray-900">{resource.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{resource.description}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link href="/chrome-extension" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Chrome Extension
              </Link>

              <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>

              <a 
                href="https://appendment.com/contact" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Contact
              </a>
            </div>

            {/* Auth Buttons & Mobile Menu */}
            <div className="flex items-center space-x-4">
              <Link href="/auth/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup" className="hidden sm:block">
                <Button size="sm">
                  Get Started
                </Button>
              </Link>
              
              {/* Mobile Menu Button */}
              <button
                className="lg:hidden p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t">
            <div className="px-4 py-6 space-y-6">
              {/* Mobile Tools Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Reply Tools</h3>
                <div className="space-y-3">
                  {replyGeneratorTools.map((tool) => (
                    <Link
                      key={tool.name}
                      href={tool.href}
                      className="block"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="text-sm font-medium text-gray-700">{tool.name}</div>
                      <div className="text-xs text-gray-500">{tool.description}</div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Mobile Resources Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Resources</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {resources.map((resource) => (
                    <Link
                      key={resource.name}
                      href={resource.href}
                      className="block"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="text-sm font-medium text-gray-700">{resource.name}</div>
                      <div className="text-xs text-gray-500">{resource.description}</div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Mobile Navigation Links */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Navigation</h3>
                <div className="space-y-3">
                  <Link
                    href="/"
                    className="block text-sm font-medium text-gray-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Home
                  </Link>

                  <Link
                    href="/chrome-extension"
                    className="block text-sm font-medium text-gray-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Chrome Extension
                  </Link>

                  <Link
                    href="/pricing"
                    className="block text-sm font-medium text-gray-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Pricing
                  </Link>

                  <a 
                    href="https://appendment.com/contact" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block text-sm font-medium text-gray-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Contact
                  </a>
                </div>
              </div>

              {/* Mobile Auth Buttons */}
              <div className="space-y-3 pt-6 border-t">
                <Link href="/auth/login" className="block">
                  <Button variant="ghost" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup" className="block">
                  <Button className="w-full" onClick={() => setMobileMenuOpen(false)}>
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
      
      <main className="flex-grow">{children}</main>
      
      <Footer />
    </div>
  );
}