'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Target, Zap, Trophy } from 'lucide-react';
import { Progress } from './ui/progress';
import { Button } from './ui/button';

interface DailyGoalTrackerProps {
  currentCount: number;
  goal: number;
  onGoalChange?: (newGoal: number) => void;
}

export function DailyGoalTracker({ 
  currentCount, 
  goal, 
  onGoalChange 
}: DailyGoalTrackerProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState(goal);
  const [hasTriggeredCelebration, setHasTriggeredCelebration] = useState(false);
  const percentage = Math.min((currentCount / goal) * 100, 100);
  const isCompleted = currentCount >= goal;

  useEffect(() => {
    // Only trigger celebration once when goal is first completed
    if (isCompleted && !hasTriggeredCelebration) {
      setShowCelebration(true);
      setHasTriggeredCelebration(true);
      triggerCelebration();
    }
    
    // Reset when count goes below goal
    if (!isCompleted && hasTriggeredCelebration) {
      setHasTriggeredCelebration(false);
    }
  }, [isCompleted, hasTriggeredCelebration]);

  const triggerCelebration = () => {
    // Trigger confetti
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };

  const handleSaveGoal = () => {
    if (tempGoal >= 1 && tempGoal <= 100) {
      onGoalChange?.(tempGoal);
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}`}>
            {isCompleted ? <Trophy className="w-5 h-5" /> : <Target className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Daily Goal
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {currentCount} of {goal} replies today
            </p>
          </div>
        </div>
        
        {!isEditing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-gray-500 hover:text-gray-700"
          >
            Edit
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="100"
              value={tempGoal}
              onChange={(e) => setTempGoal(parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-1 text-sm border rounded-md"
            />
            <Button size="sm" onClick={handleSaveGoal}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setTempGoal(goal);
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Progress value={percentage} className="h-3" />
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {percentage.toFixed(0)}% complete
          </span>
          {isCompleted && (
            <span className="text-green-600 font-medium flex items-center gap-1">
              <Zap className="w-4 h-4" />
              Goal achieved!
            </span>
          )}
        </div>
      </div>

      {/* Celebration Animation */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50" 
              onClick={() => setShowCelebration(false)}
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.5 }}
              className="relative z-10 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowCelebration(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close celebration"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 10, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 0.5, repeat: 3 }}
              >
                <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Daily Goal Achieved! 🎉
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                You&apos;ve hit {goal} replies today. Keep crushing it!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}