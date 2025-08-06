'use client';

import { useEffect } from 'react';

interface WebVitalsMetric {
  name: string;
  value: number;
  delta: number;
  id: string;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only load web-vitals in production
    if (process.env.NODE_ENV === 'production') {
      import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
        const handleMetric = (metric: WebVitalsMetric) => {
          // Log to console in development
          if (process.env.NODE_ENV === 'development') {
            console.log('Web Vital:', metric);
          }

          // Send to analytics (you can replace this with your analytics provider)
          if (typeof window.gtag !== 'undefined') {
            window.gtag('event', metric.name, {
              value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
              metric_id: metric.id,
              metric_value: metric.value,
              metric_delta: metric.delta,
              metric_rating: metric.rating,
            });
          }

          // You can also send to other analytics providers here
          // Example: PostHog, Mixpanel, custom analytics, etc.
        };

        onCLS(handleMetric);
        onFID(handleMetric);
        onFCP(handleMetric);
        onLCP(handleMetric);
        onTTFB(handleMetric);
      });
    }

    // Add performance observer for additional insights
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            // Track LCP elements
            console.log('LCP element:', entry);
          }
          
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            // Track layout shifts
            console.log('Layout shift:', entry);
          }
        }
      });

      try {
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        observer.observe({ type: 'layout-shift', buffered: true });
      } catch (error) {
        // Some browsers might not support all entry types
        console.log('Performance observer error:', error);
      }

      return () => {
        observer.disconnect();
      };
    }
  }, []);

  // This component doesn't render anything visible
  return null;
}

// Utility function to preload critical resources
export function preloadCriticalResources() {
  if (typeof window === 'undefined') return;

  // Preload critical fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  fontLink.as = 'style';
  fontLink.crossOrigin = 'anonymous';
  document.head.appendChild(fontLink);

  // Preload critical images
  const criticalImages = [
    '/reply_guy_logo.png',
    '/main-interface12880x800.png',
  ];

  criticalImages.forEach((src) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = src;
    link.as = 'image';
    document.head.appendChild(link);
  });
}

// Hook for measuring custom performance metrics
export function usePerformanceMetric(name: string) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Log custom metric
      console.log(`Custom metric ${name}:`, duration);
      
      // Send to analytics
      if (typeof window.gtag !== 'undefined') {
        window.gtag('event', 'custom_metric', {
          metric_name: name,
          metric_value: Math.round(duration),
        });
      }
    };
  }, [name]);
}