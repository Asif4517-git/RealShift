import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ExternalLink,
  Gauge,
  Info,
  Keyboard,
  Monitor,
  RotateCcw,
  Settings as SettingsIcon,
  SlidersHorizontal,
  TriangleAlert,
  Trash2,
  Volume2,
} from "lucide-react";
import { DEFAULT_AUDIO } from "../lib/audio";
import { nf, torqueUnit, torqueValue } from "../lib/format";
import {
  DEFAULT_BINDINGS,
  DEFAULT_SETTINGS,
  KEY_BINDINGS,
  keyLabel,
  useStore,
  type BindingAction,
  type GraphicsQuality,
} from "../lib/store";
import type { Vehicle } from "../lib/vehicles";
import { ENGINE_TYPE_SHORT } from "../lib/vehicles";
import { cn } from "../utils/cn";
import { TorqueCurveBars } from "./gauges";
import { ClusterPicker, CLUSTER_THEMES } from "./clusters";
import { Button, Chip, Kbd, Modal, Segmented, Slider, Toggle } from "./ui";

export type SettingsTab = "audio" | "simulation" | "display" | "data";

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: typeof Volume2 }[] = [
  { id: "audio", label: "Engine audio", icon: Volume2 },
  { id: "simulation", label: "Simulation", icon: Gauge },
  { id: "display", label: "Display", icon: Monitor },
  { id: "data", label: "Local data", icon: SlidersHorizontal },
];

