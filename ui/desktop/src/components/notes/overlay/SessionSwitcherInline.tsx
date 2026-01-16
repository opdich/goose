import React, { useState, useEffect, useCallback } from 'react';
import { FolderOpen, Clock, Plus } from 'lucide-react';
import { ScrollArea } from '../../ui/scroll-area';

interface Session {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface SessionSwitcherInlineProps {
  onClose: () => void;
}

export const SessionSwitcherInline: React.FC<SessionSwitcherInlineProps> = ({ onClose }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [sessionsData, currentId] = await Promise.all([
          window.electron.listRecentSessions(),
          window.electron.getMainWindowSession(),
        ]);
        setSessions(sessionsData as Session[]);
        setCurrentSessionId(currentId);
      } catch (error) {
        console.error('Failed to load sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      if (sessionId === currentSessionId || switching) return;

      try {
        setSwitching(true);
        await window.electron.switchMainWindowSession(sessionId);
        onClose();
      } catch (error) {
        console.error('Failed to switch session:', error);
        setSwitching(false);
      }
    },
    [currentSessionId, switching, onClose]
  );

  const handleNewChat = useCallback(async () => {
    if (switching) return;

    try {
      setSwitching(true);
      await window.electron.createNewSession();
      onClose();
    } catch (error) {
      console.error('Failed to create new session:', error);
      setSwitching(false);
    }
  }, [switching, onClose]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

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
    <div className="w-full flex items-start bg-background-muted">
      <button
        onClick={onClose}
        className="p-3 m-2 rounded-xl flex items-center justify-center text-gray-700 bg-transparent border-none cursor-pointer hover:bg-black/5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <FolderOpen className="w-5 h-5" />
      </button>
      <div
        className="flex flex-1 flex-col h-screen gap-0.5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className="bg-background-default rounded-bl-2xl p-2">
          <button
            onClick={handleNewChat}
            disabled={switching}
            className={`w-full px-3 py-2 rounded-lg text-left transition-all hover:bg-black/5 ${
              switching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <h3 className="text-sm font-normal text-gray-700">New Chat</h3>
            </div>
          </button>
        </div>

        <div className="bg-background-default rounded-tl-2xl flex-1 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-textStandard">Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-textStandard">No sessions found</p>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="space-y-1 p-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    disabled={switching || session.id === currentSessionId}
                    className={`w-full px-3 py-2 rounded-lg text-left transition-all hover:bg-black/5 ${
                      session.id === currentSessionId
                        ? 'border border-slate-600'
                        : 'border border-transparent'
                    } ${switching ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-normal text-gray-700 truncate">
                          {session.name || 'Untitled Session'}
                        </h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-textMuted" />
                          <span className="text-xs text-textMuted">
                            {formatDate(session.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
};
