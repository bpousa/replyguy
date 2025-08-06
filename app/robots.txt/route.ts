import { NextResponse } from 'next/server';

export async function GET() {
  const robotsContent = `User-agent: *
Allow: /

# Sitemap location
Sitemap: https://replyguy.com/sitemap.xml

# Crawl-delay for specific bots
User-agent: Googlebot
Crawl-delay: 0

User-agent: Bingbot
Crawl-delay: 1

# Block specific paths (if any)
# Disallow: /api/
# Disallow: /admin/

# Allow all social media crawlers
User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: WhatsApp
Allow: /

# SEO optimization directives
User-agent: *
Allow: /blog/
Allow: /pricing
Allow: /ai-reply-generator
Allow: /twitter-reply-generator
Allow: /x-reply-generator
Allow: /write-like-me
Allow: /chrome-extension
Allow: /how-it-works
Allow: /alternatives

# Host directive
Host: https://replyguy.com`;

  return new NextResponse(robotsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    },
  });
}