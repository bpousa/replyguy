import Link from 'next/link';
import { Footer } from '@/app/components/footer';

export default function TermsOfService() {
  return (
    <>
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <Link href="/" className="text-purple-600 hover:text-purple-700 mb-8 inline-block">
            ← Back to ReplyGuy
          </Link>
          
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Effective Date:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
              <p>
                By accessing or using ReplyGuy (&ldquo;Service&rdquo;), operated by Appendment LLC (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), 
                you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you disagree with any part of these terms, 
                you do not have permission to access the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p>
                ReplyGuy is an AI-powered tool that helps users generate authentic, human-like replies to social media posts, 
                specifically Twitter/X. The Service uses various AI models to analyze content and generate appropriate responses 
                based on user input and preferences.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
              <h3 className="text-xl font-semibold mb-2">Account Creation</h3>
              <p>To use ReplyGuy, you must:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Create an account with accurate and complete information</li>
                <li>Be at least 13 years of age</li>
                <li>Maintain the security of your account credentials</li>
                <li>Promptly notify us of any unauthorized use</li>
              </ul>
              <p>You are responsible for all activities that occur under your account.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
              <p>You agree NOT to use ReplyGuy to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Violate any laws or regulations</li>
                <li>Harass, abuse, or harm others</li>
                <li>Spread misinformation or engage in deceptive practices</li>
                <li>Infringe on intellectual property rights</li>
                <li>Generate spam or unsolicited content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use the Service for any illegal or unauthorized purpose</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Subscription and Payment</h2>
              <h3 className="text-xl font-semibold mb-2">Billing</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Subscription fees are billed in advance on a monthly or annual basis</li>
                <li>All payments are processed through Stripe</li>
                <li>Prices are subject to change with 30 days notice</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2">Refunds</h3>
              <p>
                We offer a 7-day money-back guarantee for first-time subscribers. After this period, 
                payments are non-refundable except as required by law.
              </p>

              <h3 className="text-xl font-semibold mb-2">Cancellation</h3>
              <p>
                You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Content and Intellectual Property</h2>
              <h3 className="text-xl font-semibold mb-2">Your Content</h3>
              <p>
                You retain ownership of content you input into ReplyGuy. By using the Service, you grant us a license to 
                process your content solely for the purpose of providing the Service.
              </p>

              <h3 className="text-xl font-semibold mb-2">Generated Content</h3>
              <p>
                Content generated by ReplyGuy is provided for your use. You are responsible for reviewing and approving 
                any generated content before using it on social media platforms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Disclaimers</h2>
              <p>THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>MERCHANTABILITY</li>
                <li>FITNESS FOR A PARTICULAR PURPOSE</li>
                <li>NON-INFRINGEMENT</li>
                <li>ACCURACY OR RELIABILITY OF CONTENT</li>
              </ul>
              <p>
                We do not guarantee that the Service will be uninterrupted, secure, or error-free.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, APPENDMENT LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY 
                OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless Appendment LLC, its officers, directors, employees, and agents 
                from any claims, damages, losses, liabilities, and expenses arising from your use of the Service or 
                violation of these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Modifications to Service</h2>
              <p>
                We reserve the right to modify or discontinue the Service at any time, with or without notice. We shall 
                not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the State of Florida, 
                United States, without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
              <p>For questions about these Terms, please contact us at:</p>
              <div className="bg-gray-100 p-4 rounded-lg mt-4">
                <p className="font-semibold">Appendment LLC</p>
                <p>123 Main St.</p>
                <p>Tarpon Springs, FL 34689</p>
                <p>Email: legal@appendment.com</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}