interface IconProps {
  className?: string;
}

export function AvalancheIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <circle cx="16" cy="16" r="16" fill="#E84142" />
      <path
        d="M21.5 21h-3.2c-.5 0-.8-.3-1-.7l-1-1.8c-.2-.4-.2-.9 0-1.3l4.4-8c.3-.6 1.2-.6 1.5 0l2.4 4.4c.2.4.2.9 0 1.3l-2.1 3.9c-.2.4-.2.9 0 1.3l.5.9c.2.4-.1.9-.5.9h-1z"
        fill="#fff"
      />
      <path
        d="M13.8 21H8.5c-.5 0-.8-.5-.5-.9l5.2-9.5c.3-.5 1-.5 1.3 0l1.7 3.1c.2.4.2.9 0 1.3l-2.9 5.3c-.2.4-.2.9 0 1.3l.5.9c.2.4-.1.9-.5.9h.5z"
        fill="#fff"
      />
    </svg>
  );
}
