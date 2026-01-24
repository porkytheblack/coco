interface IconProps {
  className?: string;
}

export function CustomIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className}>
      <circle cx="16" cy="16" r="16" fill="#6B7280" />
      <path
        d="M16 8a8 8 0 100 16 8 8 0 000-16zm0 14.4A6.4 6.4 0 1116 9.6a6.4 6.4 0 010 12.8zm0-11.2a4.8 4.8 0 100 9.6 4.8 4.8 0 000-9.6zm0 8a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4z"
        fill="#FFF"
      />
    </svg>
  );
}
