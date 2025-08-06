import { Metadata } from 'next';
import { Hero } from './(marketing)/components/hero';
import { Features } from './(marketing)/components/features';
import { ChromeExtension } from './(marketing)/components/chrome-extension';
import { WhyReplyGuy } from './(marketing)/components/why-reply-guy';
import { WriteLikeMe } from './(marketing)/components/write-like-me';
import { PricingCards } from './(marketing)/components/pricing-cards';
import { MarketingWrapper } from './components/marketing-wrapper';
import { HomepageFAQ } from './(marketing)/components/homepage-faq';
import { StrategicLinks } from './components/strategic-links';
// import { Testimonials } from './(marketing)/components/testimonials';

export const metadata: Metadata = {
  title: 'ReplyGuy - AI Twitter Reply Generator | Write Like You',
  description: 'Generate authentic, human-like Twitter replies with AI in seconds. Our Chrome extension helps you craft engaging X replies that sound genuinely like you. 10 free replies monthly, no credit card required. Try now!',
  keywords: 'AI reply generator, Twitter reply generator, X reply generator, AI Twitter replies, Chrome extension Twitter, human-like replies, Twitter engagement, X engagement tool, social media AI, Twitter automation, reply bot, Twitter marketing, social media management, authentic replies, Twitter growth, X growth',
  openGraph: {
    title: 'ReplyGuy - AI Twitter Reply Generator | Write Like You',
    description: 'Generate authentic, human-like Twitter replies with AI in seconds. Chrome extension included. 10 free replies monthly. Try now!',
    url: 'https://replyguy.com',
    images: [
      {
        url: '/main-interface12880x800.png',
        width: 1280,
        height: 800,
        alt: 'ReplyGuy AI Twitter Reply Generator Interface - Generate authentic replies',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReplyGuy - AI Twitter Reply Generator',
    description: 'Generate authentic, human-like Twitter replies with AI in seconds. Chrome extension included. 10 free replies monthly.',
    images: ['/main-interface12880x800.png'],
  },
  alternates: {
    canonical: 'https://replyguy.com',
  },
};

export default function LandingPage() {
  return (
    <MarketingWrapper>
      <Hero />
      <Features />
      <ChromeExtension />
      <WriteLikeMe />
      <WhyReplyGuy />
      <PricingCards />
      <HomepageFAQ />
      <StrategicLinks context="homepage" currentPage="/" />
      {/* <Testimonials /> */}
    </MarketingWrapper>
  );
}