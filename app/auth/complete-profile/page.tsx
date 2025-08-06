'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/app/lib/auth';
import { toast } from 'react-hot-toast';
import { Button } from '@/app/components/ui/button';
import { Gift, UserPlus, Phone, User, ArrowRight } from 'lucide-react';
import { Logo } from '@/app/components/logo';

export default function CompleteProfilePage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          console.log('[complete-profile] No authenticated user, redirecting to login');
          router.replace('/auth/login');
          return;
        }

        // Check if this is an OAuth user (specifically X/Twitter)
        const isOAuthUser = user.app_metadata?.provider && user.app_metadata.provider !== 'email';
        const isXUser = user.app_metadata?.provider === 'twitter';
        
        if (!isOAuthUser || !isXUser) {
          console.log('[complete-profile] Not an X OAuth user, redirecting to dashboard');
          router.replace('/dashboard');
          return;
        }

        console.log('[complete-profile] X OAuth user detected:', {
          provider: user.app_metadata?.provider,
          email: user.email,
          hasName: !!user.user_metadata?.full_name
        });

        setUser(user);
        // Pre-fill name from OAuth data
        setFullName(user.user_metadata?.full_name || user.user_metadata?.name || '');
        setIsLoading(false);
        
      } catch (error) {
        console.error('[complete-profile] Error checking user:', error);
        router.replace('/auth/login');
      }
    };

    checkUserAndRedirect();
  }, [router, supabase]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format as US phone number
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else if (phoneNumber.length <= 10) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('[complete-profile] Submitting profile completion:', {
        fullName: fullName.trim(),
        phone: phone.trim(),
        smsOptIn,
        isXUser: true
      });

      const response = await fetch('/api/user/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          smsOptIn: phone.trim() ? smsOptIn : false
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Profile completion failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('[complete-profile] Profile completion successful:', result);
      
      toast.success('Profile completed successfully!');
      
      // Redirect to trial offer page
      router.push('/auth/trial-offer');
      
    } catch (error: any) {
      console.error('[complete-profile] Profile completion error:', error);
      toast.error(error.message || 'Failed to complete profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    console.log('[complete-profile] Profile completion skipped');
    toast.success('You can complete your profile later in settings');
    // Redirect to trial offer page even if skipped
    router.push('/auth/trial-offer');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Logo imageClassName="w-12 h-12 mx-auto mb-4" textClassName="text-2xl" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-8 text-center">
          <Logo href="/" imageClassName="w-10 h-10 mx-auto mb-4" textClassName="text-xl text-white" />
          
          <div className="flex items-center justify-center gap-3 mb-3">
            <Gift className="h-8 w-8 text-yellow-300" />
            <h1 className="text-2xl font-bold">Complete Your Signup</h1>
          </div>
          <p className="text-purple-100 text-sm">
            Just one more step to unlock your X growth potential
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="mb-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                What you&apos;ll get:
              </h3>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>🚀 Exclusive X growth tips via SMS</li>
                <li>📈 Viral content formulas from top creators</li>
                <li>⚡ Early access to new features</li>
                <li>🎯 Personalized recommendations</li>
              </ul>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                placeholder="Your full name"
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="inline h-4 w-4 mr-1" />
                Phone Number <span className="text-gray-500 font-normal">(optional but recommended)</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                placeholder="(555) 123-4567"
              />
              
              {/* SMS Opt-in */}
              {phone && (
                <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={smsOptIn}
                      onChange={(e) => setSmsOptIn(e.target.checked)}
                      className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">Yes, send me exclusive growth tips! 🎯</span>
                      <p className="text-gray-600 mt-1">
                        Get insider strategies from top X creators. 2-3 texts per month, unsubscribe anytime.
                      </p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Current Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={user.email || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-3 text-base font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Completing...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    Complete Signup
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                className="w-full py-3 text-base"
                disabled={isSubmitting}
              >
                Skip for now
              </Button>
            </div>
          </form>

          <p className="text-xs text-gray-500 text-center mt-6">
            You can always update this information later in your settings.
          </p>
        </div>
      </div>
    </div>
  );
}