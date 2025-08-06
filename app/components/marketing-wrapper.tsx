import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Footer } from '@/app/components/footer';
import { Sparkles, ChevronDown, Menu, X } from 'lucide-react';
import { useState } from 'react';

'use client';

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
    { name: 'Blog', href: '/blog', description: 'Tips and strategies for Twitter growth' },
    { name: 'How It Works', href: '/how-it-works', description: 'Learn about our AI technology' },
    { name: 'Alternatives', href: '/alternatives', description: 'Compare ReplyGuy with other tools' },
    { name: 'Chrome Extension', href: '/chrome-extension', description: 'Browser extension guide' },
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
              {/* Tools Dropdown */}
              <div className="relative group">
                <button 
                  className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  onMouseEnter={() => setToolsOpen(true)}
                  onMouseLeave={() => setToolsOpen(false)}
                >
                  Reply Tools <ChevronDown className="w-4 h-4 ml-1" />
                </button>
                {toolsOpen && (
                  <div 
                    className="absolute left-0 mt-2 w-72 bg-white rounded-lg shadow-lg border z-50"
                    onMouseEnter={() => setToolsOpen(true)}
                    onMouseLeave={() => setToolsOpen(false)}
                  >
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
              <div className="relative group">
                <button 
                  className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  onMouseEnter={() => setResourcesOpen(true)}
                  onMouseLeave={() => setResourcesOpen(false)}
                >
                  Resources <ChevronDown className="w-4 h-4 ml-1" />
                </button>
                {resourcesOpen && (
                  <div 
                    className="absolute left-0 mt-2 w-72 bg-white rounded-lg shadow-lg border z-50"
                    onMouseEnter={() => setResourcesOpen(true)}
                    onMouseLeave={() => setResourcesOpen(false)}
                  >
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

              <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </Link>
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
                <div className="space-y-3">
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

              {/* Mobile Pricing */}
              <Link
                href="/pricing"
                className="block text-sm font-medium text-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>

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