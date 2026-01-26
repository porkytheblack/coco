'use client';

import { useRef, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';

interface TerminalProps {
  lines: string[];
  className?: string;
  autoScroll?: boolean;
  enableColors?: boolean;
}

// ANSI color code mappings
const ANSI_COLORS: Record<string, string> = {
  '30': 'text-gray-900 dark:text-gray-900',
  '31': 'text-red-500',
  '32': 'text-green-500',
  '33': 'text-yellow-500',
  '34': 'text-blue-500',
  '35': 'text-purple-500',
  '36': 'text-cyan-500',
  '37': 'text-gray-300',
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
  '41': 'bg-red-500',
  '42': 'bg-green-500',
  '43': 'bg-yellow-500',
  '44': 'bg-blue-500',
  '45': 'bg-purple-500',
  '46': 'bg-cyan-500',
  '47': 'bg-gray-300',
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

function TerminalLine({ line, enableColors }: { line: string; enableColors: boolean }) {
  const spans = useMemo(() => {
    if (!enableColors) {
      return [{ text: line, classes: [] }];
    }
    return parseAnsi(line);
  }, [line, enableColors]);

  return (
    <div className="whitespace-pre-wrap break-all">
      {spans.map((span, i) => (
        <span key={i} className={span.classes.join(' ')}>
          {span.text}
        </span>
      ))}
    </div>
  );
}

export function Terminal({ lines, className, autoScroll = true, enableColors = true }: TerminalProps) {
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
        <span className="text-[#666]">Waiting for output...</span>
      ) : (
        lines.map((line, index) => (
          <TerminalLine key={index} line={line} enableColors={enableColors} />
        ))
      )}
    </div>
  );
}
