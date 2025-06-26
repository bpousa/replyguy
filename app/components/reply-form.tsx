'use client';

import { useState, useEffect } from 'react';
import { UserInput, ResponseType, Tone, ReplyLength } from '@/app/lib/types';
import { RESPONSE_TYPES, TONES, PLACEHOLDER_TWEETS, PLACEHOLDER_IDEAS, REPLY_LENGTHS } from '@/app/lib/constants';
import { validateTweet, sanitizeInput, debounce } from '@/app/lib/utils';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { AlertCircle, Sparkles, RefreshCw, Lightbulb } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DetailedUpgradeModal } from './upgrade-modal';

interface ReplyFormProps {
  onSubmit: (input: UserInput) => Promise<void>;
  isLoading: boolean;
  user?: any;
  subscription?: any;
}

export default function ReplyForm({ onSubmit, isLoading, user, subscription }: ReplyFormProps) {
  const [originalTweet, setOriginalTweet] = useState('');
  const [responseIdea, setResponseIdea] = useState('');
  const [responseType, setResponseType] = useState<ResponseType>('agree');
  const [tone, setTone] = useState<Tone>('casual');
  const [needsResearch, setNeedsResearch] = useState(false);
  const [replyLength, setReplyLength] = useState<ReplyLength>('short');
  const [perplexityGuidance, setPerplexityGuidance] = useState('');
  const [enableStyleMatching, setEnableStyleMatching] = useState(true);
  const [includeMeme, setIncludeMeme] = useState(false);
  const [errors, setErrors] = useState<{ tweet?: string; idea?: string }>({});
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeLimitType, setUpgradeLimitType] = useState<'tweet' | 'response' | 'replies' | 'memes' | 'suggestions'>('tweet');
  const [isSuggestingIdea, setIsSuggestingIdea] = useState(false);
  const [useCustomStyle, setUseCustomStyle] = useState(false);
  const [hasActiveStyle, setHasActiveStyle] = useState(false);
  
  // Get user plan from subscription
  const userPlan = subscription?.subscription_plans ? {
    ...subscription.subscription_plans,
    memes_used: subscription.memes_used || 0
  } : {
    max_tweet_length: 280,
    max_response_idea_length: 500,
    max_reply_length: 280,
    enable_long_replies: false,
    enable_style_matching: false,
    enable_perplexity_guidance: false,
    enable_memes: false,
    meme_limit: 0,
    memes_used: 0,
    enable_write_like_me: false
  };
  
  // Override meme settings based on subscription tier
  if (subscription?.plan_id) {
    const memeLimits: Record<string, number> = {
      'free': 0,
      'growth': 10,      // X Basic
      'professional': 50, // X Pro
      'enterprise': 100   // X Business
    };
    userPlan.meme_limit = memeLimits[subscription.plan_id] || 0;
    userPlan.enable_memes = userPlan.meme_limit > 0;
  }
  
  // Filter reply lengths based on plan
  const availableReplyLengths = REPLY_LENGTHS.filter(length => {
    if (!userPlan.enable_long_replies && length.value !== 'short') {
      return false;
    }
    return length.maxChars <= userPlan.max_reply_length;
  });

  // Check if user has an active style
  useEffect(() => {
    const checkActiveStyle = async () => {
      if (!user || !userPlan.enable_write_like_me) return;
      
      try {
        const response = await fetch('/api/user-style', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          const activeStyle = data.styles?.find((s: any) => s.is_active);
          setHasActiveStyle(!!activeStyle);
          setUseCustomStyle(!!activeStyle); // Default to on if they have a style
        }
      } catch (error) {
        console.error('Failed to check active style:', error);
      }
    };
    
    checkActiveStyle();
  }, [user, userPlan.enable_write_like_me]);

  const handleSuggestIdea = async () => {
    if (!originalTweet.trim()) {
      toast.error('Please enter a tweet first');
      return;
    }
    
    setIsSuggestingIdea(true);
    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweet: originalTweet,
          responseType,
          tone
        })
      });
      
      if (!response.ok) throw new Error('Failed to get suggestion');
      
      const data = await response.json();
      setResponseIdea(data.suggestion);
      toast.success('Suggestion generated!');
    } catch (error) {
      toast.error('Failed to generate suggestion');
    } finally {
      setIsSuggestingIdea(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const tweetValidation = validateTweet(originalTweet);
    if (!tweetValidation.valid) {
      setErrors({ tweet: tweetValidation.error });
      return;
    }
    
    if (!responseIdea.trim()) {
      setErrors({ idea: 'Please describe what you want to say' });
      return;
    }
    
    setErrors({});
    
    const input: UserInput = {
      originalTweet: sanitizeInput(originalTweet),
      responseIdea: sanitizeInput(responseIdea),
      responseType,
      tone,
      needsResearch,
      replyLength,
      perplexityGuidance: needsResearch && userPlan.enable_perplexity_guidance ? perplexityGuidance : undefined,
      enableStyleMatching: userPlan.enable_style_matching ? enableStyleMatching : false,
      includeMeme: userPlan.enable_memes ? includeMeme : false,
      useCustomStyle: userPlan.enable_write_like_me && hasActiveStyle ? useCustomStyle : false
    };
    
    try {
      await onSubmit(input);
    } catch (error) {
      toast.error('Failed to generate reply. Please try again.');
    }
  };

  const handleRandomIdea = () => {
    const randomIdea = PLACEHOLDER_IDEAS[Math.floor(Math.random() * PLACEHOLDER_IDEAS.length)];
    setResponseIdea(randomIdea);
    setErrors({});
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tweet/X Post Input */}
      <div className="space-y-2">
        <Label htmlFor="tweet">Tweet/X Post</Label>
        <Textarea
          id="tweet"
          placeholder="Paste the tweet you want to reply to..."
          value={originalTweet}
          onChange={(e) => {
            setOriginalTweet(e.target.value);
            if (errors.tweet) setErrors({ ...errors, tweet: undefined });
          }}
          className={`min-h-[100px] ${errors.tweet ? 'border-red-500' : ''}`}
          maxLength={userPlan.max_tweet_length}
        />
        {errors.tweet && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.tweet}
          </p>
        )}
        <p className="text-xs text-gray-500">
          {originalTweet.length}/{userPlan.max_tweet_length}
          {originalTweet.length > userPlan.max_tweet_length && (
            <Button 
              type="button"
              variant="link" 
              size="sm" 
              className="ml-2 text-purple-600 p-0 h-auto"
              onClick={() => {
                setUpgradeLimitType('tweet');
                setShowUpgradeModal(true);
              }}
            >
              Upgrade for longer tweets
            </Button>
          )}
        </p>
      </div>

      {/* Response Idea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="idea">What do you want to say?</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSuggestIdea}
            disabled={isSuggestingIdea || !originalTweet.trim()}
            className="text-xs"
          >
            <Lightbulb className="w-3 h-3 mr-1" />
            {isSuggestingIdea ? 'Suggesting...' : 'Suggest'}
          </Button>
        </div>
        <Textarea
          id="idea"
          placeholder="Describe your response (e.g., 'Sympathize and share a similar experience')"
          value={responseIdea}
          onChange={(e) => {
            setResponseIdea(e.target.value);
            if (errors.idea) setErrors({ ...errors, idea: undefined });
          }}
          className={`min-h-[80px] ${errors.idea ? 'border-red-500' : ''}`}
          maxLength={userPlan.max_response_idea_length}
        />
        {errors.idea && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.idea}
          </p>
        )}
        <p className="text-xs text-gray-500">
          {responseIdea.length}/{userPlan.max_response_idea_length}
          {responseIdea.length > userPlan.max_response_idea_length && (
            <Button 
              type="button"
              variant="link" 
              size="sm" 
              className="ml-2 text-purple-600 p-0 h-auto"
              onClick={() => {
                setUpgradeLimitType('response');
                setShowUpgradeModal(true);
              }}
            >
              Upgrade for longer ideas
            </Button>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Response Type */}
        <div className="space-y-2">
          <Label htmlFor="response-type">Response Type</Label>
          <Select value={responseType} onValueChange={(value) => setResponseType(value as ResponseType)}>
            <SelectTrigger id="response-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESPONSE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs text-gray-500">{type.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tone */}
        <div className="space-y-2">
          <Label htmlFor="tone">Tone</Label>
          <Select value={tone} onValueChange={(value) => setTone(value as Tone)}>
            <SelectTrigger id="tone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="flex items-center gap-2">
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reply Length - Only show if plan supports it */}
      {userPlan.enable_long_replies && availableReplyLengths.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="reply-length">Reply Length</Label>
          <Select value={replyLength} onValueChange={(value) => setReplyLength(value as ReplyLength)}>
            <SelectTrigger id="reply-length">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableReplyLengths.map((length) => (
                <SelectItem key={length.value} value={length.value}>
                  <div>
                    <div className="font-medium">{length.label}</div>
                    <div className="text-xs text-gray-500">{length.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Research Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="space-y-1">
          <Label htmlFor="research" className="text-base font-medium">
            Include Research
          </Label>
          <p className="text-sm text-gray-500">
            Use Perplexity to find relevant facts and statistics
          </p>
        </div>
        <Switch
          id="research"
          checked={needsResearch}
          onCheckedChange={setNeedsResearch}
        />
      </div>

      {/* Perplexity Guidance - Only show when research is enabled and plan supports it */}
      {needsResearch && userPlan.enable_perplexity_guidance && (
        <div className="space-y-2">
          <Label htmlFor="perplexity-guidance">
            Research Guidance (Optional)
          </Label>
          <Textarea
            id="perplexity-guidance"
            placeholder="What specific facts, stats, or current events should we look for? (e.g., 'recent tech layoffs statistics', 'latest climate change data')"
            value={perplexityGuidance}
            onChange={(e) => setPerplexityGuidance(e.target.value)}
            className="min-h-[60px]"
            maxLength={200}
          />
          <p className="text-xs text-gray-500">
            Guide the research to find specific, relevant information
          </p>
        </div>
      )}

      {/* Style Matching Toggle - Only show if plan supports it */}
      {userPlan.enable_style_matching && (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="style-matching" className="text-base font-medium">
              Match Tweet Style
            </Label>
            <p className="text-sm text-gray-500">
              Adapt writing style to match the original tweet (50% influence)
            </p>
          </div>
          <Switch
            id="style-matching"
            checked={enableStyleMatching}
            onCheckedChange={setEnableStyleMatching}
          />
        </div>
      )}

      {/* Write Like Me Toggle - Only show if plan supports it and user has active style */}
      {userPlan.enable_write_like_me && hasActiveStyle && (
        <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="space-y-1">
            <Label htmlFor="write-like-me" className="text-base font-medium flex items-center gap-2">
              Write Like Me™
              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">
                Pro
              </span>
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Use your personalized writing style
            </p>
          </div>
          <Switch
            id="write-like-me"
            checked={useCustomStyle}
            onCheckedChange={setUseCustomStyle}
          />
        </div>
      )}

      {/* Meme Toggle - Only show if plan supports it */}
      {userPlan.enable_memes && (
        <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="space-y-1">
            <Label htmlFor="include-meme" className="text-base font-medium">
              Include Meme
            </Label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {userPlan.memes_used}/{userPlan.meme_limit} memes used this month
            </p>
          </div>
          <Switch
            id="include-meme"
            checked={includeMeme}
            onCheckedChange={setIncludeMeme}
            disabled={userPlan.memes_used >= userPlan.meme_limit}
          />
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Reply
          </>
        )}
      </Button>
    </form>

    {/* Upgrade Modal */}
    <DetailedUpgradeModal
      isOpen={showUpgradeModal}
      onClose={() => setShowUpgradeModal(false)}
      limitType={upgradeLimitType}
      currentLimit={
        upgradeLimitType === 'tweet' ? `${userPlan.max_tweet_length} chars` :
        upgradeLimitType === 'response' ? `${userPlan.max_response_idea_length} chars` :
        upgradeLimitType === 'replies' ? `${userPlan.reply_limit}/month` :
        upgradeLimitType === 'memes' ? `${userPlan.meme_limit}/month` :
        `${userPlan.suggestion_limit}/month`
      }
      currentPlan={userPlan.name || 'Free'}
      upgradePlans={
        upgradeLimitType === 'tweet' ? [
          { name: 'X Basic', limit: '500 chars', price: '$19', features: ['300 replies/month', '10 memes/month', '50 AI suggestions'] },
          { name: 'X Pro', limit: '1000 chars', price: '$49', features: ['500 replies/month', '50 memes/month', 'Write Like Me™'] },
          { name: 'X Business', limit: '1500 chars', price: '$99', features: ['1000 replies/month', '100 memes/month', 'All features'] }
        ] :
        upgradeLimitType === 'response' ? [
          { name: 'X Basic', limit: '300 chars', price: '$19', features: ['300 replies/month', '10 memes/month', '50 AI suggestions'] },
          { name: 'X Pro', limit: '500 chars', price: '$49', features: ['500 replies/month', '50 memes/month', 'Write Like Me™'] },
          { name: 'X Business', limit: '1000 chars', price: '$99', features: ['1000 replies/month', '100 memes/month', 'All features'] }
        ] :
        upgradeLimitType === 'replies' ? [
          { name: 'X Basic', limit: '300/month', price: '$19', features: ['10 memes/month', '50 AI suggestions', 'Email support'] },
          { name: 'X Pro', limit: '500/month', price: '$49', features: ['50 memes/month', 'Write Like Me™', 'Priority support'] },
          { name: 'X Business', limit: '1000/month', price: '$99', features: ['100 memes/month', 'Real-time research', 'Dedicated support'] }
        ] :
        upgradeLimitType === 'memes' ? [
          { name: 'X Basic', limit: '10/month', price: '$19', features: ['300 replies/month', '50 AI suggestions', 'Email support'] },
          { name: 'X Pro', limit: '50/month', price: '$49', features: ['500 replies/month', 'Write Like Me™', 'Priority support'] },
          { name: 'X Business', limit: '100/month', price: '$99', features: ['1000 replies/month', 'Real-time research', 'Dedicated support'] }
        ] : [
          { name: 'X Basic', limit: '50/month', price: '$19', features: ['300 replies/month', '10 memes/month', 'Email support'] },
          { name: 'X Pro', limit: '100/month', price: '$49', features: ['500 replies/month', 'Write Like Me™', 'Priority support'] },
          { name: 'X Business', limit: '200/month', price: '$99', features: ['1000 replies/month', 'Real-time research', 'Dedicated support'] }
        ]
      }
    />
    </>
  );
}