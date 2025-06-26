'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/app/lib/auth';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Select } from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'react-hot-toast';
import { 
  User, 
  CreditCard, 
  Bell, 
  Globe, 
  Shield,
  Loader2,
  Save,
  ArrowLeft
} from 'lucide-react';
import { WriteLikeMeSettings } from '@/app/components/write-like-me-settings';
import { UsageDashboard } from '@/app/components/usage-dashboard';


export default function SettingsPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [settings, setSettings] = useState({
    email: '',
    daily_goal: 10,
    timezone: 'America/New_York',
    email_notifications: true,
    celebration_animations: true,
  });

  useEffect(() => {
    loadUserData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);
      setSettings(prev => ({ ...prev, email: user.email || '' }));

      // Get user settings
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userData) {
        setSettings(prev => ({
          ...prev,
          daily_goal: userData.daily_goal || 10,
          timezone: userData.timezone || 'America/New_York',
        }));
      }

      // Get user with subscription info
      const { data: userWithSub } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (userWithSub?.subscription_tier) {
        // Get plan details separately
        const { data: plan } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', userWithSub.subscription_tier)
          .single();
          
        if (plan) {
          setSubscription({
            plan_id: userWithSub.subscription_tier,
            subscription_plans: plan,
            status: userWithSub.subscription_status,
            current_period_end: userWithSub.subscription_current_period_end
          });
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Update user settings
      const { error } = await supabase
        .from('users')
        .update({
          daily_goal: settings.daily_goal,
          timezone: settings.timezone,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          returnUrl: window.location.href 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to open billing portal');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      console.error('Error opening billing portal:', error);
      toast.error(error.message || 'Failed to open billing portal');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Profile Section */}
      <Card className="p-6 mb-6">
        <div className="flex items-center mb-4">
          <User className="w-5 h-5 mr-2 text-gray-600" />
          <h2 className="text-xl font-semibold">Profile</h2>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <input
              id="email"
              type="email"
              value={settings.email}
              disabled
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <div>
            <Label htmlFor="daily-goal">Daily Reply Goal</Label>
            <input
              id="daily-goal"
              type="number"
              min="1"
              max="100"
              value={settings.daily_goal}
              onChange={(e) => setSettings({ ...settings, daily_goal: parseInt(e.target.value) || 10 })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Set your daily target for replies (1-100)
            </p>
          </div>
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Australia/Sydney">Sydney (AEDT)</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Used for daily goal tracking
            </p>
          </div>
        </div>
      </Card>

      {/* Subscription Section */}
      <Card className="p-6 mb-6">
        <div className="flex items-center mb-4">
          <CreditCard className="w-5 h-5 mr-2 text-gray-600" />
          <h2 className="text-xl font-semibold">Subscription</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Current Plan</p>
              <p className="text-2xl font-bold text-purple-600">
                {subscription?.subscription_plans?.name || 'Free'}
              </p>
            </div>
            <Button onClick={handleManageBilling} variant="outline">
              Manage Billing
            </Button>
          </div>
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600">
              {subscription ? (
                <>
                  Next billing date:{' '}
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </>
              ) : (
                'Using the free plan'
              )}
            </p>
          </div>
        </div>
      </Card>

      {/* Write Like Me Section - Only show for Pro/Business plans */}
      {(subscription?.subscription_plans?.enable_write_like_me || subscription?.plan_id === 'professional' || subscription?.plan_id === 'enterprise') && (
        <WriteLikeMeSettings />
      )}

      {/* Preferences Section */}
      <Card className="p-6 mb-6">
        <div className="flex items-center mb-4">
          <Bell className="w-5 h-5 mr-2 text-gray-600" />
          <h2 className="text-xl font-semibold">Preferences</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-gray-500">
                Receive updates about your account
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.email_notifications}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, email_notifications: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="celebrations">Celebration Animations</Label>
              <p className="text-sm text-gray-500">
                Show confetti when you reach your daily goal
              </p>
            </div>
            <Switch
              id="celebrations"
              checked={settings.celebration_animations}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, celebration_animations: checked })
              }
            />
          </div>
        </div>
      </Card>

      {/* Usage Stats */}
      {user && (
        <div className="mb-6">
          <UsageDashboard userId={user.id} />
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="min-w-[120px]"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}