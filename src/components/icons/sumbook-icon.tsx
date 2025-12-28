import { SVGProps } from 'react';

export function SumbookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19z" fill="currentColor" stroke="none" />
      <path d="M15 8.5H9.5a2 2 0 1 0 0 4h5a2 2 0 1 1 0 4H9" stroke="#1E88E5" />
    </svg>
  );
}
