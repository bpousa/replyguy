'use client';

import { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { toast } from 'react-hot-toast';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Check,
  Loader2,
  FileText,
  Brain,
  Wand2,
  Trophy
} from 'lucide-react';
import StyleAnalysisDisplay from './style-analysis-display';
import { motion, AnimatePresence } from 'framer-motion';

interface WizardStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    title: 'Name Your Style',
    description: 'Give your writing style a memorable name',
    icon: <FileText className="h-5 w-5" />
  },
  {
    title: 'Share Your Tweets',
    description: 'Provide 10 examples of your writing',
    icon: <Sparkles className="h-5 w-5" />
  },
  {
    title: 'Review Analysis',
    description: 'See how we understand your style',
    icon: <Brain className="h-5 w-5" />
  },
  {
    title: 'Refine Your Style',
    description: 'Edit AI examples to match your voice',
    icon: <Wand2 className="h-5 w-5" />
  },
  {
    title: 'Complete!',
    description: 'Your personalized style is ready',
    icon: <Trophy className="h-5 w-5" />
  }
];

interface WriteStyleWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function WriteStyleWizard({ onComplete, onCancel }: WriteStyleWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [styleName, setStyleName] = useState('');
  const [sampleTweets, setSampleTweets] = useState(Array(10).fill(''));
  const [styleAnalysis, setStyleAnalysis] = useState<any>(null);
  const [styleId, setStyleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refinement state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentExample, setCurrentExample] = useState<any>(null);
  const [userRevision, setUserRevision] = useState('');
  const [feedback, setFeedback] = useState('');
  const [refinementProgress, setRefinementProgress] = useState(0);

  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  const updateSampleTweet = (index: number, value: string) => {
    const newSamples = [...sampleTweets];
    newSamples[index] = value;
    setSampleTweets(newSamples);
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 0: // Name
        return styleName.trim().length > 0;
      case 1: // Tweets
        const validTweets = sampleTweets.filter(t => t.trim().length > 0);
        return validTweets.length >= 10;
      case 2: // Analysis
        return !!styleAnalysis;
      case 3: // Refinement
        return refinementProgress >= 100;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // Create style and analyze
      await createAndAnalyzeStyle();
    } else if (currentStep === 2) {
      // Start refinement
      await startRefinement();
    } else if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onCancel();
    }
  };

  const createAndAnalyzeStyle = async () => {
    setIsLoading(true);
    try {
      const validSamples = sampleTweets.filter(s => s.trim().length > 0);
      
      const response = await fetch('/api/user-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: styleName.trim(),
          sampleTweets: validSamples,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create style');
      }

      const { style } = await response.json();
      setStyleAnalysis(style.style_analysis);
      setStyleId(style.id);
      setCurrentStep(2);
    } catch (error: any) {
      toast.error(error.message || 'Failed to analyze style');
    } finally {
      setIsLoading(false);
    }
  };

  const startRefinement = async () => {
    if (!styleId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/user-style/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styleId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start refinement');
      }

      const data = await response.json();
      setSessionId(data.session.id);
      setCurrentExample(data.currentExample);
      setUserRevision(data.currentExample.text);
      setRefinementProgress(10);
      setCurrentStep(3);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start refinement');
    } finally {
      setIsLoading(false);
    }
  };

  const submitRefinementFeedback = async () => {
    if (!sessionId || !currentExample) return;

    setIsLoading(true);
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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit feedback');
      }

      const data = await response.json();
      
      if (data.complete) {
        setRefinementProgress(100);
        toast.success('Style refinement complete!');
        setTimeout(() => setCurrentStep(4), 1000);
      } else {
        setCurrentExample(data.currentExample);
        setUserRevision(data.currentExample.text);
        setFeedback('');
        setRefinementProgress(data.progress.current * 10);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit feedback');
    } finally {
      setIsLoading(false);
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
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {WIZARD_STEPS[currentStep].icon}
            <div>
              <CardTitle>{WIZARD_STEPS[currentStep].title}</CardTitle>
              <CardDescription>{WIZARD_STEPS[currentStep].description}</CardDescription>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {WIZARD_STEPS.length}
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>

      <CardContent className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 0 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="style-name">Style Name</Label>
                  <Input
                    id="style-name"
                    value={styleName}
                    onChange={(e) => setStyleName(e.target.value)}
                    placeholder="e.g., Professional, Casual Friday, Tech Enthusiast"
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Choose a name that helps you remember when to use this style
                  </p>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Paste 10 of your actual tweets below. The more authentic examples you provide,
                  the better we can capture your unique voice.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                  {sampleTweets.map((tweet, index) => (
                    <div key={index}>
                      <Label htmlFor={`tweet-${index}`} className="text-xs">
                        Tweet {index + 1}
                      </Label>
                      <Textarea
                        id={`tweet-${index}`}
                        value={tweet}
                        onChange={(e) => updateSampleTweet(index, e.target.value)}
                        placeholder="Paste your tweet here..."
                        rows={3}
                        maxLength={280}
                        className="mt-1 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {sampleTweets.filter(t => t.trim()).length}/10 tweets provided
                </p>
              </div>
            )}

            {currentStep === 2 && styleAnalysis && (
              <div>
                <StyleAnalysisDisplay
                  analysis={styleAnalysis}
                  name={styleName}
                  isRefined={false}
                />
                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm">
                    <strong>Next step:</strong> We&apos;ll show you 10 example tweets and you&apos;ll 
                    edit them to match exactly how YOU would write them. This helps us perfect your style!
                  </p>
                </div>
              </div>
            )}

            {currentStep === 3 && currentExample && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <Label>Example {currentExample.index + 1} of 10</Label>
                  <span className="text-sm text-muted-foreground">
                    {getExampleTypeDescription(currentExample.type)}
                  </span>
                </div>
                <Progress value={refinementProgress} className="h-2 mb-4" />

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Our attempt:</CardTitle>
                    <CardDescription>
                      Based on your style for: &ldquo;{getExampleTypeDescription(currentExample.type)}&rdquo;
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm">{currentExample.text}</p>
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <Label htmlFor="revision">Your version</Label>
                  <Textarea
                    id="revision"
                    value={userRevision}
                    onChange={(e) => setUserRevision(e.target.value)}
                    placeholder="Edit this to match EXACTLY how you would write it"
                    rows={3}
                    maxLength={280}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {userRevision.length}/280 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="feedback">Notes (Optional)</Label>
                  <Input
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="e.g., &apos;I never use exclamation marks&apos;"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="text-center py-8">
                <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Congratulations!</h3>
                <p className="text-muted-foreground mb-6">
                  Your writing style &ldquo;{styleName}&rdquo; has been created and refined.
                  It&apos;s now ready to use!
                </p>
                <div className="flex gap-2 justify-center">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-sm">10 sample tweets analyzed</span>
                </div>
                <div className="flex gap-2 justify-center mt-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-sm">10 examples refined</span>
                </div>
                <div className="flex gap-2 justify-center mt-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Ready to generate authentic replies</span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={isLoading}
        >
          {currentStep === 0 ? 'Cancel' : (
            <>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </>
          )}
        </Button>

        {currentStep === 3 && currentExample ? (
          <Button
            onClick={submitRefinementFeedback}
            disabled={isLoading || userRevision.trim() === ''}
          >
            {isLoading ? (
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
        ) : (
          <Button
            onClick={handleNext}
            disabled={isLoading || !canProceedFromStep(currentStep)}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {currentStep === 1 ? 'Analyzing...' : 'Processing...'}
              </>
            ) : currentStep === WIZARD_STEPS.length - 1 ? (
              'Finish'
            ) : (
              <>
                {currentStep === 1 ? 'Analyze Style' : 
                 currentStep === 2 ? 'Start Refinement' : 'Next'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}