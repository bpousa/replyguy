import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Breadcrumb } from '@/app/components/breadcrumb';
import { ArrowRight, Calendar, Clock, User, Tag } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ReplyGuy Blog - Twitter AI & Social Media Growth Tips',
  description: 'Learn how to grow your Twitter following, create engaging replies, and master social media with AI. Expert tips on Twitter marketing, engagement strategies, and AI tools.',
  keywords: 'Twitter tips, social media growth, AI Twitter tools, Twitter engagement, Twitter marketing, social media strategy, Twitter replies, AI content creation, Twitter automation, social media tips',
  openGraph: {
    title: 'ReplyGuy Blog - Twitter AI & Social Media Growth Tips',
    description: 'Expert tips on growing your Twitter following and mastering social media with AI tools.',
    url: 'https://replyguy.com/blog',
  },
  alternates: {
    canonical: 'https://replyguy.com/blog',
  },
};

const blogPosts = [
  {
    slug: 'how-to-write-engaging-twitter-replies',
    title: 'How to Write Engaging Twitter Replies That Get Noticed',
    excerpt: 'Master the art of Twitter engagement with proven strategies for writing replies that boost your visibility and grow your following.',
    category: 'Twitter Strategy',
    readTime: '8 min read',
    publishDate: '2025-01-15',
    image: '/feature-showcase640x400.png',
    featured: true,
  },
  {
    slug: 'twitter-reply-strategies-2025',
    title: '10 Twitter Reply Strategies That Actually Work in 2025',
    excerpt: 'Discover the latest Twitter reply strategies that successful creators use to build their audience and increase engagement.',
    category: 'Growth Tips',
    readTime: '12 min read',
    publishDate: '2025-01-10',
    image: '/main-interface12880x800.png',
    featured: true,
  },
  {
    slug: 'ai-vs-human-social-media-engagement',
    title: 'AI vs Human: The Future of Social Media Engagement',
    excerpt: 'Explore how AI is transforming social media engagement and what it means for content creators and businesses.',
    category: 'AI & Technology',
    readTime: '10 min read',
    publishDate: '2025-01-05',
    image: '/generated-reply1280x800.png',
    featured: true,
  },
  {
    slug: 'twitter-reply-etiquette-dos-donts',
    title: 'Twitter Reply Etiquette: Do\'s and Don\'ts for 2025',
    excerpt: 'Learn the unwritten rules of Twitter engagement to avoid common mistakes and build genuine connections.',
    category: 'Best Practices',
    readTime: '6 min read',
    publishDate: '2024-12-28',
    image: '/advanced-options640x400.png',
  },
  {
    slug: 'building-personal-brand-twitter-replies',
    title: 'Building Your Personal Brand Through Better Twitter Replies',
    excerpt: 'Transform your Twitter replies into powerful brand-building tools with these proven strategies.',
    category: 'Personal Branding',
    readTime: '9 min read',
    publishDate: '2024-12-20',
    image: '/feature-showcase640x400.png',
  },
  {
    slug: 'chrome-extensions-twitter-productivity',
    title: 'Chrome Extensions That Will Transform Your Twitter Game',
    excerpt: 'Discover the best Chrome extensions for Twitter power users, including our AI reply generator.',
    category: 'Tools & Extensions',
    readTime: '7 min read',
    publishDate: '2024-12-15',
    image: '/main-interface12880x800.png',
  },
];

const categories = [
  'All Posts',
  'Twitter Strategy',
  'Growth Tips', 
  'AI & Technology',
  'Best Practices',
  'Personal Branding',
  'Tools & Extensions'
];

export default function BlogPage() {
  const featuredPosts = blogPosts.filter(post => post.featured);
  const regularPosts = blogPosts.filter(post => !post.featured);

  return (
    <div className="bg-white">
      <Breadcrumb 
        items={[
          { label: 'Blog' }
        ]} 
      />
      
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Master Twitter with <span className="gradient-text">AI-Powered</span> Insights
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Expert tips, strategies, and insights on growing your Twitter following, 
              creating engaging content, and leveraging AI tools for social media success.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2">
                  Try ReplyGuy Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/ai-reply-generator">
                <Button size="lg" variant="outline">
                  See AI Reply Generator
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
              Featured Articles
            </h2>
            
            <div className="grid lg:grid-cols-3 gap-8 mb-16">
              {featuredPosts.map((post, index) => (
                <Card key={post.slug} className={`shadow-lg hover:shadow-xl transition-shadow ${index === 0 ? 'lg:col-span-2 lg:row-span-2' : ''}`}>
                  <div className="relative">
                    <Image
                      src={post.image}
                      alt={post.title}
                      width={index === 0 ? 800 : 400}
                      height={index === 0 ? 400 : 200}
                      className="w-full h-48 lg:h-64 object-cover rounded-t-lg"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        {post.category}
                      </span>
                    </div>
                  </div>
                  
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(post.publishDate).toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {post.readTime}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-3 hover:text-purple-600 transition-colors">
                      <Link href={`/blog/${post.slug}`}>
                        {post.title}
                      </Link>
                    </h3>
                    
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {post.excerpt}
                    </p>
                    
                    <Link 
                      href={`/blog/${post.slug}`}
                      className="text-purple-600 font-medium hover:text-purple-700 transition-colors inline-flex items-center gap-1"
                    >
                      Read More <ArrowRight className="w-4 h-4" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* All Posts */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              All Articles
            </h2>
            
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-12">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    category === 'All Posts' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map((post) => (
                <Card key={post.slug} className="shadow-lg hover:shadow-xl transition-shadow">
                  <div className="relative">
                    <Image
                      src={post.image}
                      alt={post.title}
                      width={400}
                      height={200}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        {post.category}
                      </span>
                    </div>
                  </div>
                  
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(post.publishDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {post.readTime}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-3 hover:text-purple-600 transition-colors">
                      <Link href={`/blog/${post.slug}`}>
                        {post.title}
                      </Link>
                    </h3>
                    
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {post.excerpt}
                    </p>
                    
                    <Link 
                      href={`/blog/${post.slug}`}
                      className="text-purple-600 font-medium hover:text-purple-700 transition-colors inline-flex items-center gap-1"
                    >
                      Read More <ArrowRight className="w-4 h-4" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-12 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Stay Updated with Twitter AI Tips
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Get weekly insights on Twitter growth, AI tools, and social media strategies delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500"
              />
              <Button className="bg-white text-purple-600 hover:bg-gray-100">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}