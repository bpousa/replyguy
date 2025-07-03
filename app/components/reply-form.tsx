'use client';

import { useState, useEffect, useMemo } from 'react';
import { UserInput, ResponseType, Tone, ReplyLength } from '@/app/lib/types';
import { RESPONSE_TYPES, TONES, PLACEHOLDER_TWEETS, PLACEHOLDER_IDEAS, REPLY_LENGTHS } from '@/app/lib/constants';
import { validateTweet, sanitizeInput, debounce } from '@/app/lib/utils';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { AlertCircle, Sparkles, RefreshCw, Lightbulb, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DetailedUpgradeModal } from './upgrade-modal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

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
  const [memeText, setMemeText] = useState('');
  const [memeTextMode, setMemeTextMode] = useState<'exact' | 'enhance'>('exact');
  const [errors, setErrors] = useState<{ tweet?: string; idea?: string }>({});
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeLimitType, setUpgradeLimitType] = useState<'tweet' | 'response' | 'replies' | 'memes' | 'suggestions'>('tweet');
  const [isSuggestingIdea, setIsSuggestingIdea] = useState(false);
  const [useCustomStyle, setUseCustomStyle] = useState(false);
  const [hasActiveStyle, setHasActiveStyle] = useState(false);
  const [isSuggestingResearch, setIsSuggestingResearch] = useState(false);
  const [researchSuggestions, setResearchSuggestions] = useState<string[]>([]);
  
  // Get user plan from subscription
  const userPlan = useMemo(() => {
    return subscription?.subscription_plans ? {
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
  }, [subscription]);
  
  // Debug logging for meme feature
  useEffect(() => {
    console.log('[ReplyForm] Subscription data:', subscription);
    console.log('[ReplyForm] User plan:', userPlan);
    console.log('[ReplyForm] Meme feature enabled:', userPlan.enable_memes);
    console.log('[ReplyForm] Meme usage:', userPlan.memes_used, '/', userPlan.meme_limit);
  }, [subscription, userPlan]);
  
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
      
      if (!response.ok) {
        const error = await response.json();
        if (response.status === 429 && error.limit) {
          // Show upgrade modal for limit reached
          setUpgradeLimitType('suggestions');
          setShowUpgradeModal(true);
          return;
        }
        throw new Error(error.error || 'Failed to get suggestion');
      }
      
      const data = await response.json();
      setResponseIdea(data.suggestion);
      toast.success('Suggestion generated!');
    } catch (error) {
      toast.error('Failed to generate suggestion');
    } finally {
      setIsSuggestingIdea(false);
    }
  };

  const handleSuggestResearch = async () => {
    if (!originalTweet.trim() || !responseIdea.trim()) {
      toast.error('Please enter a tweet and response idea first');
      return;
    }
    
    setIsSuggestingResearch(true);
    setResearchSuggestions([]);
    try {
      const response = await fetch('/api/suggest-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalTweet,
          responseIdea,
          responseType,
          tone
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        if (response.status === 429 && error.limit) {
          // Show upgrade modal for limit reached
          setUpgradeLimitType('suggestions');
          setShowUpgradeModal(true);
          return;
        }
        throw new Error(error.error || 'Failed to get research suggestions');
      }
      
      const data = await response.json();
      setResearchSuggestions(data.suggestions || []);
      toast.success('Research suggestions generated!');
    } catch (error) {
      toast.error('Failed to generate research suggestions');
    } finally {
      setIsSuggestingResearch(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const tweetValidation = validateTweet(originalTweet, userPlan.max_tweet_length);
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
      memeText: userPlan.enable_memes && includeMeme ? memeText.trim() : undefined,
      memeTextMode: userPlan.enable_memes && includeMeme && memeText ? memeTextMode : undefined,
      useCustomStyle: userPlan.enable_write_like_me && hasActiveStyle ? useCustomStyle : false
    };
    
    console.log('[ReplyForm] Submitting with input:', {
      ...input,
      memeEnabled: userPlan.enable_memes,
      includeMeme: input.includeMeme
    });
    
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
    <TooltipProvider>
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
          <div className="flex items-center gap-2">
            <Label htmlFor="tone">Tone</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Sets the emotional tone of your reply. Professional for work discussions, casual for friends, humorous for entertainment, etc.</p>
              </TooltipContent>
            </Tooltip>
          </div>
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
          <div className="flex items-center gap-2">
            <Label htmlFor="reply-length">Reply Length</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Controls how detailed your reply will be. Short for quick responses, long for in-depth discussions. Each length has different character limits.</p>
              </TooltipContent>
            </Tooltip>
          </div>
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
          <div className="flex items-center gap-2">
            <Label htmlFor="research" className="text-base font-medium">
              Include Research
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Adds real-time data and facts to your reply using Perplexity AI. Great for backing up claims with current statistics or recent events.</p>
              </TooltipContent>
            </Tooltip>
          </div>
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
          <div className="flex items-center justify-between">
            <Label htmlFor="perplexity-guidance">
              Research Guidance (Optional)
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSuggestResearch}
              disabled={isSuggestingResearch || !originalTweet.trim() || !responseIdea.trim()}
              className="text-xs"
            >
              <Lightbulb className="w-3 h-3 mr-1" />
              {isSuggestingResearch ? 'Suggesting...' : 'Suggest'}
            </Button>
          </div>
          <Textarea
            id="perplexity-guidance"
            placeholder="What specific facts, stats, or current events should we look for? (e.g., 'recent tech layoffs statistics', 'latest climate change data')"
            value={perplexityGuidance}
            onChange={(e) => setPerplexityGuidance(e.target.value)}
            className="min-h-[60px]"
            maxLength={200}
          />
          {researchSuggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {researchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setPerplexityGuidance(suggestion)}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500">
            Guide the research to find specific, relevant information
          </p>
        </div>
      )}

      {/* Style Matching Toggle - Only show if plan supports it */}
      {userPlan.enable_style_matching && (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label htmlFor="style-matching" className="text-base font-medium">
                Match Tweet Style
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Analyzes the original tweet&apos;s writing style (formal/casual, emoji usage, punctuation) and adapts your reply to match. Creates more natural conversations.</p>
                </TooltipContent>
              </Tooltip>
            </div>
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
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="include-meme" className="text-base font-medium">
                  Include Meme
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Generates a contextually relevant meme using AI. The meme will match your reply&apos;s tone and message. You can provide specific text or let AI choose.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {userPlan.memes_used}/{userPlan.meme_limit} memes used this month
              </p>
            </div>
            <Switch
              id="include-meme"
              checked={includeMeme}
              onCheckedChange={(checked) => {
                console.log('[ReplyForm] Meme toggle clicked:', checked);
                setIncludeMeme(checked);
                if (!checked) {
                  setMemeText(''); // Clear meme text when toggled off
                }
              }}
              disabled={userPlan.memes_used >= userPlan.meme_limit}
            />
          </div>
          
          {/* Meme Text Input - Show when meme is toggled on */}
          {includeMeme && (
            <div className="ml-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="meme-text" className="text-sm font-medium">
                  Meme text (optional)
                </Label>
                <Input
                  id="meme-text"
                  placeholder="e.g., 'this is fine' or 'bugs everywhere'"
                  value={memeText}
                  onChange={(e) => setMemeText(e.target.value)}
                  maxLength={100}
                  className="text-sm"
                />
              </div>
              
              {/* Show radio buttons only when user has typed text */}
              {memeText && (
                <RadioGroup 
                  value={memeTextMode} 
                  onValueChange={(value) => setMemeTextMode(value as 'exact' | 'enhance')}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="exact" id="exact" />
                    <Label htmlFor="exact" className="text-sm font-normal cursor-pointer">
                      Use my exact text
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="enhance" id="enhance" />
                    <Label htmlFor="enhance" className="text-sm font-normal cursor-pointer">
                      Make it more creative with AI ✨
                    </Label>
                  </div>
                </RadioGroup>
              )}
              
              <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                {!memeText ? (
                  <p>💡 <span className="font-medium">Leave blank</span> = AI creates meme text from your reply</p>
                ) : memeTextMode === 'exact' ? (
                  <p>✏️ Your exact text will be used: &ldquo;{memeText}&rdquo;</p>
                ) : (
                  <p>✨ AI will enhance your idea to make it funnier</p>
                )}
              </div>
            </div>
          )}
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
          { name: 'X Business', limit: '2000 chars', price: '$99', features: ['1000 replies/month', '100 memes/month', 'All features'] }
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
    </TooltipProvider>
  );
}