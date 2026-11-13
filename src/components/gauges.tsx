import type { PullSample } from "../lib/physics";
import { torqueUnit, torqueValue } from "../lib/format";
import type { Units } from "../lib/store";
import type { Vehicle } from "../lib/vehicles";
import { cn } from "../utils/cn";

export function Tachometer({
  rpm,
  redline,
  limiter,
  gear,
  engineOn,
  limiterActive,
  idle,
  size = 240,
}: {
  rpm: number;
  redline: number;
  limiter: number;
  gear: string;
  engineOn: boolean;
  limiterActive: boolean;
  idle: number;
  size?: number;
}) {
  const maxVal = Math.ceil((limiter + 200) / 1000) * 1000;
  const startAngle = -126;
  const sweep = 252;
  const fraction = Math.min(1, Math.max(0, rpm / maxVal));
  const redFrac = Math.min(1, redline / maxVal);
  const needleAngle = startAngle + sweep * fraction;
  const cx = 130;
  const cy = 132;
  const r = 96;

  const polar = (deg: number, radius: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + Math.sin(rad) * radius, y: cy - Math.cos(rad) * radius };
  };
  const arc = (start: number, end: number, radius: number) => {
    const a = polar(start, radius);
    const b = polar(end, radius);
    const large = Math.abs(end - start) > 180 ? 1 : 0;
    return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${large} 1 ${b.x} ${b.y}`;
  };

  const ticks = [];
  const tickStep = maxVal > 8000 ? 1000 : 500;
  for (let value = 0; value <= maxVal; value += tickStep) {
    const angle = startAngle + (value / maxVal) * sweep;
    const outer = polar(angle, r + 5);
    const inner = polar(angle, value % 1000 === 0 ? r - 7 : r - 2);
    const labelPos = polar(angle, r - 20);
    const isRed = value >= redline;
    ticks.push(
      <g key={value}>
        <line x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke={isRed ? "#e27455" : "#5c675d"} strokeWidth={value % 1000 === 0 ? 1.6 : 1} />
        {value % (tickStep * 2) === 0 && (
          <text x={labelPos.x} y={labelPos.y + 3} textAnchor="middle" fontSize="8.5" fontFamily="JetBrains Mono, monospace" fill={isRed ? "#d68a76" : "#8a958b"}>
            {value / 1000}
          </text>
        )}
      </g>,
    );
  }

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 260 260" width={size} height={size} className={cn("overflow-visible transition-opacity", !engineOn && "opacity-70")}>
        <defs>
          <linearGradient id="rpmArc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8dbb52" />
            <stop offset="72%" stopColor="#cbf466" />
            <stop offset="100%" stopColor="#e8b25a" />
          </linearGradient>
          <filter id="rpmGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={cx} cy={cy} r={113} fill="none" stroke="#1b241d" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={107} fill="url(#gaugeFace)" opacity="0.6" />
        <path d={arc(startAngle, startAngle + sweep, r)} fill="none" stroke="#252e26" strokeWidth="10" strokeLinecap="round" />
        <path d={arc(startAngle + sweep * redFrac, startAngle + sweep, r)} fill="none" stroke="#6b2a22" strokeWidth="10" strokeLinecap="round" opacity="0.9" />
        <path d={arc(startAngle, startAngle + sweep * redFrac * 0.16, r)} fill="none" stroke="#3a4a35" strokeWidth="10" strokeLinecap="round" />
        {fraction > 0.005 && (
          <>
            <path d={arc(startAngle, needleAngle, r)} fill="none" stroke="url(#rpmArc)" strokeWidth="10" strokeLinecap="round" filter="url(#rpmGlow)" opacity="0.35" />
            <path d={arc(startAngle, needleAngle, r)} fill="none" stroke="url(#rpmArc)" strokeWidth="5" strokeLinecap="round" />
          </>
        )}
        {ticks}
        <text x={cx} y={cy - 58} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7.5" letterSpacing="2" fill="#6f7c70">
          ×1000 RPM
        </text>
        <g transform={`rotate(${needleAngle} ${cx} ${cy})`}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - r + 20} stroke={limiterActive ? "#f08a63" : "#e7f5da"} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx={cx} cy={cy - r + 20} r="2.4" fill={limiterActive ? "#f08a63" : "#cbf466"} />
        </g>
        <circle cx={cx} cy={cy} r="7" fill="#101511" stroke="#3a463b" strokeWidth="2" />
        <circle cx={cx} cy={cy} r="2.4" fill="#cbf466" />
        <text x={cx} y={cy + 40} textAnchor="middle" fontFamily="Space Grotesk, Arial, sans-serif" fontWeight="600" fontSize="38" fill="#edf2e9">
          {gear}
        </text>
        <text x={cx} y={cy + 54} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7.5" letterSpacing="2.4" fill="#758278">
          GEAR
        </text>
        <text x={cx} y={cy + 79} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="16" fill={limiterActive ? "#f08a63" : "#cbd8c8"}>
          {Math.round(rpm).toLocaleString("en-US")}
        </text>
        <text x={cx} y={cy + 90} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="6.5" letterSpacing="2" fill="#6f7c70">
          ENGINE RPM
        </text>
        <text x={cx - 92} y={cy + 106} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill="#607062">
          IDLE {idle}
        </text>
        <text x={cx + 92} y={cy + 106} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill="#a76a57">
          RED {redline}
        </text>
      </svg>
      {limiterActive && (
        <div className="absolute left-1/2 top-[46%] -translate-x-1/2 rounded border border-danger/40 bg-danger/15 px-1.5 py-0.5 font-mono text-[8.5px] tracking-[0.15em] text-danger">
          LIMITER
        </div>
      )}
    </div>
  );
}

export function ShiftLights({ rpm, redline, size = "md" }: { rpm: number; redline: number; size?: "sm" | "md" }) {
  const start = redline - 1600;
  const activeCount = Math.max(0, Math.min(7, Math.ceil(((rpm - start) / 1600) * 7)));
  return (
    <div className={cn("flex items-center justify-center", size === "sm" ? "gap-[3px]" : "gap-1")}>
      {Array.from({ length: 7 }).map((_, i) => {
        const on = i < activeCount;
        const color = i >= 5 ? "#e27455" : i >= 3 ? "#e8b25a" : "#cbf466";
        return (
          <span
            key={i}
            className={cn("rounded-full transition-all duration-75", size === "sm" ? "h-1 w-2.5" : "h-1.5 w-3.5")}
            style={{
              background: on ? color : "#232c25",
              boxShadow: on ? `0 0 8px ${color}77` : "none",
            }}
          />
        );
      })}
    </div>
  );
}

export function LinearGauge({
  label,
  value,
  tone = "accent",
  display,
  engaged,
}: {
  label: string;
  value: number;
  tone?: "accent" | "warm" | "teal" | "danger";
  display?: string;
  engaged?: boolean;
}) {
  const colors = { accent: "#cbf466", warm: "#e8b25a", teal: "#7bb8a5", danger: "#e27455" };
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label-xs">{label}</span>
        <span className="value-mono text-[11px] text-[#b7c3b5]">{display ?? `${Math.round(value * 100)}%`}</span>
      </div>
      <div className="h-[5px] overflow-hidden rounded-full bg-[#1c241d]">
        <div
          className="h-full rounded-full transition-[width] duration-100"
          style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, background: engaged ? colors[tone] : "#4a564c", boxShadow: value > 0 ? `0 0 10px ${colors[tone]}44` : "none" }}
        />
      </div>
    </div>
  );
}

export function TempBar({ label, value, max, tone = "accent", unit = "°C" }: { label: string; value: number; max: number; tone?: "accent" | "warm" | "danger"; unit?: string }) {
  const colors = { accent: "#7bb8a5", warm: "#e8b25a", danger: "#e27455" };
  const pct = Math.min(1, value / max);
  return (
    <div className="flex items-center gap-2">
      <span className="label-xs w-[42px] shrink-0">{label}</span>
      <div className="relative h-[4px] flex-1 overflow-hidden rounded-full bg-[#1e261f]">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct * 100}%`, background: colors[tone] }} />
      </div>
      <span className="value-mono w-[48px] text-right text-[10.5px] text-mut">{Math.round(value)}{unit}</span>
    </div>
  );
}

