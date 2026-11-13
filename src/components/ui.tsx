import { useEffect, useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../utils/cn";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("panel", className)}>{children}</div>;
}

export function PanelHeader({
  eyebrow,
  title,
  right,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3 sm:px-5", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="label-xs mb-1">{eyebrow}</p>}
        <div className="truncate font-display text-[14.5px] font-semibold tracking-tight text-fg">{title}</div>
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

type ButtonVariant = "primary" | "outline" | "ghost" | "subtle" | "danger";
const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-[#0a0f0a] hover:bg-[#d8fb85] border border-accent shadow-[0_4px_20px_-6px_rgba(203,244,102,0.6)]",
  outline: "border border-line bg-panel-2 text-fg hover:border-[#3c4a3e] hover:bg-[#182019]",
  ghost: "text-mut hover:text-fg hover:bg-white/[0.055] border border-transparent",
  subtle: "border border-line-soft bg-white/[0.035] text-fg hover:bg-white/[0.07]",
  danger: "border border-danger/35 bg-danger/10 text-danger hover:bg-danger/20",
};

export function Button({
  children,
  className,
  variant = "outline",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" | "lg" | "icon" }) {
  const sizes = {
    sm: "h-7 px-2.5 text-[12.5px] gap-1.5 rounded-lg",
    md: "h-9 px-3.5 text-xs gap-2 rounded-[10px]",
    lg: "h-11 px-5 text-[14.5px] gap-2 rounded-xl",
    icon: "h-9 w-9 rounded-[10px] justify-center",
  };
  return (
    <button
      className={cn(
        "inline-flex select-none items-center justify-center font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40",
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className,
  active,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-[10px] border transition-colors",
        active
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-line-soft bg-white/[0.025] text-mut hover:border-line hover:bg-white/[0.06] hover:text-fg",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Chip({
  children,
  active,
  onClick,
  icon,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  className?: string;
}) {
  const cls = cn(
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors",
    active
      ? "border-accent/45 bg-accent/[0.12] text-accent"
      : "border-line-soft bg-white/[0.02] text-mut hover:border-line hover:text-fg",
    className,
  );
  if (!onClick) return <span className={cls}>{icon}{children}</span>;
  return (
    <button type="button" onClick={onClick} className={cls}>
      {icon}
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2.5">
      <span>
        <span className="block text-xs font-medium text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-[12.5px] leading-relaxed text-mut">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors",
          checked ? "border-accent/60 bg-accent/25" : "border-line bg-panel-3",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all",
            checked ? "left-[18px] bg-accent" : "left-0.5 bg-[#6d786e]",
          )}
        />
      </button>
    </label>
  );
}

export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  display,
  hint,
  compact,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  display?: string;
  hint?: string;
  compact?: boolean;
}) {
  const id = useId();
  return (
    <div className={compact ? "py-1.5" : "py-2"}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={id} className="label-xs">
          {label}
        </label>
        <span className="value-mono text-[11.5px] text-[#c3cdc1]">{display ?? `${value}%`}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, #cbf466 0%, #cbf466 ${((value - min) / (max - min)) * 100}%, #263027 ${((value - min) / (max - min)) * 100}%, #263027 100%)`,
        }}
      />
      {hint && <p className="mt-1.5 text-[11.5px] leading-relaxed text-mut-2">{hint}</p>}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: {
  options: { value: T; label: string; title?: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("inline-flex w-full rounded-[10px] border border-line-soft bg-[#0a0e0b] p-0.5", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title ?? option.label}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 rounded-lg font-medium transition-colors",
            size === "sm" ? "px-2 py-1 text-[11.5px]" : "px-2 py-1.5 text-[12.5px]",
            value === option.value ? "bg-accent/[0.14] text-accent shadow-[inset_0_0_0_1px_rgba(203,244,102,0.2)]" : "text-mut hover:text-fg",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  const widths = { md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className={cn("rise-in relative z-10 w-full overflow-hidden rounded-2xl border border-line bg-[#0c110d] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.9)]", widths[width])}>
        <div className="flex items-start justify-between gap-4 border-b border-line-soft px-5 py-4">
          <div>
            {eyebrow && <p className="label-xs mb-1.5">{eyebrow}</p>}
            <h2 className="font-display text-lg font-semibold tracking-tight text-fg">{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line-soft text-mut transition-colors hover:border-line hover:text-fg"
          >
            <X size={15} />
          </button>
        </div>
        <div className="thin-scroll max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-line-soft bg-black/20 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col justify-between gap-3 sm:flex-row sm:items-end", className)}>
      <div>
        {eyebrow && <p className="label-xs mb-1.5 flex items-center gap-2">{eyebrow}</p>}
        <h1 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.02em] text-fg sm:text-[26px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-xs leading-relaxed text-mut">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  hint,
  accent,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 px-4 py-3", className)}>
      <p className="label-xs truncate">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={cn("value-mono text-[19px] font-medium leading-none tracking-tight", accent ? "text-accent" : "text-fg")}>{value}</span>
        {unit && <span className="font-mono text-[10.5px] uppercase tracking-wide text-mut-2">{unit}</span>}
      </div>
      {hint && <p className="mt-1 truncate text-[11.5px] text-mut-2">{hint}</p>}
    </div>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 min-w-[20px] items-center justify-center rounded-[5px] border border-[#303a31] bg-[#1b231c] px-1 font-mono text-[10.5px] text-[#c4cec2] shadow-[inset_0_-1px_0_rgba(0,0,0,0.35)]", className)}>
      {children}
    </span>
  );
}

export function StatusDot({ tone = "accent", pulse }: { tone?: "accent" | "muted" | "warm" | "danger"; pulse?: boolean }) {
  const colors = { accent: "bg-accent", muted: "bg-mut-2", warm: "bg-warm", danger: "bg-danger" };
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      {pulse && <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-50", colors[tone], "pulse-dot")} />}
      <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", colors[tone])} />
    </span>
  );
}

export function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-mut">
      <span className="h-[2px] w-3 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export function EqBars({ level = 0.5, className }: { level?: number; className?: string }) {
  return (
    <span className={cn("flex h-3 items-end gap-[2px]", className)} aria-hidden="true">
      {[0.35, 0.75, 0.5, 0.9, 0.42].map((h, i) => (
        <span key={i} className="eq-bar w-[2px] rounded-full bg-accent/70" style={{ height: `${Math.max(12, h * level * 100)}%`, animationDelay: `${i * 90}ms` }} />
      ))}
    </span>
  );
}
