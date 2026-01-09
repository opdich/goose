import React, { useState, useEffect, useRef } from 'react';
import { Mic, Image, FolderOpen } from 'lucide-react';
import { ChatSmart } from '../icons';
import { AddNoteDialog } from './AddNoteDialog';
import { DictateDialog } from './DictateDialog';
import { SessionSwitcher } from './SessionSwitcher';
import { ScreenshotCapture } from './ScreenshotCapture';

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
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const buttons: OverlayButton[] = [
    {
      id: 'add-note',
      icon: <ChatSmart className="w-5 h-5" />,
      label: 'Add note',
      onClick: () => setShowAddNote(true),
    },
    {
      id: 'dictate',
      icon: <Mic className="w-5 h-5" />,
      label: 'Dictate',
      onClick: () => setShowDictate(true),
    },
    {
      id: 'screenshot',
      icon: <Image className="w-5 h-5" />,
      label: 'Screenshot',
      onClick: () => setShowScreenshot(true),
    },
    {
      id: 'change-project',
      icon: <FolderOpen className="w-5 h-5" />,
      label: 'Change project',
      onClick: () => setShowSessionSwitcher(true),
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
                  fontWeight: 500,
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

      {showAddNote && <AddNoteDialog onClose={() => setShowAddNote(false)} />}
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
