import { useEffect, useState } from "react";
import {
  CarFront,
  ChartLine,
  ChevronRight,
  Gauge,
  Info,
  Keyboard,
  Menu,
  Settings,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useStore } from "../lib/store";
import type { AppView } from "../lib/views";
import { VIEW_LABELS } from "../lib/views";
import { cn } from "../utils/cn";
import { CreatorCard } from "./CreatorCard";
import { CarBlueprint } from "./gauges";
import { ShiftMark } from "./icons";
import { IconButton, Kbd, StatusDot } from "./ui";

const NAV: { view: AppView; label: string; icon: typeof Gauge; hint: string }[] = [
  { view: "dyno", label: "Dyno Bay", icon: Gauge, hint: "Live test cell" },
  { view: "garage", label: "Garage", icon: CarFront, hint: "11 vehicles" },
  { view: "data", label: "Data Log", icon: ChartLine, hint: "Runs & sources" },
  { view: "about", label: "About", icon: Info, hint: "Creator & project" },
];

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-8 w-8 items-center justify-center rounded-[9px] border border-accent/25 bg-[#1a2419] text-accent shadow-[inset_0_0_18px_rgba(203,244,102,0.08)]">
        <ShiftMark className="h-[19px] w-[19px]" />
      </div>
      {!compact && (
        <div>
          <div className="font-display text-[17px] font-bold tracking-[0.11em] text-[#f1f6e9]">REALSHIFT</div>
          <div className="-mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.22em] text-mut-2">Transmission & Dyno Lab</div>
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  view,
  onNavigate,
  onOpenSettings,
  onOpenControls,
  mobile,
  onClose,
}: {
  view: AppView;
  onNavigate: (view: AppView) => void;
  onOpenSettings: () => void;
  onOpenControls: () => void;
  mobile?: boolean;
  onClose?: () => void;
}) {
  const { vehicle } = useStore();
  return (
    <aside
      className={cn(
        "thin-scroll flex h-full w-[248px] shrink-0 flex-col overflow-y-auto border-r border-line bg-[#080b09]",
        mobile ? "shadow-2xl" : "fixed inset-y-0 left-0 z-50 hidden lg:flex",
      )}
    >
      <div className="flex items-center justify-between border-b border-line-soft px-4 py-4">
        <Logo />
        {mobile && (
          <button onClick={onClose} aria-label="Close navigation" className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-mut">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="px-3.5 pt-4">
        <div className="flex items-center justify-between px-1">
          <span className="label-xs">Test facility</span>
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-accent">
            <StatusDot pulse /> Cell online
          </span>
        </div>
        <div className="mt-2 rounded-xl border border-line-soft bg-[linear-gradient(135deg,#141c16,#0d120f)] px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-mut">Bay</p>
              <p className="font-display text-sm font-semibold text-fg">01 · Chassis cell</p>
            </div>
            <div className="flex items-end gap-[2px]">
              {[4, 7, 5, 9, 6].map((h, i) => (
                <span key={i} className="w-[2px] rounded-full bg-accent/60" style={{ height: h + 4 }} />
              ))}
            </div>
          </div>
          <div className="mt-1.5 flex items-center justify-between border-t border-white/[0.05] pt-1.5 font-mono text-[9.5px] text-mut-2">
            <span>4WD·2 AXLE ROLLER SET</span>
            <span className="text-[#7f9a5e]">READY</span>
          </div>
        </div>
      </div>

      <nav className="mt-5 px-2.5" aria-label="Main navigation">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="label-xs">Workspace</span>
          <SlidersHorizontal size={10} className="text-mut-2" />
        </div>
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.view;
            return (
              <li key={item.view}>
                <button
                  onClick={() => {
                    onNavigate(item.view);
                    onClose?.();
                  }}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left transition-colors",
                    active ? "bg-[#1a221b] text-fg" : "text-mut hover:bg-white/[0.035] hover:text-[#ccd6c9]",
                  )}
                >
                  {active && <span className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-accent" />}
                  <Icon size={15} strokeWidth={active ? 2 : 1.7} className={active ? "text-accent" : "text-mut-2 group-hover:text-mut"} />
                  <span className="flex-1 text-[14px] font-medium">{item.label}</span>
                  <span className={cn("font-mono text-[9.5px] tracking-wide", active ? "text-accent/70" : "text-mut-2")}>{item.hint.split(" ")[0]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mx-3.5 my-4 border-t border-line-soft" />

      <div className="px-3.5">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="label-xs">Loaded vehicle</span>
          <button onClick={() => onNavigate("garage")} className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-accent hover:underline">
            Change
          </button>
        </div>
        <button
          onClick={() => {
            onNavigate("garage");
            onClose?.();
          }}
          className="group w-full overflow-hidden rounded-xl border border-line bg-[linear-gradient(160deg,#151d17,#0c110e)] text-left transition-colors hover:border-[#37453a]"
        >
          <div className="h-[58px] px-3 pt-1.5 opacity-80 transition-opacity group-hover:opacity-100">
            <CarBlueprint vehicle={vehicle} className="h-full" />
          </div>
          <div className="border-t border-white/[0.05] px-3 py-2">
            <p className="truncate text-[13px] font-semibold text-fg">{vehicle.make} {vehicle.model}</p>
            <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[9.5px] uppercase tracking-[0.05em] text-mut-2">
              <span className="truncate">{vehicle.engine.code} · {vehicle.chassis.tyre}</span>
              <ChevronRight size={11} className="shrink-0 text-accent/70" />
            </div>
          </div>
        </button>
      </div>

      <div className="mt-4 space-y-0.5 px-2.5">
        <button onClick={onOpenControls} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-mut transition-colors hover:bg-white/[0.04] hover:text-fg">
          <Keyboard size={13} className="text-mut-2" />
          <span className="flex-1">Controls</span>
          <Kbd>?</Kbd>
        </button>
        <button onClick={onOpenSettings} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-mut transition-colors hover:bg-white/[0.04] hover:text-fg">
          <Settings size={13} className="text-mut-2" />
          <span className="flex-1">Audio & settings</span>
          <Kbd>⌘,</Kbd>
        </button>
      </div>

      <div className="mt-auto px-3.5 pb-3 pt-4">
        <CreatorCard />
        <div className="mt-2 flex items-center justify-between px-1 font-mono text-[9px] uppercase tracking-[0.1em] text-mut-2">
          <span>RealShift v1.4</span>
          <span>© 2026 Asif</span>
        </div>
      </div>
    </aside>
  );
}

export function TopBar({
  view,
  onMenu,
  onOpenControls,
  onOpenSettings,
  onOpenAudio,
  onAbout,
}: {
  view: AppView;
  onMenu: () => void;
  onOpenControls: () => void;
  onOpenSettings: () => void;
  onOpenAudio: () => void;
  onAbout: () => void;
}) {
  const { settings, updateSettings, vehicle } = useStore();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const date = now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase();
  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <header className="sticky top-0 z-40 flex h-[54px] items-center gap-3 border-b border-line bg-[#080b09]/90 px-3 backdrop-blur-xl sm:px-5">
      <button onClick={onMenu} aria-label="Open navigation" className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-mut lg:hidden">
        <Menu size={16} />
      </button>
      <div className="hidden items-center gap-2 text-[11.5px] sm:flex">
        <span className="font-mono uppercase tracking-[0.16em] text-mut-2">RealShift</span>
        <ChevronRight size={11} className="text-[#3c463d]" />
        <span className="font-mono uppercase tracking-[0.12em] text-[#c3cec0]">{VIEW_LABELS[view]}</span>
        {view === "dyno" && <span className="ml-1 rounded border border-accent/25 bg-accent/[0.07] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-accent">Bay 01</span>}
      </div>
      <div className="flex items-center gap-2 lg:hidden">
        <span className="font-display text-[13.5px] font-semibold tracking-wide text-fg">REALSHIFT</span>
        <span className="hidden max-w-[130px] truncate font-mono text-[9.5px] uppercase tracking-wider text-mut sm:block">{vehicle.make} {vehicle.model}</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <div className="mr-1 hidden items-center gap-2 border-r border-line-soft pr-3 xl:flex">
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-mut-2">
            <StatusDot tone="accent" pulse />
            Simulation
          </span>
          <span className="font-mono text-[10.5px] tracking-wide text-[#9daa9c]">{date} · {time}</span>
        </div>
        <button
          onClick={() => updateSettings({ units: settings.units === "metric" ? "imperial" : "metric" })}
          className="hidden h-8 items-center gap-1.5 rounded-lg border border-line-soft px-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-mut transition-colors hover:border-line hover:text-fg sm:flex"
          aria-label={`Switch units to ${settings.units === "metric" ? "imperial" : "metric"}`}
        >
          {settings.units === "metric" ? "km/h" : "mph"}
        </button>
        <IconButton label={settings.audio.muted ? "Unmute audio" : "Mute audio"} onClick={() => updateSettings({ audio: { ...settings.audio, muted: !settings.audio.muted } })} active={settings.audio.muted}>
          {settings.audio.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </IconButton>
        <button onClick={onOpenControls} aria-label="Keyboard controls" title="Keyboard controls" className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line-soft px-2.5 text-mut transition-colors hover:border-line hover:text-fg">
          <Keyboard size={15} />
          <span className="hidden text-[12.5px] sm:block">Controls</span>
        </button>
        <button onClick={onOpenAudio} aria-label="Audio settings" title="Audio settings" className="hidden h-9 items-center gap-1.5 rounded-[10px] border border-line-soft px-2.5 text-mut transition-colors hover:border-line hover:text-fg sm:flex">
          <SlidersHorizontal size={15} />
          <span className="text-[12.5px]">Audio</span>
        </button>
        <IconButton label="Open settings" onClick={onOpenSettings}>
          <Settings size={15} />
        </IconButton>
        <button
          onClick={onAbout}
          aria-label="About the creator, Asif"
          className="relative ml-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#dcffa0,#8fd8c4_72%)] font-display text-[13.5px] font-bold text-[#0b1611]"
          title="Asif · Creator · About"
        >
          A
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-[#080b09] bg-accent" />
        </button>
      </div>
    </header>
  );
}
