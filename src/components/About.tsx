import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CarFront,
  Check,
  Cog,
  Database,
  FileCode2,
  Gauge,
  Globe,
  Info,
  Mail,
  ShieldCheck,
  Volume2,
  Wrench,
} from "lucide-react";
import { useStore } from "../lib/store";
import { VEHICLES } from "../lib/vehicles";
import type { AppView } from "../lib/views";
import { CarBlueprint } from "./gauges";
import { InstagramIcon, ShiftMark } from "./icons";
import { Button, Chip, Panel, StatusDot } from "./ui";

export function About({ onNavigate, onOpenControls }: { onNavigate: (view: AppView) => void; onOpenControls: () => void }) {
  const { vehicle } = useStore();

  return (
    <div className="bay-bg mx-auto w-full max-w-[1380px] space-y-5 px-3 py-4 sm:px-5 lg:px-6 lg:py-6">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-[radial-gradient(ellipse_at_18%_-10%,rgba(203,244,102,0.12),transparent_55%),linear-gradient(160deg,#121a13,#090d0a)] px-4 py-6 sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] items-center justify-center opacity-70 lg:flex">
          <div className="w-full max-w-[420px] px-6">
            <CarBlueprint vehicle={vehicle} detailed />
            <div className="mt-2 flex items-center justify-between font-mono text-[7.5px] uppercase tracking-[0.12em] text-mut-2">
              <span>Available fleet · {VEHICLES.length} builds</span>
              <span>{VEHICLES.reduce((sum, v) => sum + v.engine.cylinders, 0)} cylinders total</span>
            </div>
          </div>
        </div>
        <div className="relative max-w-[640px]">
          <div className="flex flex-wrap items-center gap-2">
            <Chip active icon={<StatusDot tone="accent" pulse />}>RealShift · simulation lab</Chip>
            <Chip>Independent build</Chip>
            <Chip>2026</Chip>
          </div>
          <h1 className="mt-4 font-display text-[30px] font-semibold leading-[1.04] tracking-[-0.035em] text-fg sm:text-[42px]">
            A serious chassis dyno,
            <br />
            built for the browser.
          </h1>
          <p className="mt-3 max-w-[520px] text-[12px] leading-relaxed text-mut sm:text-[13px]">
            RealShift is an automotive transmission and dynamometer simulator. Choose a real production vehicle, enter Bay 01, start the engine, work the clutch and gearbox, and record a pull on the rollers. Every value is driven by one shared simulation state — from the tachometer needle to the exhaust note.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" size="lg" onClick={() => onNavigate("dyno")}><Gauge size={14} /> Enter Bay 01</Button>
            <Button variant="outline" size="lg" onClick={() => onNavigate("garage")}><CarFront size={14} /> Browse the garage</Button>
            <Button variant="ghost" size="lg" onClick={onOpenControls}><BookOpen size={13} /> Controls</Button>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-white/[0.06] pt-3 font-mono text-[8px] uppercase tracking-[0.1em] text-mut-2">
            <span className="flex items-center gap-1.5"><Check size={9} className="text-accent" /> 11 real vehicles</span>
            <span className="flex items-center gap-1.5"><Check size={9} className="text-accent" /> 120 Hz fixed timestep</span>
            <span className="flex items-center gap-1.5"><Check size={9} className="text-accent" /> Local persistence</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Panel className="p-4 sm:p-5">
            <p className="label-xs mb-1">Project overview</p>
            <h2 className="font-display text-lg font-semibold tracking-tight text-fg">What RealShift is — and what it is not</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-accent/15 bg-accent/[0.035] p-3">
                <p className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-accent"><Check size={10} /> It is</p>
                <ul className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed text-[#bdc9ba]">
                  <li>A manual-transmission and clutch simulation with real ratios and final drives.</li>
                  <li>A live rolling-road model with wheel torque, speed and dyno trace recording.</li>
                  <li>An instrument cluster connected to engine and drivetrain state.</li>
                  <li>A per-vehicle procedural engine sound model driven by rpm, load and boost.</li>
                </ul>
              </div>
              <div className="rounded-xl border border-line-soft bg-black/20 p-3">
                <p className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-mut"><Info size={10} /> It is not</p>
                <ul className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed text-mut">
                  <li>A racing game or open-world driving experience.</li>
                  <li>A physical load-cell measurement. Power is a calculated estimate.</li>
                  <li>A licensed reproduction of manufacturer CAD or game audio.</li>
                  <li>A finished substitute for professional calibration software.</li>
                </ul>
              </div>
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { icon: Gauge, title: "Engine simulation", text: "Flywheel inertia, friction, idle governors, turbo spool and a hard rev limiter. Torque curves are interpolated from each vehicle's published anchors.", tag: "physics" },
              { icon: Wrench, title: "Clutch & manual gearbox", text: "Manual, assisted and bypass clutch modes. Real gear counts and ratios, slip coupling, driveline lock-up and stall behaviour.", tag: "drivetrain" },
              { icon: Volume2, title: "Layered engine audio", text: "Web Audio blends recorded engine-family loops with modelled intake, turbo and roller layers.", tag: "audio" },
              { icon: CarFront, title: "Procedural dyno bay", text: "Original 3D vehicle bodies scaled to published dimensions, sitting on a modelled 4-axle roller set with studio cameras and live wheel motion.", tag: "3D" },
              { icon: Database, title: "Sourced vehicle register", text: "Eleven real models across NA, turbo, diesel, V6, flat-six, V8 and 4x4 configurations, each with verified and estimated fields separated.", tag: "data" },
              { icon: ShieldCheck, title: "Honest instrumentation", text: "No decorative gauges. Every readout is classified as simulated state, roller-derived or estimated, with methodology available in the data log.", tag: "trust" },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="group rounded-xl border border-line bg-[linear-gradient(160deg,#121914,#0c110d)] p-3.5 transition-colors hover:border-[#39483b]">
                  <div className="flex items-start justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/20 bg-accent/[0.07] text-accent"><Icon size={15} /></div>
                    <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-mut-2">{feature.tag}</span>
                  </div>
                  <p className="mt-2.5 text-[11.5px] font-semibold text-fg">{feature.title}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-mut">{feature.text}</p>
                </div>
              );
            })}
          </div>

          <Panel className="relative overflow-hidden">
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(123,184,165,0.12),transparent_65%)]" />
            <div className="relative p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="label-xs mb-1 text-[#8db3a2]">Developer spotlight</p>
                  <h2 className="font-display text-xl font-semibold tracking-tight text-fg">Built by Asif</h2>
                </div>
                <Chip active icon={<StatusDot tone="accent" />}>Sole creator & developer</Chip>
              </div>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                <div className="relative shrink-0">
                  <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#dcffa0,#8fd8c4_72%)] font-display text-[28px] font-bold text-[#0b1611] shadow-[0_0_40px_rgba(203,244,102,0.22)]">
                    A
                  </div>
                  <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-[3px] border-[#0e140f] bg-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[15px] font-semibold text-fg">Asif</p>
                  <p className="text-[10.5px] text-[#8db3a2]">Creator - RealShift</p>
                  <p className="mt-2 max-w-2xl text-[11px] leading-relaxed text-mut">
                    Asif is the sole creator and developer of RealShift. He designed and implemented the vehicle database, drivetrain and clutch simulation, the fixed-step roller model, the original Web Audio engine, the Three.js dyno bay and the complete interface. This is an independent browser-based simulation project — no studio, no generated automobile claims, and no borrowed commercial assets.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["Simulation design", "Frontend engineering", "Audio engineering", "3D & interface"].map((tag) => <Chip key={tag}>{tag}</Chip>)}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <a
                  href="mailto:asifsrk4517@gmail.com"
                  aria-label="Send an email to Asif"
                  className="group rounded-xl border border-[#29443a] bg-[linear-gradient(150deg,#17281f,#101a14)] p-3 transition-colors hover:border-[#3f6a58]"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#2b4a3d] bg-[#1c3a2e] text-[#7bd0b1]"><Mail size={14} /></span>
                  <p className="mt-2 font-mono text-[7.5px] uppercase tracking-[0.14em] text-[#7f9d90]">Email</p>
                  <p className="mt-0.5 truncate text-[10.5px] font-medium text-fg">asifsrk4517@gmail.com</p>
                  <p className="mt-1 flex items-center gap-1 font-mono text-[7.5px] uppercase tracking-[0.08em] text-[#7f9d90]">Write directly <ArrowUpRight size={9} /></p>
                </a>
                <a
                  href="https://www.instagram.com/asif_xrk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow Asif on Instagram"
                  className="group rounded-xl border border-[#3d2e37] bg-[linear-gradient(150deg,#261b22,#171115)] p-3 transition-colors hover:border-[#6b4759]"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#4b2b3a] bg-[#3a2130] text-[#e59ab8]"><InstagramIcon className="h-3.5 w-3.5" /></span>
                  <p className="mt-2 font-mono text-[7.5px] uppercase tracking-[0.14em] text-[#a88294]">Instagram</p>
                  <p className="mt-0.5 text-[10.5px] font-medium text-fg">@asif_xrk</p>
                  <p className="mt-1 flex items-center gap-1 font-mono text-[7.5px] uppercase tracking-[0.08em] text-[#a88294]">Follow <ArrowUpRight size={9} /></p>
                </a>
                <a
                  href="https://asif4517-git.github.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit Asif's Portfolio"
                  className="group rounded-xl border border-[#2b3c3c] bg-[linear-gradient(150deg,#172525,#101818)] p-3 transition-colors hover:border-[#446161]"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#28453e] bg-[#1a382f] text-[#82dbc0]"><Globe size={14} /></span>
                  <p className="mt-2 font-mono text-[7.5px] uppercase tracking-[0.14em] text-[#84a3a0]">Portfolio</p>
                  <p className="mt-0.5 text-[10.5px] font-medium text-fg">About Me</p>
                  <p className="mt-1 flex items-center gap-1 font-mono text-[7.5px] uppercase tracking-[0.08em] text-[#84a3a0]">asif4517-git.github.io <ArrowUpRight size={9} /></p>
                </a>
              </div>
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Panel className="p-4">
              <p className="label-xs mb-1">Data policy</p>
              <h3 className="text-sm font-semibold text-fg">Real vehicles, stated estimates</h3>
              <p className="mt-1.5 text-[10px] leading-relaxed text-mut">
                Headline engine figures, transmissions, drivetrain layouts and body dimensions are sourced from manufacturers and documented automotive references. Interpolated torque shapes, inertia, clutch capacity and some ratio sets are calibrated estimates. Every vehicle datasheet separates the two.
              </p>
              <button onClick={() => onNavigate("data")} className="mt-2 flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.08em] text-accent hover:underline">Open the data register <ArrowRight size={10} /></button>
            </Panel>
            <Panel className="p-4">
              <p className="label-xs mb-1">Asset & audio policy</p>
              <h3 className="text-sm font-semibold text-fg">No copied game assets</h3>
              <p className="mt-1.5 text-[10px] leading-relaxed text-mut">
                Vehicles are original procedural geometry. Engine audio uses licensed recordings as engine-family approximations, with some synthetic effects. See the audio manifest for source credits and licences. Interface icons use Lucide and Simple Icons, 3D uses Three.js, and typefaces are Space Grotesk, Inter and JetBrains Mono under the SIL Open Font License.
              </p>
            </Panel>
          </div>
        </div>

        <div className="space-y-4">
          <Panel>
            <div className="border-b border-line-soft px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md border border-accent/20 bg-accent/[0.08] text-accent"><ShiftMark className="h-4 w-4" /></div>
                <div>
                  <p className="label-xs">Project</p>
                  <p className="font-display text-[12px] font-semibold text-fg">RealShift v1.4</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-line-soft">
              {[
                ["Type", "Automotive dyno simulator"],
                ["Scope", "Single-user browser simulation"],
                ["Created by", "Asif"],
                ["Role", "Creator - RealShift"],
                ["Storage", "Local browser persistence"],
                ["Vehicles", `${VEHICLES.length} production models`],
                ["Rendering", "Three.js + WebGL"],
                ["Audio", "Web Audio API · recorded loops"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="label-xs">{label}</span>
                  <span className="text-right font-mono text-[9px] text-[#c4cfc1]">{value}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="border-b border-line-soft px-4 py-3">
              <p className="label-xs">Asset licences</p>
              <p className="font-display text-[12px] font-semibold text-fg">Open components used</p>
            </div>
            <div className="space-y-2 px-4 py-3">
              {[
                ["Three.js", "MIT", "3D renderer"],
                ["Lucide", "ISC", "Interface icons"],
                ["Simple Icons", "CC0 1.0", "Instagram glyph"],
                ["Space Grotesk", "SIL OFL", "Display typeface"],
                ["Inter", "SIL OFL", "UI typeface"],
                ["JetBrains Mono", "SIL OFL", "Telemetry typeface"],
              ].map(([name, licence, role]) => (
                <div key={name} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] text-[#cfd9cc]">{name}</p>
                    <p className="font-mono text-[7px] uppercase tracking-[0.05em] text-mut-2">{role}</p>
                  </div>
                  <span className="rounded border border-line-soft px-1.5 py-0.5 font-mono text-[7.5px] text-mut">{licence}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-line-soft px-4 py-2.5 text-[9px] leading-relaxed text-mut-2">
              No manufacturer logos, CAD models or game-ripped assets are redistributed. Licensed engine recordings are credited in the audio manifest. All vehicle representations are original procedural work.
            </div>
          </Panel>

          <Panel className="p-4">
            <div className="flex items-center gap-2">
              <FileCode2 size={15} className="text-accent" />
              <p className="font-display text-[12px] font-semibold text-fg">Build & run</p>
            </div>
            <div className="mt-2 space-y-1 rounded-lg border border-line-soft bg-[#090d0a] p-2.5 font-mono text-[9px] text-[#b8c6b5]">
              <p><span className="text-mut-2">$</span> npm install</p>
              <p><span className="text-mut-2">$</span> npm run dev</p>
              <p><span className="text-mut-2">$</span> npm run build</p>
            </div>
            <p className="mt-2 text-[9.5px] leading-relaxed text-mut-2">Vite + React + TypeScript. Controls, audio mixes, clutch mode, units, dyno load and recorded runs persist in local storage on this device.</p>
            <button onClick={() => onNavigate("data")} className="mt-2 flex items-center gap-1 font-mono text-[8px] uppercase tracking-[0.08em] text-accent hover:underline"><Cog size={9} /> Methodology & sources <ArrowRight size={9} /></button>
          </Panel>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-[#0b100c] px-3 py-2.5">
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-mut-2">Created by</p>
              <p className="mt-0.5 text-[11px] font-semibold text-fg">Asif <span className="font-normal text-mut">— Creator, RealShift</span></p>
            </div>
            <div className="flex items-center gap-1">
              <a href="mailto:asifsrk4517@gmail.com" aria-label="Send an email to Asif" className="flex h-7 w-7 items-center justify-center rounded-md border border-line-soft text-mut transition-colors hover:text-fg"><Mail size={12} /></a>
              <a href="https://www.instagram.com/asif_xrk/" target="_blank" rel="noopener noreferrer" aria-label="Follow Asif on Instagram" className="flex h-7 w-7 items-center justify-center rounded-md border border-line-soft text-mut transition-colors hover:text-fg"><InstagramIcon className="h-3 w-3" /></a>
              <a href="https://asif4517-git.github.io/" target="_blank" rel="noopener noreferrer" aria-label="Visit Asif's Portfolio" className="flex h-7 w-7 items-center justify-center rounded-md border border-line-soft text-mut transition-colors hover:text-fg"><Globe size={12} /></a>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-2 border-t border-line-soft pt-3 sm:flex-row sm:items-center">
        <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-mut-2">© 2026 RealShift · Created and developed by Asif</p>
        <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-mut-2">No affiliation with any vehicle manufacturer · simulation output</p>
      </div>
    </div>
  );
}
