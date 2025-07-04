'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/app/lib/auth';
import { useAuth } from '@/app/contexts/auth-context';
import { Button } from '@/app/components/ui/button';
import { 
  Home, 
  Settings, 
  CreditCard, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Logo } from '@/app/components/logo';
import { Footer } from '@/app/components/footer';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { user, status, checkSession } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log('[dashboard-layout] No session, redirecting to login');
      router.push('/auth/login');
    } else if (status === 'authenticated' && user) {
      console.log('[dashboard-layout] Session found:', user.email);
      // Clear auth flow marker
      sessionStorage.removeItem('auth_flow_active');
      
      // Ensure user exists in database
      const ensureUser = async () => {
        try {
          const response = await fetch('/auth/ensure-user', {
            credentials: 'include'
          });
          if (response.ok) {
            console.log('[dashboard] User existence confirmed');
          } else {
            console.error('[dashboard] Failed to ensure user exists');
          }
        } catch (err) {
          console.error('[dashboard] Error ensuring user:', err);
        }
      };
      ensureUser();

      // Get user's subscription from users table
      const fetchSubscription = async () => {
        const { data: userData } = await supabase
          .from('users')
          .select('subscription_tier')
          .eq('id', user.id)
          .single();
          
        if (userData?.subscription_tier) {
          // Get plan details
          const { data: plan } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', userData.subscription_tier)
            .single();
            
          if (plan) {
            setSubscription({
              subscription_plans: plan
            });
          }
        }
      };
      fetchSubscription();
      setLoading(false);
    } else if (status === 'loading') {
      setLoading(true);
    }
  }, [status, user, router, supabase]);
  
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Billing', href: '/billing', icon: CreditCard },
  ];
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r">
          <div className="flex items-center h-16 px-4 border-b">
            <Logo href="/dashboard" textColor="purple" />
          </div>
          
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </nav>
          
          <div className="p-4 border-t">
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-900">{user.email}</p>
              <p className="text-xs text-gray-500 capitalize">
                {subscription?.subscription_plans?.name || 'Free'} Plan
              </p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-50 flex items-center justify-between h-16 px-4 bg-white border-b">
        <Logo href="/dashboard" textColor="purple" />
        
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-md text-gray-700"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white pt-16">
          <nav className="px-4 py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </nav>
          
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-900">{user.email}</p>
              <p className="text-xs text-gray-500 capitalize">
                {subscription?.subscription_plans?.name || 'Free'} Plan
              </p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        <main className="flex-grow py-6">
          <div className="mx-auto px-4 sm:px-6 md:px-8">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}