import React, { useState, useEffect } from 'react';
import { SessionSwitcher } from './SessionSwitcher';
import { ScreenshotCapture } from './ScreenshotCapture';
import { NoteInput } from './NoteInput';
import { DictateMode } from './DictateMode';
import { OverlayButtons } from './OverlayButtons';
import { useOverlayOpacity } from '../../hooks/useOverlayOpacity';

export const OverlayWindow: React.FC = () => {
  const [showAddNote, setShowAddNote] = useState(false);
  const [showDictate, setShowDictate] = useState(false);
  const [showSessionSwitcher, setShowSessionSwitcher] = useState(false);
  const [showScreenshot, setShowScreenshot] = useState(false);

  const isDialogOpen = showAddNote || showDictate || showScreenshot || showSessionSwitcher;
  const { handleMouseEnter, handleMouseLeave } = useOverlayOpacity({ isDialogOpen });

  useEffect(() => {
    document.body.style.backgroundColor = 'transparent';

    const dragRegion = document.querySelector('.titlebar-drag-region') as HTMLElement;
    if (dragRegion) {
      dragRegion.style.display = 'none';
    }
  }, []);

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

  const handleAddNoteClick = () => {
    setShowAddNote(true);
    window.electron.resizeOverlayWindow(500, 60);
  };

  const handleDictateClick = () => {
    setShowDictate(true);
  };

  const handleScreenshotClick = () => {
    setShowScreenshot(true);
  };

  const handleChangeProjectClick = () => {
    setShowSessionSwitcher(true);
  };

  const handleCloseNote = () => {
    setShowAddNote(false);
    window.electron.resizeOverlayWindow(60, 196);
  };

  const handleCloseDictate = () => {
    setShowDictate(false);
    window.electron.resizeOverlayWindow(60, 196);
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="w-screen h-screen bg-transparent flex items-start justify-start p-0 m-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {showAddNote ? (
        <NoteInput onClose={handleCloseNote} />
      ) : showDictate ? (
        <DictateMode onClose={handleCloseDictate} autoStart={true} />
      ) : (
        <OverlayButtons
          onAddNote={handleAddNoteClick}
          onDictate={handleDictateClick}
          onScreenshot={handleScreenshotClick}
          onChangeProject={handleChangeProjectClick}
        />
      )}

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
