import { Hero } from './(marketing)/components/hero';
import { Features } from './(marketing)/components/features';
import { WhyReplyGuy } from './(marketing)/components/why-reply-guy';
import { PricingCards } from './(marketing)/components/pricing-cards';
import { MarketingWrapper } from './components/marketing-wrapper';
// import { Testimonials } from './(marketing)/components/testimonials';

export default function LandingPage() {
  return (
    <MarketingWrapper>
      <Hero />
      <Features />
      <WhyReplyGuy />
      <PricingCards />
      {/* <Testimonials /> */}
    </MarketingWrapper>
  );
}