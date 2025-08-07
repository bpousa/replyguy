'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How does ReplyGuy make replies sound like me?",
      answer: "Our proprietary Write Like Me™ technology analyzes your existing tweets to understand your unique writing style, tone, vocabulary, and personality. The AI learns patterns like how you structure sentences, your humor style, preferred phrases, and emotional expressions. This creates a personalized model that generates replies authentically matching your voice."
    },
    {
      question: "Will people know my replies are AI-generated?",
      answer: "No. Our anti-AI detection algorithms are specifically designed to avoid common AI patterns and maintain natural language flow. The replies sound authentically human because they're based on your actual writing style. Many users report that even close friends can't tell the difference between their AI-generated replies and manually written ones."
    },
    {
      question: "Do I really get 10 free replies every month?",
      answer: "Yes! Every account gets 10 completely free AI-generated replies monthly with no credit card required. This includes access to basic reply types and our Chrome extension. You can upgrade anytime for more replies, advanced features like Write Like Me™ training, and longer response options."
    },
    {
      question: "How fast can I generate replies?",
      answer: "Most replies generate in 10 seconds or less. Our system analyzes the original tweet, considers context, selects the best reply type, and generates multiple options for you to choose from. You can generate and post replies faster than typing them manually."
    },
    {
      question: "What's the Chrome extension and how does it work?",
      answer: "Our Chrome extension integrates directly into X (Twitter), allowing you to generate replies without leaving the platform. Click on any tweet, select 'Generate Reply', and choose from AI-generated options that match your voice. It's seamless and works with your existing Twitter workflow."
    },
    {
      question: "Is my Twitter data safe and secure?",
      answer: "Absolutely. We use industry-standard OAuth authentication (no passwords stored) and only access public tweet data needed for the AI to learn your writing style. We never post anything without your explicit approval, and your data is encrypted and stored securely. You maintain full control over your account."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel anytime with no questions asked. If you&apos;re on the free plan, there&apos;s nothing to cancel. For paid plans, you&apos;ll retain access through your current billing period, and there are no cancellation fees or penalties."
    },
    {
      question: "What types of replies can ReplyGuy generate?",
      answer: "ReplyGuy has 50+ reply types including agreements, disagreements, questions, jokes, supportive responses, constructive feedback, and more. The AI automatically selects the most appropriate type based on the original tweet's context, sentiment, and conversational flow."
    },
    {
      question: "How is this different from other AI writing tools?",
      answer: "Unlike generic AI writers, ReplyGuy is built specifically for Twitter engagement. Our Write Like Me™ technology creates personalized voice models, our anti-AI detection ensures authentic-sounding responses, and our Chrome extension integrates directly into your Twitter workflow. We focus on authentic engagement, not just content generation."
    },
    {
      question: "What happens if I don't like a generated reply?",
      answer: "You always get multiple reply options to choose from, and you can regenerate new options anytime. Every reply goes through your approval before posting - the AI never posts automatically. You're in complete control of what gets shared on your account."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <HelpCircle className="w-4 h-4" />
              Got Questions?
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need to know about ReplyGuy and how it works.
            </p>
          </div>

          {/* FAQ items */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-8 py-6 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-inset"
                >
                  <h3 className="text-lg font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </h3>
                  <div className="flex-shrink-0">
                    {openIndex === index ? (
                      <ChevronUp className="w-5 h-5 text-purple-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>
                
                {openIndex === index && (
                  <div className="px-8 pb-6">
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8 border border-purple-100">
              <h3 className="text-2xl font-bold mb-4">Still Have Questions?</h3>
              <p className="text-gray-600 mb-6">
                Our team is here to help! Reach out anytime and we&apos;ll get back to you within 24 hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="mailto:support@replyguy.com" 
                  className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Email Support
                </a>
                <a 
                  href="/contact" 
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-purple-600 font-medium rounded-lg border border-purple-200 hover:bg-purple-50 transition-colors"
                >
                  Contact Form
                </a>
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 text-center">
            <div className="flex flex-wrap gap-6 justify-center items-center text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>24/7 support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}