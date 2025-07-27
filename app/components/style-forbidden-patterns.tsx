'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'react-hot-toast';
import { X, Plus, Ban, AlertCircle } from 'lucide-react';
import { createBrowserClient } from '@/app/lib/auth';

interface ForbiddenPattern {
  id: string;
  pattern_type: string;
  pattern_text: string;
  description?: string;
  created_at: string;
}

interface StyleForbiddenPatternsProps {
  styleId: string;
  styleName: string;
  onClose?: () => void;
}

const PATTERN_TYPES = [
  { value: 'opening_phrase', label: 'Opening Phrase', placeholder: 'e.g., "What I ended up doing was"' },
  { value: 'vocabulary', label: 'Specific Words', placeholder: 'e.g., "algorithm", "implementation"' },
  { value: 'theme', label: 'Theme/Topic', placeholder: 'e.g., "coding", "technical jargon"' },
  { value: 'emoji_usage', label: 'Emoji Pattern', placeholder: 'e.g., "excessive emojis", "specific emoji"' },
  { value: 'punctuation', label: 'Punctuation Style', placeholder: 'e.g., "!!!", "..."' },
  { value: 'phrase', label: 'Common Phrase', placeholder: 'e.g., "to be honest", "literally"' },
];

export function StyleForbiddenPatterns({ styleId, styleName, onClose }: StyleForbiddenPatternsProps) {
  const [patterns, setPatterns] = useState<ForbiddenPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newPattern, setNewPattern] = useState({
    type: 'opening_phrase',
    text: '',
    description: ''
  });

  const supabase = createBrowserClient();

  useEffect(() => {
    loadPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleId]);

  const loadPatterns = async () => {
    try {
      const { data, error } = await supabase
        .from('style_forbidden_patterns')
        .select('*')
        .eq('style_id', styleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatterns(data || []);
    } catch (error) {
      console.error('Failed to load forbidden patterns:', error);
      toast.error('Failed to load forbidden patterns');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newPattern.text.trim()) {
      toast.error('Please enter a pattern to block');
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await supabase.rpc('add_forbidden_pattern', {
        p_style_id: styleId,
        p_pattern_type: newPattern.type,
        p_pattern_text: newPattern.text.trim(),
        p_description: newPattern.description.trim() || null
      });

      if (error) throw error;

      toast.success('Pattern blocked successfully');
      setNewPattern({ type: 'opening_phrase', text: '', description: '' });
      await loadPatterns();
    } catch (error) {
      console.error('Failed to add forbidden pattern:', error);
      toast.error('Failed to add forbidden pattern');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (patternId: string) => {
    try {
      const { error } = await supabase
        .from('style_forbidden_patterns')
        .delete()
        .eq('id', patternId);

      if (error) throw error;

      setPatterns(patterns.filter(p => p.id !== patternId));
      toast.success('Pattern removed');
    } catch (error) {
      console.error('Failed to delete pattern:', error);
      toast.error('Failed to remove pattern');
    }
  };

  const selectedType = PATTERN_TYPES.find(t => t.value === newPattern.type);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Ban className="w-5 h-5" />
            Forbidden Patterns
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Block specific patterns from &quot;{styleName}&quot; style
          </p>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Info Alert */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">Immediate Effect</p>
            <p>Patterns you block here will be immediately excluded from all future replies. No retraining needed!</p>
          </div>
        </div>
      </div>

      {/* Add New Pattern */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pattern-type">Pattern Type</Label>
            <Select
              value={newPattern.type}
              onValueChange={(value) => setNewPattern({ ...newPattern, type: value })}
            >
              <SelectTrigger id="pattern-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PATTERN_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="pattern-text">Pattern to Block</Label>
            <Input
              id="pattern-text"
              placeholder={selectedType?.placeholder}
              value={newPattern.text}
              onChange={(e) => setNewPattern({ ...newPattern, text: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="pattern-description">Description (optional)</Label>
          <Input
            id="pattern-description"
            placeholder="Why are you blocking this pattern?"
            value={newPattern.description}
            onChange={(e) => setNewPattern({ ...newPattern, description: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <Button
          onClick={handleAdd}
          disabled={adding || !newPattern.text.trim()}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Block Pattern
        </Button>
      </div>

      {/* Pattern List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading patterns...
          </div>
        ) : patterns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No patterns blocked yet. Add patterns above to prevent them from appearing in your replies.
          </div>
        ) : (
          patterns.map((pattern) => {
            const type = PATTERN_TYPES.find(t => t.value === pattern.pattern_type);
            return (
              <div
                key={pattern.id}
                className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {type?.label || pattern.pattern_type}
                    </span>
                  </div>
                  <p className="font-medium text-sm">{pattern.pattern_text}</p>
                  {pattern.description && (
                    <p className="text-xs text-muted-foreground mt-1">{pattern.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(pattern.id)}
                  className="ml-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}