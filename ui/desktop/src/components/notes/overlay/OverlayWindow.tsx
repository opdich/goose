import React, { useState, useEffect } from 'react';
import { SessionSwitcherInline } from './SessionSwitcherInline';
import { NoteInput } from './NoteInput';
import { DictateMode } from './DictateMode';
import { OverlayButtons } from './OverlayButtons';

export const OverlayWindow: React.FC = () => {
  const [showAddNote, setShowAddNote] = useState(false);
  const [showDictate, setShowDictate] = useState(false);
  const [showSessionSwitcher, setShowSessionSwitcher] = useState(false);
  // Once a tool has been opened, keep the buttons expanded when returning
  const [shouldShowExpanded, setShouldShowExpanded] = useState(false);

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
    setShouldShowExpanded(true);
    setShowAddNote(true);
    window.electron.resizeOverlayWindow(550, 60);
  };

  const handleDictateClick = () => {
    setShouldShowExpanded(true);
    setShowDictate(true);
  };

  const handleScreenshotClick = async () => {
    try {
      setShouldShowExpanded(true);
      // Collapse the overlay to just show the icon
      window.electron.resizeOverlayWindow(60, 60);

      // Small delay to let the resize complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Trigger native macOS screenshot selector
      const dataUrl = await window.electron.captureScreenshotNative();

      // If user cancelled, dataUrl will be null
      if (dataUrl) {
        await handleScreenshotCapture(dataUrl);
      }
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }
  };

  const handleChangeProjectClick = () => {
    setShouldShowExpanded(true);
    setShowSessionSwitcher(true);
    window.electron.resizeOverlayWindow(500, 196);
  };

  const handleCloseNote = () => {
    setShowAddNote(false);
    window.electron.resizeOverlayWindow(550, 60);
  };

  const handleCloseDictate = () => {
    setShowDictate(false);
    window.electron.resizeOverlayWindow(550, 60);
  };

  const handleCloseSessionSwitcher = () => {
    setShowSessionSwitcher(false);
    window.electron.resizeOverlayWindow(550, 60);
  };

  return (
    <div
      className="w-screen h-screen bg-transparent flex items-start justify-start p-0 m-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {showAddNote ? (
        <NoteInput onClose={handleCloseNote} />
      ) : showDictate ? (
        <DictateMode onClose={handleCloseDictate} autoStart={true} />
      ) : showSessionSwitcher ? (
        <SessionSwitcherInline onClose={handleCloseSessionSwitcher} />
      ) : (
        <OverlayButtons
          onAddNote={handleAddNoteClick}
          onDictate={handleDictateClick}
          onScreenshot={handleScreenshotClick}
          onChangeSession={handleChangeProjectClick}
          initialExpanded={shouldShowExpanded}
        />
      )}
    </div>
  );
};
