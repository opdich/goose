import { useEffect, useRef } from 'react';

interface UseOverlayOpacityProps {
  isDialogOpen: boolean;
}

export const useOverlayOpacity = ({ isDialogOpen }: UseOverlayOpacityProps) => {
  const isHoveringRef = useRef(false);

  useEffect(() => {
    if (isDialogOpen) {
      window.electron.setOverlayOpacity(1.0);
    } else {
      if (!isHoveringRef.current) {
        window.electron.setOverlayOpacity(0.3);
      }
    }
  }, [isDialogOpen]);

  const handleMouseEnter = () => {
    isHoveringRef.current = true;
    window.electron.setOverlayOpacity(1.0);
  };

  const handleMouseLeave = () => {
    isHoveringRef.current = false;
    if (!isDialogOpen) {
      window.electron.setOverlayOpacity(0.3);
    }
  };

  return {
    handleMouseEnter,
    handleMouseLeave,
  };
};
