'use client';

import Script from 'next/script';
import { useEffect } from 'react';

interface AnalyticsProps {
  gaId?: string;
}

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export function Analytics({ gaId }: AnalyticsProps) {
  // Use environment variable or provided gaId
  const GA_TRACKING_ID = gaId || process.env.NEXT_PUBLIC_GA_ID;

  useEffect(() => {
    if (GA_TRACKING_ID && typeof window !== 'undefined') {
      // Initialize dataLayer if it doesn't exist
      window.dataLayer = window.dataLayer || [];
      
      function gtag(...args: any[]) {
        window.dataLayer.push(args);
      }
      
      // Make gtag available globally
      window.gtag = gtag;
      
      // Configure GA4
      gtag('js', new Date());
      gtag('config', GA_TRACKING_ID, {
        page_title: document.title,
        page_location: window.location.href,
        // Enhanced ecommerce and engagement tracking
        send_page_view: true,
        anonymize_ip: true, // GDPR compliance
        cookie_flags: 'SameSite=None;Secure',
      });

      // Track custom events for ReplyGuy specific actions
      const trackCustomEvents = () => {
        // Track scroll depth
        let maxScroll = 0;
        const trackScroll = () => {
          const scrollPercent = Math.round(
            (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
          );
          if (scrollPercent > maxScroll && scrollPercent % 25 === 0) {
            maxScroll = scrollPercent;
            gtag('event', 'scroll_depth', {
              event_category: 'engagement',
              event_label: `${scrollPercent}%`,
              value: scrollPercent
            });
          }
        };
        window.addEventListener('scroll', trackScroll);

        // Track time on page
        const startTime = Date.now();
        const trackTimeOnPage = () => {
          const timeOnPage = Math.round((Date.now() - startTime) / 1000);
          if (timeOnPage >= 30 && timeOnPage % 30 === 0) {
            gtag('event', 'time_on_page', {
              event_category: 'engagement',
              event_label: `${timeOnPage}s`,
              value: timeOnPage
            });
          }
        };
        setInterval(trackTimeOnPage, 30000);

        // Track external link clicks
        document.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const link = target.closest('a');
          if (link && link.href && !link.href.includes(window.location.hostname)) {
            gtag('event', 'click', {
              event_category: 'outbound_link',
              event_label: link.href,
              transport_type: 'beacon'
            });
          }
        });

        // Track ReplyGuy specific interactions
        const trackReplyGuyEvents = () => {
          // Track Chrome extension downloads
          document.querySelectorAll('a[href*="chrome.google.com"]').forEach(link => {
            link.addEventListener('click', () => {
              gtag('event', 'extension_download_click', {
                event_category: 'conversion',
                event_label: 'chrome_extension'
              });
            });
          });

          // Track pricing page visits
          document.querySelectorAll('a[href*="/pricing"]').forEach(link => {
            link.addEventListener('click', () => {
              gtag('event', 'pricing_page_visit', {
                event_category: 'conversion',
                event_label: 'pricing_interest'
              });
            });
          });

          // Track signup button clicks
          document.querySelectorAll('a[href*="/auth/signup"], a[href*="signup"]').forEach(link => {
            link.addEventListener('click', () => {
              gtag('event', 'signup_click', {
                event_category: 'conversion',
                event_label: 'signup_attempt'
              });
            });
          });
        };

        trackReplyGuyEvents();
      };

      // Initialize custom tracking after a short delay
      setTimeout(trackCustomEvents, 1000);
    }
  }, [GA_TRACKING_ID]);

  if (!GA_TRACKING_ID) {
    return null;
  }

  return (
    <>
      {/* Google Analytics 4 */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          
          gtag('config', '${GA_TRACKING_ID}', {
            page_title: document.title,
            page_location: window.location.href,
            send_page_view: true,
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}
      </Script>

      {/* Google Search Console verification (if provided) */}
      {process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && (
        <meta 
          name="google-site-verification" 
          content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION} 
        />
      )}
    </>
  );
}

// Helper function to track custom events
export const trackEvent = (eventName: string, parameters: Record<string, any> = {}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};

// Helper function to track page views
export const trackPageView = (url: string, title?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
      page_location: url,
      page_title: title || document.title,
    });
  }
};