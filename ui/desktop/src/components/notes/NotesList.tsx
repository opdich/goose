import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { listNotes, deleteNote } from '../../api/sdk.gen';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';

interface NoteListItem {
  id: string;
  title: string;
  updated_at: string;
}

export const NotesList: React.FC = () => {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listNotes();
      if (response.data) {
        setNotes(response.data.notes);
      }
    } catch (err) {
      setError('Failed to load notes');
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const handleDelete = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await deleteNote({ path: { id: noteId } });
      await loadNotes();
    } catch (err) {
      console.error('Error deleting note:', err);
      window.alert('Failed to delete note');
    }
  };

  const handleCreateNote = () => {
    navigate('/notes/create');
  };

  const handleNoteClick = (noteId: string) => {
    navigate(`/notes/${noteId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading notes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-8 pb-4 pt-8">
        <div className="flex flex-col page-transition">
          <div className="flex justify-between items-center mb-1">
            <h1 className="text-4xl font-light">Notes</h1>
            <Button
              onClick={handleCreateNote}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Note
            </Button>
          </div>
          <p className="text-sm text-text-muted mb-4">
            Organized notes from your conversations with Goose.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative px-8">
        <ScrollArea className="h-full">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="w-16 h-16 text-text-muted mb-4" />
              <p className="text-text-muted text-center mb-4">You haven't created any notes yet.</p>
              <Button onClick={handleCreateNote} variant="outline">
                Create your first note
              </Button>
            </div>
          ) : (
            <div className="space-y-2 p-1 pb-4">
              {notes.map((note) => (
                <Card
                  key={note.id}
                  onClick={() => handleNoteClick(note.id)}
                  className="h-full py-3 px-4 hover:shadow-default cursor-pointer transition-all duration-150 flex flex-col justify-between relative group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
                      <h3 className="text-base break-words line-clamp-2 flex-1 min-w-0">
                        {note.title}
                      </h3>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={(e) => handleDelete(note.id, e)}
                        className="p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors"
                        title="Delete note"
                      >
                        <Trash2 className="w-3 h-3 text-red-500 hover:text-red-600" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-text-muted">
                    Updated {new Date(note.updated_at).toLocaleDateString()}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};
