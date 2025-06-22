'use client';

import { useState } from 'react';
import { UserInput, ResponseType, Tone } from '@/app/lib/types';
import { RESPONSE_TYPES, TONES, PLACEHOLDER_TWEETS, PLACEHOLDER_IDEAS } from '@/app/lib/constants';
import { validateTweet, sanitizeInput, debounce } from '@/app/lib/utils';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
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
  const [errors, setErrors] = useState<{ tweet?: string; idea?: string }>({});

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
    };
    
    try {
      await onSubmit(input);
    } catch (error) {
      toast.error('Failed to generate reply. Please try again.');
    }
  };

  const handleRandomTweet = () => {
    const randomTweet = PLACEHOLDER_TWEETS[Math.floor(Math.random() * PLACEHOLDER_TWEETS.length)];
    setOriginalTweet(randomTweet);
    setErrors({});
  };

  const handleRandomIdea = () => {
    const randomIdea = PLACEHOLDER_IDEAS[Math.floor(Math.random() * PLACEHOLDER_IDEAS.length)];
    setResponseIdea(randomIdea);
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Original Tweet */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="tweet">Original Tweet</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRandomTweet}
            className="text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Random
          </Button>
        </div>
        <Textarea
          id="tweet"
          placeholder="Paste the tweet you want to reply to..."
          value={originalTweet}
          onChange={(e) => {
            setOriginalTweet(e.target.value);
            if (errors.tweet) setErrors({ ...errors, tweet: undefined });
          }}
          className={`min-h-[100px] ${errors.tweet ? 'border-red-500' : ''}`}
          maxLength={500}
        />
        {errors.tweet && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.tweet}
          </p>
        )}
        <p className="text-xs text-gray-500">{originalTweet.length}/500</p>
      </div>

      {/* Response Idea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="idea">What do you want to say?</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRandomIdea}
            className="text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Suggest
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
          maxLength={200}
        />
        {errors.idea && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.idea}
          </p>
        )}
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