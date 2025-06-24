import { Hero } from './components/hero';
import { Features } from './components/features';
import { WhyReplyGuy } from './components/why-reply-guy';
import { PricingCards } from './components/pricing-cards';
// import { Testimonials } from './components/testimonials';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <WhyReplyGuy />
      <PricingCards />
      {/* <Testimonials /> */}
    </>
  );
}