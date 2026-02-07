
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const LoadingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Purely visual duration - does not block logic
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="relative mb-8 mx-auto w-24 h-24">
              <div className="w-24 h-24 border-2 border-zinc-900 rounded-full flex items-center justify-center">
                 <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-t-2 border-blue-500 rounded-full"
                 />
                 <span className="text-3xl font-black text-white italic">ED</span>
              </div>
            </div>
            
            <h1 className="text-xl font-black tracking-[0.3em] text-white uppercase mb-4">
              Elbek Designer
            </h1>
            
            <div className="w-48 h-0.5 bg-zinc-900 rounded-full overflow-hidden relative mx-auto">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-blue-600"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2 }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
