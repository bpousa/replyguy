'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { X, Gift, UserPlus, Phone, User } from 'lucide-react';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: { fullName?: string; phone?: string; smsOptIn?: boolean }) => void;
  userEmail: string;
  existingName?: string;
  existingPhone?: string;
}

export function ProfileCompletionModal({ 
  isOpen, 
  onClose, 
  onComplete, 
  userEmail,
  existingName = '',
  existingPhone = ''
}: ProfileCompletionModalProps) {
  const [fullName, setFullName] = useState(existingName);
  const [phone, setPhone] = useState(existingPhone);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

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
      await onComplete({
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        smsOptIn: phone.trim() ? smsOptIn : false
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-lg relative">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            aria-label="Skip profile completion"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <Gift className="h-8 w-8 text-yellow-300" />
            <h2 className="text-xl font-bold">Unlock Exclusive Benefits!</h2>
          </div>
          <p className="text-purple-100 text-sm">
            Complete your profile to get the most out of ReplyGuy
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                What you'll get:
              </h3>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>🚀 Exclusive X growth tips via SMS</li>
                <li>📈 Viral content formulas from top creators</li>
                <li>⚡ Early access to new features</li>
                <li>🎯 Personalized recommendations</li>
              </ul>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                <User className="inline h-4 w-4 mr-1" />
                Full Name {!existingName && <span className="text-red-500">*</span>}
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Your full name"
                required={!existingName}
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="inline h-4 w-4 mr-1" />
                Phone Number <span className="text-gray-500">(optional but recommended)</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="(555) 123-4567"
              />
              
              {/* SMS Opt-in */}
              {phone && (
                <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={userEmail}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Complete Profile'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                className="px-6"
                disabled={isSubmitting}
              >
                Skip for now
              </Button>
            </div>
          </form>

          <p className="text-xs text-gray-500 text-center mt-4">
            You can always update this information later in your settings.
          </p>
        </div>
      </div>
    </div>
  );
}