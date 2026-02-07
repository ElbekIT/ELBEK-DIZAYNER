
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const LoadingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsExiting(true), 500);
          setTimeout(onComplete, 1500);
          return 100;
        }
        return prev + 1;
      });
    }, 25);
    return () => clearInterval(interval);
  }, [onComplete]);

  // Panels for the staggered exit animation
  const panels = [0, 1, 2, 3, 4];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden">
      {/* Background Staggered Exit Panels */}
      <div className="absolute inset-0 flex pointer-events-none">
        {panels.map((i) => (
          <motion.div
            key={i}
            initial={{ y: 0 }}
            animate={isExiting ? { y: '-100%' } : { y: 0 }}
            transition={{
              duration: 0.8,
              ease: [0.645, 0.045, 0.355, 1],
              delay: i * 0.1
            }}
            className="flex-1 bg-zinc-950 border-r border-white/5 last:border-r-0"
          />
        ))}
      </div>

      <AnimatePresence>
        {!isExiting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            className="relative z-10 flex flex-col items-center"
          >
            {/* Main Brand Reveal */}
            <div className="relative mb-12">
              <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase leading-none select-none">
                {/* Outline Text */}
                <span 
                  className="block text-transparent stroke-white/10" 
                  style={{ WebkitTextStroke: '1px rgba(255,255,255,0.1)' }}
                >
                  ELBEK DESIGN
                </span>
                
                {/* Filled Masked Text */}
                <motion.span 
                  className="absolute inset-0 block text-blue-600 overflow-hidden"
                  initial={{ height: '0%' }}
                  animate={{ height: `${progress}%` }}
                  transition={{ ease: "linear" }}
                  style={{ clipPath: 'inset(0 0 0 0)' }}
                >
                  ELBEK DESIGN
                </motion.span>
              </h1>

              {/* Scanning Line */}
              <motion.div 
                className="absolute left-0 right-0 h-px bg-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                animate={{ top: `${progress}%` }}
                transition={{ ease: "linear" }}
              />
            </div>

            {/* Subtitle & Info */}
            <div className="flex flex-col items-center gap-4">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100px' }}
                className="h-px bg-zinc-800"
              />
              <p className="text-[10px] font-black tracking-[0.5em] text-zinc-500 uppercase">
                Initializing Creative Engine
              </p>
            </div>

            {/* Monospace Progress */}
            <div className="absolute bottom-[-15vh] right-[-5vw] md:right-[-10vw] pointer-events-none opacity-20">
               <span className="text-[15rem] md:text-[25rem] font-mono font-black text-white leading-none tracking-tighter">
                 {progress.toString().padStart(2, '0')}
               </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </div>
  );
};
