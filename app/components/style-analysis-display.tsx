'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Mic, 
  BookOpen, 
  MessageSquare, 
  Hash, 
  Smile, 
  Type,
  TrendingUp,
  Zap,
  AlertCircle
} from 'lucide-react';

interface StyleAnalysisDisplayProps {
  analysis: any;
  name: string;
  isRefined?: boolean;
}

export default function StyleAnalysisDisplay({ 
  analysis, 
  name,
  isRefined = false 
}: StyleAnalysisDisplayProps) {
  if (!analysis) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>No style analysis available</p>
        </div>
      </Card>
    );
  }

  const getConfidenceLevel = () => {
    if (isRefined) return 95;
    if (analysis.examplePhrases?.length > 5) return 85;
    if (analysis.examplePhrases?.length > 2) return 70;
    return 60;
  };

  const confidence = getConfidenceLevel();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            {name} Analysis
          </span>
          {isRefined && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Refined
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          How we understand your unique writing voice
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Confidence Score */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Analysis Confidence</span>
            <span className="font-medium">{confidence}%</span>
          </div>
          <Progress value={confidence} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {confidence >= 85 
              ? "Excellent understanding of your style"
              : confidence >= 70
              ? "Good understanding, refinement will improve accuracy"
              : "Basic understanding, more examples needed"}
          </p>
        </div>

        {/* Core Attributes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Tone & Voice
            </h4>
            <p className="text-sm text-muted-foreground">{analysis.tone}</p>
            {analysis.contentPatterns?.humor && (
              <Badge variant="outline" className="text-xs">
                {analysis.contentPatterns.humor} humor
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Vocabulary
            </h4>
            <p className="text-sm text-muted-foreground">
              {analysis.vocabulary?.level || analysis.vocabulary || 'Not analyzed'}
            </p>
            {analysis.vocabulary?.uniqueWords?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {analysis.vocabulary.uniqueWords.slice(0, 3).map((word: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {word}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Type className="h-4 w-4" />
              Structure
            </h4>
            <p className="text-sm text-muted-foreground">
              {analysis.sentencePatterns?.structure || analysis.sentenceStructure || 'Not analyzed'}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Smile className="h-4 w-4" />
              Emoji Usage
            </h4>
            <p className="text-sm text-muted-foreground">
              {analysis.emojiPatterns?.frequency || analysis.emojiUsage || 'None'}
            </p>
            {analysis.emojiPatterns?.specific?.length > 0 && (
              <div className="text-lg">
                {analysis.emojiPatterns.specific.slice(0, 5).join(' ')}
              </div>
            )}
          </div>
        </div>

        {/* Unique Patterns */}
        {analysis.uniqueQuirks?.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Unique Quirks
            </h4>
            <ul className="space-y-1">
              {analysis.uniqueQuirks.slice(0, 5).map((quirk: string, i: number) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  {quirk}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Example Phrases */}
        {analysis.examplePhrases?.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Signature Phrases
            </h4>
            <div className="space-y-2">
              {analysis.examplePhrases.slice(0, 3).map((phrase: string, i: number) => (
                <div key={i} className="p-2 bg-muted rounded-md">
                  <p className="text-sm italic">"{phrase}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Common Patterns */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {analysis.linguisticFeatures?.contractions && (
            <div>
              <span className="text-muted-foreground">Contractions:</span>
              <span className="ml-2 font-medium">{analysis.linguisticFeatures.contractions}</span>
            </div>
          )}
          {analysis.capitalization?.style && (
            <div>
              <span className="text-muted-foreground">Capitalization:</span>
              <span className="ml-2 font-medium">{analysis.capitalization.style}</span>
            </div>
          )}
          {analysis.punctuation?.style && (
            <div>
              <span className="text-muted-foreground">Punctuation:</span>
              <span className="ml-2 font-medium">{analysis.punctuation.style}</span>
            </div>
          )}
          {analysis.sentencePatterns?.openings?.length > 0 && (
            <div>
              <span className="text-muted-foreground">Common openings:</span>
              <span className="ml-2 font-medium">{analysis.sentencePatterns.openings.length} patterns</span>
            </div>
          )}
        </div>

        {/* Improvement Tip */}
        {!isRefined && (
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <p className="text-sm flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600 mt-0.5" />
              <span>
                <strong className="text-purple-700 dark:text-purple-400">Tip:</strong>
                {' '}Use the "Refine" feature to improve accuracy by showing us exactly how you'd write different types of tweets.
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}