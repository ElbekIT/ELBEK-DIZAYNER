import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let value = 0;

    const animate = () => {
      const speed =
        value < 60 ? Math.random() * 3 + 1 :
        value < 90 ? Math.random() * 1.2 :
        Math.random() * 0.4;

      value = Math.min(100, value + speed);
      setProgress(Math.floor(value));

      if (value < 100) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(onComplete, 1000);
      }
    };

    animate();
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 1 }}
      >
        <div className="relative text-center">

          {/* LOGO */}
          <motion.div
            className="mx-auto mb-10 w-24 h-24 rounded-full border border-white/10
                       flex items-center justify-center backdrop-blur-md"
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          >
            <span className="text-2xl font-black italic text-white">ED</span>
          </motion.div>

          {/* CURVE LINE */}
          <svg
            width="180"
            height="260"
            viewBox="0 0 180 260"
            className="mx-auto mb-6"
          >
            <motion.path
              d="M90 10 C150 80 150 180 90 250"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: progress / 100, opacity: 1 }}
              transition={{ ease: "easeInOut" }}
            />
          </svg>

          {/* TITLE */}
          <h1 className="text-sm tracking-[0.45em] uppercase text-white/90">
            Elbek Design
          </h1>

          {/* SUBTEXT */}
          <p className="mt-2 text-xs tracking-widest text-white/40">
            Elevating your presence
          </p>

          {/* PROGRESS */}
          <motion.p
            key={progress}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-xs tracking-widest text-white/60"
          >
            {progress}%
          </motion.p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
