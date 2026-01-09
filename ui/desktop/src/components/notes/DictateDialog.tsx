import React, { useState, useCallback } from 'react';
import { X, Mic, Square } from 'lucide-react';
import { Button } from '../ui/button';
import { useWhisper } from '../../hooks/useWhisper';
import { WaveformVisualizer } from '../WaveformVisualizer';
import { toastError } from '../../toasts';

interface DictateDialogProps {
  onClose: () => void;
}

export const DictateDialog: React.FC<DictateDialogProps> = ({ onClose }) => {
  const [transcribedText, setTranscribedText] = useState('');
  const [sending, setSending] = useState(false);

  const {
    isRecording,
    isTranscribing,
    canUseDictation,
    audioContext,
    analyser,
    startRecording,
    stopRecording,
    recordingDuration,
    estimatedSize,
  } = useWhisper({
    onTranscription: (text) => {
      setTranscribedText(text);
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

  const handleSend = async () => {
    if (!transcribedText.trim()) return;

    try {
      setSending(true);
      await window.electron.sendMessageToMainChat(transcribedText.trim());
      onClose();
    } catch (error) {
      console.error('Failed to send transcription:', error);
    } finally {
      setSending(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[500px] max-w-[90vw] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Voice Dictation
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {!canUseDictation ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Voice dictation is not configured. Please set up dictation in settings.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4 mb-6">
                {isRecording && audioContext && analyser && (
                  <div className="w-full h-24">
                    <WaveformVisualizer
                      audioContext={audioContext}
                      analyser={analyser}
                      isRecording={isRecording}
                    />
                  </div>
                )}

                <div className="flex items-center gap-4">
                  {!isRecording && !isTranscribing && !transcribedText && (
                    <Button onClick={handleStartRecording} size="lg" className="gap-2">
                      <Mic className="w-5 h-5" />
                      Start Recording
                    </Button>
                  )}

                  {isRecording && (
                    <>
                      <Button
                        onClick={handleStopRecording}
                        size="lg"
                        variant="destructive"
                        className="gap-2"
                      >
                        <Square className="w-5 h-5" />
                        Stop Recording
                      </Button>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDuration(recordingDuration)}
                        {estimatedSize > 0 && ` • ${estimatedSize.toFixed(1)}MB`}
                      </div>
                    </>
                  )}

                  {isTranscribing && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">Transcribing...</div>
                  )}
                </div>
              </div>

              {transcribedText && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                      {transcribedText}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTranscribedText('');
                        handleStartRecording();
                      }}
                    >
                      Record Again
                    </Button>
                    <Button onClick={handleSend} disabled={sending}>
                      {sending ? 'Sending...' : 'Send to Chat'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
