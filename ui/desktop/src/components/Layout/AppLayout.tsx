import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AppSidebar from '../GooseSidebar/AppSidebar';
import { View, ViewOptions } from '../../utils/navigationUtils';
import { AppWindowMac, AppWindow, Notebook, NotebookPen, Layers } from 'lucide-react';
import { Button } from '../ui/button';
import { Sidebar, SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from '../ui/sidebar';

const AppLayoutContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const safeIsMacOS = (window?.electron?.platform || 'darwin') === 'darwin';
  const { isMobile, openMobile } = useSidebar();
  const [showNoteTitle, setShowNoteTitle] = React.useState(false);

  // Detect if we're in a notes window (has mainWindowId set)
  const isNotesWindow = React.useMemo(() => {
    try {
      return window.appConfig?.get('mainWindowId') !== undefined;
    } catch {
      return false;
    }
  }, []);

  // Calculate padding based on sidebar state and macOS
  const headerPadding = safeIsMacOS ? 'pl-21' : 'pl-4';
  // const headerPadding = '';

  // Hide buttons when mobile sheet is showing
  const shouldHideButtons = isMobile && openMobile;

  const setView = (view: View, viewOptions?: ViewOptions) => {
    // Convert view-based navigation to route-based navigation
    switch (view) {
      case 'chat':
        navigate('/');
        break;
      case 'pair':
        navigate('/pair');
        break;
      case 'settings':
        navigate('/settings', { state: viewOptions });
        break;
      case 'extensions':
        navigate('/extensions', { state: viewOptions });
        break;
      case 'sessions':
        navigate('/sessions');
        break;
      case 'schedules':
        navigate('/schedules');
        break;
      case 'recipes':
        navigate('/recipes');
        break;
      case 'permission':
        navigate('/permission', { state: viewOptions });
        break;
      case 'ConfigureProviders':
        navigate('/configure-providers');
        break;
      case 'sharedSession':
        navigate('/shared-session', { state: viewOptions });
        break;
      case 'welcome':
        navigate('/welcome');
        break;
      default:
        navigate('/');
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    // Navigate to chat with session data
    navigate('/', { state: { sessionId } });
  };

  const handleNewWindow = () => {
    window.electron.createChatWindow(
      undefined,
      window.appConfig.get('GOOSE_WORKING_DIR') as string | undefined
    );
  };

  // Listen for scroll events from NoteEditor (must be at top level, not conditional)
  React.useEffect(() => {
    if (!isNotesWindow) {
      return undefined;
    }

    const isNotesList = location.pathname === '/notes';
    const isCreateNote = location.pathname === '/notes/create';
    const isViewingNote = !isNotesList && !isCreateNote;

    if (!isViewingNote) {
      setShowNoteTitle(false);
      return undefined;
    }

    const handleNoteScroll = (e: Event) => {
      const customEvent = e as CustomEvent<{ scrolled: boolean; title: string }>;
      setShowNoteTitle(customEvent.detail.scrolled);
    };

    window.addEventListener('note-scroll', handleNoteScroll);
    return () => window.removeEventListener('note-scroll', handleNoteScroll);
  }, [isNotesWindow, location.pathname]);

  // Notes window layout - simplified without sidebar
  if (isNotesWindow) {
    const isNotesList = location.pathname === '/notes';
    const isCreateNote = location.pathname === '/notes/create';
    const isViewingNote = !isNotesList && !isCreateNote;
    const noteTitle = location.state?.noteTitle;

    const handleEditCurrentNote = () => {
      // Navigate to the same note with edit flag in state
      navigate(location.pathname, { state: { edit: true, noteTitle } });
    };

    const handleOpenOverlay = async () => {
      try {
        await window.electron.openOverlayWindow();
      } catch (error) {
        console.error('Failed to open overlay:', error);
      }
    };

    return (
      <div className="flex flex-col flex-1 w-full h-full relative animate-fade-in bg-background-default">
        <div
          className={`${headerPadding} pt-3 pb-3 flex items-center justify-between relative z-100 transition-all duration-200`}
        >
          <div className="flex items-center">
            <Button
              onClick={() => navigate('/notes')}
              className="no-drag hover:!bg-background-medium"
              variant="ghost"
              size="xs"
              title="Go to notes"
            >
              <Notebook className="w-4 h-4" />
            </Button>
            {isViewingNote && (
              <Button
                onClick={handleEditCurrentNote}
                className="no-drag hover:!bg-background-medium"
                variant="ghost"
                size="xs"
                title="Edit note"
              >
                <NotebookPen className="w-4 h-4" />
              </Button>
            )}
            <Button
              onClick={handleOpenOverlay}
              className="no-drag hover:!bg-background-medium"
              variant="ghost"
              size="xs"
              title="Open overlay"
            >
              <Layers className="w-4 h-4" />
            </Button>
          </div>
          {isViewingNote && showNoteTitle && noteTitle && (
            <h2 className="text-sm text-text-standard truncate max-w-md mr-4 transition-opacity duration-200">
              {noteTitle}
            </h2>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
    );
  }

  // Main window layout with sidebar
  return (
    <div className="flex flex-1 w-full relative animate-fade-in">
      {!shouldHideButtons && (
        <div className={`${headerPadding} absolute top-3 z-100 flex items-center`}>
          <SidebarTrigger
            className={`no-drag hover:border-border-strong hover:text-text-default hover:!bg-background-medium hover:scale-105`}
          />
          <Button
            onClick={handleNewWindow}
            className="no-drag hover:!bg-background-medium"
            variant="ghost"
            size="xs"
            title="Start a new session in a new window"
          >
            {safeIsMacOS ? <AppWindowMac className="w-4 h-4" /> : <AppWindow className="w-4 h-4" />}
          </Button>
        </div>
      )}
      <Sidebar variant="inset" collapsible="offcanvas">
        <AppSidebar
          onSelectSession={handleSelectSession}
          setView={setView}
          currentPath={location.pathname}
        />
      </Sidebar>
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </div>
  );
};

export const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <AppLayoutContent />
    </SidebarProvider>
  );
};
