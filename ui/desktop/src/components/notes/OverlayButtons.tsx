import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Image, FolderOpen } from 'lucide-react';
import { ChatSmart, Microphone } from '../icons';

interface OverlayButton {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

interface Session {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
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
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [currentSessionName, setCurrentSessionName] = useState<string>('');
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const buttons: OverlayButton[] = useMemo(
    () => [
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
        label: 'Explorations in AI design UX',
        onClick: onChangeSession,
      },
    ],
    [onAddNote, onDictate, onScreenshot, onChangeSession]
  );

  useEffect(() => {
    const fetchSessionName = async () => {
      try {
        const [sessionId, sessions] = await Promise.all([
          window.electron.getMainWindowSession(),
          window.electron.listRecentSessions(),
        ]);

        if (sessionId && sessions) {
          const currentSession = (sessions as Session[]).find((s) => s.id === sessionId);
          if (currentSession?.name) {
            setCurrentSessionName(currentSession.name);
          }
        }
      } catch (error) {
        console.error('Failed to fetch session name:', error);
      }
    };

    fetchSessionName();
  }, []);

  useEffect(() => {
    console.log('focusedIndex changed to:', focusedIndex);
  }, [focusedIndex]);

  const handleOverlayHover = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      console.log('Expanding overlay');
      setIsExpanded(true);
      window.electron.resizeOverlayWindow(600, 60);
      setTimeout(() => {
        console.log('Focusing container');
        containerRef.current?.focus();
      }, 100);
    }, 2000);
  };

  const handleOverlayLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
      setFocusedIndex(0);
      window.electron.resizeOverlayWindow(60, 60);
    }, 500);
  };

  const handleButtonClick = useCallback((onClick: () => void) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    onClick();
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    console.log('Wheel event:', { isExpanded, deltaY: e.deltaY });
    if (!isExpanded) return;

    e.preventDefault();
    if (e.deltaY > 0) {
      console.log('Scrolling right/down, incrementing focusedIndex');
      setFocusedIndex((prev) => (prev + 1) % buttons.length);
    } else if (e.deltaY < 0) {
      console.log('Scrolling left/up, decrementing focusedIndex');
      setFocusedIndex((prev) => (prev - 1 + buttons.length) % buttons.length);
    }
  };

  useEffect(() => {
    if (!isExpanded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('Keydown event:', { key: e.key, isExpanded });
      if (e.key === 'ArrowRight') {
        console.log('ArrowRight pressed, incrementing focusedIndex');
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % buttons.length);
      } else if (e.key === 'ArrowLeft') {
        console.log('ArrowLeft pressed, decrementing focusedIndex');
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + buttons.length) % buttons.length);
      } else if (e.key === 'Enter') {
        console.log('Enter pressed, activating button at focusedIndex:', focusedIndex);
        e.preventDefault();
        handleButtonClick(buttons[focusedIndex].onClick);
      }
    };

    console.log('Adding keyboard event listener, isExpanded:', isExpanded);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      console.log('Removing keyboard event listener');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded, focusedIndex, buttons, handleButtonClick]);

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="min-h-[60px] p-2 outline-none"
      onMouseEnter={handleOverlayHover}
      onMouseLeave={handleOverlayLeave}
      onWheel={handleWheel}
    >
      <div className="flex flex-row items-center">
        {buttons.map((button, index) => {
          const isFocused = isExpanded && focusedIndex === index;
          const isSessionButton = button.id === 'change-session';

          return (
            <button
              key={button.id}
              onClick={() => handleButtonClick(button.onClick)}
              className={`bg-transparent border-none p-3 rounded-xl cursor-pointer flex items-center transition-all duration-200 ${
                isFocused ? 'bg-slate-200 ring-2 ring-slate-400' : 'hover:bg-black/5'
              }`}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <div className="text-gray-700 flex-shrink-0 leading-none">{button.icon}</div>
              {isSessionButton ? (
                <div
                  className="text-sm font-normal text-gray-700 whitespace-nowrap overflow-hidden transition-all duration-300"
                  style={{
                    maxWidth: isExpanded ? '400px' : '0',
                    opacity: isExpanded ? 1 : 0,
                    marginLeft: isExpanded ? '12px' : '0',
                  }}
                >
                  {currentSessionName || button.label}
                </div>
              ) : (
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
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
