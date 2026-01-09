import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ScreenshotCaptureProps {
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

export const ScreenshotCapture: React.FC<ScreenshotCaptureProps> = ({ onClose, onCapture }) => {
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line no-undef
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const captureScreen = async () => {
      try {
        const dataUrl = await window.electron.captureScreenshot();
        setScreenshotData(dataUrl);
      } catch (error) {
        console.error('Failed to capture screenshot:', error);
        onClose();
      }
    };

    captureScreen();
  }, [onClose]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPos({ x, y });
    setCurrentPos({ x, y });
    setIsSelecting(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPos({ x, y });
  };

  const handleMouseUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);

    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const img = imageRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    if (width < 10 || height < 10) {
      return;
    }

    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    canvas.width = width * scaleX;
    canvas.height = height * scaleY;

    ctx.drawImage(
      img,
      x * scaleX,
      y * scaleY,
      width * scaleX,
      height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedDataUrl = canvas.toDataURL('image/png');
    onCapture(croppedDataUrl);
    onClose();
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const selectionRect = {
    left: Math.min(startPos.x, currentPos.x),
    top: Math.min(startPos.y, currentPos.y),
    width: Math.abs(currentPos.x - startPos.x),
    height: Math.abs(currentPos.y - startPos.y),
  };

  if (!screenshotData) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <p className="text-white">Capturing screen...</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          backgroundImage: `url(${screenshotData})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundColor: 'black',
        }}
      >
        <img
          ref={imageRef}
          src={screenshotData}
          alt="Screenshot"
          className="w-full h-full object-contain opacity-0 pointer-events-none"
        />

        {isSelecting && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/20"
            style={{
              left: `${selectionRect.left}px`,
              top: `${selectionRect.top}px`,
              width: `${selectionRect.width}px`,
              height: `${selectionRect.height}px`,
            }}
          />
        )}

        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg">
          <p className="text-sm">Click and drag to select an area • Press ESC to cancel</p>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-black/80 text-white hover:bg-black transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </>
  );
};
