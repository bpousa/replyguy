
'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { toast } from 'react-hot-toast';
import { 
  User, 
  Plus, 
  Trash2, 
  Edit, 
  Check,
  X,
  Loader2,
  Sparkles,
  Wand2,
  AlertCircle,
  Ban
} from 'lucide-react';
import StyleRefinementDialog from './style-refinement-dialog';
import StyleAnalysisDisplay from './style-analysis-display';
import WriteStyleWizard from './write-like-me-wizard';
import { StyleForbiddenPatterns } from './style-forbidden-patterns';

interface UserStyle {
  id: string;
  name: string;
  sample_tweets: string[];
  is_active: boolean;
  analyzed_at: string | null;
  style_analysis: any;
  is_refined?: boolean;
  refined_at?: string | null;
}

export function WriteLikeMeSettings() {
  const [styles, setStyles] = useState<UserStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editingStyle, setEditingStyle] = useState<Partial<UserStyle>>({});
  const [refiningStyleId, setRefiningStyleId] = useState<string | null>(null);
  const [refiningStyleName, setRefiningStyleName] = useState<string>('');
  const [updatingStyle, setUpdatingStyle] = useState<string | null>(null);
  const [togglingActive, setTogglingActive] = useState<string | null>(null);
  const [deletingStyle, setDeletingStyle] = useState<string | null>(null);
  const [expandedStyle, setExpandedStyle] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [managingForbiddenPatterns, setManagingForbiddenPatterns] = useState<string | null>(null);

  useEffect(() => {
    loadStyles();
  }, []);

  const loadStyles = async () => {
    try {
      const response = await fetch('/api/user-style');
      const data = await response.json();
      
      if (response.ok) {
        setStyles(data.styles || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to load styles:', error);
      toast.error('Failed to load your styles');
    } finally {
      setLoading(false);
    }
  };


  const handleUpdateStyle = async (styleId: string) => {
    const style = editingStyle;
    const validSamples = style.sample_tweets?.filter(s => s.trim().length > 0);
    
    if (validSamples && validSamples.length < 10) {
      toast.error('Please provide at least 10 sample tweets for accurate analysis');
      return;
    }

    setUpdatingStyle(styleId);
    try {
      const response = await fetch('/api/user-style', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleId,
          name: style.name,
          sampleTweets: validSamples,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Style updated!');
        setStyles(styles.map(s => s.id === styleId ? data.style : s));
        setEditing(null);
        setEditingStyle({});
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update style');
    } finally {
      setUpdatingStyle(null);
    }
  };

  const handleToggleActive = async (styleId: string) => {
    setTogglingActive(styleId);
    try {
      const response = await fetch('/api/user-style', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleId,
          isActive: true,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Active style updated');
        setStyles(styles.map(s => ({
          ...s,
          is_active: s.id === styleId,
        })));
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update active style');
    } finally {
      setTogglingActive(null);
    }
  };

  const handleDeleteStyle = async (styleId: string) => {
    if (!confirm('Are you sure you want to delete this style?')) {
      return;
    }

    setDeletingStyle(styleId);
    try {
      const response = await fetch(`/api/user-style?styleId=${styleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Style deleted');
        setStyles(styles.filter(s => s.id !== styleId));
      } else {
        throw new Error('Failed to delete style');
      }
    } catch (error) {
      toast.error('Failed to delete style');
    } finally {
      setDeletingStyle(null);
    }
  };


  const addSampleField = () => {
    setEditingStyle({
      ...editingStyle,
      sample_tweets: [...(editingStyle.sample_tweets || []), ''],
    });
  };

  const updateSample = (index: number, value: string) => {
    const samples = [...(editingStyle.sample_tweets || [])];
    samples[index] = value;
    setEditingStyle({ ...editingStyle, sample_tweets: samples });
  };

  const removeSample = (index: number) => {
    const samples = (editingStyle.sample_tweets || []).filter((_, i) => i !== index);
    setEditingStyle({ ...editingStyle, sample_tweets: samples });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center mb-6">
        <User className="w-5 h-5 mr-2 text-gray-600" />
        <h2 className="text-xl font-semibold">Write Like Me™</h2>
        <span className="ml-2 bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
          Pro Feature
        </span>
      </div>

      <p className="text-gray-600 mb-6">
        Train AI on your writing style by providing sample tweets. The AI will analyze your patterns and generate replies that sound exactly like you.
      </p>

      {/* Wizard */}
      {showWizard && (
        <WriteStyleWizard
          onComplete={() => {
            setShowWizard(false);
            loadStyles();
            toast.success('Style created successfully!');
          }}
          onCancel={() => setShowWizard(false)}
        />
      )}

      {/* Create New Style */}
      {!showWizard && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create New Style
          </h3>
          
          <p className="text-gray-600 mb-4">
            Create a personalized writing style through our guided wizard. We&apos;ll analyze your tweets 
            and work with you to perfectly capture your unique voice.
          </p>
          
          <Button
            onClick={() => setShowWizard(true)}
            className="w-full"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Start Style Wizard
          </Button>
        </div>
      )}

      {/* Existing Styles */}
      {!showWizard && (
        <div className="space-y-4">
          <h3 className="font-medium">Your Styles</h3>
        
        {styles.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No styles created yet. Create your first style above!
          </p>
        ) : (
          styles.map((style) => (
            <div
              key={style.id}
              className={`border rounded-lg p-4 ${
                style.is_active ? 'border-purple-500 bg-purple-50' : ''
              }`}
            >
              {editing === style.id ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editingStyle.name || ''}
                    onChange={(e) => setEditingStyle({ ...editingStyle, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  
                  <div>
                    <Label>Sample Tweets</Label>
                    {(editingStyle.sample_tweets || []).map((sample, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <Textarea
                          value={sample}
                          onChange={(e) => updateSample(index, e.target.value)}
                          className="flex-1"
                          rows={2}
                        />
                        {(editingStyle.sample_tweets || []).length > 10 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSample(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    {(editingStyle.sample_tweets || []).length < 20 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addSampleField}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Sample
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStyle(style.id)}
                      disabled={updatingStyle === style.id}
                    >
                      {updatingStyle === style.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(null);
                        setEditingStyle({});
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        {style.name}
                        {style.is_active && (
                          <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                        {style.is_refined && (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Refined
                          </span>
                        )}
                      </h4>
                      {style.analyzed_at && (
                        <p className="text-sm text-gray-500 mt-1">
                          Analyzed: {style.style_analysis?.tone && `${style.style_analysis.tone} tone`}
                          {style.style_analysis?.formality && `, ${style.style_analysis.formality}`}
                          {style.style_analysis?.personalityTraits && style.style_analysis.personalityTraits.length > 0 && 
                            ` • ${style.style_analysis.personalityTraits.slice(0, 2).join(', ')}`}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={style.is_active}
                        onCheckedChange={() => handleToggleActive(style.id)}
                        disabled={togglingActive === style.id}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(style.id);
                          setEditingStyle(style);
                        }}
                        title="Edit style"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setManagingForbiddenPatterns(style.id)}
                        title="Manage forbidden patterns"
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteStyle(style.id)}
                        disabled={deletingStyle === style.id}
                        title="Delete style"
                      >
                        {deletingStyle === style.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                      {!style.is_refined && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setRefiningStyleId(style.id);
                            setRefiningStyleName(style.name);
                          }}
                          title="Refine this style for better accuracy"
                        >
                          <Wand2 className="w-4 h-4 text-purple-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-1">Sample tweets:</p>
                    <ul className="space-y-1">
                      {style.sample_tweets.slice(0, 3).map((sample, i) => (
                        <li key={i} className="pl-4 text-gray-500 italic">
                          &quot;{sample}&quot;
                        </li>
                      ))}
                      {style.sample_tweets.length > 3 && (
                        <li className="pl-4 text-gray-400">
                          +{style.sample_tweets.length - 3} more samples
                        </li>
                      )}
                    </ul>
                  </div>
                  
                  {style.analyzed_at && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedStyle(expandedStyle === style.id ? null : style.id)}
                      className="mt-3 w-full"
                    >
                      {expandedStyle === style.id ? 'Hide' : 'Show'} Analysis
                    </Button>
                  )}
                </>
              )}
              
              {expandedStyle === style.id && style.style_analysis && (
                <div className="mt-4">
                  <StyleAnalysisDisplay
                    analysis={style.style_analysis}
                    name={style.name}
                    isRefined={style.is_refined}
                  />
                </div>
              )}
            </div>
          ))
        )}
        </div>
      )}
      
      {/* Refinement Dialog */}
      <StyleRefinementDialog
        open={!!refiningStyleId}
        onOpenChange={(open) => {
          if (!open) {
            setRefiningStyleId(null);
            setRefiningStyleName('');
          }
        }}
        styleId={refiningStyleId || ''}
        styleName={refiningStyleName}
        onComplete={() => {
          loadStyles();
          setRefiningStyleId(null);
          setRefiningStyleName('');
          toast.success('Style refined successfully!');
        }}
      />
      
      {/* Forbidden Patterns Dialog */}
      {managingForbiddenPatterns && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-background rounded-lg shadow-lg">
            <StyleForbiddenPatterns
              styleId={managingForbiddenPatterns}
              styleName={styles.find(s => s.id === managingForbiddenPatterns)?.name || ''}
              onClose={() => setManagingForbiddenPatterns(null)}
            />
          </div>
        </div>
      )}
    </Card>
  );
}