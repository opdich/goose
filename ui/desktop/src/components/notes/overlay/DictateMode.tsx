import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Microphone } from '../../icons';
import { useWhisper } from '../../../hooks/useWhisper';
import { toastError } from '../../../toasts';
import { OverlayCloseButton } from './OverlayCloseButton';

interface DictateModeProps {
  onClose: () => void;
  autoStart?: boolean;
}

export const DictateMode: React.FC<DictateModeProps> = ({ onClose, autoStart = false }) => {
  const [transcribedText, setTranscribedText] = useState('');
  const transcriptionSentRef = useRef(false);
  const canceledRef = useRef(false);
  const hasAutoStartedRef = useRef(false);
  const shouldCloseAfterSendRef = useRef(false);

  const { isRecording, isTranscribing, canUseDictation, startRecording, stopRecording } =
    useWhisper({
      onTranscription: (text) => {
        if (!canceledRef.current) {
          setTranscribedText(text);
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

  useEffect(() => {
    window.electron.resizeOverlayWindow(canUseDictation ? 120 : 500, 60);
  }, [canUseDictation]);

  useEffect(() => {
    if (autoStart && canUseDictation && !hasAutoStartedRef.current && !isRecording) {
      hasAutoStartedRef.current = true;
      const timer = setTimeout(async () => {
        try {
          await startRecording();
        } catch (error) {
          console.error('Failed to auto-start recording:', error);
        }
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [autoStart, canUseDictation, startRecording, isRecording]);

  const stopRecordingRef = useRef(stopRecording);
  const isRecordingRef = useRef(isRecording);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
    isRecordingRef.current = isRecording;
  });

  useEffect(() => {
    return () => {
      if (isRecordingRef.current && stopRecordingRef.current) {
        try {
          const result = stopRecordingRef.current();
          Promise.resolve(result).catch((err: Error) => {
            console.error('Error stopping recording on unmount:', err);
          });
        } catch (err) {
          console.error('Error stopping recording on unmount:', err);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (
      transcribedText.trim() &&
      !transcriptionSentRef.current &&
      !isTranscribing &&
      !canceledRef.current
    ) {
      transcriptionSentRef.current = true;

      const sendTranscription = async () => {
        try {
          await window.electron.sendMessageToMainChat(transcribedText.trim());

          setTimeout(() => {
            setTranscribedText('');
            transcriptionSentRef.current = false;

            if (shouldCloseAfterSendRef.current) {
              onClose();
            }
          }, 100);
        } catch (error) {
          console.error('Failed to send transcription:', error);
          transcriptionSentRef.current = false;
        }
      };

      sendTranscription();
    }
  }, [transcribedText, isTranscribing, onClose]);

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

  const handleCancel = useCallback(async () => {
    if (isRecording) {
      shouldCloseAfterSendRef.current = true;
      try {
        await stopRecording();
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
      return;
    }

    setTranscribedText('');
    transcriptionSentRef.current = false;
    canceledRef.current = false;
    shouldCloseAfterSendRef.current = false;
    onClose();
  }, [isRecording, stopRecording, onClose]);

  useEffect(() => {
    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        canceledRef.current = true;
        shouldCloseAfterSendRef.current = false;

        if (isRecording) {
          try {
            await stopRecording();
          } catch (error) {
            console.error('Failed to stop recording:', error);
          }
        }

        setTranscribedText('');
        transcriptionSentRef.current = false;
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();

        if (isRecording) {
          try {
            await stopRecording();
          } catch (error) {
            console.error('Failed to stop recording:', error);
          }
        } else if (!isTranscribing) {
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
  }, [isRecording, isTranscribing, stopRecording, startRecording, onClose]);

  return (
    <div className="w-full flex items-center bg-background-muted">
      <OverlayCloseButton icon={<Microphone className="w-5 h-5" />} onClick={handleCancel} />

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
  );
};
