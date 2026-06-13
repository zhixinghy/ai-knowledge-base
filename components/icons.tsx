import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={20}
      height={20}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const ChatIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 5.5h16v10H8l-4 3.5z" />
    <path d="M8 9.5h8M8 12.5h5" />
  </Base>
);

export const LibraryIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 4h4v16H5zM10 4h4v16h-4z" />
    <path d="M16.5 4.5l3 .8-3.2 14.4-2.9-.8" />
  </Base>
);

export const UploadIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 16V5M8 9l4-4 4 4" />
    <path d="M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16" />
  </Base>
);

export const TrashIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6.5h16M9 6.5V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5" />
    <path d="M6 6.5l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </Base>
);

export const SearchIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-3.8-3.8" />
  </Base>
);

export const CalculatorIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="5" y="3.5" width="14" height="17" rx="2" />
    <path d="M8 7.5h8M8 12h.01M12 12h.01M16 12h.01M8 15.5h.01M12 15.5h.01M16 15.5v2.5" />
  </Base>
);

export const DatabaseIcon = (p: IconProps) => (
  <Base {...p}>
    <ellipse cx="12" cy="6" rx="7" ry="2.6" />
    <path d="M5 6v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" />
    <path d="M5 12v6c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-6" />
  </Base>
);

export const GlobeIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M4 12h16M12 4c2.5 2 2.5 14 0 16M12 4c-2.5 2-2.5 14 0 16" />
  </Base>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 9.5l6 6 6-6" />
  </Base>
);

export const CheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </Base>
);

export const SpinnerIcon = (p: IconProps) => (
  <Base {...p} className={`animate-spin ${p.className ?? ""}`}>
    <path d="M12 4a8 8 0 0 1 8 8" opacity={1} />
    <path d="M20 12a8 8 0 1 1-8-8" opacity={0.25} />
  </Base>
);

export const SunIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
  </Base>
);

export const MoonIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5z" />
  </Base>
);

export const SendIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 19V6M6 12l6-6 6 6" />
  </Base>
);

export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const SparkleIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l1.8 5.4L19 10.2l-5.2 1.8L12 17.4l-1.8-5.4L5 10.2l5.2-1.8z" />
  </Base>
);

export const FileIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 3h7l4 4v14H7z" />
    <path d="M14 3v4h4M9.5 13h5M9.5 16.5h5" />
  </Base>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </Base>
);

export const MenuIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6.5h16M4 12h16M4 17.5h16" />
  </Base>
);

export const CloseIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const CopyIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </Base>
);

export const SettingsIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </Base>
);

const TOOL_ICONS = {
  search: SearchIcon,
  calculator: CalculatorIcon,
  database: DatabaseIcon,
  globe: GlobeIcon,
} as const;

export function ToolIcon({
  name,
  ...props
}: IconProps & { name: keyof typeof TOOL_ICONS }) {
  const Cmp = TOOL_ICONS[name];
  return <Cmp {...props} />;
}

/** 品牌图标 —— 圆角强调色方块上的几何「C」标记。 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      width={28}
      height={28}
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="3.5"
        width="25"
        height="25"
        rx="7.5"
        fill="var(--accent)"
      />
      {/* open "C": major arc with the gap on the right */}
      <path
        d="M20.4 11.1 A6.4 6.4 0 1 0 20.4 20.9"
        stroke="var(--accent-fg)"
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
