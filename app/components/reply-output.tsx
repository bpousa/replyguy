'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { GeneratedReply } from '@/app/lib/types';
import { formatCost, formatDuration, copyToClipboard } from '@/app/lib/utils';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Copy, Check, Sparkles, DollarSign, Clock, Info, Link, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingReplyGuy } from './loading-reply-guy';

interface ReplyOutputProps {
  reply: GeneratedReply | null;
  isLoading: boolean;
  maxReplyLength?: number;
}

export default function ReplyOutput({ reply, isLoading, maxReplyLength = 280 }: ReplyOutputProps) {
  const [copied, setCopied] = useState(false);
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debug') === 'true';

  const handleCopy = async () => {
    if (!reply) return;
    
    const success = await copyToClipboard(reply.reply);
    if (success) {
      setCopied(true);
      toast.success('Reply copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (isLoading) {
    return <LoadingReplyGuy />;
  }

  if (!reply) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          Your generated reply will appear here
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          Fill out the form and click Generate Reply
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="reply"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        {/* Main Reply */}
        <Card className="p-6 relative">
          <div className="pr-12">
            <p className="text-lg leading-relaxed">{reply.reply}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </Card>

        {/* Meme debug logging */}
        {(() => {
          console.log('[ReplyOutput] Meme Debug:', {
            memeUrl: reply.memeUrl,
            debugInfo: reply.debugInfo
          });
          return null;
        })()}
        
        {/* Show meme skip reason if in debug mode and meme was requested but not generated */}
        {debugMode && reply.debugInfo?.memeRequested && !reply.memeUrl && (
          <Card className="p-4 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-orange-700 dark:text-orange-300" />
              <div>
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Meme not generated
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  {reply.debugInfo.memeSkipReason || 'Unknown reason'}
                </p>
              </div>
            </div>
          </Card>
        )}
        
        {/* Meme if included */}
        {reply.memeUrl && (
          <Card className="p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-purple-900 dark:text-purple-100">
                  Generated Meme
                </h3>
                <a
                  href={reply.memePageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400"
                >
                  View on Imgflip →
                </a>
              </div>
              <img
                src={reply.memeUrl}
                alt="Generated meme"
                className="rounded-lg w-full max-w-md mx-auto"
              />
            </div>
          </Card>
        )}
        
        {/* Meme generation failure notice */}
        {reply.debugInfo?.memeRequested && !reply.memeUrl && reply.debugInfo?.memeSkipReason && (
          <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Meme generation unavailable
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  The meme couldn't be generated with the current text. Try a different response or add custom meme text for better results.
                </p>
                {debugMode && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-mono">
                    Debug: {reply.debugInfo.memeSkipReason}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Citations if included */}
        {(() => {
          console.log('[ReplyOutput] Citations:', {
            hasCitations: !!reply.citations,
            citationCount: reply.citations?.length || 0,
            citations: reply.citations
          });
          return null;
        })()}
        {reply.citations && reply.citations.length > 0 && (
          <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Link className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                <h3 className="font-medium text-sm text-amber-900 dark:text-amber-100">
                  Sources
                </h3>
              </div>
              <div className="space-y-2">
                {reply.citations
                  .filter(citation => citation && citation.url) // Filter out invalid citations
                  .map((citation, index) => {
                  // Safely extract hostname with fallback
                  let displayTitle = citation.title;
                  if (!displayTitle && citation.url) {
                    try {
                      const urlObj = new URL(citation.url);
                      displayTitle = urlObj.hostname;
                    } catch (e) {
                      // If URL is invalid, use a fallback
                      displayTitle = 'Source ' + (index + 1);
                      console.warn('Invalid citation URL:', citation.url);
                    }
                  }
                  
                  // Validate URL for href attribute
                  let isValidUrl = false;
                  try {
                    new URL(citation.url);
                    isValidUrl = true;
                  } catch {
                    isValidUrl = false;
                  }
                  
                  return (
                    <a
                      key={index}
                      href={isValidUrl ? citation.url : '#'}
                      onClick={isValidUrl ? undefined : (e) => e.preventDefault()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg bg-amber-100/50 dark:bg-amber-800/20 hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100 truncate">
                            {displayTitle || 'Source'}
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 truncate mt-1">
                            {citation.url}
                          </p>
                        </div>
                        <ExternalLink className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" />
                      </div>
                    </a>
                  );
                })}
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                Research powered by Perplexity AI
              </p>
            </div>
          </Card>
        )}

        {/* Metadata - Only show in debug mode */}
        {debugMode && (
          <div className="grid grid-cols-3 gap-4">
            <MetadataCard
              icon={<Info className="w-4 h-4" />}
              label="Reply Type"
              value={reply.replyType}
              color="blue"
            />
            <MetadataCard
              icon={<DollarSign className="w-4 h-4" />}
              label="Cost"
              value={formatCost(reply.cost)}
              color="green"
            />
            <MetadataCard
              icon={<Clock className="w-4 h-4" />}
              label="Time"
              value={formatDuration(reply.processingTime)}
              color="purple"
            />
          </div>
        )}

        {/* Perplexity Data - Only show in debug mode */}
        {debugMode && reply.perplexityData && (
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <h3 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">
              Research Data
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-200">
              {reply.perplexityData}
            </p>
          </Card>
        )}

        {/* Character Count */}
        <div className="text-center text-sm text-gray-500">
          {reply.reply.length} characters
          {reply.reply.length > maxReplyLength && (
            <span className="text-red-500 ml-2">(Too long for your plan limit of {maxReplyLength} characters)</span>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function MetadataCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
  color: 'blue' | 'green' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  };

  return (
    <Card className={`p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider opacity-75">
          {label}
        </span>
      </div>
      <p className="font-semibold">{value}</p>
    </Card>
  );
}