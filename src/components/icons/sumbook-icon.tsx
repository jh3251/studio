import { SVGProps } from 'react';

export function SumbookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* The outer circle, filled with the current text color (which will be white when bg is primary) */}
      <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
      
      {/* The S-symbol, stroked with the primary theme color. It will be visible against the white circle background. */}
      <path
        d="M15 8.5A2.5 2.5 0 0 0 12.5 6h-3A2.5 2.5 0 0 0 7 8.5v0A2.5 2.5 0 0 0 9.5 11h5A2.5 2.5 0 0 1 17 13.5v0A2.5 2.5 0 0 1 14.5 16h-3a2.5 2.5 0 0 1-2.5-2.5"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
      />
    </svg>
  );
}
