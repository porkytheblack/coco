interface IconProps {
  className?: string;
}

export function BaseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className}>
      <circle cx="16" cy="16" r="16" fill="#0052FF" />
      <path
        d="M16 28c6.627 0 12-5.373 12-12S22.627 4 16 4 4 9.373 4 16s5.373 12 12 12z"
        fill="#0052FF"
      />
      <path
        d="M15.998 5.5c-5.799 0-10.5 4.701-10.5 10.5s4.701 10.5 10.5 10.5c5.488 0 9.988-4.217 10.447-9.59H18.25v-1.82h8.195C26.19 9.497 21.562 5.5 15.998 5.5z"
        fill="#FFF"
      />
    </svg>
  );
}
