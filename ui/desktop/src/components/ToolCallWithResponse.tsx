import React from 'react';
import { Card } from './ui/card';
import { ToolCallArguments } from './ToolCallArguments';
import MarkdownContent from './MarkdownContent';
import { LoadingPlaceholder } from './LoadingPlaceholder';
import { Content, ToolRequestMessageContent, ToolResponseMessageContent } from '../types/message';
import { snakeToTitleCase } from '../utils';
import Dot from './ui/Dot';
import Expand from './ui/Expand';

interface ToolCallWithResponseProps {
  isCancelledMessage: boolean;
  toolRequest: ToolRequestMessageContent;
  toolResponse?: ToolResponseMessageContent;
}

export default function ToolCallWithResponse({
  isCancelledMessage,
  toolRequest,
  toolResponse,
}: ToolCallWithResponseProps) {
  const toolCall = toolRequest.toolCall.status === 'success' ? toolRequest.toolCall.value : null;
  if (!toolCall) {
    return null;
  }

  return (
    <div className={'w-full py-1 text-textSubtle text-sm'}>
      <Card className="">
        <ToolCallView {...{ isCancelledMessage, toolCall, toolResponse }} />
      </Card>
    </div>
  );
}

interface ToolCallExpandableProps {
  label: string | ((isExpanded: boolean) => React.ReactNode);
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
}

function ToolCallExpandable({
  label,
  defaultExpanded = false,
  children,
  className = '',
}: ToolCallExpandableProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const toggleExpand = () => setIsExpanded((prev) => !prev);

  return (
    <div className={className}>
      <button onClick={toggleExpand} className="w-full flex justify-between items-center py-1 px-2">
        <span className="flex items-center">
          {typeof label === 'function' ? label(isExpanded) : label}
        </span>
        <Expand size={5} isExpanded={isExpanded} />
      </button>
      {isExpanded && <div>{children}</div>}
    </div>
  );
}

interface ToolCallViewProps {
  isCancelledMessage: boolean;
  toolCall: {
    name: string;
    arguments: Record<string, unknown>;
  };
  toolResponse?: ToolResponseMessageContent;
}

function ToolCallView({ isCancelledMessage, toolCall, toolResponse }: ToolCallViewProps) {
  const isToolDetails = Object.entries(toolCall?.arguments).length > 0;

  return (
    <ToolCallExpandable
      label={(isExpanded) => (
        <>
          <Dot size={2} isActive={isExpanded} />
          <span className="ml-[10px]">
            {snakeToTitleCase(toolCall.name.substring(toolCall.name.lastIndexOf('__') + 2))}
          </span>
        </>
      )}
    >
      {isToolDetails && <ToolDetailsView toolCall={toolCall} />}
      <div className={`bg-bgStandard mt-1 rounded ${isToolDetails ? 'rounded-t-none' : ''}`}>
        {!isCancelledMessage &&
          (toolResponse ? (
            <ToolResultView
              result={
                toolResponse.toolResult.status === 'success'
                  ? toolResponse.toolResult.value
                  : undefined
              }
            />
          ) : (
            <LoadingPlaceholder />
          ))}
      </div>
    </ToolCallExpandable>
  );
}

interface ToolDetailsViewProps {
  toolCall: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

function ToolDetailsView({ toolCall }: ToolDetailsViewProps) {
  return (
    <ToolCallExpandable label="Tool Details" className="bg-bgStandard rounded-t mt-1">
      {toolCall.arguments && <ToolCallArguments args={toolCall.arguments} />}
    </ToolCallExpandable>
  );
}

interface ToolResultViewProps {
  result?: Content[];
}

function ToolResultView({ result }: ToolResultViewProps) {
  // State to track expanded items
  const [expandedItems, setExpandedItems] = React.useState<number[]>([]);

  // If no result info, don't show anything
  if (!result) return null;

  // Find results where either audience is not set, or it's set to a list that includes user
  const filteredResults = result.filter((item) => {
    // Check audience (which may not be in the type)
    const audience = item.annotations?.audience;

    return !audience || audience.includes('user');
  });

  if (filteredResults.length === 0) return null;

  const toggleExpand = (index: number) => {
    setExpandedItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const shouldShowExpanded = (item: Content, index: number) => {
    return (
      (item.annotations &&
        item.annotations.priority !== undefined &&
        item.annotations.priority >= 0.5) ||
      expandedItems.includes(index)
    );
  };

  return (
    <div className="">
      {filteredResults.map((item, index) => {
        const isExpanded = shouldShowExpanded(item, index);
        const shouldMinimize =
          !item.annotations ||
          item.annotations.priority === undefined ||
          item.annotations.priority < 0.5;
        return (
          <div key={index} className="relative">
            {shouldMinimize && (
              <button
                onClick={() => toggleExpand(index)}
                className="w-full flex justify-between items-center pl-[19px] pr-2 py-1"
              >
                <span className="">Output</span>
                <Expand size={5} isExpanded={isExpanded} />
              </button>
            )}
            {(isExpanded || !shouldMinimize) && (
              <>
                <div className="bg-bgApp rounded-b pl-[19px] pr-2 py-4">
                  {item.type === 'text' && item.text && (
                    <MarkdownContent
                      content={item.text}
                      className="whitespace-pre-wrap p-2 max-w-full overflow-x-auto"
                    />
                  )}
                  {item.type === 'image' && (
                    <img
                      src={`data:${item.mimeType};base64,${item.data}`}
                      alt="Tool result"
                      className="max-w-full h-auto rounded-md my-2"
                      onError={(e) => {
                        console.error('Failed to load image: Invalid MIME-type encoded image data');
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