function modelCurve(vehicle: Vehicle) {
  return vehicle.engine.torqueCurve.map((point) => ({
    rpm: point.rpm,
    torque: point.nm * 0.92,
    hp: (point.nm * point.rpm) / 9549 * 1.34102,
  }));
}

export function DynoChart({
  samples,
  vehicle,
  units,
  height = 235,
  showTorque = true,
  compact,
}: {
  samples: PullSample[];
  vehicle: Vehicle;
  units: Units;
  height?: number;
  showTorque?: boolean;
  compact?: boolean;
}) {
  const W = 720;
  const H = 280;
  const pad = { l: 34, r: 38, t: 18, b: 28 };
  const domainMax = Math.ceil((vehicle.engine.limiter + 120) / 500) * 500;
  const curve = modelCurve(vehicle);
  const maxHp = Math.max(
    vehicle.dyno.peakPowerHp * 1.1,
    40,
    ...curve.map((p) => p.hp),
    ...samples.map((s) => s.crankHp),
  );
  const hpMax = Math.ceil(maxHp / 50) * 50;
  const torqueMax = Math.ceil((Math.max(vehicle.engine.torqueNm, ...samples.map((s) => s.torqueNm)) * 1.1) / 50) * 50;
  const x = (rpm: number) => pad.l + (rpm / domainMax) * (W - pad.l - pad.r);
  const yHp = (hp: number) => H - pad.b - (hp / hpMax) * (H - pad.t - pad.b);
  const yTq = (tq: number) => H - pad.b - (tq / torqueMax) * (H - pad.t - pad.b);
  const path = (items: { rpm: number; value: number }[], yFn: (v: number) => number) =>
    items.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.rpm).toFixed(1)} ${yFn(p.value).toFixed(1)}`).join(" ");

  const samplePath = samples.map((s) => ({ rpm: s.rpm, value: s.crankHp }));
  const areaPath = samplePath.length > 1
    ? `${path(samplePath, yHp)} L ${x(samples[samples.length - 1].rpm)} ${H - pad.b} L ${x(samples[0].rpm)} ${H - pad.b} Z`
    : "";
  const hasSamples = samples.length > 1;

  return (
    <div className={cn("w-full", compact ? "" : "")}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} role="img" aria-label={`Dyno chart for ${vehicle.make} ${vehicle.model}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="hpFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cbf466" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#cbf466" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 6 }).map((_, i) => {
          const y = pad.t + ((H - pad.t - pad.b) / 5) * i;
          const hp = Math.round(hpMax - (hpMax / 5) * i);
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#1e2720" strokeWidth="1" strokeDasharray={i === 5 ? "" : "2 5"} />
              <text x={pad.l - 7} y={y + 3} textAnchor="end" fontSize="7.5" fontFamily="JetBrains Mono, monospace" fill="#667267">{hp}</text>
            </g>
          );
        })}
        {Array.from({ length: 9 }).map((_, i) => {
          const rpm = (domainMax / 8) * i;
          return (
            <g key={`x${i}`}>
              <line x1={x(rpm)} y1={pad.t} x2={x(rpm)} y2={H - pad.b} stroke="#19211a" strokeWidth="1" />
              <text x={x(rpm)} y={H - 12} textAnchor="middle" fontSize="7.5" fontFamily="JetBrains Mono, monospace" fill="#667267">
                {Math.round(rpm / 100) / 10}k
              </text>
            </g>
          );
        })}
        <line x1={x(vehicle.engine.redline)} y1={pad.t} x2={x(vehicle.engine.redline)} y2={H - pad.b} stroke="#e27455" strokeOpacity="0.4" strokeDasharray="3 4" />
        <text x={x(vehicle.engine.redline) + 3} y={pad.t + 8} fontSize="7" fontFamily="JetBrains Mono, monospace" fill="#b37666">REDLINE</text>
        <path d={path(curve.map((p) => ({ rpm: p.rpm, value: p.hp })), yHp)} fill="none" stroke="#93a46e" strokeWidth="1.4" strokeDasharray="4 4" opacity="0.8" />
        {showTorque && (
          <path d={path(curve.map((p) => ({ rpm: p.rpm, value: p.torque })), yTq)} fill="none" stroke="#a8864b" strokeWidth="1.2" strokeDasharray="2 5" opacity="0.7" />
        )}
        {hasSamples && <path d={areaPath} fill="url(#hpFill)" />}
        {hasSamples && (
          <path d={path(samplePath, yHp)} fill="none" stroke="#cbf466" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        )}
        {hasSamples && showTorque && (
          <path d={path(samples.map((s) => ({ rpm: s.rpm, value: s.torqueNm })), yTq)} fill="none" stroke="#e8b25a" strokeWidth="1.7" strokeLinejoin="round" />
        )}
        <text x={pad.l - 7} y={pad.t - 6} textAnchor="end" fontSize="7" fontFamily="JetBrains Mono, monospace" fill="#7f8c80">HP</text>
        {showTorque && <text x={W - pad.r + 7} y={pad.t - 6} fontSize="7" fontFamily="JetBrains Mono, monospace" fill="#a08557">TQ</text>}
        {!hasSamples && (
          <g>
            <rect x={W / 2 - 110} y={H / 2 - 14} width="220" height="28" rx="6" fill="#0c110d" stroke="#263027" />
            <text x={W / 2} y={H / 2 + 3} textAnchor="middle" fontSize="8" fontFamily="JetBrains Mono, monospace" fill="#8a958b" letterSpacing="1">
              REFERENCE MODEL · NO PULL ARMED
            </text>
          </g>
        )}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
        <ChartLegend color="#cbf466" solid label="Est. crank hp" />
        {showTorque && <ChartLegend color="#e8b25a" solid label={`Wheel torque (${torqueUnit(units)})`} />}
        <ChartLegend color="#93a46e" label="Reference hp" />
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.08em] text-mut-2">
          {hasSamples ? `${samples.length} live samples` : "calculated from published torque anchors"}
        </span>
      </div>
    </div>
  );
}

