import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = 'https://replyguy.com';
  const currentDate = new Date().toISOString();
  
  const staticPages = [
    { url: '', changeFreq: 'daily', priority: '1.0' }, // Homepage
    { url: '/pricing', changeFreq: 'weekly', priority: '0.9' },
    { url: '/ai-reply-generator', changeFreq: 'weekly', priority: '0.8' },
    { url: '/twitter-reply-generator', changeFreq: 'weekly', priority: '0.8' },
    { url: '/x-reply-generator', changeFreq: 'weekly', priority: '0.8' },
    { url: '/write-like-me', changeFreq: 'weekly', priority: '0.8' },
    { url: '/chrome-extension', changeFreq: 'weekly', priority: '0.7' },
    { url: '/how-it-works', changeFreq: 'monthly', priority: '0.7' },
    { url: '/alternatives', changeFreq: 'monthly', priority: '0.6' },
    { url: '/auth/login', changeFreq: 'monthly', priority: '0.5' },
    { url: '/auth/signup', changeFreq: 'monthly', priority: '0.5' },
  ];

  const blogPosts = [
    {
      url: '/blog',
      changeFreq: 'daily',
      priority: '0.8',
      lastmod: '2024-01-15T10:00:00Z'
    },
    {
      url: '/blog/10-twitter-reply-templates-that-actually-get-engagement',
      changeFreq: 'weekly',
      priority: '0.9',
      lastmod: '2024-01-15T10:00:00Z'
    },
    {
      url: '/blog/how-to-write-twitter-replies-that-dont-sound-like-ai',
      changeFreq: 'weekly',
      priority: '0.9',
      lastmod: '2024-01-15T10:00:00Z'
    },
    {
      url: '/blog/twitter-engagement-strategy-beyond-just-replying',
      changeFreq: 'weekly',
      priority: '0.9',
      lastmod: '2024-01-15T10:00:00Z'
    },
    {
      url: '/blog/chrome-extensions-every-twitter-marketer-needs',
      changeFreq: 'weekly',
      priority: '0.8',
      lastmod: '2024-01-15T10:00:00Z'
    },
    {
      url: '/blog/ai-writing-tools-vs-human-writers-future-social-media',
      changeFreq: 'weekly',
      priority: '0.9',
      lastmod: '2024-01-15T10:00:00Z'
    },
    {
      url: '/blog/building-personal-brand-twitter-reply-strategy',
      changeFreq: 'weekly',
      priority: '0.9',
      lastmod: '2024-01-15T10:00:00Z'
    }
  ];

  const allPages = [...staticPages, ...blogPosts];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml" 
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" 
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${allPages
  .map(
    (page) => `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod || currentDate}</lastmod>
    <changefreq>${page.changeFreq}</changefreq>
    <priority>${page.priority}</priority>
    <mobile:mobile/>
  </url>`
  )
  .join('')}
</urlset>`;

  return new NextResponse(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
    },
  });
}