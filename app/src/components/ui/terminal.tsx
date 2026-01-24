'use client';

import { useRef, useEffect } from 'react';
import { clsx } from 'clsx';

interface TerminalProps {
  lines: string[];
  className?: string;
  autoScroll?: boolean;
}

export function Terminal({ lines, className, autoScroll = true }: TerminalProps) {
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
          <div key={index} className="whitespace-pre-wrap break-all">
            {line}
          </div>
        ))
      )}
    </div>
  );
}
