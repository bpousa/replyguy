'use client';

import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { trackEvent } from '@/app/components/analytics';
import { createBrowserClient } from '@/app/lib/auth';

export function LandingHero() {
  const supabase = createBrowserClient();

  const handleXSignup = async () => {
    // Track GA4 event for X signup CTA
    trackEvent('cta_click_x_signup', {
      event_category: 'conversion',
      event_label: 'landing_page_x_cta',
      page_location: '/landing'
    });

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const redirectTo = `${appUrl}/auth/callback`;
      
      // Set OAuth signup flag for better user detection
      sessionStorage.setItem('oauth_signup', 'true');
      sessionStorage.setItem('signup_source', 'landing_page_x');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo,
          skipBrowserRedirect: false
        }
      });
      
      if (error) throw error;
      
      // Manual redirect if needed
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('X OAuth error:', error);
      // Fallback to email signup
      window.location.href = '/auth/signup';
    }
  };

  const handleEmailSignup = () => {
    // Track GA4 event for email signup CTA
    trackEvent('cta_click_email_signup', {
      event_category: 'conversion',
      event_label: 'landing_page_email_cta',
      page_location: '/landing'
    });
  };

  return (
    <section className="relative py-12 md:py-20 bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/reply_guy_logo.png"
              alt="ReplyGuy Logo"
              width={80}
              height={80}
              className="mx-auto object-contain"
              priority
            />
          </div>
          
          {/* Main headline - Conversion focused */}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            AI Twitter Replies That <span className="gradient-text">Sound Exactly Like You</span>
          </h1>
          
          {/* Subheadline with quantified benefits */}
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
            Generate authentic replies in 10 seconds. Build your X following 3x faster 
            with AI that learns your unique voice and style. No robotic responses, just you.
          </p>

          {/* Primary CTA Section */}
          <div className="mb-12">
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              {/* Primary CTA - X Signup */}
              <Button
                size="lg"
                onClick={handleXSignup}
                className="
                  relative overflow-hidden
                  bg-gradient-to-r from-purple-600 via-purple-700 to-blue-600
                  hover:from-purple-700 hover:via-purple-800 hover:to-blue-700
                  text-white font-bold text-lg
                  px-10 py-6 rounded-2xl
                  shadow-2xl shadow-purple-500/30
                  transform transition-all duration-300
                  hover:scale-105 hover:shadow-3xl hover:shadow-purple-500/40
                  border-0 min-w-[280px]
                "
              >
                <span className="relative z-10 flex items-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Create Account with X
                  <ArrowRight className="w-5 h-5" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
              </Button>

              {/* Secondary CTA - Email Signup */}
              <Link href="/auth/signup" onClick={handleEmailSignup}>
                <Button
                  size="lg"
                  variant="outline"
                  className="
                    font-semibold text-lg px-10 py-6 rounded-2xl
                    border-2 border-purple-200 hover:border-purple-300
                    bg-white hover:bg-purple-50
                    text-purple-700 hover:text-purple-800
                    shadow-lg hover:shadow-xl
                    transition-all duration-300
                    min-w-[280px]
                  "
                >
                  Create Account with Email
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
            
            {/* Trust indicators - Prominent */}
            <div className="mb-8 p-4 bg-green-50 rounded-xl border border-green-200 max-w-md mx-auto">
              <p className="text-lg font-bold text-green-800 mb-2">
                🚀 No Credit Card Required
              </p>
              <p className="text-green-700 font-medium text-sm">
                Start with 10 free replies monthly • Chrome extension included • Upgrade anytime
              </p>
            </div>
          </div>
          
          {/* Trust indicators with checkmarks */}
          <div className="flex flex-wrap gap-6 justify-center items-center text-sm text-gray-600 mb-10">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium">10 free replies monthly</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium">Chrome extension included</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium">Cancel anytime</span>
            </div>
          </div>

          {/* Quick credibility indicators */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 max-w-2xl mx-auto">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-600 mb-1">10s</div>
                <div className="text-sm text-gray-600">Reply Generation</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 mb-1">50+</div>
                <div className="text-sm text-gray-600">Reply Types</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600 mb-1">4.8★</div>
                <div className="text-sm text-gray-600">Chrome Extension</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}