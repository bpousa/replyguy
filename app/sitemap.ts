import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://replyguy.appendment.com'
  const now = new Date()
  const lastModified = now.toISOString()

  return [
    // Main pages
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    
    // Primary keyword landing pages
    {
      url: `${baseUrl}/ai-reply-generator`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/twitter-reply-generator`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/x-reply-generator`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    
    // Feature pages
    {
      url: `${baseUrl}/chrome-extension`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/write-like-me`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    
    // Competitive pages
    {
      url: `${baseUrl}/alternatives`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/vs/hypefury`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/vs/jasper-ai`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    
    // Blog pages
    {
      url: `${baseUrl}/blog`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/10-twitter-reply-templates-that-actually-get-engagement`,
      lastModified: '2024-01-15T10:00:00Z',
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/how-to-write-twitter-replies-that-dont-sound-like-ai`,
      lastModified: '2024-01-15T10:00:00Z',
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/twitter-engagement-strategy-beyond-just-replying`,
      lastModified: '2024-01-15T10:00:00Z',
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/chrome-extensions-every-twitter-marketer-needs`,
      lastModified: '2024-01-15T10:00:00Z',
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog/ai-writing-tools-vs-human-writers-future-social-media`,
      lastModified: '2024-01-15T10:00:00Z',
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/building-personal-brand-twitter-reply-strategy`,
      lastModified: '2024-01-15T10:00:00Z',
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/how-to-write-engaging-twitter-replies`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    
    // Legal pages
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/disclaimer`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}