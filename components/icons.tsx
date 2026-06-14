import type { SVGProps } from "react";
import {
  ArrowRight,
  ArrowUp,
  Calculator,
  Check,
  ChevronDown,
  Copy,
  Database,
  Eye,
  EyeOff,
  FileText,
  Globe,
  LibraryBig,
  Loader2,
  Lock,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkle,
  Sun,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";

type IconProps = SVGProps<SVGSVGElement>;

// 手写图标外壳(个别有品牌辨识度的图标保留自绘,不走 lucide)。
function Base({
  children,
  ...props
}: IconProps & { children: React.ReactNode }) {
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

// 问答:手绘对话气泡(带文字线,比 lucide 空气泡更有辨识度)
export const ChatIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 5.5h16v10H8l-4 3.5z" />
    <path d="M8 9.5h8M8 12.5h5" />
  </Base>
);

// 其余图标统一从 lucide 转出,保留原有导出名(调用处零改动),
// 统一 size=20 / strokeWidth=1.6,跟手绘图标的尺寸与线条粗细一致。
// 品牌 Logo 在文件底部保留手写(lucide 里没有)。
const mk =
  (Cmp: React.ComponentType<IconProps & { size?: number }>) =>
  (p: IconProps) => <Cmp size={20} strokeWidth={1.6} {...p} />;

export const LibraryIcon = mk(LibraryBig);
export const UploadIcon = mk(Upload);
export const TrashIcon = mk(Trash2);
export const SearchIcon = mk(Search);
export const CalculatorIcon = mk(Calculator);
export const DatabaseIcon = mk(Database);
export const GlobeIcon = mk(Globe);
export const ChevronDownIcon = mk(ChevronDown);
export const CheckIcon = mk(Check);
export const SunIcon = mk(Sun);
export const MoonIcon = mk(Moon);
export const SendIcon = mk(ArrowUp);
export const PlusIcon = mk(Plus);
export const SparkleIcon = mk(Sparkle);
export const FileIcon = mk(FileText);
export const ArrowRightIcon = mk(ArrowRight);
export const MenuIcon = mk(Menu);
export const CloseIcon = mk(X);
export const CopyIcon = mk(Copy);
export const SettingsIcon = mk(Settings);
export const LogOutIcon = mk(LogOut);
export const UserIcon = mk(User);
export const LockIcon = mk(Lock);
export const EyeIcon = mk(Eye);
export const EyeOffIcon = mk(EyeOff);

// 加载中:lucide Loader2 + 自带的 animate-spin
export const SpinnerIcon = (p: IconProps) => (
  <Loader2
    size={20}
    strokeWidth={1.6}
    {...p}
    className={`animate-spin ${p.className ?? ""}`}
  />
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
