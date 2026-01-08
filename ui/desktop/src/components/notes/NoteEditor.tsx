import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { getNote, updateNote as updateNoteApi } from '../../api/sdk.gen';
import { Button } from '../ui/button';
import MarkdownContent from '../MarkdownContent';
import { ScrollArea } from '../ui/scroll-area';

interface Citation {
  session_id: string;
  message_id: string;
  citation_index: number;
}

export const NoteEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [note, setNote] = useState<{ id: string; title: string; content: string } | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
          setEditedContent(noteData.content);

          // Store note title in location state for AppLayout to access
          navigate(location.pathname, { replace: true, state: { noteTitle: noteData.title } });

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
  }, [id, navigate, location.pathname]);

  // Check if we should enter edit mode (from top bar button)
  useEffect(() => {
    if (location.state?.edit && note) {
      setEditing(true);
      // Clear the edit flag but keep noteTitle
      navigate(location.pathname, { replace: true, state: { noteTitle: note.title } });
    }
  }, [location.state, note, navigate, location.pathname]);

  // Monitor scroll position and dispatch event for AppLayout
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const scrolled = target.scrollTop > 100;

      // Dispatch custom event for AppLayout to listen to
      window.dispatchEvent(
        new CustomEvent('note-scroll', {
          detail: { scrolled, title: note?.title },
        })
      );
    };

    const scrollViewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollViewport) {
      scrollViewport.addEventListener('scroll', handleScroll);
      return () => scrollViewport.removeEventListener('scroll', handleScroll);
    }

    return undefined;
  }, [note]);

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

      // Extract title from first line if it's an H1
      const lines = editedContent.split('\n');
      const firstLine = lines[0] || '';
      const extractedTitle = firstLine.startsWith('# ') ? firstLine.slice(2).trim() : note.title; // Fallback to existing title if no H1 found

      await updateNoteApi({
        path: { id },
        body: {
          title: extractedTitle,
          content: editedContent,
        },
      });
      setNote({ ...note, title: extractedTitle, content: editedContent });
      setEditing(false);

      // Update location state with new title
      navigate(location.pathname, { replace: true, state: { noteTitle: extractedTitle } });
    } catch (err) {
      console.error('Error saving note:', err);
      setError('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (note) {
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
    <div className="h-full flex flex-col min-h-0">
      {editing && (
        <div className="px-8 pt-4 pb-2 flex-shrink-0 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 min-h-0 relative px-8">
        <ScrollArea className="h-full">
          <div className="max-w-4xl pb-4 pt-4">
            {editing ? (
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="# Note Title\n\nNote content (Markdown supported)"
                className="w-full min-h-[500px] font-mono border border-borderSubtle rounded-md p-3 bg-background-default text-textStandard"
              />
            ) : (
              <div
                ref={contentRef}
                className="prose prose-sm max-w-none"
                style={{
                  cursor: 'default',
                }}
              >
                <MarkdownContent content={note.content} />
              </div>
            )}
            <style>{`
              .prose h1,
              .prose h2,
              .prose h3,
              .prose h4,
              .prose h5,
              .prose h6 {
                font-weight: 300;
              }
              .prose a[href^="#cite-"] {
                cursor: pointer;
                color: #3b82f6;
                text-decoration: none;
                font-weight: 600;
                transition: opacity 0.2s;
                user-select: none;
                vertical-align: super;
                font-size: 0.75em;
                line-height: 0;
              }
              .prose a[href^="#cite-"]:hover {
                opacity: 0.7;
                text-decoration: underline;
              }
            `}</style>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