function ChartLegend({ color, label, solid }: { color: string; label: string; solid?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-mut">
      <span className={cn("h-[2px] w-3.5 rounded-full", !solid && "opacity-60")} style={{ background: color, backgroundImage: solid ? undefined : "repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 7px)" }} />
      {label}
    </span>
  );
}

export function MiniBar({ label, value, unit, tone = "accent", max = 1 }: { label: string; value: number; unit?: string; tone?: "accent" | "warm" | "teal" | "danger"; max?: number }) {
  const colors = { accent: "#cbf466", warm: "#e8b25a", teal: "#7bb8a5", danger: "#e27455" };
  const ratio = Math.max(0, Math.min(1, value / max));
  return (
    <div className="rounded-lg border border-line-soft bg-black/20 p-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="label-xs text-[9.5px]">{label}</span>
        <span className="value-mono text-[11.5px] text-fg">{value.toFixed(value < 10 ? 1 : 0)}{unit && <span className="ml-0.5 text-[8.5px] text-mut-2">{unit}</span>}</span>
      </div>
      <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-[#1d251e]">
        <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, background: colors[tone] }} />
      </div>
    </div>
  );
}

export function CarBlueprint({ vehicle, detailed = false, className }: { vehicle: Vehicle; detailed?: boolean; className?: string }) {
  const style = vehicle.bodyStyle;
  const lengthScale = 0.86 + ((vehicle.chassis.lengthMm - 3800) / 1500) * 0.22;
  const ground = 92;
  const body: Record<string, string> = {
    Hatchback: "M38,84 L44,66 L74,58 L106,38 L196,34 L226,54 L286,60 L302,78 L296,86 L44,86 Z",
    Sedan: "M30,84 L36,66 L82,58 L116,38 L206,36 L238,56 L300,62 L312,80 L306,86 L36,86 Z",
    Coupe: "M28,84 L34,68 L90,58 L124,42 L208,40 L244,60 L308,64 L318,82 L308,86 L34,86 Z",
    Sports: "M30,84 L38,70 L100,60 L142,42 L214,42 L258,58 L306,64 L316,82 L304,86 L36,86 Z",
    Roadster: "M34,84 L42,68 L96,60 L130,52 L200,52 L238,62 L300,66 L308,82 L298,86 L40,86 Z",
    SUV: "M32,84 L36,50 L70,40 L102,20 L222,20 L262,42 L304,48 L310,82 L304,86 L38,86 Z",
    Pickup: "M30,84 L34,52 L64,42 L94,24 L178,24 L204,42 L214,52 L308,52 L312,78 L306,86 L36,86 Z",
  };
  const windows: Record<string, string> = {
    Hatchback: "M110,41 L192,38 L218,55 L110,55 Z",
    Sedan: "M120,41 L202,39 L230,55 L120,55 Z",
    Coupe: "M128,45 L204,43 L236,59 L128,59 Z",
    Sports: "M146,46 L210,46 L250,59 L146,59 Z",
    Roadster: "M136,55 L198,55 L232,63 L136,63 Z",
    SUV: "M106,24 L220,24 L256,43 L106,43 Z",
    Pickup: "M98,28 L174,28 L194,43 L98,43 Z",
  };
  const wheelPositions = style === "Pickup" ? [84, 252] : [98, 250];
  return (
    <svg viewBox="0 0 340 120" className={cn("h-auto w-full", className)} role="img" aria-label={`${vehicle.make} ${vehicle.model} technical profile illustration`}>
      <defs>
        <linearGradient id={`bluefill-${vehicle.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cbf466" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#cbf466" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={`v${i}`} x1={20 + i * 40} y1={12} x2={20 + i * 40} y2={106} stroke="#253027" strokeWidth="0.5" opacity="0.55" />
      ))}
      {Array.from({ length: 4 }).map((_, i) => (
        <line key={`h${i}`} x1={16} y1={26 + i * 24} x2={330} y2={26 + i * 24} stroke="#253027" strokeWidth="0.5" opacity="0.5" />
      ))}
      <line x1={16} y1={ground} x2={330} y2={ground} stroke="#4a574b" strokeWidth="1" />
      <g transform={`translate(170 0) scale(${lengthScale} 1) translate(-170 0)`}>
        <path d={body[style] ?? body.Sedan} fill={`url(#bluefill-${vehicle.id})`} stroke="#cbf466" strokeWidth={detailed ? 1.5 : 1.3} strokeLinejoin="round" />
        <path d={windows[style] ?? windows.Sedan} fill="#cbf466" fillOpacity="0.08" stroke="#8fae6b" strokeWidth="0.8" strokeDasharray="2 2" />
        {wheelPositions.map((x) => (
          <g key={x}>
            <circle cx={x} cy={82} r={19} fill="#0b0f0c" stroke="#b9d284" strokeWidth="1.4" />
            <circle cx={x} cy={82} r={11} fill="none" stroke="#80926a" strokeWidth="1" />
            <circle cx={x} cy={82} r={3.4} fill="none" stroke="#94a779" strokeWidth="1" />
            {Array.from({ length: 6 }).map((_, s) => {
              const a = (s / 6) * Math.PI * 2;
              return <line key={s} x1={x + Math.cos(a) * 3} y1={82 + Math.sin(a) * 3} x2={x + Math.cos(a) * 10.5} y2={82 + Math.sin(a) * 10.5} stroke="#8fa475" strokeWidth="1" />;
            })}
          </g>
        ))}
        <line x1={wheelPositions[0]} y1={64} x2={wheelPositions[0]} y2={48} stroke="#3c4a3c" strokeWidth="0.7" strokeDasharray="2 2" />
        <line x1={wheelPositions[1]} y1={64} x2={wheelPositions[1]} y2={48} stroke="#3c4a3c" strokeWidth="0.7" strokeDasharray="2 2" />
      </g>
      {detailed && (
        <g fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill="#7c897d">
          <text x={20} y={112}>L {vehicle.chassis.lengthMm} mm</text>
          <text x={132} y={112}>WB {vehicle.chassis.wheelbaseMm} mm</text>
          <text x={248} y={112}>H {vehicle.chassis.heightMm} mm</text>
          <text x={170} y={18} textAnchor="middle" letterSpacing="2.2" fill="#94a97c">{vehicle.chassis.tyre}</text>
        </g>
      )}
    </svg>
  );
}

export function TorqueCurveBars({ vehicle, units }: { vehicle: Vehicle; units: Units }) {
  const max = Math.max(...vehicle.engine.torqueCurve.map((p) => p.nm));
  return (
    <div className="flex h-14 items-end gap-1">
      {vehicle.engine.torqueCurve.map((point) => (
        <div key={point.rpm} className="group relative flex-1">
          <div className="w-full rounded-sm bg-gradient-to-t from-accent-2/30 to-accent/70 transition-all group-hover:to-accent" style={{ height: `${Math.max(6, (point.nm / max) * 52)}px` }} />
          <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-[9.5px] text-fg group-hover:block">
            {torqueValue(point.nm, units).toFixed(0)} {torqueUnit(units)}
          </span>
        </div>
      ))}
    </div>
  );
}
