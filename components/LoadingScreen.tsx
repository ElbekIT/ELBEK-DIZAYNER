
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const LoadingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 800);
          return 100;
        }
        return prev + 1;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="text-center"
      >
        <div className="relative mb-8">
          <div className="w-24 h-24 border-2 border-zinc-800 rounded-full flex items-center justify-center">
             <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-t-2 border-blue-500 rounded-full"
             />
             <span className="text-2xl font-black text-white italic">ED</span>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold tracking-[0.2em] text-white uppercase mb-4">
          Elbek Design
        </h1>
        
        <div className="w-64 h-1 bg-zinc-900 rounded-full overflow-hidden relative">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-blue-600"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
          />
        </div>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-xs tracking-widest text-zinc-500 uppercase"
        >
          Elevating Your Presence... {progress}%
        </motion.p>
      </motion.div>
    </div>
  );
};
