import Link from 'next/link';
import { Footer } from '@/app/components/footer';

export default function PrivacyPolicy() {
  return (
    <>
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <Link href="/" className="text-purple-600 hover:text-purple-700 mb-8 inline-block">
            ← Back to ReplyGuy
          </Link>
          
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Effective Date:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p>
                Welcome to ReplyGuy (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;), operated by Appendment LLC. 
                We are committed to protecting your personal information and your right to privacy. This Privacy Policy 
                explains how we collect, use, disclose, and safeguard your information when you use our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
              <h3 className="text-xl font-semibold mb-2">Personal Information</h3>
              <p>We collect personal information that you provide to us, including:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Email address</li>
                <li>Name (if provided)</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Usage data and preferences</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2">Automatically Collected Information</h3>
              <p>When you use ReplyGuy, we automatically collect:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Log data (IP address, browser type, operating system)</li>
                <li>Usage information (features used, time spent, interactions)</li>
                <li>Device information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Provide, operate, and maintain our service</li>
                <li>Process your transactions and manage your subscription</li>
                <li>Send you updates, marketing communications, and other information</li>
                <li>Respond to your comments, questions, and customer service requests</li>
                <li>Monitor and analyze usage patterns to improve our service</li>
                <li>Detect, prevent, and address technical issues</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Data Sharing and Disclosure</h2>
              <p>We may share your information in the following situations:</p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf</li>
                <li><strong>Legal Requirements:</strong> If required by law or in response to valid legal requests</li>
                <li><strong>Business Transfers:</strong> In connection with any merger, sale, or acquisition</li>
                <li><strong>With Your Consent:</strong> When you give us explicit permission to share your information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational security measures to protect your personal information. 
                However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot 
                guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Chrome Extension Privacy</h2>
              <h3 className="text-xl font-semibold mb-2">Browser Extension Data Collection</h3>
              <p>When you use the ReplyGuy Chrome Extension, we collect and process:</p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Browser Storage Data:</strong> We use Chrome&apos;s local storage API to save your authentication tokens and user preferences. This data is stored locally on your device and is not transmitted to our servers unless necessary for authentication.</li>
                <li><strong>Cookie Data:</strong> The extension accesses cookies solely for authentication purposes with replyguy.appendment.com. We do not track or access cookies from other websites.</li>
                <li><strong>Active Tab Information:</strong> When you click the ReplyGuy button on a tweet, the extension reads only the content of that specific tweet to generate a reply. We do not continuously monitor or collect your browsing data.</li>
                <li><strong>Host Permissions:</strong> The extension requires access to twitter.com and x.com domains solely to inject the ReplyGuy interface and read tweet content when you explicitly request it.</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2">Extension Data Storage and Security</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Local Storage:</strong> User preferences, authentication tokens, and temporary data are stored using Chrome&apos;s secure storage APIs</li>
                <li><strong>Session Storage:</strong> Temporary session data is cleared when you close your browser</li>
                <li><strong>No Background Tracking:</strong> The extension only activates when you explicitly click the ReplyGuy button</li>
                <li><strong>Minimal Permissions:</strong> We only request the minimum permissions necessary for functionality</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2">Extension Data Transmission</h3>
              <p>The Chrome extension transmits data to our servers only when:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>You authenticate your ReplyGuy account</li>
                <li>You generate a reply (tweet content and your input are sent for processing)</li>
                <li>You request real-time research (if enabled)</li>
                <li>Usage statistics are updated (reply count only, no content)</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2">Extension User Control</h3>
              <p>For the Chrome Extension specifically:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>You can clear all extension data by removing the extension from Chrome</li>
                <li>Local storage can be cleared through Chrome&apos;s settings</li>
                <li>You can revoke the extension&apos;s permissions at any time through Chrome&apos;s extension management</li>
                <li>Uninstalling the extension immediately removes all locally stored data</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2">Cookie Policy for Chrome Extension</h3>
              <p>The ReplyGuy Chrome Extension uses cookies in the following limited ways:</p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Authentication Cookies:</strong> We access cookies from replyguy.appendment.com domain only to maintain your login session</li>
                <li><strong>No Third-Party Cookie Access:</strong> The extension does not read or modify cookies from any other websites</li>
                <li><strong>No Tracking Cookies:</strong> We do not use cookies for tracking or advertising purposes</li>
                <li><strong>Session Management:</strong> Cookies are used solely to keep you logged in while using the extension</li>
              </ul>
              <p>You can manage cookie preferences through your Chrome browser settings. Disabling cookies for replyguy.appendment.com will require you to log in each time you use the extension.</p>

              <h3 className="text-xl font-semibold mb-2">Chrome Web Store Compliance</h3>
              <p>This extension complies with Chrome Web Store policies by:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Using permissions only for stated functionality</li>
                <li>Not collecting user data beyond what&apos;s necessary for the service</li>
                <li>Providing clear disclosure of all data practices</li>
                <li>Implementing secure data handling practices</li>
                <li>Respecting user privacy choices</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Third-Party Services</h2>
              <p>Our service integrates with:</p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Stripe:</strong> For payment processing</li>
                <li><strong>Supabase:</strong> For authentication and data storage</li>
                <li><strong>AI Providers:</strong> OpenAI, Anthropic, and Perplexity for content generation</li>
              </ul>
              <p>
                These services have their own privacy policies, and we encourage you to review them.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to processing of your data</li>
                <li>Data portability</li>
                <li>Withdraw consent</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Children&apos;s Privacy</h2>
              <p>
                ReplyGuy is not intended for use by children under 13 years of age. We do not knowingly collect 
                personal information from children under 13.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
                the new Privacy Policy on this page and updating the &ldquo;Effective Date&rdquo; above.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
              <p>If you have questions about this Privacy Policy, please contact us at:</p>
              <div className="bg-gray-100 p-4 rounded-lg mt-4">
                <p className="font-semibold">Appendment LLC</p>
                <p>123 Main St.</p>
                <p>Tarpon Springs, FL 34689</p>
                <p>Email: privacy@appendment.com</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}