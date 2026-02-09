
import React, { useState } from 'react';
import { Loader2, ImageOff } from 'lucide-react';

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
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-zinc-700">
          <ImageOff size={40} className="mb-2" />
          <span className="text-[10px] font-black uppercase tracking-widest">Load Failed</span>
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
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 protected-image ${loading ? 'opacity-0' : 'opacity-100'}`}
          onDragStart={handleDragStart}
          draggable={false}
        />
      )}

      {/* Security Overlay */}
      <div className="absolute inset-0 bg-transparent select-none" />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-300 flex items-center justify-center pointer-events-none border border-white/5">
        <span className="text-white font-black text-[10px] tracking-[0.4em] uppercase shadow-2xl">ELBEK DESIGN</span>
      </div>
    </div>
  );
};
