
import React, { useState } from 'react';
import { Loader2, ImageOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProtectedImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const ProtectedImage: React.FC<ProtectedImageProps> = ({ src, alt, className }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div 
      className={`relative overflow-hidden group bg-zinc-900/50 ${className}`} 
      onContextMenu={handleContextMenu}
    >
      <AnimatePresence>
        {loading && !error && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-20"
          >
            <div className="relative">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <div className="absolute inset-0 blur-xl bg-blue-600/20 animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-zinc-700">
          <ImageOff size={40} className="mb-2" />
          <span className="text-[10px] font-black uppercase tracking-widest">Asset Unreachable</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          className={`w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 group-hover:blur-[2px] protected-image ${loading ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}`}
          onDragStart={handleDragStart}
          draggable={false}
        />
      )}

      {/* Advanced Security Layer */}
      <div className="absolute inset-0 bg-transparent select-none z-10" />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-700 flex flex-col items-center justify-center pointer-events-none border border-white/5 z-10">
        <div className="relative">
          <span className="text-white font-black text-xs tracking-[0.6em] uppercase shadow-2xl relative z-10">ELBEK DESIGN</span>
          <div className="absolute inset-0 blur-2xl bg-blue-600/40 -z-10" />
        </div>
        <div className="mt-4 w-12 h-0.5 bg-blue-600 rounded-full" />
      </div>
    </div>
  );
};
