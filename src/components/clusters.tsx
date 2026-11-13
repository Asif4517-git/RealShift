import type { SimSnapshot } from "../lib/physics";
import { nf, speedUnit, speedValue, tempUnit, tempValue } from "../lib/format";
import type { Units } from "../lib/store";
import { cn } from "../utils/cn";

export type ClusterTheme = "sport" | "classic" | "digital" | "bavaria" | "elegance" | "stuttgart" | "minimal";

export const CLUSTER_THEMES: { id: ClusterTheme; name: string; blurb: string; accent: string }[] = [
  { id: "sport", name: "Performance", blurb: "Central tach, shift bar, live power", accent: "#cbf466" },
  { id: "classic", name: "Classic analogue", blurb: "Twin cream dials, chrome bezels", accent: "#e8d9bd" },
  { id: "digital", name: "Modern digital", blurb: "Full-width digital bar and panel", accent: "#7bb8a5" },
  { id: "bavaria", name: "Bavaria", blurb: "Red-accented twin dial layout", accent: "#e27455" },
  { id: "elegance", name: "Elegance", blurb: "Wide calm dials, central display", accent: "#d9cbb0" },
  { id: "stuttgart", name: "Stuttgart", blurb: "Five-dial sports layout", accent: "#f0efe6" },
  { id: "minimal", name: "Minimal", blurb: "Thin arc, large numerals", accent: "#edf2e9" },
];

