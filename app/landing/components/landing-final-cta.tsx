'use client';

import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { trackEvent } from '@/app/components/analytics';
import { createBrowserClient } from '@/app/lib/auth';

export function LandingFinalCTA() {
  const supabase = createBrowserClient();

  const handleXSignup = async () => {
    // Track GA4 event for final X signup CTA
    trackEvent('cta_click_x_signup', {
      event_category: 'conversion',
      event_label: 'landing_page_final_x_cta',
      page_location: '/landing'
    });

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const redirectTo = `${appUrl}/auth/callback`;
      
      // Set OAuth signup flag for better user detection
      sessionStorage.setItem('oauth_signup', 'true');
      sessionStorage.setItem('signup_source', 'landing_page_final_x');
      
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
    // Track GA4 event for final email signup CTA
    trackEvent('cta_click_email_signup', {
      event_category: 'conversion',
      event_label: 'landing_page_final_email_cta',
      page_location: '/landing'
    });
  };

  return (
    <section className="py-20 bg-gradient-to-br from-purple-600 via-purple-700 to-blue-600">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center text-white">
          {/* Main CTA content */}
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Transform Your X Engagement?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Join creators who are growing 3x faster with authentic AI replies that sound exactly like them. 
            Start free today - no credit card required.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            {/* Primary CTA - X Signup */}
            <Button
              size="lg"
              onClick={handleXSignup}
              className="
                relative overflow-hidden
                bg-white text-purple-700 hover:text-purple-800
                font-bold text-lg
                px-10 py-6 rounded-2xl
                shadow-2xl hover:shadow-3xl
                transform transition-all duration-300
                hover:scale-105
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
            </Button>

            {/* Secondary CTA - Email Signup */}
            <Link href="/auth/signup" onClick={handleEmailSignup}>
              <Button
                size="lg"
                variant="outline"
                className="
                  font-semibold text-lg px-10 py-6 rounded-2xl
                  border-2 border-white/30 hover:border-white/50
                  bg-white/10 hover:bg-white/20
                  text-white
                  backdrop-blur-sm
                  transition-all duration-300
                  min-w-[280px]
                "
              >
                Create Account with Email
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap gap-6 justify-center items-center text-white/90 mb-8">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="font-medium">10 free replies monthly</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="font-medium">No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="font-medium">Cancel anytime</span>
            </div>
          </div>

          {/* Final trust boost */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white mb-1">2 min</div>
                <div className="text-sm text-white/80">Setup Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">10s</div>
                <div className="text-sm text-white/80">Reply Generation</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">3x</div>
                <div className="text-sm text-white/80">More Engagement</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">100%</div>
                <div className="text-sm text-white/80">Authentic Voice</div>
              </div>
            </div>
          </div>

          {/* Social proof */}
          <div className="mt-8">
            <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Join creators growing their X presence with AI
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}