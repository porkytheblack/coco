interface IconProps {
  className?: string;
}

export function AptosIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <circle cx="16" cy="16" r="16" fill="#000" />
      <path
        d="M22.8 13.6h-3.2c-.3 0-.5-.1-.6-.4l-2.4-3.6c-.2-.4-.7-.4-.9 0l-2.4 3.6c-.1.2-.4.4-.6.4H9.5c-.5 0-.8.6-.5 1l3.3 5c.2.3.4.4.7.4h3.2c.3 0 .5.1.6.4l2.4 3.6c.2.4.7.4.9 0l2.4-3.6c.1-.2.4-.4.6-.4h3.2c.5 0 .8-.6.5-1l-3.3-5c-.2-.3-.4-.4-.7-.4z"
        fill="#2DD8A3"
      />
    </svg>
  );
}
