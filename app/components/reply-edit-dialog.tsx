'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Label } from './ui/label';
import { Loader2, Edit3, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { GeneratedReply } from '@/app/lib/types';

interface ReplyEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reply: GeneratedReply;
  onSave?: () => void;
}

export default function ReplyEditDialog({
  open,
  onOpenChange,
  reply,
  onSave,
}: ReplyEditDialogProps) {
  const [editedReply, setEditedReply] = useState(reply.reply);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (editedReply.trim() === reply.reply.trim()) {
      toast.error('Please make some changes to the reply first');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/user-style/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleId: reply.styleId,
          originalTweet: reply.originalTweet,
          responseIdea: reply.responseIdea,
          replyType: reply.replyType,
          tone: reply.tone,
          generatedReply: reply.reply,
          correctedReply: editedReply,
          correctionNotes: notes,
        }),
      });

      if (!response.ok) throw new Error('Failed to save correction');

      const data = await response.json();
      
      if (data.needsReanalysis) {
        toast.success('Thanks! Your style will be updated soon based on your feedback.');
      } else {
        toast.success(data.message || 'Thank you for your feedback!');
      }
      
      onSave?.();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save your edits');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Improve Your Writing Style
          </DialogTitle>
          <DialogDescription>
            Edit the reply to match exactly how YOU would write it. This helps us improve your personal writing style over time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Original Tweet</Label>
            <div className="p-3 bg-muted rounded-md text-sm">
              {reply.originalTweet}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Your Idea</Label>
            <div className="p-3 bg-muted rounded-md text-sm">
              {reply.responseIdea}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edited-reply" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Your Version
            </Label>
            <Textarea
              id="edited-reply"
              value={editedReply}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedReply(e.target.value)}
              placeholder="Edit this to match how YOU would write it"
              rows={4}
              maxLength={280}
            />
            <p className="text-xs text-muted-foreground">
              {editedReply.length}/280 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">What did we get wrong? (Optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
              placeholder="e.g., 'Too formal' or 'I never use exclamation marks'"
            />
            <p className="text-xs text-muted-foreground">
              Help us understand what to improve
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || editedReply.trim() === reply.reply.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save & Improve Style'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}