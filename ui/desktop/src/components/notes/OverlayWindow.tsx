import React, { useState, useEffect, useRef } from 'react';
import { Image, FolderOpen } from 'lucide-react';
import { ChatSmart, Attach, Send, Microphone } from '../icons';
import { DictateDialog } from './DictateDialog';
import { SessionSwitcher } from './SessionSwitcher';
import { ScreenshotCapture } from './ScreenshotCapture';
import { Button } from '../ui/button';

interface OverlayButton {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

export const OverlayWindow: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showDictate, setShowDictate] = useState(false);
  const [showSessionSwitcher, setShowSessionSwitcher] = useState(false);
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [noteInputValue, setNoteInputValue] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Log for debugging
  useEffect(() => {
    console.log('OverlayWindow mounted');
    // Make window visible immediately
    document.body.style.backgroundColor = 'transparent';

    // Hide the titlebar-drag-region for overlay window
    const dragRegion = document.querySelector('.titlebar-drag-region') as HTMLElement;
    if (dragRegion) {
      dragRegion.style.display = 'none';
    }
  }, []);

  const handleOverlayHover = () => {
    // Don't expand if any dialog/input mode is open
    if (showAddNote || showDictate || showScreenshot || showSessionSwitcher) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsExpanded(true);
      // Resize window to show expanded text
      window.electron.resizeOverlayWindow(166, 196);
    }, 1000);
  };

  const handleOverlayLeave = () => {
    // Don't collapse if any dialog/input mode is open
    if (showAddNote || showDictate || showScreenshot || showSessionSwitcher) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsExpanded(false);
    // Resize window back to collapsed size
    window.electron.resizeOverlayWindow(60, 196);
  };

  const handleScreenshotCapture = async (dataUrl: string) => {
    try {
      const uniqueId = `screenshot-${Date.now()}`;
      const result = await window.electron.saveDataUrlToTemp(dataUrl, uniqueId);
      if (result.filePath) {
        await window.electron.sendMessageToMainChat('', [result.filePath]);
      }
    } catch (error) {
      console.error('Failed to save screenshot:', error);
    }
  };

  // Handle Add Note button click
  const handleAddNoteClick = () => {
    // Clear any pending hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsExpanded(false);
    setShowAddNote(true);
    // Resize window: wider but shorter (extra width for icon and Send button text)
    window.electron.resizeOverlayWindow(500, 60);
  };

  // Handle note submission
  const handleSubmitNote = async () => {
    if (!noteInputValue.trim() || isSendingNote) return;

    setIsSendingNote(true);
    try {
      await window.electron.sendMessageToMainChat(noteInputValue.trim());
      setNoteInputValue('');
      setShowAddNote(false);
      // Resize back to original size
      window.electron.resizeOverlayWindow(60, 196);
    } catch (error) {
      console.error('Failed to send note:', error);
    } finally {
      setIsSendingNote(false);
    }
  };

  // Handle canceling note input
  const handleCancelNote = () => {
    setNoteInputValue('');
    setShowAddNote(false);
    // Resize back to original size
    window.electron.resizeOverlayWindow(60, 196);
  };

  // Handle key press in input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitNote();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelNote();
    }
  };

  // Focus input when showAddNote becomes true
  useEffect(() => {
    if (showAddNote && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [showAddNote]);

  // Global escape key handler for closing the input dialog
  useEffect(() => {
    if (!showAddNote) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelNote();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [showAddNote]);

  const buttons: OverlayButton[] = [
    {
      id: 'add-note',
      icon: <ChatSmart className="w-5 h-5" />,
      label: 'Add note',
      onClick: handleAddNoteClick,
    },
    {
      id: 'dictate',
      icon: <Microphone className="w-5 h-5" />,
      label: 'Dictate',
      onClick: () => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        setIsExpanded(false);
        setShowDictate(true);
      },
    },
    {
      id: 'screenshot',
      icon: <Image className="w-5 h-5" />,
      label: 'Screenshot',
      onClick: () => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        setIsExpanded(false);
        setShowScreenshot(true);
      },
    },
    {
      id: 'change-project',
      icon: <FolderOpen className="w-5 h-5" />,
      label: 'Change project',
      onClick: () => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        setIsExpanded(false);
        setShowSessionSwitcher(true);
      },
    },
  ];

  return (
    <div
      style={
        {
          width: '100vw',
          height: '100vh',
          backgroundColor: 'transparent',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          padding: 0,
          margin: 0,
          WebkitAppRegion: 'drag',
        } as React.CSSProperties
      }
    >
      {showAddNote ? (
        // Note input mode
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#333',
            }}
          >
            <ChatSmart className="w-5 h-5" />
          </div>
          <div
            className="flex flex-1 gap-2 h-screen bg-background-default rounded-2xl"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <input
              ref={inputRef}
              type="text"
              value={noteInputValue}
              onChange={(e) => setNoteInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Type your note..."
              disabled={isSendingNote}
              className="w-full outline-none border-none focus:ring-0 bg-transparent px-3 pr-0 py-3 text-sm text-textStandard placeholder:text-textPlaceholder"
            />
            <div className="flex items-center gap-1 pr-2">
              <Button
                type="button"
                onClick={() => {
                  console.log('attach');
                }}
                disabled={false}
                // onClick={handleFileSelect}
                // disabled={isFilePickerOpen}
                variant="ghost"
                size="sm"
                className={`flex items-center justify-center text-text-default/70 hover:text-text-default text-xs transition-colors rounded-full !px-2 cursor-pointer`}
                // className={`flex items-center justify-center text-text-default/70 hover:text-text-default text-xs transition-colors ${isFilePickerOpen ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <Attach className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                onClick={handleSubmitNote}
                disabled={!noteInputValue.trim() || isSendingNote}
                variant="ghost"
                size="sm"
                // className={`flex items-center justify-center text-text-default/70 hover:text-text-default text-xs transition-colors ${!noteInputValue.trim() || isSendingNote ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                className={`flex items-center justify-center text-text-default/70 hover:text-text-default text-xs transition-colors rounded-full !px-2 ${
                  !noteInputValue.trim() || isSendingNote
                    ? 'cursor-not-allowed opacity-50 border border-transparent'
                    : 'bg-slate-600 text-white hover:bg-slate-700 border border-slate-600 hover:cursor-pointer'
                }`}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Button mode
        <div
          style={
            {
              minWidth: '60px',
              padding: '8px',
            } as React.CSSProperties
          }
          onMouseEnter={handleOverlayHover}
          onMouseLeave={handleOverlayLeave}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {buttons.map((button) => (
              <button
                key={button.id}
                className="overlay-button"
                style={
                  {
                    backgroundColor: 'transparent',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s',
                    WebkitAppRegion: 'no-drag',
                  } as React.CSSProperties
                }
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    'rgba(0, 0, 0, 0.05)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
                onClick={button.onClick}
              >
                <div style={{ color: '#333', flexShrink: 0, lineHeight: 0 }}>{button.icon}</div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#333',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    transition: 'all 0.3s',
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
      )}

      {showDictate && <DictateDialog onClose={() => setShowDictate(false)} />}
      {showSessionSwitcher && <SessionSwitcher onClose={() => setShowSessionSwitcher(false)} />}
      {showScreenshot && (
        <ScreenshotCapture
          onClose={() => setShowScreenshot(false)}
          onCapture={handleScreenshotCapture}
        />
      )}
    </div>
  );
};
