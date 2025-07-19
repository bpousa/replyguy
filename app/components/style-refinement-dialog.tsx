'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Loader2, CheckCircle2, ArrowRight, Edit3 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface StyleRefinementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  styleId: string;
  styleName: string;
  onComplete: () => void;
}

interface RefinementExample {
  index: number;
  type: string;
  text: string;
}

export default function StyleRefinementDialog({
  open,
  onOpenChange,
  styleId,
  styleName,
  onComplete,
}: StyleRefinementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentExample, setCurrentExample] = useState<RefinementExample | null>(null);
  const [userRevision, setUserRevision] = useState('');
  const [feedback, setFeedback] = useState('');
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const startRefinement = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user-style/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styleId }),
      });

      if (!response.ok) throw new Error('Failed to start refinement');

      const data = await response.json();
      setSessionId(data.session.id);
      setCurrentExample(data.currentExample);
      setUserRevision(data.currentExample.text);
      setProgress((data.currentExample.index + 1) * 10);
    } catch (error) {
      toast.error('Failed to start refinement process');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!sessionId || !currentExample) return;

    setLoading(true);
    try {
      const response = await fetch('/api/user-style/refine', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          exampleIndex: currentExample.index,
          originalExample: currentExample.text,
          userRevision,
          feedback,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit feedback');

      const data = await response.json();
      
      if (data.complete) {
        setIsComplete(true);
        setProgress(100);
        toast.success('Style refinement complete!');
        setTimeout(() => {
          onComplete();
          onOpenChange(false);
        }, 2000);
      } else {
        setCurrentExample(data.currentExample);
        setUserRevision(data.currentExample.text);
        setFeedback('');
        setProgress(data.progress.current * 10);
      }
    } catch (error) {
      toast.error('Failed to submit feedback');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getExampleTypeDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      reaction: 'React to surprising news',
      opinion: 'Share an opinion on a trending topic',
      joke: 'Make a humorous observation',
      question: 'Ask an engaging question',
      story: 'Share a brief personal anecdote',
      advice: 'Give helpful advice',
      observation: 'Make an interesting observation',
      complaint: 'Express mild frustration humorously',
      excitement: 'Share excitement about something',
      reflection: 'Share a thoughtful reflection',
    };
    return descriptions[type] || 'Write a tweet';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Refine Your Writing Style</DialogTitle>
          <DialogDescription>
            We'll show you 10 example tweets. Edit them to match exactly how YOU would write them.
            This helps us capture your unique voice perfectly.
          </DialogDescription>
        </DialogHeader>

        {!sessionId && !isComplete && (
          <div className="py-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Ready to refine "{styleName}"?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              This process takes about 5-10 minutes and dramatically improves accuracy.
            </p>
            <Button onClick={startRefinement} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                'Start Refinement Process'
              )}
            </Button>
          </div>
        )}

        {currentExample && !isComplete && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Progress: Example {currentExample.index + 1} of 10</Label>
                <span className="text-sm text-muted-foreground">
                  {getExampleTypeDescription(currentExample.type)}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Generated Example:</CardTitle>
                <CardDescription>
                  This is what we think you'd write for: "{getExampleTypeDescription(currentExample.type)}"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">{currentExample.text}</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div>
                <Label htmlFor="revision" className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  Your Version
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Edit this to match EXACTLY how you would write it
                </p>
                <Textarea
                  id="revision"
                  value={userRevision}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUserRevision(e.target.value)}
                  placeholder="How would YOU write this tweet?"
                  rows={3}
                  maxLength={280}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {userRevision.length}/280 characters
                </p>
              </div>

              <div>
                <Label htmlFor="feedback">Additional Notes (Optional)</Label>
                <Input
                  id="feedback"
                  value={feedback}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFeedback(e.target.value)}
                  placeholder="e.g., 'I never use exclamation marks' or 'I always lowercase everything'"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Save & Continue Later
              </Button>
              <Button
                onClick={submitFeedback}
                disabled={loading || userRevision.trim() === ''}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Next Example
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {isComplete && (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Refinement Complete!</h3>
            <p className="text-sm text-muted-foreground">
              Your writing style has been refined and will now produce much more accurate results.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}