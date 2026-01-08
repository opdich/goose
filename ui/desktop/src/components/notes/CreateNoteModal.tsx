import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSessions, createNote as createNoteApi } from '../../api/sdk.gen';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Checkbox } from '@radix-ui/themes';
import { ScrollArea } from '../ui/scroll-area';

interface Session {
  id: string;
  name: string;
  updated_at: string;
}

export const CreateNoteModal: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSessions = async () => {
      try {
        console.log('Loading sessions...');
        const response = await listSessions();
        console.log('Sessions response:', response);
        if (response.data?.sessions) {
          console.log('Found sessions:', response.data.sessions.length);
          setSessions(response.data.sessions);
        } else {
          console.log('No sessions in response');
        }
      } catch (err) {
        console.error('Error loading sessions:', err);
        setError(`Failed to load sessions: ${err}`);
      }
    };
    loadSessions();
  }, []);

  const toggleSession = (sessionId: string) => {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    console.log('handleCreate called, selected sessions:', Array.from(selectedSessions));

    if (selectedSessions.size === 0) {
      window.alert('Please select at least one session');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Creating note with sessions:', Array.from(selectedSessions));
      const response = await createNoteApi({
        body: {
          session_ids: Array.from(selectedSessions),
          title: title || undefined,
        },
      });

      console.log('Note created:', response);
      if (response.data?.note) {
        console.log('Navigating to note:', response.data.note.id);
        navigate(`/notes/${response.data.note.id}`);
      } else {
        console.error('No note in response');
        setError('Note was created but response was empty');
      }
    } catch (err) {
      console.error('Error creating note:', err);
      setError(`Failed to create note: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/notes');
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Note</DialogTitle>
          <DialogDescription>
            Select the conversations you want to include in this note. Goose will organize the
            content by topic.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-textStandard mb-1">
              Title (optional)
            </label>
            <Input
              id="title"
              placeholder="Goose will generate a title if left blank"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <label className="block text-sm font-medium text-textStandard mb-2">
              Select Sessions ({selectedSessions.size} selected)
            </label>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            <div className="flex-1 min-h-0 mt-2">
              <ScrollArea className="h-64 border rounded-md">
                <div className="p-4 space-y-2">
                  {sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {loading
                        ? 'Loading sessions...'
                        : 'No sessions found. Create a conversation first.'}
                    </p>
                  ) : (
                    sessions.map((session) => (
                      <div key={session.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={session.id}
                          checked={selectedSessions.has(session.id)}
                          onCheckedChange={() => toggleSession(session.id)}
                          disabled={loading}
                        />
                        <label
                          htmlFor={session.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {session.name}
                          <span className="text-xs text-muted-foreground ml-2">
                            {new Date(session.updated_at).toLocaleDateString()}
                          </span>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || selectedSessions.size === 0}
            title={selectedSessions.size === 0 ? 'Select at least one session' : ''}
          >
            {loading
              ? 'Creating Note...'
              : `Create Note${selectedSessions.size > 0 ? ` (${selectedSessions.size} session${selectedSessions.size > 1 ? 's' : ''})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
