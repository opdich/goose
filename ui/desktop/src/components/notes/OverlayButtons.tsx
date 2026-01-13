import React, { useRef, useState } from 'react';
import { Image, FolderOpen } from 'lucide-react';
import { ChatSmart, Microphone } from '../icons';

interface OverlayButton {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

interface OverlayButtonsProps {
  onAddNote: () => void;
  onDictate: () => void;
  onScreenshot: () => void;
  onChangeSession: () => void;
}

export const OverlayButtons: React.FC<OverlayButtonsProps> = ({
  onAddNote,
  onDictate,
  onScreenshot,
  onChangeSession,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOverlayHover = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsExpanded(true);
      window.electron.resizeOverlayWindow(170, 196);
    }, 1000);
  };

  const handleOverlayLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsExpanded(false);
    window.electron.resizeOverlayWindow(60, 196);
  };

  const handleButtonClick = (onClick: () => void) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    onClick();
  };

  const buttons: OverlayButton[] = [
    {
      id: 'add-note',
      icon: <ChatSmart className="w-5 h-5" />,
      label: 'Add note',
      onClick: onAddNote,
    },
    {
      id: 'dictate',
      icon: <Microphone className="w-5 h-5" />,
      label: 'Dictate',
      onClick: onDictate,
    },
    {
      id: 'screenshot',
      icon: <Image className="w-5 h-5" />,
      label: 'Screenshot',
      onClick: onScreenshot,
    },
    {
      id: 'change-session',
      icon: <FolderOpen className="w-5 h-5" />,
      label: 'Change session',
      onClick: onChangeSession,
    },
  ];

  return (
    <div
      className="min-w-[60px] p-2"
      onMouseEnter={handleOverlayHover}
      onMouseLeave={handleOverlayLeave}
    >
      <div className="flex flex-col">
        {buttons.map((button) => (
          <button
            key={button.id}
            onClick={() => handleButtonClick(button.onClick)}
            className="bg-transparent border-none p-3 rounded-xl cursor-pointer flex items-center transition-all duration-200 hover:bg-black/5"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <div className="text-gray-700 flex-shrink-0 leading-none">{button.icon}</div>
            <div
              className="text-sm font-normal text-gray-700 whitespace-nowrap overflow-hidden transition-all duration-300"
              style={{
                maxWidth: isExpanded ? '200px' : '0',
                opacity: isExpanded ? 1 : 0,
                marginLeft: isExpanded ? '12px' : '0',
              }}
            >
              {button.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
