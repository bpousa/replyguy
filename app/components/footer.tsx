import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { 
  Facebook, 
  Twitter, 
  Youtube, 
  Instagram, 
  Linkedin 
} from 'lucide-react';

const socialLinks = [
  { 
    name: 'Facebook', 
    href: 'https://facebook.com/appendment', 
    icon: Facebook 
  },
  { 
    name: 'X (Twitter)', 
    href: 'https://x.com/appendment', 
    icon: Twitter 
  },
  { 
    name: 'YouTube', 
    href: 'https://youtube.com/@appendment', 
    icon: Youtube 
  },
  { 
    name: 'Instagram', 
    href: 'https://instagram.com/appendmentapp', 
    icon: Instagram 
  },
  { 
    name: 'LinkedIn', 
    href: 'https://www.linkedin.com/company/appendment/', 
    icon: Linkedin 
  },
];

const footerLinks = {
  product: [
    { name: 'Features', href: '/#features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'How it Works', href: '/#features' },
  ],
  company: [
    { name: 'About', href: 'https://appendment.com' },
    { name: 'Contact', href: 'https://appendment.com/contact' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Disclaimer', href: '/disclaimer' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand and Description */}
          <div className="col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <span className="text-xl font-bold">ReplyGuy</span>
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              AI-powered replies that actually sound human. Build your X presence with authentic engagement.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              A product by Appendment LLC<br />
              123 Main St.<br />
              Tarpon Springs, FL 34689
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Product
            </h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Company
            </h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Legal
            </h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Social Links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>

            {/* Copyright */}
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              © {new Date().getFullYear()} Appendment LLC. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}