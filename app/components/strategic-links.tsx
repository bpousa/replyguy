import Link from 'next/link';
import { ArrowRight, ExternalLink, FileText, Zap, Users, Chrome, Target } from 'lucide-react';

interface StrategicLinksProps {
  context: 'homepage' | 'pricing' | 'blog-post' | 'blog-index' | 'product-page';
  currentPage?: string;
  excludePages?: string[];
}

export function StrategicLinks({ context, currentPage, excludePages = [] }: StrategicLinksProps) {
  const allLinks = {
    // Core product pages
    'ai-reply-generator': {
      title: 'AI Reply Generator',
      href: '/ai-reply-generator',
      description: 'Generate authentic Twitter replies with AI',
      icon: Zap,
      category: 'product',
      priority: 'high'
    },
    'twitter-reply-generator': {
      title: 'Twitter Reply Generator',
      href: '/twitter-reply-generator', 
      description: 'Twitter-specific AI reply tool',
      icon: Zap,
      category: 'product',
      priority: 'high'
    },
    'write-like-me': {
      title: 'Write Like Me™',
      href: '/write-like-me',
      description: 'Personalized AI that learns your voice',
      icon: Users,
      category: 'product',
      priority: 'high'
    },
    'chrome-extension': {
      title: 'Chrome Extension',
      href: '/chrome-extension',
      description: 'Install our browser extension',
      icon: Chrome,
      category: 'product',
      priority: 'medium'
    },
    
    // High-value blog content
    'reply-templates': {
      title: '10 Twitter Reply Templates',
      href: '/blog/10-twitter-reply-templates-that-actually-get-engagement',
      description: 'Copy-paste templates that boost engagement by 300%',
      icon: FileText,
      category: 'blog',
      priority: 'high'
    },
    'ai-vs-human': {
      title: 'AI vs Human Writing',
      href: '/blog/ai-writing-tools-vs-human-writers-future-social-media',
      description: 'The future of content creation',
      icon: Target,
      category: 'blog',
      priority: 'high'
    },
    'personal-branding': {
      title: 'Twitter Personal Branding',
      href: '/blog/building-personal-brand-twitter-reply-strategy',
      description: 'Build your brand through strategic replies',
      icon: Users,
      category: 'blog',
      priority: 'high'
    },
    'human-like-ai': {
      title: 'Human-Like AI Writing',
      href: '/blog/how-to-write-twitter-replies-that-dont-sound-like-ai',
      description: '15 techniques to bypass AI detection',
      icon: Target,
      category: 'blog',
      priority: 'medium'
    },
    'engagement-strategy': {
      title: 'Twitter Engagement Strategy',
      href: '/blog/twitter-engagement-strategy-beyond-just-replying',
      description: '5-pillar framework for Twitter success',
      icon: Users,
      category: 'blog',
      priority: 'medium'
    },
    'chrome-extensions-guide': {
      title: 'Chrome Extensions Guide',
      href: '/blog/chrome-extensions-every-twitter-marketer-needs',
      description: '15 essential tools for Twitter marketers',
      icon: Chrome,
      category: 'blog',
      priority: 'low'
    },
    
    // Supporting pages
    'pricing': {
      title: 'Pricing',
      href: '/pricing',
      description: 'Choose your plan - start with 10 free replies',
      icon: FileText,
      category: 'conversion',
      priority: 'high'
    },
    'how-it-works': {
      title: 'How It Works',
      href: '/how-it-works',
      description: 'Learn about our AI technology',
      icon: FileText,
      category: 'info',
      priority: 'medium'
    },
    'blog-index': {
      title: 'Blog',
      href: '/blog',
      description: 'Twitter marketing strategies and tips',
      icon: FileText,
      category: 'blog',
      priority: 'medium'
    }
  };

  const getContextualLinks = () => {
    const filtered = Object.entries(allLinks).filter(([key, link]) => {
      // Exclude current page and explicitly excluded pages
      if (currentPage && link.href.includes(currentPage)) return false;
      if (excludePages.some(exclude => link.href.includes(exclude))) return false;
      return true;
    });

    switch (context) {
      case 'homepage':
        return filtered
          .filter(([key, link]) => link.priority === 'high' && (link.category === 'blog' || link.category === 'product'))
          .slice(0, 4);
      
      case 'pricing':
        return filtered
          .filter(([key, link]) => link.category === 'product' || link.category === 'blog')
          .slice(0, 3);
      
      case 'blog-post':
        return filtered
          .filter(([key, link]) => link.category === 'blog' || (link.category === 'product' && link.priority === 'high'))
          .slice(0, 4);
      
      case 'blog-index':
        return filtered
          .filter(([key, link]) => link.category === 'product' && link.priority === 'high')
          .slice(0, 2);
      
      case 'product-page':
        return filtered
          .filter(([key, link]) => link.category === 'blog' || link.category === 'conversion')
          .slice(0, 3);
      
      default:
        return filtered.slice(0, 3);
    }
  };

  const contextualLinks = getContextualLinks();
  
  if (contextualLinks.length === 0) return null;

  const getContextTitle = () => {
    switch (context) {
      case 'homepage':
        return 'Explore More';
      case 'pricing':
        return 'Learn More';
      case 'blog-post':
        return 'Related Resources';
      case 'blog-index':
        return 'Get Started';
      case 'product-page':
        return 'Next Steps';
      default:
        return 'Related Links';
    }
  };

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            {getContextTitle()}
          </h3>
          <div className={`grid ${contextualLinks.length <= 2 ? 'md:grid-cols-2' : contextualLinks.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'} gap-6`}>
            {contextualLinks.map(([key, link]) => {
              const IconComponent = link.icon;
              return (
                <Link
                  key={key}
                  href={link.href}
                  className="group bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                        {link.title}
                      </h4>
                      <p className="text-gray-600 text-sm leading-relaxed mb-3">
                        {link.description}
                      </p>
                      <div className="flex items-center text-sm text-purple-600 font-medium">
                        {link.href.startsWith('/blog') ? 'Read More' : 'Learn More'}
                        <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}