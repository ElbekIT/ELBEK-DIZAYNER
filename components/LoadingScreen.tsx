import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let current = 0;

    const tick = () => {
      const increment =
        current < 60 ? Math.random() * 3 + 1 :
        current < 85 ? Math.random() * 1.5 :
        Math.random() * 0.6;

      current = Math.min(100, current + increment);
      setProgress(Math.floor(current));

      if (current < 100) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(onComplete, 900);
      }
    };

    tick();
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
      >
        <div className="w-full max-w-sm px-8 text-center">

          {/* LOGO */}
          <motion.div
            className="mx-auto mb-10 w-24 h-24 rounded-full border border-white/10
                       backdrop-blur-md flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <span className="text-2xl font-black italic text-white tracking-wide">
              ED
            </span>
          </motion.div>

          {/* TITLE */}
          <h1 className="text-sm tracking-[0.45em] uppercase text-white/90 mb-6">
            Elbek Design
          </h1>

          {/* BAR */}
          <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="absolute inset-y-0 left-0 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]"
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>

          {/* PERCENT */}
          <motion.p
            key={progress}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-5 text-xs tracking-widest text-white/40"
          >
            {progress}%
          </motion.p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
