import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Image } from 'lucide-react';
import { ChatSmart, Attach, Send } from '../../icons';
import { Button } from '../../ui/button';

interface NoteInputProps {
  onClose: () => void;
}

export const NoteInput: React.FC<NoteInputProps> = ({ onClose }) => {
  const [noteInputValue, setNoteInputValue] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmitNote = useCallback(async () => {
    if (!noteInputValue.trim() || isSendingNote) return;

    setIsSendingNote(true);
    try {
      await window.electron.sendMessageToMainChat(noteInputValue.trim());
      setNoteInputValue('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } catch (error) {
      console.error('Failed to send note:', error);
    } finally {
      setIsSendingNote(false);
    }
  }, [noteInputValue, isSendingNote]);

  const handleScreenshotClick = useCallback(async () => {
    try {
      const dataUrl = await window.electron.captureScreenshotNative();
      if (dataUrl) {
        const uniqueId = `screenshot-${Date.now()}`;
        const result = await window.electron.saveDataUrlToTemp(dataUrl, uniqueId);
        if (result.filePath) {
          await window.electron.sendMessageToMainChat(noteInputValue.trim() || '', [
            result.filePath,
          ]);
          setNoteInputValue('');
          setTimeout(() => {
            inputRef.current?.focus();
          }, 50);
        }
      }
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }
  }, [noteInputValue]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitNote();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [handleSubmitNote, onClose]
  );

  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [onClose]);

  return (
    <div className="w-full flex items-center">
      <button
        onClick={onClose}
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
            onClick={() => {}}
            disabled={false}
            variant="ghost"
            size="sm"
            className={`flex items-center justify-center text-text-default/70 hover:text-text-default text-xs transition-colors rounded-full !px-2 cursor-pointer`}
          >
            <Attach className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            onClick={handleScreenshotClick}
            disabled={false}
            variant="ghost"
            size="sm"
            className={`flex items-center justify-center text-text-default/70 hover:text-text-default text-xs transition-colors rounded-full !px-2 cursor-pointer`}
          >
            <Image className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            onClick={handleSubmitNote}
            disabled={!noteInputValue.trim() || isSendingNote}
            variant="ghost"
            size="sm"
            className={`flex items-center justify-center text-text-default/70 hover:text-text-default text-xs transition-colors rounded-full !px-2 ${
              !noteInputValue.trim() || isSendingNote
                ? 'cursor-not-allowed opacity-50 border border-transparent'
                : 'bg-slate-600 text-white hover:bg-slate-700 hover:text-white border border-slate-600 hover:cursor-pointer'
            }`}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
