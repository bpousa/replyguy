'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { GeneratedReply } from '@/app/lib/types';
import { formatCost, formatDuration, copyToClipboard } from '@/app/lib/utils';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Copy, Check, Sparkles, DollarSign, Clock, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface ReplyOutputProps {
  reply: GeneratedReply | null;
  isLoading: boolean;
}

export default function ReplyOutput({ reply, isLoading }: ReplyOutputProps) {
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
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
      </div>
    );
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
          {reply.reply.length > 280 && (
            <span className="text-red-500 ml-2">(Too long for X/Twitter)</span>
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