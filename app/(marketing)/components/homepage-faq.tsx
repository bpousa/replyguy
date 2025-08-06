'use client';

import { Card, CardContent } from '@/app/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "How does the AI reply generator work?",
    answer: "ReplyGuy uses advanced AI models including GPT-3.5 and Claude to analyze tweets and generate authentic, human-like replies. Our system classifies the best reply type, optionally researches facts, and creates responses that match your writing style with our Write Like Me™ feature."
  },
  {
    question: "Is the Chrome extension free to use?",
    answer: "Yes! The Chrome extension is completely free to install and use. You get 10 free AI-generated replies per month without any credit card required. For more replies and advanced features, you can upgrade to our paid plans starting at $19/month."
  },
  {
    question: "How does Write Like Me™ personalization work?",
    answer: "Write Like Me™ analyzes your existing tweets to understand your unique writing style, tone, and voice. The AI then generates replies that sound authentically like you, maintaining your personality while crafting engaging responses. This helps you maintain consistency and authenticity across all your Twitter interactions."
  },
  {
    question: "Can AI-generated replies be detected?",
    answer: "ReplyGuy uses advanced anti-AI detection technology to ensure your replies sound genuinely human. Our system avoids common AI patterns and phrases, creates natural variations, and maintains authentic conversational flow that&apos;s indistinguishable from human-written content."
  },
  {
    question: "What makes ReplyGuy better than other Twitter tools?",
    answer: "Unlike generic Twitter automation tools, ReplyGuy focuses specifically on creating authentic, human-like replies. We offer unique features like Write Like Me™ personalization, Chrome extension integration, real-time fact-checking, and anti-AI detection technology that other tools don&apos;t provide."
  },
  {
    question: "Is there a free trial available?",
    answer: "Absolutely! You get 10 free AI-generated replies every month with no credit card required. This lets you test our AI reply generator and see the quality of responses before deciding to upgrade to a paid plan for unlimited usage."
  },
  {
    question: "How quickly can I start generating replies?",
    answer: "You can start generating replies immediately! Simply sign up for your free account, install our Chrome extension (optional), and begin creating authentic Twitter replies in seconds. The setup process takes less than 2 minutes."
  },
  {
    question: "Does ReplyGuy work with X (formerly Twitter)?",
    answer: "Yes! ReplyGuy works perfectly with X (formerly Twitter). Our Chrome extension integrates directly into the X interface, and our web app supports all X posts and replies. We stay updated with all platform changes to ensure seamless functionality."
  }
];

function FAQAccordionItem({ item, isOpen, onClick }: { 
  item: FAQItem; 
  isOpen: boolean; 
  onClick: () => void; 
}) {
  return (
    <Card className="border border-gray-200 hover:border-purple-300 transition-colors">
      <button
        className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset"
        onClick={onClick}
        aria-expanded={isOpen}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 pr-4">
            {item.question}
          </h3>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-purple-600 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
          )}
        </div>
      </button>
      {isOpen && (
        <CardContent className="px-6 pb-6 pt-0">
          <p className="text-gray-600 leading-relaxed">
            {item.answer}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

export function HomepageFAQ() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0])); // First item open by default

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  // Schema markup for FAQ
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  return (
    <section className="py-20 bg-gray-50" id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about ReplyGuy&apos;s AI-powered Twitter reply generator
            </p>
          </div>

          {/* FAQ items */}
          <div className="space-y-4">
            {faqData.map((item, index) => (
              <FAQAccordionItem
                key={index}
                item={item}
                isOpen={openItems.has(index)}
                onClick={() => toggleItem(index)}
              />
            ))}
          </div>

          {/* CTA section */}
          <div className="text-center mt-12 p-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Start Generating Better Replies?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Join thousands of users who are already creating more engaging Twitter replies with AI. 
              Get started with 10 free replies - no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/auth/signup"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
              >
                Start Free Trial
              </a>
              <a
                href="https://chromewebstore.google.com/detail/reply-guy-for-x-twitter/ggdieefnnmcgnmonbkngnmonoifdgmje"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Install Chrome Extension
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}