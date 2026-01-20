import React, { useState } from 'react';
import { X } from 'lucide-react';

interface OverlayCloseButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
}

export const OverlayCloseButton: React.FC<OverlayCloseButtonProps> = ({ icon, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="p-3 m-2 rounded-xl flex items-center justify-center text-gray-700 bg-transparent border-none cursor-pointer hover:bg-black/5"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {isHovered ? <X className="w-5 h-5" /> : icon}
    </button>
  );
};
