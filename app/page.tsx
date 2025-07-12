import { Hero } from './(marketing)/components/hero';
import { Features } from './(marketing)/components/features';
import { ChromeExtension } from './(marketing)/components/chrome-extension';
import { WhyReplyGuy } from './(marketing)/components/why-reply-guy';
import { WriteLikeMe } from './(marketing)/components/write-like-me';
import { PricingCards } from './(marketing)/components/pricing-cards';
import { MarketingWrapper } from './components/marketing-wrapper';
// import { Testimonials } from './(marketing)/components/testimonials';

export default function LandingPage() {
  return (
    <MarketingWrapper>
      <Hero />
      <Features />
      <ChromeExtension />
      <WriteLikeMe />
      <WhyReplyGuy />
      <PricingCards />
      {/* <Testimonials /> */}
    </MarketingWrapper>
  );
}