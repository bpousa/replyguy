'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const loadingMessages = [
  "Reply Guy is crafting the perfect response...",
  "Analyzing tweet vibes and cooking up something good...",
  "Making sure this doesn't sound like a robot wrote it...",
  "Checking if this needs a spicy meme...",
  "Adding just the right amount of personality...",
  "Ensuring maximum engagement potential...",
  "Channeling your inner Twitter genius...",
  "Applying advanced human mimicry algorithms..."
];

export function LoadingReplyGuy() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      {/* Animated Reply Guy Character */}
      <div className="relative w-32 h-32">
        {/* Head */}
        <motion.div
          className="absolute inset-0"
          animate={{
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <svg viewBox="0 0 128 128" className="w-full h-full">
            {/* Face */}
            <circle cx="64" cy="64" r="40" fill="#a78bfa" />
            
            {/* Eyes */}
            <motion.g
              animate={{
                scaleY: [1, 0.1, 1]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatDelay: 1
              }}
            >
              <circle cx="50" cy="55" r="5" fill="#1f2937" />
              <circle cx="78" cy="55" r="5" fill="#1f2937" />
            </motion.g>
            
            {/* Thinking dots */}
            <motion.g
              animate={{
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                staggerChildren: 0.2
              }}
            >
              <circle cx="90" cy="40" r="3" fill="#e9d5ff" />
              <circle cx="98" cy="35" r="4" fill="#e9d5ff" />
              <circle cx="106" cy="30" r="5" fill="#e9d5ff" />
            </motion.g>
            
            {/* Smile */}
            <motion.path
              d="M 45 75 Q 64 85 83 75"
              stroke="#1f2937"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              animate={{
                d: [
                  "M 45 75 Q 64 85 83 75",
                  "M 45 70 Q 64 80 83 70",
                  "M 45 75 Q 64 85 83 75"
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity
              }}
            />
          </svg>
        </motion.div>
        
        {/* Spinning gears around head */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <svg viewBox="0 0 128 128" className="w-full h-full">
            <g opacity="0.3">
              <circle cx="20" cy="64" r="8" fill="#7c3aed" />
              <circle cx="108" cy="64" r="8" fill="#7c3aed" />
              <circle cx="64" cy="20" r="8" fill="#7c3aed" />
              <circle cx="64" cy="108" r="8" fill="#7c3aed" />
            </g>
          </svg>
        </motion.div>
      </div>

      {/* Loading message */}
      <motion.p
        key={messageIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5 }}
        className="text-center text-gray-600 dark:text-gray-400 max-w-md"
      >
        {loadingMessages[messageIndex]}
      </motion.p>

      {/* Progress dots */}
      <div className="flex space-x-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-purple-400 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
      </div>
    </div>
  );
}