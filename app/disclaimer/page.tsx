import Link from 'next/link';
import { Footer } from '@/app/components/footer';

export default function Disclaimer() {
  return (
    <>
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <Link href="/" className="text-purple-600 hover:text-purple-700 mb-8 inline-block">
            ← Back to ReplyGuy
          </Link>
          
          <h1 className="text-4xl font-bold mb-8">Disclaimer</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. General Information</h2>
              <p>
                The information provided by ReplyGuy (&ldquo;Service&rdquo;) operated by Appendment LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) 
                is for general informational purposes only. All information on the Service is provided in good faith, 
                however, we make no representation or warranty of any kind, express or implied, regarding the accuracy, 
                adequacy, validity, reliability, availability, or completeness of any information on the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. AI-Generated Content Disclaimer</h2>
              <p>
                ReplyGuy uses artificial intelligence to generate content. Please be aware that:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>AI-generated content may contain errors, inaccuracies, or inappropriate material</li>
                <li>You are solely responsible for reviewing and approving any generated content before use</li>
                <li>We do not guarantee the accuracy, relevance, or appropriateness of generated content</li>
                <li>Generated content should not be relied upon for critical decisions without human review</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. External Links Disclaimer</h2>
              <p>
                The Service may contain links to external websites that are not provided or maintained by us. 
                Please note that we do not guarantee the accuracy, relevance, timeliness, or completeness of 
                any information on these external websites.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Professional Disclaimer</h2>
              <p>
                The Service does not provide professional advice of any kind, including but not limited to:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Legal advice</li>
                <li>Financial or investment advice</li>
                <li>Medical or health advice</li>
                <li>Professional marketing or business consulting</li>
              </ul>
              <p>
                Always seek the advice of qualified professionals for specific questions or concerns.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Fair Use Disclaimer</h2>
              <p>
                Any content analysis or processing performed by ReplyGuy is intended for fair use purposes only. 
                Users are responsible for ensuring their use of the Service complies with applicable copyright 
                and intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Errors and Omissions Disclaimer</h2>
              <p>
                While we strive to provide accurate and up-to-date information, ReplyGuy may contain errors, 
                omissions, or outdated information. We reserve the right to correct any errors, inaccuracies, 
                or omissions and to change or update information at any time without prior notice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Results Disclaimer</h2>
              <p>
                We make no guarantees regarding:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Social media engagement or growth</li>
                <li>Success of generated content</li>
                <li>Specific outcomes from using the Service</li>
                <li>Performance on social media platforms</li>
              </ul>
              <p>
                Individual results may vary based on numerous factors outside our control.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Third-Party Services</h2>
              <p>
                ReplyGuy integrates with third-party services including OpenAI, Anthropic, Perplexity, and social 
                media platforms. We are not responsible for the policies, practices, or content of these third-party services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
              <p>
                Under no circumstance shall we have any liability to you for any loss or damage of any kind 
                incurred as a result of the use of the Service or reliance on any information provided on the Service. 
                Your use of the Service and your reliance on any information on the Service is solely at your own risk.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
              <p>If you have any questions about this Disclaimer, please contact us at:</p>
              <div className="bg-gray-100 p-4 rounded-lg mt-4">
                <p className="font-semibold">Appendment LLC</p>
                <p>123 Main St.</p>
                <p>Tarpon Springs, FL 34689</p>
                <p>Email: support@appendment.com</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}