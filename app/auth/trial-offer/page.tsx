'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/app/lib/auth';
import { Button } from '@/app/components/ui/button';
import { Loader2, CheckCircle, Zap, TrendingUp, Chrome, Users, Star, Timer, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TrialOfferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [currentOffer, setCurrentOffer] = useState<'pro' | 'basic'>('pro');
  const [userId, setUserId] = useState<string | null>(null);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const supabase = createBrowserClient();

  useEffect(() => {
    const checkAuthAndToken = async () => {
      // First check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      setUserId(session.user.id);
      
      // Check if there's a token in the URL
      const token = searchParams.get('token');
      
      if (token) {
        // Validate token
        try {
          const response = await fetch(`/api/trial-offer/generate-token?token=${token}`);
          const data = await response.json();
          
          if (data.valid) {
            console.log('[trial-offer] Valid token provided');
            setTokenValid(true);
            
            // Mark token as used
            await fetch('/api/trial-offer/mark-used', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token })
            });
          } else {
            console.log('[trial-offer] Invalid or expired token:', data);
            toast.error(data.expired ? 'Trial offer link has expired' : 'Invalid trial offer link');
            router.push('/dashboard');
            return;
          }
        } catch (error) {
          console.error('[trial-offer] Error validating token:', error);
          toast.error('Error validating trial offer');
          router.push('/dashboard');
          return;
        }
      } else {
        // No token - check if user is eligible (within 7 days of signup)
        const { data: userData } = await supabase
          .from('users')
          .select('created_at, has_seen_trial_offer')
          .eq('id', session.user.id)
          .single();
          
        if (userData) {
          const userCreatedAt = new Date(userData.created_at);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          if (userCreatedAt < sevenDaysAgo) {
            console.log('[trial-offer] User outside 7-day window');
            toast.error('Trial offer period has expired');
            router.push('/dashboard');
            return;
          }
          
          // Check if already seen (only enforce if no token)
          if (userData.has_seen_trial_offer) {
            console.log('[trial-offer] User has already seen offer');
            toast.error('You have already viewed the trial offer');
            router.push('/dashboard');
            return;
          }
        }
      }
      
      // Mark that user has seen the offer (whether via token or direct access)
      try {
        const { error } = await supabase
          .from('users')
          .update({ 
            has_seen_trial_offer: true,
            trial_offer_shown_at: new Date().toISOString()
          })
          .eq('id', session.user.id);
        
        if (error) {
          console.error('[trial-offer] Error marking offer as seen:', error);
        }
      } catch (error) {
        console.error('[trial-offer] Unexpected error marking offer as seen:', error);
      }
      
      setValidatingToken(false);
    };
    
    checkAuthAndToken();
  }, [router, supabase, searchParams]);

  const handleAcceptOffer = async (plan: 'pro' | 'basic') => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Get the trial price ID (LIVE MODE)
      const priceId = plan === 'pro' 
        ? 'price_1Rlhbg08qNQAUd0lmrEzmJWe' // X Pro $1 trial (LIVE)
        : 'price_1Rlhbf08qNQAUd0lbUZR3RwW'; // X Basic $1 trial (LIVE)
      
      // Create checkout session
      const response = await fetch('/api/stripe/create-trial-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({ 
          priceId,
          plan: plan === 'pro' ? 'professional' : 'growth'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Checkout error:', data);
        throw new Error(data.error || 'Failed to create checkout session');
      }
      
      if (data.url) {
        // Update user record
        await supabase
          .from('users')
          .update({ 
            trial_offer_accepted: `${plan === 'pro' ? 'professional' : 'growth'}_trial`
          })
          .eq('id', userId);
        
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleDeclineOffer = async () => {
    if (currentOffer === 'pro') {
      // Show basic offer
      setCurrentOffer('basic');
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Both offers declined, go to dashboard
      router.push('/dashboard');
    }
  };

  // Show loading state while validating token
  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Validating Your Offer...
          </h2>
          <p className="text-gray-600">Please wait a moment</p>
        </div>
      </div>
    );
  }

  if (currentOffer === 'pro') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            {/* Urgency Banner */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg p-4 mb-8 flex items-center justify-center gap-2">
              <Timer className="w-5 h-5" />
              <span className="font-semibold">Limited Time: New User Special Offer</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-center">
              🚀 Your X Growth Starts Now!
            </h1>

            {/* Social Proof */}
            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              </div>
              <span className="text-gray-600">Join 1,000+ growing X accounts</span>
            </div>

            {/* Transformation Story */}
            <div className="prose prose-lg max-w-none mb-8">
              <p className="text-gray-700 leading-relaxed">
                Remember when you had <strong>&lt;100 followers</strong> and your tweets got <strong>2 likes max</strong>?
              </p>
              
              <p className="text-gray-900 font-semibold text-xl mt-6 mb-4">
                Imagine 6 months from now:
              </p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>10,000+ engaged followers</strong> hanging on your every word</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>100+ replies</strong> on your best tweets</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <span><strong>DMs from people</strong> wanting to work with you</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Your ideas <strong>spreading like wildfire</strong></span>
                </li>
              </ul>
            </div>

            {/* The Secret */}
            <div className="bg-purple-50 rounded-xl p-6 mb-8">
              <p className="text-lg font-semibold text-purple-900 mb-2">
                The secret? Consistency + Quality replies that spark conversations.
              </p>
              <p className="text-purple-700">
                That&apos;s exactly what ReplyGuy Pro delivers:
              </p>
              <p className="text-sm text-purple-600 mt-2 italic">
                (Want data-backed replies? Upgrade to Business later for Perplexity research!)
              </p>
            </div>

            {/* Features with Chrome Extension Highlight */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <Zap className="w-6 h-6 text-purple-600 flex-shrink-0" />
                <div>
                  <strong>500 AI-powered replies/month</strong> that sound 100% human
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-6 h-6 text-purple-600 flex-shrink-0" />
                <div>
                  <strong>Write Like Me™</strong> - AI learns YOUR unique voice
                </div>
              </div>
              <div className="flex items-start gap-3 bg-yellow-50 p-4 rounded-lg">
                <Chrome className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                <div>
                  <strong className="text-yellow-900">Chrome Extension</strong>
                  <span className="text-yellow-800"> - Reply directly from X without tab switching!</span>
                  <p className="text-sm text-yellow-700 mt-1">Your secret weapon for 100X faster engagement</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="w-6 h-6 text-purple-600 flex-shrink-0" />
                <div>
                  <strong>Medium-length replies</strong> for perfect engagement balance
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Star className="w-6 h-6 text-purple-600 flex-shrink-0" />
                <div>
                  <strong>50 memes/month</strong> to boost viral potential
                </div>
              </div>
            </div>

            {/* Price Anchor */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8 text-center">
              <p className="text-gray-600 mb-2">Normally $49/month</p>
              <p className="text-4xl font-bold text-gray-900 mb-2">
                Today? Just <span className="text-green-600">$1</span> for 30 days
              </p>
              <p className="text-lg text-purple-600 font-semibold">
                That&apos;s $48 OFF your first month
              </p>
              <p className="text-sm text-gray-600 mt-2">Cancel anytime in your portal</p>
            </div>

            {/* Risk Reversal */}
            <p className="text-center text-gray-700 mb-8 italic">
              But why would you? Your future audience is waiting.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => handleAcceptOffer('pro')}
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Start Growing for $1 →'
                )}
              </Button>
              <Button
                onClick={handleDeclineOffer}
                disabled={loading}
                variant="outline"
                className="px-8 py-6 text-lg"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Basic offer (shown after Pro is declined)
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Wait Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg p-4 mb-8 text-center">
            <span className="font-semibold text-lg">✋ Wait! How about starting smaller?</span>
          </div>

          {/* Empathy */}
          <p className="text-xl text-gray-700 mb-6 text-center">
            I get it. $49 might feel like a lot right now.
          </p>

          {/* Alternative Offer */}
          <div className="bg-blue-50 rounded-xl p-6 mb-8">
            <p className="text-lg font-semibold text-blue-900 mb-4">
              But what if you could still:
            </p>
            
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>Generate <strong>300 brilliant replies/month</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>Create <strong>10 viral memes</strong></span>
              </li>
              <li className="flex items-start gap-3 bg-yellow-50 p-3 rounded-lg">
                <Chrome className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <span className="text-yellow-900">Use our <strong>Chrome Extension</strong> for instant replies</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>Match your <strong>writing style perfectly</strong></span>
              </li>
            </ul>
          </div>

          {/* Price Point */}
          <div className="text-center mb-8">
            <p className="text-3xl font-bold text-gray-900 mb-2">
              All for just <span className="text-green-600">$1</span> for your first 30 days?
            </p>
            <p className="text-gray-600">
              (Then only $19/month - less than a Netflix subscription)
            </p>
          </div>

          {/* Urgency */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-8">
            <p className="text-orange-900 font-semibold text-center">
              ⚡ Your competition is using AI to grow. Don&apos;t get left behind.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => handleAcceptOffer('basic')}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-6 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Yes, Give Me Growth for $1 →'
              )}
            </Button>
            <Button
              onClick={handleDeclineOffer}
              disabled={loading}
              variant="ghost"
              className="px-8 py-6 text-lg text-gray-600 hover:text-gray-800"
            >
              No Thanks, I&apos;ll Stay Small
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}