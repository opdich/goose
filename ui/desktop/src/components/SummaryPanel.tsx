import { X, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import MarkdownContent from './MarkdownContent';

interface SummaryPanelProps {
  summary: string | null;
  isSummarizing: boolean;
  error: string | null;
  onDismiss: () => void;
}

export function SummaryPanel({ summary, isSummarizing, error, onDismiss }: SummaryPanelProps) {
  return (
    <div className="rounded-2xl bg-background-primary mb-0.5">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <div className="flex items-center gap-1.5 text-text-secondary">
          <Sparkles size={13} />
          <span className="text-xs font-medium">Summary</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={onDismiss}
          className="text-text-secondary hover:text-text-primary h-5 w-5 p-0"
        >
          <X size={13} />
        </Button>
      </div>
      <div className="px-3 pb-3 max-h-[60vh] overflow-y-auto">
        {error ? (
          <p className="text-xs text-red-500">{error}</p>
        ) : isSummarizing && !summary ? (
          <p className="text-xs text-text-secondary animate-pulse">Generating summary...</p>
        ) : (
          <MarkdownContent content={summary ?? ''} className="text-sm" />
        )}
      </div>
    </div>
  );
}
