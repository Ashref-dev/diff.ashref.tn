import type { ReactNode, SVGProps } from "react";

// Lucide-derived glyphs (ISC), inlined so the shell ships no icon font or library.
function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement>;

export const ISwap = (p: P) => (
  <Icon {...p}>
    <path d="m16 3 4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16" />
  </Icon>
);
export const IEraser = (p: P) => (
  <Icon {...p}>
    <path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l10-10a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L11 21M22 21H7M5 11l9 9" />
  </Icon>
);
export const ICopy = (p: P) => (
  <Icon {...p}>
    <rect width="14" height="14" x="8" y="8" rx="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </Icon>
);
export const ICheck = (p: P) => (
  <Icon {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);
export const ISun = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
  </Icon>
);
export const IMoon = (p: P) => (
  <Icon {...p}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </Icon>
);
export const IMonitor = (p: P) => (
  <Icon {...p}>
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </Icon>
);
export const ISliders = (p: P) => (
  <Icon {...p}>
    <path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4" />
  </Icon>
);
export const IColumns = (p: P) => (
  <Icon {...p}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M12 3v18" />
  </Icon>
);
export const IRows = (p: P) => (
  <Icon {...p}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M7 9h10M7 15h6" />
  </Icon>
);
export const IUnfold = (p: P) => (
  <Icon {...p}>
    <path d="M12 22v-6M12 8V2M4 12H2M10 12H8M16 12h-2M22 12h-2M15 19l-3 3-3-3M15 5l-3-3-3 3" />
  </Icon>
);
export const IFold = (p: P) => (
  <Icon {...p}>
    <path d="M12 22v-6M12 8V2M4 12H2M10 12H8M16 12h-2M22 12h-2M15 19l-3-3-3 3M15 5l-3 3-3-3" />
  </Icon>
);
export const IChevronUp = (p: P) => (
  <Icon {...p}>
    <path d="m18 15-6-6-6 6" />
  </Icon>
);
export const IChevronDown = (p: P) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);
export const IArrowRight = (p: P) => (
  <Icon {...p}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </Icon>
);
export const IExpandLines = (p: P) => (
  <Icon {...p}>
    <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
  </Icon>
);
