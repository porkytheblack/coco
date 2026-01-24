interface IconProps {
  className?: string;
}

export function ArbitrumIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <circle cx="16" cy="16" r="16" fill="#2D374B" />
      <path
        d="M16.8 11.2l4.4 7.2c.2.3.2.7 0 1l-1.5 2.4c-.2.3-.6.5-1 .5h-.6l-4.2-6.9.6-1 2.3 3.8 2.6-4.2c.2-.3.2-.7 0-1l-2.6-4.2-2.3 3.8-.6-1 3-4.9c.2-.3.6-.5 1-.5h.6c.4 0 .8.2 1 .5l-2.7 4.5z"
        fill="#28A0F0"
      />
      <path
        d="M15.2 11.2L10.8 18.4c-.2.3-.2.7 0 1l1.5 2.4c.2.3.6.5 1 .5h.6l4.2-6.9-.6-1-2.3 3.8-2.6-4.2c-.2-.3-.2-.7 0-1l2.6-4.2 2.3 3.8.6-1-3-4.9c-.2-.3-.6-.5-1-.5h-.6c-.4 0-.8.2-1 .5l2.7 4.5z"
        fill="#fff"
      />
    </svg>
  );
}
