import React from 'react';
import { motion } from 'motion/react';

export const Visualizer: React.FC<{ isListening: boolean; isSpeaking: boolean }> = ({ isListening, isSpeaking }) => {
  const bars = Array.from({ length: 20 });

  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {bars.map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"
          animate={{
            height: isListening || isSpeaking ? [10, Math.random() * 40 + 20, 10] : 4,
            opacity: isListening || isSpeaking ? 1 : 0.3,
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: i * 0.05,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};
