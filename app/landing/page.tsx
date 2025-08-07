import { LandingHero } from './components/landing-hero';
import { LandingSocialProof } from './components/landing-social-proof';
import { LandingBenefits } from './components/landing-benefits';
import { LandingHowItWorks } from './components/landing-how-it-works';
import { LandingFAQ } from './components/landing-faq';
import { LandingFinalCTA } from './components/landing-final-cta';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div data-section="hero">
        <LandingHero />
      </div>

      {/* Social Proof Section */}
      <div data-section="social-proof">
        <LandingSocialProof />
      </div>

      {/* Benefits Section */}
      <div data-section="benefits">
        <LandingBenefits />
      </div>

      {/* How It Works Section */}
      <div data-section="how-it-works">
        <LandingHowItWorks />
      </div>

      {/* FAQ Section */}
      <div data-section="faq">
        <LandingFAQ />
      </div>

      {/* Final CTA Section */}
      <div data-section="final-cta">
        <LandingFinalCTA />
      </div>

      {/* Footer - Minimal */}
      <footer className="py-8 bg-gray-900 text-white text-center">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center text-sm text-gray-400">
            <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            <span className="hidden md:block">•</span>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <span className="hidden md:block">•</span>
            <a href="mailto:support@replyguy.com" className="hover:text-white transition-colors">Support</a>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            © 2024 ReplyGuy. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}