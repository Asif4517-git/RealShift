import { ArrowUpRight, Globe, Mail } from "lucide-react";
import { cn } from "../utils/cn";
import { InstagramIcon } from "./icons";

export function CreatorCard({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#263027] bg-[linear-gradient(160deg,#141b16_0%,#0e1410_100%)] p-3.5 shadow-[0_18px_40px_-22px_rgba(0,0,0,0.9)]",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#dcffa0,#8fd8c4_72%)] font-display text-[15px] font-bold text-[#0b1611] shadow-[0_0_22px_rgba(203,244,102,0.22)]">
            A
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#101611] bg-accent" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-[13px] font-semibold leading-tight text-fg">Asif</p>
          <p className="mt-0.5 truncate text-[10px] leading-tight text-[#8db3a2]">Creator · RealShift</p>
        </div>
        <span className="ml-auto font-mono text-[7.5px] uppercase tracking-[0.16em] text-mut-2">Dev</span>
      </div>

      <div className="mt-3 space-y-1.5">
        <a
          href="mailto:asifsrk4517@gmail.com"
          aria-label="Send an email to Asif"
          className="group flex h-[34px] items-center gap-2.5 rounded-[9px] border border-white/[0.055] bg-[#19201b] px-2 transition-colors hover:border-[#33413a] hover:bg-[#1d2721]"
        >
          <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px] border border-[#2b4a3d] bg-[#1c3a2e] text-[#7bd0b1]">
            <Mail size={12} strokeWidth={1.9} />
          </span>
          <span className="truncate text-[10px] font-medium tracking-[0.01em] text-[#e1e9dd]">asifsrk4517@gmail.com</span>
        </a>
        <a
          href="https://www.instagram.com/asif_xrk/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow Asif on Instagram"
          className="group flex h-[34px] items-center gap-2.5 rounded-[9px] border border-white/[0.055] bg-[#19201b] px-2 transition-colors hover:border-[#3d3238] hover:bg-[#1f2520]"
        >
          <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px] border border-[#4b2b3a] bg-[#3a2130] text-[#e59ab8]">
            <InstagramIcon className="h-3 w-3" />
          </span>
          <span className="text-[10px] font-medium text-[#e1e9dd]">@asif_xrk</span>
          <ArrowUpRight size={12} className="ml-auto shrink-0 text-[#65736a] transition-colors group-hover:text-[#c6d3c1]" />
        </a>
        <a
          href="https://asif4517-git.github.io/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit Asif's Portfolio"
          className="group flex h-[34px] items-center gap-2.5 rounded-[9px] border border-white/[0.055] bg-[#19201b] px-2 transition-colors hover:border-[#2e4137] hover:bg-[#1d2721]"
        >
          <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px] border border-[#28453e] bg-[#1a382f] text-[#82dbc0]">
            <Globe size={12} strokeWidth={1.9} />
          </span>
          <span className="text-[10px] font-medium text-[#e1e9dd]">About Me</span>
          <ArrowUpRight size={12} className="ml-auto shrink-0 text-[#65736a] transition-colors group-hover:text-[#c6d3c1]" />
        </a>
      </div>

      {!compact && (
        <p className="mt-2.5 border-t border-white/[0.05] pt-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#59665c]">
          Independent simulation build · 2026
        </p>
      )}
    </div>
  );
}
