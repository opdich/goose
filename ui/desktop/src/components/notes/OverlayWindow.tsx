import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Image, FolderOpen } from 'lucide-react';
import { ChatSmart, Attach, Send, Microphone } from '../icons';
import { SessionSwitcher } from './SessionSwitcher';
import { ScreenshotCapture } from './ScreenshotCapture';
import { Button } from '../ui/button';
import { useWhisper } from '../../hooks/useWhisper';
import { toastError } from '../../toasts';

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
  const [transcribedText, setTranscribedText] = useState('');
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isHoveringRef = useRef(false);
  const transcriptionSentRef = useRef(false);
  const canceledRef = useRef(false);

  const { isRecording, isTranscribing, canUseDictation, startRecording, stopRecording } =
    useWhisper({
      onTranscription: (text) => {
        console.log('onTranscription called, text:', text, 'canceledRef:', canceledRef.current);
        // Don't set transcription if we've canceled
        if (!canceledRef.current) {
          console.log('Setting transcribed text:', text);
          setTranscribedText(text);
        } else {
          console.log('Ignoring transcription because canceled');
        }
      },
      onError: (error) => {
        toastError({
          title: 'Dictation Error',
          msg: error.message,
        });
      },
      onSizeWarning: (sizeMB) => {
        toastError({
          title: 'Recording Size Warning',
          msg: `Recording is ${sizeMB.toFixed(1)}MB. Maximum size is 25MB.`,
        });
      },
    });

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

  // Manage opacity based on interaction state
  useEffect(() => {
    // If any dialog or input is active, set full opacity
    if (showAddNote || showDictate || showScreenshot || showSessionSwitcher) {
      window.electron.setOverlayOpacity(1.0);
    } else {
      // When all dialogs close, return to low opacity only if not hovering
      if (!isHoveringRef.current) {
        window.electron.setOverlayOpacity(0.3);
      }
    }
  }, [showAddNote, showDictate, showScreenshot, showSessionSwitcher]);

  const handleMouseEnter = () => {
    isHoveringRef.current = true;
    window.electron.setOverlayOpacity(1.0);
  };

  const handleMouseLeave = () => {
    isHoveringRef.current = false;
    // Only reduce opacity if no dialogs are open
    if (!showAddNote && !showDictate && !showScreenshot && !showSessionSwitcher) {
      window.electron.setOverlayOpacity(0.3);
    }
  };

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

  // Handle Dictate button click
  const handleDictateClick = async () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsExpanded(false);
    canceledRef.current = false; // Reset cancel flag
    setShowDictate(true);
    // Resize for dictation UI - wider if not configured to show message
    window.electron.resizeOverlayWindow(canUseDictation ? 120 : 500, 60);

    // If dictation is configured, immediately start recording
    if (canUseDictation) {
      try {
        // Small delay to let the UI update before starting
        setTimeout(async () => {
          await startRecording();
        }, 100);
      } catch (error) {
        console.error('Failed to auto-start recording:', error);
      }
    }
  };

  // Handle dictation recording
  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    try {
      await stopRecording();
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }, [stopRecording]);

  // Automatically send transcription when it's ready
  useEffect(() => {
    console.log('Send effect triggered:', {
      transcribedText: transcribedText.trim(),
      showDictate,
      transcriptionSentRef: transcriptionSentRef.current,
      isTranscribing,
      canceledRef: canceledRef.current,
    });

    if (
      transcribedText.trim() &&
      showDictate &&
      !transcriptionSentRef.current &&
      !isTranscribing &&
      !canceledRef.current
    ) {
      console.log('All conditions met, sending transcription');
      transcriptionSentRef.current = true;

      const sendTranscription = async () => {
        try {
          setIsSendingNote(true);
          console.log('Sending transcription to main chat:', transcribedText.trim());
          await window.electron.sendMessageToMainChat(transcribedText.trim());

          // Clear transcription but keep dictate mode open for next recording
          setTimeout(() => {
            setTranscribedText('');
            transcriptionSentRef.current = false;
            // Don't close showDictate - stay in dictate mode
            // Don't resize - keep the same size
          }, 100);
        } catch (error) {
          console.error('Failed to send transcription:', error);
          transcriptionSentRef.current = false;
        } finally {
          setIsSendingNote(false);
        }
      };

      sendTranscription();
    }
  }, [transcribedText, showDictate, isTranscribing]);

  // Handle clicking microphone button - stops recording and sends (doesn't cancel)
  const handleCancelDictate = useCallback(async () => {
    // If recording, stop it (but don't cancel - let transcription complete and send)
    if (isRecording) {
      console.log('Microphone button clicked while recording - stopping to complete');
      try {
        await stopRecording();
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
      // Don't close the dialog yet - wait for transcription to complete and send
      return;
    }

    // If not recording, just close the dialog
    setTranscribedText('');
    setShowDictate(false);
    transcriptionSentRef.current = false;
    canceledRef.current = false; // Reset for next session
    window.electron.resizeOverlayWindow(60, 196);
  }, [isRecording, stopRecording]);

  // Handle note submission
  const handleSubmitNote = useCallback(async () => {
    if (!noteInputValue.trim() || isSendingNote) return;

    setIsSendingNote(true);
    try {
      await window.electron.sendMessageToMainChat(noteInputValue.trim());
      setNoteInputValue('');
      // Keep the input open, just clear the text and refocus
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } catch (error) {
      console.error('Failed to send note:', error);
    } finally {
      setIsSendingNote(false);
    }
  }, [noteInputValue, isSendingNote]);

  // Handle canceling note input
  const handleCancelNote = useCallback(() => {
    setNoteInputValue('');
    setShowAddNote(false);
    // Resize back to original size
    window.electron.resizeOverlayWindow(60, 196);
  }, []);

  // Handle key press in input
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitNote();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelNote();
      }
    },
    [handleSubmitNote, handleCancelNote]
  );

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
  }, [showAddNote, handleCancelNote]);

  // Global keyboard handlers for dictation
  useEffect(() => {
    if (!showDictate) return;

    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();

        // Escape always cancels (prevents transcription from sending)
        console.log('Escape pressed - canceling dictation');
        canceledRef.current = true;

        // If recording, stop it
        if (isRecording) {
          try {
            await stopRecording();
          } catch (error) {
            console.error('Failed to stop recording:', error);
          }
        }

        setTranscribedText('');
        setShowDictate(false);
        transcriptionSentRef.current = false;
        // Don't reset canceledRef here - it needs to stay true to prevent transcription
        window.electron.resizeOverlayWindow(60, 196);
      } else if (e.key === 'Enter') {
        e.preventDefault();

        // Enter toggles recording
        if (isRecording) {
          console.log('Enter pressed - stopping recording');
          try {
            await stopRecording();
          } catch (error) {
            console.error('Failed to stop recording:', error);
          }
        } else if (!isTranscribing) {
          console.log('Enter pressed - starting recording');
          try {
            await startRecording();
          } catch (error) {
            console.error('Failed to start recording:', error);
          }
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [showDictate, isRecording, isTranscribing, stopRecording, startRecording]);

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
      onClick: handleDictateClick,
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="w-screen h-screen bg-transparent flex items-start justify-start p-0 m-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {showAddNote ? (
        // Note input mode
        <div className="w-full flex items-center">
          <button
            onClick={handleCancelNote}
            className="p-3 m-2 rounded-xl flex items-center justify-center text-gray-700 bg-transparent border-none cursor-pointer hover:bg-black/5"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <ChatSmart className="w-5 h-5" />
          </button>
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
      ) : showDictate ? (
        // Dictate mode
        <div className="w-full flex items-center">
          <button
            onClick={handleCancelDictate}
            className="p-3 m-2 rounded-xl flex items-center justify-center text-gray-700 bg-transparent border-none cursor-pointer hover:bg-black/5"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <Microphone className="w-5 h-5" />
          </button>

          {!canUseDictation ? (
            <div
              className="flex flex-1 items-center h-screen bg-background-default rounded-2xl px-4 py-3"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <div className="flex-1">
                <h3 className="text-sm text-textStandard">
                  Voice Dictation is not configured. Set up in Chat Settings.
                </h3>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-4 w-full">
              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  className="w-11 h-11 rounded-full bg-white hover:border-red-700 border-3 border-red-600 border-solid transition-colors flex items-center justify-center border-none cursor-pointer"
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                  <div className="w-4 h-4 rounded-full bg-red-600" />
                </button>
              ) : (
                <button
                  onClick={handleStopRecording}
                  className="w-11 h-11 rounded-full bg-white hover:border-gray-700 border-3 border-gray-900 transition-colors flex items-center justify-center cursor-pointer"
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                  <div className="w-4 h-4 bg-gray-900 rounded-sm" />
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        // Button mode
        <div
          className="min-w-[60px] p-2"
          onMouseEnter={handleOverlayHover}
          onMouseLeave={handleOverlayLeave}
        >
          <div className="flex flex-col">
            {buttons.map((button) => (
              <button
                key={button.id}
                onClick={button.onClick}
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
