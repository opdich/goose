import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { listNotes, deleteNote } from '../../api/sdk.gen';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
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
    <div className="h-full min-h-0">
      <ScrollArea className="h-full">
        <div className="container mx-auto px-6 py-4 max-w-4xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">My Notes</h1>
            <Button onClick={handleCreateNote} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Note
            </Button>
          </div>

          {notes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center mb-4">
                  You haven't created any notes yet.
                </p>
                <Button onClick={handleCreateNote} variant="outline">
                  Create your first note
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <Card
                  key={note.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleNoteClick(note.id)}
                >
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div className="flex-1">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        {note.title}
                      </CardTitle>
                      <CardDescription>
                        Updated {new Date(note.updated_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(note.id, e)}
                      className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
