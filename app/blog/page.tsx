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
    slug: '10-twitter-reply-templates-that-actually-get-engagement',
    title: '10 Twitter Reply Templates That Actually Get Engagement',
    excerpt: 'Copy-paste these proven templates to boost your Twitter engagement by 300%. Each template includes psychology triggers, timing tips, and real examples.',
    category: 'Templates',
    readTime: '8 min read',
    publishDate: '2024-01-15',
    image: '/feature-showcase640x400.png',
    featured: true,
  },
  {
    slug: 'how-to-write-twitter-replies-that-dont-sound-like-ai',
    title: 'How to Write Twitter Replies That Don\'t Sound Like AI',
    excerpt: 'Master the subtle art of human-like writing. Learn 15 proven techniques to make AI-generated replies sound authentically human and bypass detection tools.',
    category: 'AI Writing',
    readTime: '12 min read',
    publishDate: '2024-01-15',
    image: '/generated-reply1280x800.png',
    featured: true,
  },
  {
    slug: 'building-personal-brand-twitter-reply-strategy',
    title: 'Building Personal Brand on Twitter: The Reply Strategy',
    excerpt: 'The complete framework for building a powerful personal brand through strategic Twitter replies. Used by 10,000+ creators to build authority and attract opportunities.',
    category: 'Personal Branding',
    readTime: '18 min read',
    publishDate: '2024-01-15',
    image: '/main-interface12880x800.png',
    featured: true,
  },
  {
    slug: 'ai-writing-tools-vs-human-writers-future-social-media',
    title: 'AI Writing Tools vs Human Writers: The Future of Social Media',
    excerpt: 'The ultimate analysis of AI vs human writing for social media. Discover which approach wins, when to use each, and how to combine both for maximum impact.',
    category: 'AI & Technology',
    readTime: '15 min read',
    publishDate: '2024-01-15',
    image: '/advanced-options640x400.png',
    featured: false,
  },
  {
    slug: 'twitter-engagement-strategy-beyond-just-replying',
    title: 'Twitter Engagement Strategy: Beyond Just Replying',
    excerpt: 'Build a comprehensive Twitter presence that drives real business results. The 5-pillar framework used by successful creators and brands.',
    category: 'Strategy',
    readTime: '16 min read',
    publishDate: '2024-01-15',
    image: '/feature-showcase640x400.png',
    featured: false,
  },
  {
    slug: 'chrome-extensions-every-twitter-marketer-needs',
    title: 'Chrome Extensions Every Twitter Marketer Needs in 2024',
    excerpt: '15 essential Chrome extensions that supercharge your Twitter marketing workflow. Detailed reviews, pros/cons, and optimization tips included.',
    category: 'Tools & Extensions',
    readTime: '14 min read',
    publishDate: '2024-01-15',
    image: '/main-interface12880x800.png',
    featured: false,
  },
];

const categories = [
  'All Posts',
  'Templates',
  'AI Writing',
  'Personal Branding',
  'AI & Technology',
  'Strategy',
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