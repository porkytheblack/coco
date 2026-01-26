'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Copy, Check, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';

interface TerminalProps {
  lines: string[];
  className?: string;
  autoScroll?: boolean;
  enableColors?: boolean;
  showLineNumbers?: boolean;
  showTimestamps?: boolean;
  showToolbar?: boolean;
  title?: string;
  status?: 'running' | 'success' | 'error' | 'idle';
  maxHeight?: string;
}

// ANSI color code mappings - standard colors
const ANSI_COLORS: Record<string, string> = {
  '30': 'text-gray-900 dark:text-gray-100',
  '31': 'text-red-500',
  '32': 'text-green-500',
  '33': 'text-yellow-500',
  '34': 'text-blue-500',
  '35': 'text-purple-500',
  '36': 'text-cyan-500',
  '37': 'text-gray-300',
  // Bright colors
  '90': 'text-gray-500',
  '91': 'text-red-400',
  '92': 'text-green-400',
  '93': 'text-yellow-400',
  '94': 'text-blue-400',
  '95': 'text-purple-400',
  '96': 'text-cyan-400',
  '97': 'text-white',
};

const ANSI_BG_COLORS: Record<string, string> = {
  '40': 'bg-gray-900',
  '41': 'bg-red-500/30',
  '42': 'bg-green-500/30',
  '43': 'bg-yellow-500/30',
  '44': 'bg-blue-500/30',
  '45': 'bg-purple-500/30',
  '46': 'bg-cyan-500/30',
  '47': 'bg-gray-300/30',
  // Bright backgrounds
  '100': 'bg-gray-700',
  '101': 'bg-red-400/30',
  '102': 'bg-green-400/30',
  '103': 'bg-yellow-400/30',
  '104': 'bg-blue-400/30',
  '105': 'bg-purple-400/30',
  '106': 'bg-cyan-400/30',
  '107': 'bg-white/30',
};

interface AnsiSpan {
  text: string;
  classes: string[];
}

// Parse ANSI escape codes and return styled spans
function parseAnsi(text: string): AnsiSpan[] {
  const spans: AnsiSpan[] = [];
  // Match ANSI escape sequences: ESC[...m
  const ansiRegex = /\x1b\[([0-9;]*)m/g;

  let lastIndex = 0;
  let currentClasses: string[] = [];
  let match;

  while ((match = ansiRegex.exec(text)) !== null) {
    // Add text before the escape code
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index);
      if (textBefore) {
        spans.push({ text: textBefore, classes: [...currentClasses] });
      }
    }

    // Parse the escape code
    const codes = match[1].split(';').filter(Boolean);
    for (const code of codes) {
      if (code === '0' || code === '') {
        // Reset
        currentClasses = [];
      } else if (code === '1') {
        currentClasses.push('font-bold');
      } else if (code === '2') {
        currentClasses.push('opacity-70');
      } else if (code === '3') {
        currentClasses.push('italic');
      } else if (code === '4') {
        currentClasses.push('underline');
      } else if (ANSI_COLORS[code]) {
        // Remove any existing text color classes
        currentClasses = currentClasses.filter(c => !c.startsWith('text-'));
        currentClasses.push(ANSI_COLORS[code]);
      } else if (ANSI_BG_COLORS[code]) {
        // Remove any existing bg color classes
        currentClasses = currentClasses.filter(c => !c.startsWith('bg-'));
        currentClasses.push(ANSI_BG_COLORS[code]);
      }
    }

    lastIndex = ansiRegex.lastIndex;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    spans.push({ text: text.slice(lastIndex), classes: [...currentClasses] });
  }

  return spans;
}

function TerminalLine({
  line,
  enableColors,
  lineNumber,
  showLineNumbers
}: {
  line: string;
  enableColors: boolean;
  lineNumber?: number;
  showLineNumbers?: boolean;
}) {
  const spans = useMemo(() => {
    if (!enableColors) {
      return [{ text: line, classes: [] }];
    }
    return parseAnsi(line);
  }, [line, enableColors]);

  return (
    <div className="flex whitespace-pre-wrap break-all hover:bg-white/5 transition-colors group">
      {showLineNumbers && lineNumber !== undefined && (
        <span className="select-none text-gray-600 w-10 text-right pr-3 shrink-0 group-hover:text-gray-500">
          {lineNumber}
        </span>
      )}
      <div className="flex-1">
        {spans.map((span, i) => (
          <span key={i} className={span.classes.join(' ')}>
            {span.text}
          </span>
        ))}
      </div>
    </div>
  );
}

// Status indicator component
function StatusIndicator({ status }: { status: TerminalProps['status'] }) {
  if (status === 'running') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-blue-400">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        Running
      </span>
    );
  }
  if (status === 'success') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-green-400">
        <span className="w-2 h-2 bg-green-400 rounded-full" />
        Completed
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-400">
        <span className="w-2 h-2 bg-red-400 rounded-full" />
        Failed
      </span>
    );
  }
  return null;
}

export function Terminal({
  lines,
  className,
  autoScroll = true,
  enableColors = true,
  showLineNumbers = false,
  showTimestamps = false,
  showToolbar = false,
  title,
  status = 'idle',
  maxHeight = '400px',
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (autoScroll && containerRef.current && !isCollapsed) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines, autoScroll, isCollapsed]);

  const handleCopy = async () => {
    const content = lines.join('\n');
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const effectiveMaxHeight = isExpanded ? '80vh' : maxHeight;

  return (
    <div className={clsx(
      'font-mono text-sm bg-[#0d0d0d] text-[#e5e5e5] rounded-lg overflow-hidden border border-[#2a2a2a]',
      className
    )}>
      {/* Toolbar */}
      {(showToolbar || title || status !== 'idle') && (
        <div className="flex items-center justify-between px-3 py-2 bg-[#1a1a1a] border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
              />
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors"
              />
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors"
              />
            </div>
            {title && (
              <span className="text-xs text-gray-400 font-medium">{title}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <StatusIndicator status={status} />

            <div className="flex items-center gap-1">
              {/* Collapse/Expand toggle */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-gray-300 transition-colors"
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>

              {/* Fullscreen toggle */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-gray-300 transition-colors"
                title={isExpanded ? "Restore" : "Maximize"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Copy button */}
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-gray-300 transition-colors"
                title="Copy output"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {!isCollapsed && (
        <div
          ref={containerRef}
          className="p-4 leading-relaxed overflow-auto transition-all duration-200"
          style={{ maxHeight: effectiveMaxHeight }}
        >
          {lines.length === 0 ? (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="w-2 h-4 bg-gray-600 animate-pulse" />
              <span>Waiting for output...</span>
            </div>
          ) : (
            lines.map((line, index) => (
              <TerminalLine
                key={index}
                line={line}
                enableColors={enableColors}
                lineNumber={index + 1}
                showLineNumbers={showLineNumbers}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Simple terminal variant without toolbar
export function SimpleTerminal({
  lines,
  className,
  autoScroll = true,
  enableColors = true
}: Pick<TerminalProps, 'lines' | 'className' | 'autoScroll' | 'enableColors'>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  return (
    <div
      ref={containerRef}
      className={clsx(
        'font-mono text-sm bg-[#1a1a1a] text-[#e5e5e5]',
        'p-4 rounded-lg leading-relaxed overflow-auto',
        'max-h-[400px]',
        className
      )}
    >
      {lines.length === 0 ? (
        <span className="text-gray-600">Waiting for output...</span>
      ) : (
        lines.map((line, index) => (
          <TerminalLine key={index} line={line} enableColors={enableColors} />
        ))
      )}
    </div>
  );
}
