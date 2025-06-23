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

interface ReplyFormProps {
  onSubmit: (input: UserInput) => Promise<void>;
  isLoading: boolean;
}

export default function ReplyForm({ onSubmit, isLoading }: ReplyFormProps) {
  const [originalTweet, setOriginalTweet] = useState('');
  const [responseIdea, setResponseIdea] = useState('');
  const [responseType, setResponseType] = useState<ResponseType>('agree');
  const [tone, setTone] = useState<Tone>('casual');
  const [needsResearch, setNeedsResearch] = useState(false);
  const [replyLength, setReplyLength] = useState<ReplyLength>('short');
  const [perplexityGuidance, setPerplexityGuidance] = useState('');
  const [enableStyleMatching, setEnableStyleMatching] = useState(true);
  const [errors, setErrors] = useState<{ tweet?: string; idea?: string }>({});
  const [isSuggestingIdea, setIsSuggestingIdea] = useState(false);
  
  // TODO: Get user plan from context/props
  const userPlan = {
    max_tweet_length: 2000,
    max_response_idea_length: 2000,
    max_reply_length: 2000,
    enable_long_replies: true,
    enable_style_matching: true,
    enable_perplexity_guidance: true
  };
  
  // Filter reply lengths based on plan
  const availableReplyLengths = REPLY_LENGTHS.filter(length => {
    if (!userPlan.enable_long_replies && length.value !== 'short') {
      return false;
    }
    return length.maxChars <= userPlan.max_reply_length;
  });

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
      enableStyleMatching: userPlan.enable_style_matching ? enableStyleMatching : false
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
        <p className="text-xs text-gray-500">{originalTweet.length}/{userPlan.max_tweet_length}</p>
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
        <p className="text-xs text-gray-500">{responseIdea.length}/{userPlan.max_response_idea_length}</p>
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
  );
}