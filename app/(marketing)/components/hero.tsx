import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';
import Image from 'next/image';

export function Hero() {
  return (
    <section className="relative py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/reply_guy_logo.png"
              alt="ReplyGuy Logo"
              width={80}
              height={80}
              className="mx-auto object-contain"
              priority
            />
          </div>
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            AI-Powered Reply Generation
          </div>
          
          {/* Main heading */}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Be the <span className="gradient-text">Reply Guy</span> Everyone Loves
          </h1>
          
          {/* Subheading */}
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Create authentic, engaging replies to tweets in seconds. Build your audience, 
            increase engagement, and save hours every day with AI that sounds genuinely human.
          </p>
          
          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/auth/signup">
              <Button size="lg" className="gap-2">
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline">
                See How It Works
              </Button>
            </Link>
          </div>
          
          {/* Trust indicators */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>10 free replies per month</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}