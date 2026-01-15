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
  const [hasNavigated, setHasNavigated] = useState(false);
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
        label: currentSessionName || 'Change session',
        onClick: onChangeSession,
      },
    ],
    [onAddNote, onDictate, onScreenshot, onChangeSession, currentSessionName]
  );

  const navigableButtonsCount = 3;

  const fetchSessionName = useCallback(async () => {
    try {
      const [sessionId, sessions] = await Promise.all([
        window.electron.getMainWindowSession(),
        window.electron.listRecentSessions(),
      ]);

      if (sessionId && sessions) {
        const currentSession = (sessions as Session[]).find((s) => s.id === sessionId);
        setCurrentSessionName(currentSession?.name || '');
      } else {
        setCurrentSessionName('');
      }
    } catch (error) {
      console.error('Failed to fetch session name:', error);
      setCurrentSessionName('');
    }
  }, []);

  useEffect(() => {
    fetchSessionName();
  }, [fetchSessionName]);

  useEffect(() => {
    if (isExpanded) {
      fetchSessionName();
    }
  }, [isExpanded, fetchSessionName]);

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
      window.electron.resizeOverlayWindow(550, 60);
      setTimeout(() => {
        console.log('Focusing container');
        containerRef.current?.focus();
      }, 100);
    }, 250);
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
      setHasNavigated(false);
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
    setHasNavigated(true);
    if (e.deltaY > 0) {
      console.log('Scrolling right/down, incrementing focusedIndex');
      setFocusedIndex((prev) => (prev + 1) % navigableButtonsCount);
    } else if (e.deltaY < 0) {
      console.log('Scrolling left/up, decrementing focusedIndex');
      setFocusedIndex((prev) => (prev - 1 + navigableButtonsCount) % navigableButtonsCount);
    }
  };

  useEffect(() => {
    if (!isExpanded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('Keydown event:', { key: e.key, isExpanded });
      if (e.key === 'ArrowRight') {
        console.log('ArrowRight pressed, incrementing focusedIndex');
        e.preventDefault();
        setHasNavigated(true);
        setFocusedIndex((prev) => (prev + 1) % navigableButtonsCount);
      } else if (e.key === 'ArrowLeft') {
        console.log('ArrowLeft pressed, decrementing focusedIndex');
        e.preventDefault();
        setHasNavigated(true);
        setFocusedIndex((prev) => (prev - 1 + navigableButtonsCount) % navigableButtonsCount);
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
      className="min-h-[60px] w-screen p-2 outline-none"
      onMouseEnter={handleOverlayHover}
      onMouseLeave={handleOverlayLeave}
      onWheel={handleWheel}
    >
      <div className="flex flex-row items-center w-full max-w-full gap-1">
        {buttons.map((button, index) => {
          const isFocused = isExpanded && hasNavigated && focusedIndex === index;
          const isSessionButton = button.id === 'change-session';

          return (
            <React.Fragment key={button.id}>
              {isSessionButton && isExpanded && <div className="w-px h-6 bg-border-default" />}
              <button
                onClick={() => handleButtonClick(button.onClick)}
                className={`bg-transparent border-none p-3 rounded-xl cursor-pointer flex items-center transition-all duration-200 ${
                  isFocused ? 'bg-slate-200 ring-2 ring-slate-400' : 'hover:bg-black/5'
                } ${isSessionButton && isExpanded ? 'flex-1 min-w-0 max-w-full overflow-hidden' : 'flex-shrink-0'}`}
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                <div className="text-gray-700 flex-shrink-0 leading-none">{button.icon}</div>
                {isSessionButton ? (
                  <div
                    className="text-left text-sm font-normal text-gray-700 transition-all duration-300 truncate flex-1 min-w-0"
                    style={{
                      opacity: isExpanded ? 1 : 0,
                      marginLeft: isExpanded ? '12px' : '0',
                      maxWidth: isExpanded ? '100%' : '0',
                    }}
                  >
                    {button.label}
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
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
