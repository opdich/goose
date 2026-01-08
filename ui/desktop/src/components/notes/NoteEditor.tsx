import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Save, X } from 'lucide-react';
import { getNote, updateNote as updateNoteApi } from '../../api/sdk.gen';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import MarkdownContent from '../MarkdownContent';

interface Citation {
  session_id: string;
  message_id: string;
  citation_index: number;
}

export const NoteEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<{ id: string; title: string; content: string } | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [editing, setEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;

    const loadNote = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getNote({ path: { id } });
        if (response.data) {
          const noteData = {
            id: response.data.id,
            title: response.data.title,
            content: response.data.content,
          };
          setNote(noteData);
          setEditedTitle(noteData.title);
          setEditedContent(noteData.content);

          // Load citations
          if (response.data.citations) {
            const citationsData = response.data.citations.map(
              (c: { session_id: string; message_id: string; citation_index: number }) => ({
                session_id: c.session_id,
                message_id: c.message_id,
                citation_index: c.citation_index,
              })
            );
            console.log('Loaded citations:', citationsData);
            setCitations(citationsData);
          } else {
            console.log('No citations in response');
          }
        }
      } catch (err) {
        console.error('Error loading note:', err);
        setError('Failed to load note');
      } finally {
        setLoading(false);
      }
    };

    loadNote();
  }, [id]);

  // Add click handlers for citation links
  useEffect(() => {
    if (!contentRef.current || editing) return;

    const handleCitationClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if clicked element is an <a> tag with a citation href
      let linkElement: HTMLElement | null = null;
      if (target.tagName === 'A') {
        linkElement = target;
      } else if (target.parentElement?.tagName === 'A') {
        linkElement = target.parentElement;
      }

      if (linkElement) {
        const href = linkElement.getAttribute('href');
        console.log('Link clicked, href:', href);

        // Check if this is a citation link (format: #cite-N)
        if (href?.startsWith('#cite-')) {
          e.preventDefault();

          // Extract citation number from href like "#cite-1"
          const match = href.match(/#cite-(\d+)/);
          if (match) {
            const citationNum = parseInt(match[1]);
            console.log('Looking for citation index:', citationNum);
            console.log('Available citations:', citations);

            const citation = citations.find((c) => c.citation_index === citationNum);
            if (citation) {
              console.log('Opening session:', citation.session_id, 'message:', citation.message_id);
              // Open the conversation in the main window
              window.electron
                .openConversationInMain(citation.session_id, citation.message_id)
                .catch((err) => {
                  console.error('Failed to open conversation:', err);
                  window.alert('Failed to open conversation in main window');
                });
            } else {
              console.log('Citation not found for index:', citationNum);
            }
          }
        }
      }
    };

    const contentEl = contentRef.current;
    contentEl.addEventListener('click', handleCitationClick);

    return () => {
      contentEl.removeEventListener('click', handleCitationClick);
    };
  }, [citations, editing, navigate]);

  const handleSave = async () => {
    if (!id || !note) return;

    try {
      setSaving(true);
      setError(null);
      await updateNoteApi({
        path: { id },
        body: {
          title: editedTitle,
          content: editedContent,
        },
      });
      setNote({ ...note, title: editedTitle, content: editedContent });
      setEditing(false);
    } catch (err) {
      console.error('Error saving note:', err);
      setError('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (note) {
      setEditedTitle(note.title);
      setEditedContent(note.content);
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading note...</div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-destructive">{error || 'Note not found'}</div>
        <Button onClick={() => navigate('/notes')}>Back to Notes</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/notes')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Notes
        </Button>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        ) : (
          <Button onClick={() => setEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              placeholder="Note title"
              className="text-2xl font-bold"
            />
          </div>
          <div>
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="Note content (Markdown supported)"
              className="w-full min-h-[500px] font-mono border border-borderSubtle rounded-md p-3 bg-background-default text-textStandard"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">{note.title}</h1>
          <div
            ref={contentRef}
            className="prose prose-sm max-w-none"
            style={{
              // Make citation links look clickable
              cursor: 'default',
            }}
          >
            <MarkdownContent content={note.content} />
          </div>
          <style>{`
            .prose a[href^="#cite-"] {
              cursor: pointer;
              color: #3b82f6;
              text-decoration: none;
              font-weight: 600;
              transition: opacity 0.2s;
              user-select: none;
            }
            .prose a[href^="#cite-"]:hover {
              opacity: 0.7;
              text-decoration: underline;
            }
          `}</style>
        </div>
      )}
    </div>
  );
};
