'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { GeneratedReply } from '@/app/lib/types';
import { formatCost, formatDuration, copyToClipboard } from '@/app/lib/utils';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Copy, Check, Sparkles, DollarSign, Clock, Info, Link, ExternalLink, AlertCircle, Flag, ThumbsUp, MessageSquare } from 'lucide-react';
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
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showPhraseReport, setShowPhraseReport] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [reportingPhrase, setReportingPhrase] = useState(false);
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debug') === 'true';

  // Reset feedback state when new reply comes in
  useEffect(() => {
    setFeedbackSent(false);
    setShowFeedback(false);
    setShowPhraseReport(false);
    setSelectedText('');
  }, [reply]);

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

  const handleFeedback = async (feedbackType: 'sounds_ai' | 'sounds_human') => {
    if (!reply || feedbackSent) return;
    
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replyText: reply.reply,
          feedbackType,
        }),
      });
      
      if (response.ok) {
        setFeedbackSent(true);
        toast.success(feedbackType === 'sounds_ai' 
          ? 'Thanks! We\'ll work on making replies more natural.' 
          : 'Great! Thanks for the feedback.');
        setShowFeedback(false);
      } else {
        toast.error('Failed to send feedback');
      }
    } catch (error) {
      console.error('Feedback error:', error);
      toast.error('Failed to send feedback');
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      setSelectedText(selection.toString().trim());
      setShowPhraseReport(true);
    }
  };

  const handlePhraseReport = async () => {
    if (!reply || !selectedText || reportingPhrase) return;
    
    setReportingPhrase(true);
    
    try {
      const response = await fetch('/api/ai-phrases/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replyText: reply.reply,
          reportedPhrase: selectedText,
          originalTweet: reply.originalTweet,
          responseIdea: reply.responseIdea,
          replyType: reply.replyType,
        }),
      });
      
      if (response.ok) {
        toast.success('Thanks! This helps us improve our AI detection.');
        setShowPhraseReport(false);
        setSelectedText('');
        setFeedbackSent(true);
      } else {
        toast.error('Failed to report phrase');
      }
    } catch (error) {
      console.error('Phrase report error:', error);
      toast.error('Failed to report phrase');
    } finally {
      setReportingPhrase(false);
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
    <div className="w-full overflow-x-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key="reply"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-4 max-w-full"
        >
        {/* Main Reply */}
        <Card className="p-4 sm:p-6 relative overflow-hidden">
          <div className="pr-10 sm:pr-12">
            <p 
              className="text-base sm:text-lg leading-relaxed break-words select-text whitespace-pre-wrap selection:bg-purple-200 dark:selection:bg-purple-800 selection:text-purple-900 dark:selection:text-purple-100"
              onMouseUp={handleTextSelection}
              onTouchEnd={handleTextSelection}
              style={{ 
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                hyphens: 'auto',
                WebkitUserSelect: 'text',
                userSelect: 'text'
              }}
            >
              {reply.reply}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 sm:top-4 sm:right-4 h-8 w-8 sm:h-10 sm:w-10"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
            ) : (
              <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
            )}
          </Button>
          
          {/* Phrase Report Popup */}
          {showPhraseReport && selectedText && (
            <div className="absolute top-full left-4 right-4 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 mt-2 z-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 max-w-xs mx-auto">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                Report &quot;{selectedText.length > 30 ? selectedText.substring(0, 30) + '...' : selectedText}&quot; as AI-sounding?
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePhraseReport}
                  disabled={reportingPhrase}
                  className="text-xs flex-1 sm:flex-initial"
                >
                  {reportingPhrase ? 'Reporting...' : 'Report'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowPhraseReport(false);
                    setSelectedText('');
                  }}
                  className="text-xs flex-1 sm:flex-initial"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Feedback Section */}
        {!feedbackSent && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <button
                onClick={() => setShowFeedback(!showFeedback)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                How does this sound?
              </button>
              {showFeedback && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFeedback('sounds_human')}
                    className="text-xs h-7 px-2"
                  >
                    <ThumbsUp className="w-3 h-3 mr-1" />
                    Natural
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFeedback('sounds_ai')}
                    className="text-xs h-7 px-2"
                  >
                    <Flag className="w-3 h-3 mr-1" />
                    Too AI
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 px-2 italic">
              Tip: Drag to highlight any AI-sounding phrases above to report them specifically
            </p>
          </div>
        )}

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
          <Card className="p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 overflow-hidden">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="font-medium text-sm text-purple-900 dark:text-purple-100">
                  Generated Meme
                </h3>
                <a
                  href={reply.memePageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 inline-flex items-center gap-1"
                >
                  View on Imgflip
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative w-full overflow-hidden rounded-lg">
                <img
                  src={reply.memeUrl}
                  alt="Generated meme"
                  className="w-full h-auto max-w-full sm:max-w-md mx-auto block"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
              </div>
            </div>
          </Card>
        )}
        
        {/* Meme generation failure notice */}
        {reply.debugInfo?.memeRequested && !reply.memeUrl && reply.debugInfo?.memeSkipReason && (
          <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 overflow-hidden">
            <div className="flex items-start gap-3 min-w-0">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Meme generation unavailable
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  The meme couldn&apos;t be generated with the current text. Try a different response or add custom meme text for better results.
                </p>
                {debugMode && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-mono break-all">
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
          <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 overflow-hidden">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Link className="w-4 h-4 text-amber-700 dark:text-amber-300 flex-shrink-0" />
                <h3 className="font-medium text-sm text-amber-900 dark:text-amber-100">
                  Sources
                </h3>
              </div>
              <div className="space-y-2 overflow-x-auto max-w-full">
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
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100 truncate">
                            {displayTitle || 'Source'}
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 break-all">
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
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 overflow-hidden">
            <h3 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">
              Research Data
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-200 break-words">
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
    </div>
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