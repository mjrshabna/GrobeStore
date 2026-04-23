import React from 'react';
import { motion } from 'framer-motion';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading GROBE...' }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
      <div className="relative">
        {/* Animated Background Ring */}
        <motion.div
          className="absolute -inset-8 rounded-full border-2 border-blue-100"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Logo Text with Shine Effect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative text-5xl font-black tracking-tighter text-blue-600 mb-8"
        >
          GROBE
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full"
            animate={{
              translateX: ['100%', '-100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 0.5
            }}
          />
        </motion.div>
      </div>

      {/* Progress Indicator */}
      <div className="w-48 h-1 background-slate-100 rounded-full overflow-hidden relative">
        <motion.div
          className="absolute inset-0 bg-blue-600 rounded-full"
          animate={{
            left: ['-100%', '100%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-4 text-slate-500 text-xs font-bold uppercase tracking-[0.3em]"
      >
        {message}
      </motion.p>
    </div>
  );
}
