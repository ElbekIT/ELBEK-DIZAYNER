
import React from 'react';

interface ProtectedImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const ProtectedImage: React.FC<ProtectedImageProps> = ({ src, alt, className }) => {
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className={`relative overflow-hidden group ${className}`} onContextMenu={handleContextMenu}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 protected-image"
        onDragStart={handleDragStart}
        draggable={false}
      />
      {/* Invisible overlay for extra protection */}
      <div className="absolute inset-0 bg-transparent" />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
        <span className="text-white font-medium text-sm tracking-widest uppercase">Elbek Design</span>
      </div>
    </div>
  );
};
