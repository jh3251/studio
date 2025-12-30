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
      {/* The blue rounded square, filled with primary color */}
      <rect x="2" y="2" width="20" height="20" rx="4" fill="hsl(var(--primary))" stroke="none" />
      
      {/* The dollar sign symbol, stroked with white. */}
      <path 
        d="M12 2v2M12 20v2M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" 
        stroke="white" 
        strokeWidth="2.5" 
      />
    </svg>
  );
}
