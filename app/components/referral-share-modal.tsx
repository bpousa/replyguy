'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Copy, Mail, Twitter, Linkedin, Facebook, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ReferralShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralUrl: string;
  referralCode: string;
  stats?: {
    bonusReplies: number;
    bonusResearch: number;
    totalReferrals: number;
    maxBonusReplies: number;
    maxBonusResearch: number;
  };
}

export function ReferralShareModal({ 
  isOpen, 
  onClose, 
  referralUrl, 
  referralCode,
  stats 
}: ReferralShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  
  // Ensure we display the clean URL
  const displayUrl = referralUrl.replace(/https:\/\/[^\/]+/, 'https://replyguy.appendment.com');
  
  // Email and social media templates
  const templates = {
    email: [
      {
        subject: "Get 10 free AI-powered tweet replies per month with ReplyGuy",
        body: `Hey!

I've been using ReplyGuy to create better Twitter/X replies with AI, and thought you might like it too.

Sign up with my link and we both get bonus features:
${displayUrl}

You'll get:
✓ 10 free AI-powered replies per month (resets monthly)
✓ 1 research credit to find facts & stats
✓ Access to multiple reply styles
✓ Daily goal tracking

It's helped me save time and write more engaging replies. Give it a try!

Best,
[Your name]`
      },
      {
        subject: "Found this AI tool for better Twitter replies",
        body: `Hi there,

Quick share - I've been using ReplyGuy to help write Twitter/X replies. It uses AI to make responses more engaging and human-like.

If you sign up with my referral link, you get 10 free replies per month (resets monthly):
${displayUrl}

Plus you can:
- Choose from different reply styles
- Add research/facts automatically  
- Track your daily reply goals

Thought it might be useful for you too!

Cheers,
[Your name]`
      }
    ],
    social: [
      {
        platform: 'twitter',
        text: `Just discovered ReplyGuy - an AI tool that helps write better Twitter replies! 🚀

Sign up with my link for 10 free AI-powered replies per month (resets monthly):
${displayUrl}

#AI #TwitterTips #SocialMedia`
      },
      {
        platform: 'linkedin',
        text: `I've been using ReplyGuy to enhance my social media engagement, and it's been a game-changer.

This AI-powered tool helps craft thoughtful, engaging replies for Twitter/X in seconds.

If you're looking to save time while maintaining authentic interactions, check it out. Sign up with my referral link for 10 free replies per month (resets monthly):

${displayUrl}

#ProductivityTools #AI #SocialMediaMarketing`
      },
      {
        platform: 'facebook',
        text: `Found a cool AI tool for anyone who uses Twitter/X! 

ReplyGuy helps you write better replies using AI - saves time and makes your responses more engaging.

Sign up with my link and get 10 free replies per month (resets monthly): ${displayUrl}

Perfect if you want to be more active on social media but struggle with what to say 😊`
      }
    ]
  };
  
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };
  
  const copyEmailTemplate = async (templateIndex: number) => {
    try {
      const template = templates.email[templateIndex];
      const fullEmail = `Subject: ${template.subject}\n\n${template.body}`;
      await navigator.clipboard.writeText(fullEmail);
      setCopiedTemplate(`email-${templateIndex}`);
      toast.success('Email template copied!');
      setTimeout(() => setCopiedTemplate(null), 2000);
    } catch (err) {
      toast.error('Failed to copy email template');
    }
  };
  
  const shareViaEmail = () => {
    const template = templates.email[selectedTemplate];
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(template.subject)}&body=${encodeURIComponent(template.body)}`;
    window.open(mailtoUrl);
  };
  
  const shareOnSocial = (platform: string) => {
    const template = templates.social.find(t => t.platform === platform);
    if (!template) return;
    
    let shareUrl = '';
    const encodedText = encodeURIComponent(template.text);
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}&quote=${encodedText}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };
  
  const remainingReplies = stats ? stats.maxBonusReplies - stats.bonusReplies : 40;
  const remainingResearch = stats ? stats.maxBonusResearch - stats.bonusResearch : 4;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share ReplyGuy & Get More Free Replies</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Stats */}
          {stats && (
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Your Referral Stats</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total Referrals:</span>
                  <span className="ml-2 font-medium">{stats.totalReferrals}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Bonus Replies:</span>
                  <span className="ml-2 font-medium">{stats.bonusReplies}/40</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Can earn:</span>
                  <span className="ml-2 font-medium">{remainingReplies} more replies</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Bonus Research:</span>
                  <span className="ml-2 font-medium">{stats.bonusResearch}/4</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Referral Link */}
          <div>
            <label className="block text-sm font-medium mb-2">Your Referral Link</label>
            <div className="flex gap-2">
              <Input 
                value={displayUrl} 
                readOnly 
                className="font-mono text-xs sm:text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(displayUrl)}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {/* Quick Share Buttons */}
          <div>
            <label className="block text-sm font-medium mb-2">Quick Share</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={shareViaEmail}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareOnSocial('twitter')}
              >
                <Twitter className="h-4 w-4 mr-2" />
                Twitter/X
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareOnSocial('linkedin')}
              >
                <Linkedin className="h-4 w-4 mr-2" />
                LinkedIn
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shareOnSocial('facebook')}
              >
                <Facebook className="h-4 w-4 mr-2" />
                Facebook
              </Button>
            </div>
          </div>
          
          {/* Email Templates */}
          <div>
            <label className="block text-sm font-medium mb-2">Email Templates</label>
            <div className="space-y-2">
              {templates.email.map((template, index) => (
                <div 
                  key={index}
                  className="border rounded-lg p-3 transition-colors hover:border-gray-300"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-1">{template.subject}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {template.body.substring(0, 100)}...
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyEmailTemplate(index)}
                    >
                      {copiedTemplate === `email-${index}` ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => copyEmailTemplate(index)}
                    >
                      <Copy className="h-3 w-3 mr-2" />
                      Copy Full Email
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="sm:w-auto"
                      onClick={() => {
                        setSelectedTemplate(index);
                        shareViaEmail();
                      }}
                    >
                      <Mail className="h-3 w-3 mr-2" />
                      Open in Email
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Social Templates */}
          <div>
            <label className="block text-sm font-medium mb-2">Social Media Posts</label>
            <div className="space-y-3">
              {templates.social.map((template) => (
                <div key={template.platform} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm capitalize">{template.platform}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(template.text)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {template.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* How it works */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg text-sm">
            <h4 className="font-medium mb-2">How it works:</h4>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              <li>• Share your referral link with friends</li>
              <li>• When they sign up and verify their email, you both get rewards</li>
              <li>• You get: +10 replies and +1 research per referral</li>
              <li>• They get: 10 free replies per month and 1 research credit per month (both reset monthly)</li>
              <li>• Maximum bonus: 40 extra replies + 4 extra research</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}