interface Props {
  state: SimSnapshot;
  units: Units;
  theme: ClusterTheme;
  className?: string;
  onOpenPicker?: () => void;
}

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
};
const arcPath = (cx: number, cy: number, r: number, start: number, end: number) => {
  const a = polar(cx, cy, r, end);
  const b = polar(cx, cy, r, start);
  const large = Math.abs(end - start) > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 0 ${b.x} ${b.y}`;
};

/** An original analogue dial used by several themes. */
function Dial({
  cx,
  cy,
  r,
  value,
  max,
  redline,
  label,
  unit,
  valueText,
  accent = "#e8d9bd",
  tickCount = 8,
  start = 225,
  sweep = 270,
  needleWidth = 2,
  face = "#0d1210",
  ring = "#2a342c",
  text = "#cbd6c7",
  dim = "#7f8c80",
  sublabel,
  small,
}: {
  cx: number;
  cy: number;
  r: number;
  value: number;
  max: number;
  redline?: number;
  label: string;
  unit?: string;
  valueText?: string;
  accent?: string;
  tickCount?: number;
  start?: number;
  sweep?: number;
  needleWidth?: number;
  face?: string;
  ring?: string;
  text?: string;
  dim?: string;
  sublabel?: string;
  small?: boolean;
}) {
  const ratio = Math.max(0, Math.min(1, value / max));
  const end = start + sweep;
  const angle = start + sweep * ratio;
  const redStart = redline !== undefined ? start + sweep * Math.max(0, Math.min(1, redline / max)) : end;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const valueAt = (max / tickCount) * i;
    const a = start + (sweep / tickCount) * i;
    const outer = polar(cx, cy, r + 1, a);
    const inner = polar(cx, cy, r - (small ? 4 : 7), a);
    const pos = polar(cx, cy, r - (small ? 14 : 19), a);
    return (
      <g key={i}>
        <line x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke={valueAt >= (redline ?? Infinity) ? "#d3705a" : "#59665b"} strokeWidth={small ? 0.9 : 1.3} />
        {i % (tickCount > 6 ? 2 : 1) === 0 && (
          <text x={pos.x} y={pos.y + 2.6} textAnchor="middle" fontSize={small ? 6 : 8} fontFamily="JetBrains Mono, monospace" fill={valueAt >= (redline ?? Infinity) ? "#c88370" : dim}>
            {small ? Math.round(valueAt / 1000) : Math.round(valueAt)}
          </text>
        )}
      </g>
    );
  });
  const needleEnd = polar(cx, cy, r - 13, angle);
  const needleTail = polar(cx, cy, 10, angle + 180);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 9} fill={face} stroke={ring} strokeWidth="1.2" />
      <path d={arcPath(cx, cy, r, start, end)} fill="none" stroke="#242d26" strokeWidth={small ? 3 : 5} strokeLinecap="round" />
      <path d={arcPath(cx, cy, r, redStart, end)} fill="none" stroke="#7a3025" strokeWidth={small ? 3 : 5} strokeLinecap="round" />
      {ratio > 0.004 && <path d={arcPath(cx, cy, r, start, angle)} fill="none" stroke={accent} strokeWidth={small ? 3 : 4} strokeLinecap="round" opacity="0.85" />}
      {ticks}
      {label && (
        <text x={cx} y={cy - r * 0.42} textAnchor="middle" fontSize={small ? 5.5 : 7} letterSpacing="1.8" fontFamily="JetBrains Mono, monospace" fill={dim}>
          {label}
        </text>
      )}
      <line x1={needleTail.x} y1={needleTail.y} x2={needleEnd.x} y2={needleEnd.y} stroke={accent} strokeWidth={needleWidth} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={small ? 3 : 4.4} fill="#141a15" stroke={ring} strokeWidth="1.2" />
      {valueText && (
        <text x={cx} y={cy + r * 0.46} textAnchor="middle" fontSize={small ? 8 : 12} fontFamily="JetBrains Mono, monospace" fill={text}>
          {valueText}
        </text>
      )}
      {sublabel && (
        <text x={cx} y={cy + r * 0.65} textAnchor="middle" fontSize={small ? 5 : 6.4} letterSpacing="1.2" fontFamily="JetBrains Mono, monospace" fill={dim}>
          {sublabel}
        </text>
      )}
      {unit && (
        <text x={cx} y={cy + r * 0.78} textAnchor="middle" fontSize={small ? 5 : 6.4} letterSpacing="1.4" fontFamily="JetBrains Mono, monospace" fill={dim}>
          {unit}
        </text>
      )}
    </g>
  );
}

function ShiftStrip({ rpm, redline, accent, width, y, segments = 9 }: { rpm: number; redline: number; accent: string; width: number; y: number; segments?: number }) {
  const start = redline - 1700;
  const lit = Math.max(0, Math.min(segments, Math.ceil(((rpm - start) / 1700) * segments)));
  return (
    <g>
      {Array.from({ length: segments }).map((_, i) => {
        const on = i < lit;
        const color = i >= segments - 2 ? "#e27455" : i >= segments - 4 ? "#e8b25a" : accent;
        const gap = 3;
        const w = (width - gap * (segments - 1)) / segments;
        return <rect key={i} x={i * (w + gap)} y={y} width={w} height="4" rx="2" fill={on ? color : "#232c25"} opacity={on ? 1 : 0.8} />;
      })}
    </g>
  );
}

function WarningLights({ state }: { state: SimSnapshot }) {
  const items = [
    { label: "CEL", on: state.cel, tone: "#e27455" },
    { label: "OIL", on: state.engineOn && state.oilBar < 1.2, tone: "#e27455" },
    { label: "BAT", on: !state.engineOn, tone: "#e8b25a" },
    { label: "TEMP", on: state.coolantC > 102, tone: "#e27455" },
    { label: "FUEL", on: state.fuelPct < 12, tone: "#e8b25a" },
  ];
  return (
    <g>
      {items.map((item, i) => (
        <g key={item.label} transform={`translate(${i * 46}, 0)`}>
          <rect width="40" height="13" rx="3" fill={item.on ? `${item.tone}22` : "#141a15"} stroke={item.on ? item.tone : "#252e27"} strokeWidth="0.8" />
          <text x="20" y="9.4" textAnchor="middle" fontSize="6.2" fontFamily="JetBrains Mono, monospace" letterSpacing="0.4" fill={item.on ? item.tone : "#56635a"}>
            {item.label}
          </text>
        </g>
      ))}
    </g>
  );
}

export function ClusterDisplay({ state, units, theme, className }: Props) {
  const speed = speedValue(state.speedKph, units);
  const unit = speedUnit(units);
  const gear = state.gearLabel;
  const tachValue = Math.round(state.rpm);
  const speedText = nf(speed, state.speedKph < 10 ? 1 : 0);
  const temp = `${nf(tempValue(state.coolantC, units), 0)}${tempUnit(units)}`;
  const fuel = `${nf(state.fuelPct, 0)}%`;
  const speedMax = Math.max(160, Math.ceil((speed / 20)) * 20 + 40);

  const wrapper = "relative w-full overflow-hidden rounded-xl border border-line-soft bg-[#080c09]";
  const caption = (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft px-3 py-2">
      <div className="flex items-center gap-3">
        <LegendDot color={CLUSTER_THEMES.find((t) => t.id === theme)?.accent ?? "#cbf466"} label={CLUSTER_THEMES.find((t) => t.id === theme)?.name ?? "Cluster"} />
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-mut-2">Live engine data · {state.engineOn ? "running" : state.stalled ? "stalled" : "ignition off"}</span>
      </div>
      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-mut">Clutch {state.clutch > 0.92 ? "open" : state.clutchSlipRpm > 80 ? "slipping" : "engaged"}</span>
    </div>
  );

  if (theme === "digital") {
    return (
      <div className={cn(wrapper, className)}>
        <svg viewBox="0 0 420 246" className="w-full" role="img" aria-label="Modern digital instrument cluster">
          <rect width="420" height="246" fill="#070d0b" />
          <rect x="12" y="12" width="396" height="222" rx="12" fill="#0b1310" stroke="#1f2b24" />
          <ShiftStrip rpm={state.rpm} redline={state.redline} accent="#7bb8a5" width={252} y={22} />
          <text x="24" y="54" fontFamily="JetBrains Mono, monospace" fontSize="8" letterSpacing="1.8" fill="#6f8378">ENGINE SPEED</text>
          <text x="24" y="96" fontFamily="JetBrains Mono, monospace" fontSize="40" fill={state.limiterActive ? "#e27455" : "#edf2e9"}>{nf(tachValue)}</text>
          <text x="24" y="112" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#7a8a7e">RPM · LIMIT {nf(state.redline)}</text>
          <rect x="24" y="124" width="252" height="8" rx="4" fill="#1b2620" />
          <rect x="24" y="124" width={Math.min(252, 252 * (state.rpm / state.limiterRpm))} height="8" rx="4" fill="#7bb8a5" />
          <rect x="24" y="124" width={252 * Math.min(1, state.redline / state.limiterRpm)} height="8" rx="4" fill="none" stroke="#7a3a2e" strokeWidth="1" />
          <text x="24" y="158" fontFamily="JetBrains Mono, monospace" fontSize="8" letterSpacing="1.8" fill="#6f8378">ROLLER SPEED</text>
          <text x="24" y="200" fontFamily="JetBrains Mono, monospace" fontSize="38" fill="#edf2e9">{speedText}</text>
          <text x="24" y="216" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#7a8a7e">{unit.toUpperCase()} · DYNO ROLLER</text>
          <rect x="292" y="24" width="100" height="94" rx="8" fill="#0f1813" stroke="#24332a" />
          <text x="342" y="40" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" letterSpacing="1.6" fill="#6f8378">GEAR</text>
          <text x="342" y="94" textAnchor="middle" fontFamily="Space Grotesk, Arial" fontWeight="700" fontSize="52" fill="#7bb8a5">{gear}</text>
          <text x="342" y="110" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill="#6f8378">MT</text>
          <rect x="292" y="126" width="100" height="48" rx="8" fill="#0f1813" stroke="#24332a" />
          <text x="302" y="141" fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill="#6f8378">COOLANT</text>
          <text x="382" y="141" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#cdd8ca">{temp}</text>
          <rect x="302" y="148" width="80" height="4" rx="2" fill="#1b2620" />
          <rect x="302" y="148" width={Math.min(80, 80 * (state.coolantC / 120))} height="4" rx="2" fill="#7bb8a5" />
          <text x="302" y="166" fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill="#6f8378">FUEL</text>
          <text x="382" y="166" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#cdd8ca">{fuel}</text>
          <rect x="292" y="184" width="100" height="42" rx="8" fill="#0f1813" stroke="#24332a" />
          <text x="342" y="199" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill="#6f8378">CRANK POWER EST.</text>
          <text x="342" y="218" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="16" fill="#cbf466">{nf(state.crankPowerHp, 0)} hp</text>
          <g transform="translate(24 222) scale(0.86)"><WarningLights state={state} /></g>
          <text x="396" y="228" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill="#4f5d52">THROTTLE {Math.round(state.throttle * 100)}% · BOOST {state.boostBar.toFixed(1)} bar</text>
        </svg>
        {caption}
      </div>
    );
  }

  if (theme === "minimal") {
    return (
      <div className={cn(wrapper, className)}>
        <svg viewBox="0 0 420 246" className="w-full" role="img" aria-label="Minimal digital instrument cluster">
          <rect width="420" height="246" fill="#080c09" />
          <rect x="30" y="26" width="214" height="4" rx="2" fill="#1d261f" />
          <rect x="30" y="26" width={214 * Math.min(1, state.rpm / state.limiterRpm)} height="4" rx="2" fill="#edf2e9" />
          <rect x="244" y="26" width={Math.max(0, 60 * Math.min(1, state.rpm / state.limiterRpm) - 0)} height="4" rx="2" fill="#e27455" opacity={state.rpm > state.redline ? 1 : 0.18} />
          <text x="30" y="76" fontFamily="JetBrains Mono, monospace" fontSize="8" letterSpacing="2" fill="#77857a">RPM</text>
          <text x="30" y="120" fontFamily="JetBrains Mono, monospace" fontSize="40" fill="#edf2e9">{nf(tachValue)}</text>
          <text x="212" y="120" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#6f7d72">/ {nf(state.redline)}</text>
          <line x1="30" y1="142" x2="212" y2="142" stroke="#232d25" />
          <text x="30" y="172" fontFamily="JetBrains Mono, monospace" fontSize="8" letterSpacing="2" fill="#77857a">SPEED · {unit.toUpperCase()}</text>
          <text x="30" y="216" fontFamily="JetBrains Mono, monospace" fontSize="40" fill="#edf2e9">{speedText}</text>
          <rect x="292" y="52" width="98" height="130" rx="6" fill="#0c120e" stroke="#222c24" />
          <text x="341" y="72" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" letterSpacing="1.6" fill="#6f7d72">GEAR</text>
          <text x="341" y="130" textAnchor="middle" fontFamily="Space Grotesk, Arial" fontSize="62" fontWeight="600" fill="#edf2e9">{gear}</text>
          <text x="341" y="152" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#6f7d72">{state.engineOn ? "RUNNING" : "OFF"}</text>
          <text x="341" y="168" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#6f7d72">{temp}</text>
          <g transform="translate(30 228) scale(0.9)"><WarningLights state={state} /></g>
          <text x="390" y="236" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill="#56645a">{nf(state.crankPowerHp, 0)} HP EST. · FUEL {fuel}</text>
        </svg>
        {caption}
      </div>
    );
  }

  if (theme === "sport") {
    return (
      <div className={cn(wrapper, className)}>
        <svg viewBox="0 0 420 246" className="w-full" role="img" aria-label="Performance instrument cluster">
          <rect width="420" height="246" fill="#080c09" />
          <ShiftStrip rpm={state.rpm} redline={state.redline} accent="#cbf466" width={190} y={18} />
          <text x="30" y="44" fontFamily="JetBrains Mono, monospace" fontSize="7" letterSpacing="1.8" fill="#6f7d72">SHIFT</text>
          <text x="390" y="44" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="7" letterSpacing="1.8" fill={state.rpm > state.redline - 1600 ? "#d3705a" : "#6f7d72"}>
            {state.rpm > state.redline - 1600 ? "NEAR LIMIT" : "OPTIMAL BAND"}
          </text>
          <Dial cx={210} cy={142} r={78} value={state.rpm} max={state.limiterRpm} redline={state.redline} label="×1000 RPM" accent="#cbf466" tickCount={8} valueText={nf(tachValue)} sublabel="ENGINE" />
          <Dial cx={82} cy={158} r={44} value={state.fuelPct} max={100} label="FUEL" accent="#e8b25a" tickCount={4} valueText={fuel} small />
          <Dial cx={338} cy={158} r={44} value={state.coolantC} max={120} redline={104} label="COOLANT" accent="#7bb8a5" tickCount={4} valueText={temp} small />
          <text x="210" y="39" textAnchor="middle" fontFamily="Space Grotesk, Arial" fontSize="17" fontWeight="600" fill="#edf2e9">{gear}</text>
          <text x="210" y="52" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="6.5" letterSpacing="1.6" fill="#7c8a7f">GEAR</text>
          <text x="30" y="118" fontFamily="JetBrains Mono, monospace" fontSize="22" fill="#edf2e9">{speedText}</text>
          <text x="30" y="132" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#77857a">{unit.toUpperCase()}</text>
          <text x="390" y="112" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="15" fill="#cbf466">{nf(state.crankPowerHp, 0)}</text>
          <text x="390" y="124" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#77857a">HP EST.</text>
          <text x="390" y="138" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#77857a">CLUTCH {state.clutch > 0.9 ? "OPEN" : state.clutchSlipRpm > 80 ? "SLIP" : "IN"}</text>
          <g transform="translate(30 222) scale(0.86)"><WarningLights state={state} /></g>
          <text x="390" y="232" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill="#56645a">BOOST {state.boostBar.toFixed(1)} BAR · LOAD {state.throttle * 100}%</text>
        </svg>
        {caption}
      </div>
    );
  }

  if (theme === "classic") {
    return (
      <div className={cn(wrapper, className)}>
        <svg viewBox="0 0 420 246" className="w-full" role="img" aria-label="Classic analogue instrument cluster">
          <rect width="420" height="246" fill="#0a0e0b" />
          <rect x="8" y="8" width="404" height="230" rx="10" fill="#101611" stroke="#2b352d" />
          <Dial cx={118} cy={128} r={76} value={state.rpm} max={state.limiterRpm} redline={state.redline} label="RPM ×1000" accent="#e8d9bd" tickCount={8} start={215} sweep={290} face="#121a14" ring="#4a4340" valueText={nf(tachValue)} sublabel="TACHOMETER" needleWidth={2.4} />
          <Dial cx={302} cy={128} r={76} value={speed} max={Math.max(160, speedMax)} label={unit.toUpperCase()} accent="#e8d9bd" tickCount={8} start={215} sweep={290} face="#121a14" ring="#4a4340" valueText={speedText} sublabel="ROLLER SPEED" needleWidth={2.4} />
          <rect x="176" y="104" width="68" height="56" rx="5" fill="#0b100d" stroke="#3b443b" />
          <text x="210" y="124" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="6" letterSpacing="1.4" fill="#93897a">GEAR</text>
          <text x="210" y="150" textAnchor="middle" fontFamily="Space Grotesk, Arial" fontSize="26" fill="#e8d9bd">{gear}</text>
          <text x="210" y="70" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="6.5" letterSpacing="1.4" fill="#7f7565">REALSHIFT INSTRUMENTS</text>
          <g transform="translate(28 214) scale(0.9)"><WarningLights state={state} /></g>
          <text x="390" y="226" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#857a68">FUEL {fuel} · {temp} · {state.oilBar.toFixed(1)} BAR OIL</text>
          <circle cx="118" cy="128" r="83" fill="none" stroke="#5a5146" strokeWidth="1" opacity="0.55" />
          <circle cx="302" cy="128" r="83" fill="none" stroke="#5a5146" strokeWidth="1" opacity="0.55" />
        </svg>
        {caption}
      </div>
    );
  }

  if (theme === "bavaria") {
    return (
      <div className={cn(wrapper, className)}>
        <svg viewBox="0 0 420 246" className="w-full" role="img" aria-label="Bavaria-inspired instrument cluster">
          <rect width="420" height="246" fill="#07090a" />
          <Dial cx={126} cy={126} r={80} value={state.rpm} max={state.limiterRpm} redline={state.redline} label="1/min ×1000" accent="#f0f2ea" tickCount={8} start={200} sweep={300} face="#0a0d0c" ring="#23282a" valueText={nf(tachValue)} sublabel="ENGINE" />
          <Dial cx={294} cy={126} r={80} value={speed} max={Math.max(160, speedMax)} redline={Math.max(160, speedMax) * 0.86} label={unit.toUpperCase()} accent="#f0f2ea" tickCount={8} start={200} sweep={300} face="#0a0d0c" ring="#23282a" valueText={speedText} sublabel="SPEED" />
          <rect x="186" y="48" width="48" height="20" rx="3" fill="#111614" stroke="#2b3230" />
          <text x="210" y="62" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9.5" fill="#d8dfd5">{gear}</text>
          <g transform="translate(186 80)">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect key={i} x={0} y={i * 11} width={48} height={8} rx={1.5} fill={state.rpm > state.redline - 1200 - i * 250 ? (i > 2 ? "#e27455" : "#e8b25a") : "#1b221e"} />
            ))}
          </g>
          <text x="210" y="158" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill="#7a847c">{temp}</text>
          <text x="210" y="170" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill="#7a847c">FUEL {fuel}</text>
          <text x="210" y="34" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="6.5" letterSpacing="1.4" fill="#8b958c">DRIVE SPORT · {state.engineOn ? "RUNNING" : "OFF"}</text>
          <g transform="translate(28 216) scale(0.9)"><WarningLights state={state} /></g>
          <text x="392" y="228" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#7a847c">{nf(state.crankPowerHp, 0)} HP EST. · CLUTCH {state.clutch > 0.9 ? "OPEN" : state.clutchSlipRpm > 80 ? "SLIP" : "IN"}</text>
        </svg>
        {caption}
      </div>
    );
  }

  if (theme === "elegance") {
    return (
      <div className={cn(wrapper, className)}>
        <svg viewBox="0 0 420 246" className="w-full" role="img" aria-label="Elegance-inspired instrument cluster">
          <rect width="420" height="246" fill="#0a0c0b" />
          <rect x="54" y="30" width="312" height="176" rx="88" fill="#0e1210" stroke="#2a322b" />
          <Dial cx={128} cy={122} r={62} value={speed} max={Math.max(160, speedMax)} label={unit.toUpperCase()} accent="#d9cbb0" tickCount={8} start={190} sweep={200} face="#0e1210" ring="#2a322b" valueText={speedText} sublabel="SPEED" />
          <Dial cx={292} cy={122} r={62} value={state.rpm} max={state.limiterRpm} redline={state.redline} label="RPM" accent="#d9cbb0" tickCount={8} start={150} sweep={200} face="#0e1210" ring="#2a322b" valueText={nf(tachValue)} sublabel="ENGINE" />
          <rect x="184" y="86" width="52" height="58" rx="5" fill="#080c09" stroke="#3a423b" />
          <text x="210" y="102" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="6" fill="#8d9489">{state.engineOn ? "D" : "P"}</text>
          <text x="210" y="130" textAnchor="middle" fontFamily="Space Grotesk, Arial" fontSize="23" fill="#e4ddcd">{gear}</text>
          <text x="210" y="140" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="5" fill="#8d9489">GEAR</text>
          <text x="210" y="64" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="6.5" letterSpacing="2" fill="#a49c8c">REALSHIFT · COMFORT</text>
          <g transform="translate(28 216) scale(0.9)"><WarningLights state={state} /></g>
          <text x="392" y="228" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#8d9489">{temp} · FUEL {fuel} · {state.oilBar.toFixed(1)} BAR</text>
        </svg>
        {caption}
      </div>
    );
  }

  // Stuttgarter five-dial
  return (
    <div className={cn(wrapper, className)}>
      <svg viewBox="0 0 420 246" className="w-full" role="img" aria-label="Stuttgart-inspired five-dial instrument cluster">
        <rect width="420" height="246" fill="#080a09" />
        <Dial cx={210} cy={124} r={72} value={state.rpm} max={state.limiterRpm} redline={state.redline} label="×1000" accent="#f0efe6" tickCount={8} start={210} sweep={300} face="#0b0e0c" ring="#2a2f2b" valueText={nf(tachValue)} sublabel="ENGINE" needleWidth={2.6} />
        <text x="210" y="196" textAnchor="middle" fontFamily="Space Grotesk, Arial" fontSize="22" fill="#f0efe6">{gear}</text>
        <Dial cx={84} cy={134} r={38} value={speed} max={Math.max(160, speedMax)} label={unit === "km/h" ? "KM/H" : "MPH"} accent="#f0efe6" tickCount={4} start={210} sweep={270} valueText={speedText} small />
        <Dial cx={336} cy={134} r={38} value={state.coolantC} max={120} redline={104} label="TEMP" accent="#f0efe6" tickCount={4} start={210} sweep={270} valueText={temp} small />
        <Dial cx={84} cy={52} r={26} value={state.fuelPct} max={100} label="FUEL" accent="#d3cdbd" tickCount={4} start={210} sweep={270} small />
        <Dial cx={336} cy={52} r={26} value={state.oilBar} max={6} label="OIL" accent="#d3cdbd" tickCount={4} start={210} sweep={270} small />
        <rect x="150" y="18" width="120" height="20" rx="4" fill="#101512" stroke="#262d27" />
        <text x="210" y="32" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" letterSpacing="1.4" fill="#a8b1a4">{state.engineOn ? "SPORT · READY" : state.stalled ? "STALLED" : "IGNITION OFF"}</text>
        <g transform="translate(150 218) scale(0.72)"><WarningLights state={state} /></g>
        <text x="24" y="234" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#6d776e">CLUTCH {state.clutch > 0.9 ? "OPEN" : state.clutchSlipRpm > 80 ? "SLIP" : "IN"}</text>
        <text x="396" y="234" textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="7" fill="#6d776e">{nf(state.crankPowerHp, 0)} HP EST.</text>
      </svg>
      {caption}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-mut">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export function ClusterPicker({ value, onChange }: { value: ClusterTheme; onChange: (theme: ClusterTheme) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3" role="group" aria-label="Instrument cluster design">
      {CLUSTER_THEMES.map((theme) => (
        <button
          key={theme.id}
          onClick={() => onChange(theme.id)}
          aria-pressed={value === theme.id}
          title={theme.blurb}
          className={cn(
            "rounded-md border px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.04em] transition-colors",
            value === theme.id ? "border-accent/45 bg-accent/[0.12] text-accent" : "border-line-soft bg-black/20 text-mut hover:border-line hover:text-fg",
          )}
        >
          {theme.name}
        </button>
      ))}
    </div>
  );
}