export function SettingsModal({
  open,
  onClose,
  initialTab = "audio",
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}) {
  const { settings, updateSettings, updateAudio, bindings, resetBindings, resetAllSettings, runs, clearRuns, resetBinding, vehicle } = useStore();
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setSaved(false);
      setConfirmReset(false);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!saved) return;
    const id = window.setTimeout(() => setSaved(false), 2200);
    return () => window.clearTimeout(id);
  }, [saved]);

  const markSaved = () => setSaved(true);
  const audio = settings.audio;

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Workspace preferences"
      title="Audio, simulation & display"
      width="lg"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className={cn("flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em]", saved ? "text-accent" : "text-mut-2")}>
            {saved ? <><Check size={10} /> Saved to this device</> : "Changes save automatically"}
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>Done</Button>
        </div>
      }
    >
      <div className="thin-scroll -mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-line-soft pb-2">
        {SETTINGS_TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                tab === item.id ? "bg-accent/[0.1] text-accent" : "text-mut hover:bg-white/[0.04] hover:text-fg",
              )}
            >
              <Icon size={12} /> {item.label}
            </button>
          );
        })}
      </div>

      <div className="mb-4 rounded-xl border border-warm/40 bg-warm/[0.06] p-3">
        <p className="text-sm font-semibold text-fg">RESET ALL SETTINGS</p>
        <p className="mt-1 text-[11.5px] text-mut">Restores audio, graphics, units, clutch, load, camera, cluster, display preferences and keyboard bindings. Saved dyno runs and the selected vehicle are kept.</p>
        {confirmReset ? <div className="mt-2 flex gap-2"><Button variant="danger" size="sm" onClick={() => { resetAllSettings(); setConfirmReset(false); markSaved(); }}>Confirm reset</Button><Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>Cancel</Button></div>
          : <Button variant="outline" size="sm" className="mt-2" onClick={() => setConfirmReset(true)}><RotateCcw size={11} /> Reset all settings</Button>}
      </div>

      {tab === "audio" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-accent/20 bg-accent/[0.04] p-3 text-[11.5px] text-mut">
            <p className="label-xs text-accent">Recommended audio mix</p>
            <p className="mt-1">For {vehicle.engine.layout} {vehicle.engine.fuel.toLowerCase()}: engine 88%, exhaust {vehicle.engine.cylinders >= 6 ? 80 : 70}%, intake 46%, turbo {vehicle.engine.boostBar ? 45 : 0}%. A starting point, not a measured calibration.</p>
            <p>Current: engine {Math.round(audio.engine * 100)}%, exhaust {Math.round(audio.exhaust * 100)}%, intake {Math.round(audio.intake * 100)}%, turbo {Math.round(audio.turbo * 100)}%.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => { updateAudio({ engine: 0.88, exhaust: vehicle.engine.cylinders >= 6 ? 0.8 : 0.7, intake: 0.46, turbo: vehicle.engine.boostBar ? 0.45 : 0 }); markSaved(); }}>Apply recommendation</Button>
          </div>
          <div className="rounded-xl border border-accent/20 bg-accent/[0.045] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent"><Volume2 size={15} /></div>
                <div>
                  <p className="text-[13px] font-semibold text-fg">Engine audio</p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-accent/70">Primary simulation output</p>
                </div>
              </div>
              <span className="value-mono text-lg text-accent">{Math.round(audio.engine * 100)}%</span>
            </div>
            <div className="mt-2.5">
              <Slider label="Engine level" value={Math.round(audio.engine * 100)} onChange={(v) => { updateAudio({ engine: v / 100 }); markSaved(); }} display={`${Math.round(audio.engine * 100)}%`} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
            <Slider label="Master output" value={Math.round(audio.master * 100)} onChange={(v) => { updateAudio({ master: v / 100 }); markSaved(); }} display={`${Math.round(audio.master * 100)}%`} />
            <Slider label="Exhaust" value={Math.round(audio.exhaust * 100)} onChange={(v) => { updateAudio({ exhaust: v / 100 }); markSaved(); }} display={`${Math.round(audio.exhaust * 100)}%`} />
            <Slider label="Intake" value={Math.round(audio.intake * 100)} onChange={(v) => { updateAudio({ intake: v / 100 }); markSaved(); }} display={`${Math.round(audio.intake * 100)}%`} />
            <Slider label="Turbocharger" value={Math.round(audio.turbo * 100)} onChange={(v) => { updateAudio({ turbo: v / 100 }); markSaved(); }} display={`${Math.round(audio.turbo * 100)}%`} />
            <Slider label="Transmission" value={Math.round(audio.transmission * 100)} onChange={(v) => { updateAudio({ transmission: v / 100 }); markSaved(); }} display={`${Math.round(audio.transmission * 100)}%`} />
            <Slider label="Dyno / mechanical" value={Math.round(audio.dyno * 100)} onChange={(v) => { updateAudio({ dyno: v / 100 }); markSaved(); }} display={`${Math.round(audio.dyno * 100)}%`} />
            <Slider label="Environmental ambience" value={Math.round(audio.ambience * 100)} onChange={(v) => { updateAudio({ ambience: v / 100 }); markSaved(); }} display={`${Math.round(audio.ambience * 100)}%`} />
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-line-soft pt-3 sm:grid-cols-2">
            <div>
              <p className="label-xs mb-1.5">Audio quality</p>
              <Segmented
                value={settings.audioQuality}
                onChange={(value) => { updateSettings({ audioQuality: value }); markSaved(); }}
                options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]}
                size="sm"
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-mut-2">Quality adjusts ancillary filter settings; bundled recording quality is unchanged.</p>
            </div>
            <div>
              <Toggle checked={audio.muted} onChange={(value) => { updateAudio({ muted: value }); markSaved(); }} label="Mute all audio" description="Engine audio continues silently; no state is lost." />
              <Button variant="ghost" size="sm" className="mt-1" onClick={() => { updateSettings({ audio: { ...DEFAULT_AUDIO } }); markSaved(); }}><RotateCcw size={11} /> Reset audio mix</Button>
            </div>
          </div>

          <div className="rounded-lg border border-line-soft bg-black/20 px-3 py-2">
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-mut">
              <Info size={11} className="mt-0.5 shrink-0 text-mut-2" />
              Browsers require a user gesture before audio output. Engine recordings are crossfaded using live RPM. They are engine-family approximations, not exact vehicle recordings; missing RPM and load states are approximated. Some effects and the fallback voice remain synthetic. See src/assets/engine/MANIFEST.md for sources and licences.
            </p>
          </div>
        </div>
      )}

      {tab === "simulation" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-accent/20 bg-accent/[0.04] p-3 text-[11.5px] text-mut">
            <p className="label-xs text-accent">Recommended settings</p>
            <p className="mt-1">Suggested roller load {Math.round(Math.min(45, Math.max(18, 18 + vehicle.engine.torqueNm / 35)))}% for this engine's torque, with assisted clutch for repeatable pulls. This is a simulation starting point, not a dyno calibration.</p>
            <p>Current: {settings.dynoLoad}% · {settings.clutchMode} clutch.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => { updateSettings({ dynoLoad: Math.round(Math.min(45, Math.max(18, 18 + vehicle.engine.torqueNm / 35))), clutchMode: "assisted" }); markSaved(); }}>Apply recommendation</Button>
          </div>
          <div>
            <p className="label-xs mb-1.5">Clutch behaviour</p>
            <Segmented
              value={settings.clutchMode}
              onChange={(value) => { updateSettings({ clutchMode: value }); markSaved(); }}
              options={[
                { value: "manual", label: "Manual" },
                { value: "assisted", label: "Assisted" },
                { value: "auto", label: "Bypass" },
              ]}
            />
            <div className="mt-2 rounded-lg border border-line-soft bg-black/20 px-3 py-2 text-[11.5px] leading-relaxed text-mut">
              {settings.clutchMode === "manual" && "Every shift requires the clutch pedal. Releasing the clutch at low wheel speed can stall the engine. Simulates clutch slip and driveline lock-up."}
              {settings.clutchMode === "assisted" && "During a gear change the simulator opens the clutch, then re-engages with progressive slip. The pedal still works and produces independent engine rpm in neutral."}
              {settings.clutchMode === "auto" && "The clutch is managed automatically. Shifts open and reconnect the clutch progressively. Best for repeatable dyno pulls and first-time operators."}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
            <Slider label="Roller load" value={settings.dynoLoad} onChange={(value) => { updateSettings({ dynoLoad: value }); markSaved(); }} display={`${settings.dynoLoad}%`} hint="Eddy-current resistance against the rollers. Higher load lengthens a pull." />
            <div className="py-2">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label-xs">Master timestep</span>
                <span className="value-mono text-[11.5px] text-[#c3cdc1]">120 Hz fixed</span>
              </div>
              <div className="rounded-md border border-line-soft bg-black/20 px-2 py-1.5 font-mono text-[10.5px] text-mut">Δt = 8.333 ms · decoupled from render frame rate</div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-mut-2">The integrator is fixed for deterministic physics; rendering adapts to display refresh.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-line-soft bg-black/20 px-3 py-2">
              <p className="label-xs">Rev limiter</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-mut">Fuel cut is applied at each vehicle's configured limiter with hysteresis. Ignition resumes below the threshold.</p>
            </div>
            <div className="rounded-lg border border-line-soft bg-black/20 px-3 py-2">
              <p className="label-xs">Stall protection</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-mut">Manual mode allows a genuine stall. Assisted and bypass modes modulate clutch bite at low rpm.</p>
            </div>
          </div>
          <div className="border-t border-line-soft pt-2">
            <Toggle checked={settings.reducedMotion} onChange={(value) => { updateSettings({ reducedMotion: value }); markSaved(); }} label="Reduce interface motion" description="Removes ambient animations such as pulsing live dots and equaliser movement." />
          </div>
        </div>
      )}

      {tab === "display" && (
        <div className="space-y-4">
          <div>
            <p className="label-xs mb-1.5">Measurement units</p>
            <Segmented
              value={settings.units}
              onChange={(value) => { updateSettings({ units: value }); markSaved(); }}
              options={[{ value: "metric", label: "Metric · km/h, Nm, °C" }, { value: "imperial", label: "Imperial · mph, lb-ft, °F" }]}
            />
          </div>
          <div>
            <p className="label-xs mb-1.5">3D graphics quality</p>
            <Segmented
              value={settings.graphics}
              onChange={(value) => { updateSettings({ graphics: value as GraphicsQuality }); markSaved(); }}
              options={[{ value: "performance", label: "Performance" }, { value: "balanced", label: "Balanced" }, { value: "high", label: "High" }]}
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-mut-2">Controls renderer resolution, shadow quality and body bevel segments. Changing this reloads the 3D scene.</p>
          </div>
          <div>
            <p className="label-xs mb-1.5">Instrument cluster design</p>
            <ClusterPicker value={settings.cluster} onChange={(theme) => { updateSettings({ cluster: theme }); markSaved(); }} />
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-mut-2">{CLUSTER_THEMES.find((t) => t.id === settings.cluster)?.blurb}. Every design reads the same live engine and roller data — changing it never alters the physics.</p>
          </div>
          <div className="border-t border-line-soft pt-1">
            <Toggle checked={settings.headlights} onChange={(value) => { updateSettings({ headlights: value }); markSaved(); }} label="Headlights in the cell" description="In-car illumination and exterior lens glow." />
          </div>
          <div className="rounded-lg border border-line-soft bg-black/20 px-3 py-2">
            <p className="label-xs">Display notes</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-mut">Instrument cluster, shift lights, dyno chart and camera overlays all read the same simulator snapshot at 120 Hz physics / 20 Hz render.</p>
          </div>
        </div>
      )}

      {tab === "data" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-line-soft bg-black/20 px-3 py-2">
              <p className="label-xs">Saved dyno runs</p>
              <p className="mt-1 value-mono text-lg text-accent">{runs.length}</p>
            </div>
            <div className="rounded-lg border border-line-soft bg-black/20 px-3 py-2">
              <p className="label-xs">Custom bindings</p>
              <p className="mt-1 value-mono text-lg text-fg">{Object.values(bindings).filter(Boolean).length} / {KEY_BINDINGS.length}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => { resetBindings(); Object.keys(DEFAULT_BINDINGS).forEach((action) => resetBinding(action as BindingAction)); markSaved(); }}>
              <RotateCcw size={11} /> Restore default controls
            </Button>
            <Button variant="outline" size="sm" onClick={() => { updateSettings({ ...DEFAULT_SETTINGS, audio: { ...DEFAULT_AUDIO } }); markSaved(); }}>
              <SettingsIcon size={11} /> Restore default settings
            </Button>
          </div>
          <div className="rounded-lg border border-danger/20 bg-danger/[0.04] p-3">
            <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-fg"><TriangleAlert size={12} className="text-danger" /> Clear saved dyno traces</p>
            <p className="mt-1 text-[11px] leading-relaxed text-mut">Removes every saved run and sampled trace from this browser. Settings and key bindings remain.</p>
            {confirmClear ? (
              <div className="mt-2 flex gap-2">
                <Button variant="danger" size="sm" onClick={() => { clearRuns(); setConfirmClear(false); markSaved(); }}><Trash2 size={11} /> Confirm clear</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="danger" size="sm" className="mt-2" disabled={!runs.length} onClick={() => setConfirmClear(true)}><Trash2 size={11} /> Clear runs</Button>
            )}
          </div>
          <div className="rounded-lg border border-line-soft bg-black/20 px-3 py-2">
            <p className="label-xs">Persistence</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-mut">Settings, bindings, the selected vehicle and up to 14 dyno runs are stored under <span className="font-mono text-[10.5px] text-[#b9c7b6]">realshift.*</span> keys in local storage. Clearing browser data removes them.</p>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function ControlsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { bindings, setBinding, resetBinding, resetBindings } = useStore();
  const [listening, setListening] = useState<BindingAction | null>(null);
  const [conflict, setConflict] = useState<{ action: BindingAction; owner: BindingAction; code: string } | null>(null);

  const duplicateGroups = useMemo(() => {
    const map = new Map<string, BindingAction[]>();
    (Object.entries(bindings) as [BindingAction, string][]).forEach(([action, code]) => {
      if (!code) return;
      map.set(code, [...(map.get(code) ?? []), action]);
    });
    return [...map.entries()].filter(([, actions]) => actions.length > 1);
  }, [bindings]);

  useEffect(() => {
    if (!open) {
      setListening(null);
      setConflict(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !listening) return;
    const capture = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        setListening(null);
        setConflict(null);
        return;
      }
      const code = event.code;
      const owner = (Object.entries(bindings) as [BindingAction, string][]).find(([action, value]) => value === code && action !== listening)?.[0];
      if (owner && owner !== listening) {
        setConflict({ action: listening, owner, code });
        return;
      }
      setBinding(listening, code);
      setConflict(null);
      setListening(null);
    };
    window.addEventListener("keydown", capture, true);
    return () => window.removeEventListener("keydown", capture, true);
  }, [open, listening, bindings, setBinding]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Central input manager"
      title="Keyboard controls"
      width="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-mut-2">Bindings save automatically</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { resetBindings(); setConflict(null); setListening(null); }}><RotateCcw size={11} /> Restore all defaults</Button>
            <Button variant="primary" size="sm" onClick={onClose}>Done</Button>
          </div>
        </div>
      }
    >
      <div className="mb-3 flex items-start gap-2 rounded-lg border border-line-soft bg-black/20 px-3 py-2">
        <Keyboard size={13} className="mt-0.5 shrink-0 text-accent/80" />
        <p className="text-[11.5px] leading-relaxed text-mut">
          Click any key field, then press a new key. Conflicts are blocked. <span className="text-[#c2cfbf]">Esc</span> cancels capture. Driving keys never scroll or navigate the page, and are released on window blur.
        </p>
      </div>

      {conflict && (
        <div className="mb-3 rounded-lg border border-warm/35 bg-warm/[0.07] px-3 py-2">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-warm"><TriangleAlert size={12} /> Key already assigned</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-mut"><Kbd>{keyLabel(conflict.code)}</Kbd> is currently bound to {KEY_BINDINGS.find((b) => b.action === conflict.owner)?.label}. Choose a different key, or reassign it here.</p>
          <div className="mt-1.5 flex gap-2">
            <Button variant="subtle" size="sm" onClick={() => { setBinding(conflict.owner, ""); setBinding(conflict.action, conflict.code); setConflict(null); setListening(null); }}>Reassign & unbind other</Button>
            <Button variant="ghost" size="sm" onClick={() => { setConflict(null); setListening(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      {duplicateGroups.length > 0 && (
        <div className="mb-3 rounded-lg border border-danger/25 bg-danger/[0.05] px-3 py-2">
          <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-danger"><TriangleAlert size={11} /> {duplicateGroups.length} conflicting binding{duplicateGroups.length > 1 ? "s" : ""} detected</p>
          <p className="mt-0.5 font-mono text-[9.5px] leading-relaxed text-mut">{duplicateGroups.map(([code, actions]) => `${keyLabel(code)} → ${actions.join(", ")}`).join(" · ")}</p>
        </div>
      )}

      {(["Driving", "Transmission", "System"] as const).map((group) => (
        <div key={group} className="mb-3">
          <p className="label-xs mb-1.5">{group}</p>
          <div className="overflow-hidden rounded-xl border border-line-soft">
            {KEY_BINDINGS.filter((binding) => binding.group === group).map((binding, index) => {
              const isListening = listening === binding.action;
              const hasConflict = duplicateGroups.some(([, actions]) => actions.includes(binding.action));
              return (
                <div key={binding.action} className={cn("flex items-center gap-3 px-3 py-2", index > 0 && "border-t border-line-soft", isListening && "bg-accent/[0.04]")}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-fg">{binding.label}</p>
                    <p className="mt-0.5 hidden text-[10.5px] text-mut-2 sm:block">{binding.hint}</p>
                  </div>
                  {hasConflict && <span className="font-mono text-[8.5px] uppercase tracking-wide text-danger">conflict</span>}
                  <button
                    onClick={() => { setListening(binding.action); setConflict(null); }}
                    className={cn(
                      "flex h-7 min-w-[88px] items-center justify-center rounded-md border px-2 font-mono text-[10.5px] uppercase tracking-[0.06em] transition-colors",
                      isListening ? "border-accent/60 bg-accent/[0.12] text-accent" : "border-line bg-[#131a14] text-[#c6d1c3] hover:border-[#3b4a3d]",
                    )}
                    aria-label={`Change binding for ${binding.label}`}
                  >
                    {isListening ? "Press key…" : keyLabel(bindings[binding.action]) || "Unbound"}
                  </button>
                  <button onClick={() => resetBinding(binding.action)} aria-label={`Reset ${binding.label} to default`} title={`Default: ${keyLabel(DEFAULT_BINDINGS[binding.action])}`} className="flex h-6 w-6 items-center justify-center rounded text-mut-2 transition-colors hover:bg-white/5 hover:text-fg">
                    <RotateCcw size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-2 rounded-lg border border-line-soft bg-black/20 px-3 py-2">
        <p className="label-xs mb-1">Default layout</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
          {KEY_BINDINGS.map((binding) => (
            <div key={binding.action} className="flex items-center justify-between gap-1">
              <span className="truncate text-[10px] text-mut-2">{binding.label}</span>
              <Kbd>{keyLabel(DEFAULT_BINDINGS[binding.action])}</Kbd>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function DatasheetModal({ vehicle, onClose, onEnterDyno }: { vehicle: Vehicle | null; onClose: () => void; onEnterDyno: () => void }) {
  const { settings, selectVehicle } = useStore();
  const units = settings.units;
  if (!vehicle) return null;


  return (
    <Modal
      open={!!vehicle}
      onClose={onClose}
      eyebrow={`Technical datasheet · ${vehicle.generation}`}
      title={`${vehicle.make} ${vehicle.model} ${vehicle.variant}`}
      width="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-mut-2"><Check size={9} className="text-accent" /> {vehicle.verified.length} verified · {vehicle.estimated.length} calibrated estimates</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            <Button variant="primary" size="sm" onClick={() => { selectVehicle(vehicle.id); onEnterDyno(); }}><Gauge size={11} /> Load into Bay 01</Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip active>{vehicle.year}</Chip>
        <Chip>{vehicle.bodyStyle}</Chip>
        <Chip>{ENGINE_TYPE_SHORT[vehicle.sound.character]}</Chip>
        <Chip>{vehicle.gearbox.drivetrain}</Chip>
        <Chip>{vehicle.country}</Chip>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-mut">{vehicle.notes}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Peak power", `${vehicle.engine.powerHp} hp`, `@ ${nf(vehicle.engine.powerRpm)} rpm`],
          ["Peak torque", `${nf(torqueValue(vehicle.engine.torqueNm, units))} ${torqueUnit(units)}`, vehicle.engine.torqueRpm],
          ["Redline", `${nf(vehicle.engine.redline)} rpm`, `limiter ${nf(vehicle.engine.limiter)}`],
          ["Kerb weight", `${nf(vehicle.chassis.weightKg)} kg`, `${vehicle.chassis.tyre}`],
        ].map(([label, value, hint]) => (
          <div key={label} className="rounded-lg border border-line-soft bg-black/20 px-2.5 py-2">
            <p className="label-xs">{label}</p>
            <p className="mt-1 value-mono text-[15px] text-fg">{value}</p>
            <p className="font-mono text-[8.5px] uppercase tracking-[0.04em] text-mut-2">{hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="label-xs mb-1.5 flex items-center gap-1.5"><Gauge size={10} /> Engine</p>
          <div className="overflow-hidden rounded-lg border border-line-soft">
            <SpecRow label="Engine code" value={vehicle.engine.code} />
            <SpecRow label="Displacement" value={`${nf(vehicle.engine.displacementCc)} cc`} />
            <SpecRow label="Configuration" value={`${vehicle.engine.cylinders}-cylinder ${vehicle.engine.layout}`} />
            <SpecRow label="Induction" value={vehicle.engine.induction} />
            <SpecRow label="Fuel" value={vehicle.engine.fuel} />
            <SpecRow label="Compression" value={vehicle.engine.compression} />
            <SpecRow label="Boost" value={vehicle.engine.boostBar ? `${vehicle.engine.boostBar.toFixed(1)} bar` : "Naturally aspirated"} />
            <SpecRow label="Idle" value={`${vehicle.engine.idleRpm} rpm`} />
            <SpecRow label="Limiter" value={`${nf(vehicle.engine.limiter)} rpm`} />
            <SpecRow label="Torque anchors" value={`${vehicle.engine.torqueCurve.length} points`} estimatedLabel />
          </div>
          <div className="mt-2 rounded-lg border border-line-soft bg-black/20 p-2.5">
            <div className="flex items-center justify-between">
              <span className="label-xs">Published-anchor torque curve</span>
              <span className="font-mono text-[8.5px] text-mut-2">interpolated</span>
            </div>
            <div className="mt-1.5"><TorqueCurveBars vehicle={vehicle} units={units} /></div>
          </div>
        </div>

        <div>
          <p className="label-xs mb-1.5 flex items-center gap-1.5"><SlidersHorizontal size={10} /> Transmission & chassis</p>
          <div className="overflow-hidden rounded-lg border border-line-soft">
            <SpecRow label="Gearbox" value={vehicle.gearbox.type} />
            <SpecRow label="Gear ratios" value={vehicle.gearbox.ratios.map((r) => r.toFixed(2)).join(" / ")} estimatedLabel />
            <SpecRow label="Reverse" value={vehicle.gearbox.reverse.toFixed(2)} estimatedLabel />
            <SpecRow label="Final drive" value={`${vehicle.gearbox.finalDrive.toFixed(2)} : 1`} estimatedLabel />
            <SpecRow label="Drivetrain" value={vehicle.gearbox.drivetrain} />
            <SpecRow label="Efficiency" value={`${Math.round(vehicle.gearbox.efficiency * 100)}%`} estimatedLabel />
            <SpecRow label="Clutch capacity" value={`${nf(vehicle.gearbox.clutchCapacityNm)} Nm`} estimatedLabel />
            <SpecRow label="Wheelbase" value={`${nf(vehicle.chassis.wheelbaseMm)} mm`} />
            <SpecRow label="Dimensions" value={`${vehicle.chassis.lengthMm} × ${vehicle.chassis.widthMm} × ${vehicle.chassis.heightMm} mm`} />
            <SpecRow label="Tyres" value={vehicle.chassis.tyre} />
          </div>
          <div className="mt-2 rounded-lg border border-line-soft bg-black/20 px-2.5 py-2">
            <p className="label-xs">Dyno note</p>
            <p className="mt-1 text-[11px] leading-relaxed text-mut">{vehicle.dyno.note}</p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.05em] text-mut-2">Calibrated wheel estimate: {nf(torqueValue(vehicle.dyno.measuredWheelHp, units), 0)} {units === "metric" ? "PS" : "hp"} · model drivetrain loss {(vehicle.dyno.driveLoss * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-accent/15 bg-accent/[0.03] p-3">
          <p className="label-xs text-accent">Verified specifications</p>
          <ul className="mt-1.5 space-y-1">
            {vehicle.verified.map((item) => <li key={item} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[#c3cfc0]"><Check size={10} className="mt-0.5 shrink-0 text-accent" />{item}</li>)}
          </ul>
        </div>
        <div className="rounded-lg border border-warm/15 bg-warm/[0.03] p-3">
          <p className="label-xs text-warm">Calibrated estimates</p>
          <ul className="mt-1.5 space-y-1">
            {vehicle.estimated.map((item) => <li key={item} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[#c4c0b4]"><Info size={10} className="mt-0.5 shrink-0 text-warm/80" />{item}</li>)}
          </ul>
        </div>
      </div>

      <div className="mt-4">
        <p className="label-xs mb-1.5 flex items-center gap-1.5"><ArrowUpRight size={10} /> Sources</p>
        <div className="overflow-hidden rounded-lg border border-line-soft">
          {vehicle.sources.map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border-b border-line-soft px-3 py-2 text-[11.5px] text-[#b5c3b2] transition-colors last:border-0 hover:bg-white/[0.03] hover:text-accent">
              <ExternalLink size={10} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{source.label}</span>
              <span className="hidden font-mono text-[8.5px] uppercase tracking-[0.08em] text-mut-2 sm:block">Open</span>
            </a>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-mut-2">Headline figures are attributed to the reference set above. Fields marked “est.” are simulation-calibrated, not manufacturer claims. Body geometry is original procedural artwork derived from published dimensions.</p>
      </div>
    </Modal>
  );
}

function SpecRow({ label, value, estimatedLabel }: { label: string; value: string; estimatedLabel?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line-soft px-2.5 py-1.5 last:border-0">
      <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.05em] text-mut-2">{label}</span>
      <span className="text-right text-[11px] text-[#c9d4c6]">
        {value}
        {estimatedLabel && <span className="ml-1 rounded border border-warm/20 px-1 py-px font-mono text-[6px] uppercase text-warm/80">est.</span>}
      </span>
    </div>
  );
}
