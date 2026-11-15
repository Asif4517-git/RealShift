import { useEffect, useMemo, useState, type PointerEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  BatteryCharging,
  Camera,
  CarFront,
  ChevronRight,
  CircleDot,
  Droplets,
  Flag,
  Fuel,
  Gauge,
  Info,
  Keyboard,
  Play,
  Power,
  RotateCcw,
  SlidersHorizontal,
  Square,
  Thermometer,
  TriangleAlert,
  Volume2,
  Wind,
  Zap,
} from "lucide-react";
import { useDyno } from "../hooks/useDyno";
import { nf, powerKw, speedUnit, speedValue, tempUnit, tempValue, torqueUnit, torqueValue, timeAgo } from "../lib/format";
import { useStore, keyLabel } from "../lib/store";
import { auditVehicle } from "../lib/vehicleValidation";
import { tyreRadiusM, ENGINE_TYPE_SHORT } from "../lib/vehicles";
import type { AppView } from "../lib/views";
import { cn } from "../utils/cn";
import CarScene, { CAMERA_LABELS, type CameraPreset } from "../three/CarScene";
import { DynoChart } from "./gauges";
import { ClusterDisplay, ClusterPicker, CLUSTER_THEMES, type ClusterTheme } from "./clusters";
import { Button, Chip, IconButton, Kbd, Legend, Panel, PanelHeader, SectionHeading, Segmented, Slider, Stat, StatusDot, Toggle } from "./ui";

interface DynoBayProps {
  onNavigate: (view: AppView) => void;
  onOpenControls: () => void;
  onOpenSettings: () => void;
  onOpenAudio: () => void;
  inputBlocked: boolean;
}

export function DynoBay({ onNavigate, onOpenControls, onOpenSettings, onOpenAudio, inputBlocked }: DynoBayProps) {
  const { settings, updateSettings, updateAudio, runs, bindings } = useStore();
  const dyno = useDyno(!inputBlocked);
  const { snapshot: snap, vehicle, held } = dyno;
  const camera = settings.camera;
  const [cameraNonce, setCameraNonce] = useState(0);
  const [showTorque, setShowTorque] = useState(true);
  const [diagnosticTrace, setDiagnosticTrace] = useState<{speed: number; rpm: number}[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const units = settings.units;
  const vehicleAudit = useMemo(() => auditVehicle(vehicle), [vehicle]);

  useEffect(() => { dyno.setAudioCamera(camera); }, [camera, dyno.setAudioCamera]);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 2800);
    return () => window.clearTimeout(id);
  }, [flash]);

  const clutchState = snap.clutch > 0.92 ? "OPEN" : snap.clutch > 0.35 || snap.clutchSlipRpm > 80 ? "SLIP" : "ENGAGED";
  useEffect(() => { setDiagnosticTrace([]); }, [vehicle.id]);
  useEffect(() => {
    if (snap.engineOn) setDiagnosticTrace(points => [...points, { speed: snap.speedKph, rpm: snap.rpm }].slice(-120));
  }, [snap]);

  const engineState = snap.starting ? "CRANKING" : snap.engineOn ? "RUNNING" : snap.stalled ? "STALLED" : "OFF";
  const currentRatio = snap.gear === 0 ? 0 : snap.gear === -1 ? vehicle.gearbox.reverse : vehicle.gearbox.ratios[snap.gear - 1];
  const totalRatio = Math.abs(currentRatio * vehicle.gearbox.finalDrive * (vehicle.gearbox.primaryReduction ?? 1));
  const speedPer1000 = totalRatio > 0 ? (1000 / totalRatio) * (2 * Math.PI * tyreRadiusM(vehicle)) * 60 / 1000 : 0;
  const sessionTime = `${String(Math.floor(snap.runSeconds / 60)).padStart(2, "0")}:${String(Math.floor(snap.runSeconds % 60)).padStart(2, "0")}`;
  const rpmRatio = Math.min(1, snap.rpm / snap.redline);
  const recentRuns = runs.filter((r) => r.vehicleId === vehicle.id).slice(0, 3);

  const activeNotice = flash ? { text: flash, kind: "info" as const } : dyno.notice;

  const handlePull = () => {
    if (snap.pulling) {
      const run = dyno.endPull();
      if (run) setFlash(`${run.id} saved · ${nf(run.peakHp, 1)} hp · ${nf(run.peakTorque, 0)} ${torqueUnit(units)}`);
      else setFlash("Pull discarded. Record at least three rpm samples under load.");
      return;
    }
    if (!snap.engineOn || snap.gear === 0) {
      setFlash("Engine running and a drive gear selected are required before arming a pull.");
      return;
    }
    dyno.startPull();
  };

  const setCameraPreset = (preset: CameraPreset) => {
    updateSettings({ camera: preset });
    setCameraNonce((n) => n + 1);
    dyno.setAudioCamera(preset);
  };

  const hold = (action: "throttle" | "brake" | "clutch") => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      dyno.setVirtualInput(action, true);
    },
    onPointerUp: () => dyno.setVirtualInput(action, false),
    onPointerCancel: () => dyno.setVirtualInput(action, false),
    onPointerLeave: () => dyno.setVirtualInput(action, false),
  });

  const gearOptions = useMemo(() => {
    const list: { value: number; label: string }[] = [{ value: -1, label: "R" }, { value: 0, label: "N" }];
    for (let i = 1; i <= vehicle.gearbox.speeds; i++) list.push({ value: i, label: String(i) });
    return list;
  }, [vehicle.gearbox.speeds]);

  return (
    <div className="bay-bg mx-auto w-full max-w-[1580px] space-y-4 px-3 py-4 sm:px-5 lg:px-6 lg:py-5">
      <SectionHeading
        eyebrow="Test cell · Bay 01"
        title="Chassis dynamometer"
        description="Load the rollers, bring the engine to temperature and record a pull. Every reading below is produced by the live drivetrain simulation."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("garage")} className="border border-line-soft">
              <CarFront size={13} /> Garage
            </Button>
            <Button variant="outline" size="sm" onClick={onOpenControls}>
              <Keyboard size={13} /> Controls
            </Button>
            <Button variant="primary" size="sm" onClick={handlePull} disabled={!snap.engineOn && !snap.pulling}>
              {snap.pulling ? <Square size={12} /> : <Flag size={12} />}
              {snap.pulling ? "End & save pull" : "Arm dyno pull"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Panel className="min-w-0 overflow-hidden">
            <div className="relative h-[280px] sm:h-[320px] lg:h-[320px]">
              <CarScene vehicle={vehicle} state={snap} camera={camera} cameraNonce={cameraNonce} graphics={settings.graphics} headlights={settings.headlights} />
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3">
                <div className="thin-scroll pointer-events-auto flex max-w-[calc(100%-130px)] items-center gap-1 overflow-x-auto rounded-[10px] border border-white/10 bg-black/55 p-1 backdrop-blur-md sm:max-w-[calc(100%-190px)]">
                  <span className="ml-1 mr-0.5 hidden shrink-0 text-mut-2 sm:block"><Camera size={12} /></span>
                  {CAMERA_LABELS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setCameraPreset(item.id)}
                      className={cn(
                        "shrink-0 rounded-md px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.08em] transition-colors",
                        camera === item.id ? "bg-accent text-[#0b100b]" : "text-[#a2aea0] hover:bg-white/10 hover:text-fg",
                      )}
                      title={item.id === "engine" ? "Engine bay cutaway" : `${item.label} camera`}
                    >
                      {item.id === "engine" ? "Cutaway" : item.label}
                    </button>
                  ))}
                </div>
                <div className="pointer-events-auto rounded-[10px] border border-white/10 bg-black/55 px-2.5 py-2 backdrop-blur-md">
                  <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em]">
                    <StatusDot tone={snap.engineOn ? "accent" : snap.stalled ? "danger" : "muted"} pulse={snap.engineOn} />
                    <span className={snap.engineOn ? "text-accent" : snap.stalled ? "text-danger" : "text-mut"}>{engineState}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="value-mono text-[14.5px] text-fg">{Math.round(snap.rpm)}</span>
                    <span className="font-mono text-[8.5px] text-mut-2">RPM</span>
                    <span className="ml-1 rounded border border-white/10 px-1 font-mono text-[10.5px] text-fg">{snap.gearLabel}</span>
                  </div>
                </div>
              </div>

              {activeNotice && (
                <div className={cn(
                  "rise-in absolute left-1/2 top-[58px] z-20 flex max-w-[420px] -translate-x-1/2 items-start gap-2 rounded-lg border px-3 py-2 text-[12px] leading-relaxed shadow-xl backdrop-blur-md",
                  activeNotice.kind === "danger"
                    ? "border-danger/40 bg-[#27130f]/90 text-[#f0b7a8]"
                    : activeNotice.kind === "warn"
                      ? "border-warm/35 bg-[#241c0f]/90 text-[#e7cb9a]"
                      : "border-accent/30 bg-[#121a11]/95 text-[#d7e8bb]",
                )}>
                  <Info size={13} className="mt-0.5 shrink-0 opacity-70" />
                  <span>{activeNotice.text}</span>
                </div>
              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 pt-10">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-accent/90">
                      <span className="h-[3px] w-[3px] rounded-full bg-accent" />
                      On the rollers
                    </div>
                    <h2 className="mt-1 font-display text-lg font-semibold leading-tight tracking-tight text-white">
                      {vehicle.make} {vehicle.model}
                    </h2>
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#a6b4a5]">
                      {vehicle.year} · {vehicle.engine.code} · {vehicle.gearbox.type} · {vehicle.gearbox.drivetrain}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="hidden items-center gap-1.5 rounded-md border border-white/10 bg-black/45 px-2 py-1 backdrop-blur-sm sm:flex">
                      <span className="flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#aebaaa]"><Volume2 size={10} /> {vehicle.sound.label}</span>
                    </div>
                    <button
                      onClick={() => updateSettings({ headlights: !settings.headlights })}
                      aria-label="Toggle headlights"
                      className={cn("pointer-events-auto flex h-7 w-7 items-center justify-center rounded-md border backdrop-blur-sm", settings.headlights ? "border-accent/30 bg-accent/15 text-accent" : "border-white/10 bg-black/45 text-mut")}
                    >
                      <Zap size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {!snap.engineOn && !snap.starting && !snap.stalled && (
                <div className="absolute bottom-[86px] left-1/2 z-20 w-[calc(100%-24px)] max-w-[320px] -translate-x-1/2 rounded-xl border border-white/10 bg-black/65 p-2.5 backdrop-blur-md">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", snap.stalled ? "border-danger/30 bg-danger/10 text-danger" : "border-accent/20 bg-accent/[0.08] text-accent")}>
                      <Power size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium text-fg">{snap.stalled ? "Engine stalled" : "Powertrain offline"}</p>
                      <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.08em] text-mut-2">Start the engine before a dyno pull</p>
                    </div>
                    <Button variant="primary" size="sm" onClick={() => void dyno.startEngine()}>
                      <Play size={11} /> Start
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 divide-x divide-line-soft border-t border-line-soft sm:grid-cols-4">
              <Stat label="Engine speed" value={nf(snap.rpm)} unit="rpm" accent hint={`${nf(snap.redline)} rpm redline`} />
              <Stat label="Roller speed" value={nf(speedValue(snap.speedKph, units), 1)} unit={speedUnit(units)} hint={`${nf(snap.rollerRpm)} roller rpm`} />
              <Stat label="Wheel torque" value={nf(torqueValue(snap.wheelTorqueNm, units), 0)} unit={torqueUnit(units)} hint="Roller-derived" />
              <Stat label="Est. crank power" value={nf(snap.crankPowerHp, 0)} unit="hp" hint={`${nf(powerKw(snap.crankPowerHp), 0)} kW · estimated`} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              eyebrow="Instrumentation"
              title="Live instrument cluster"
              right={<span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-accent"><StatusDot tone="accent" pulse /> Engine data</span>}
            />
            <div className="px-3 pb-4 pt-3 sm:px-4">
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <span className="label-xs">Instrument design</span>
                <span className="hidden font-mono text-[10.5px] text-mut-2 sm:block">{CLUSTER_THEMES.find((t) => t.id === settings.cluster)?.blurb}</span>
              </div>
              <ClusterPicker value={settings.cluster} onChange={(theme: ClusterTheme) => updateSettings({ cluster: theme })} />
              <div className="mx-auto mt-3 w-full max-w-[720px]">
                <ClusterDisplay state={snap} units={units} theme={settings.cluster} />
              </div>
            </div>
          </Panel>

      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_352px]">
        <div className="min-w-0 space-y-4">
          <Panel>
            <PanelHeader
              eyebrow="Dynamometer · live trace"
              title="Power & torque"
              right={
                <>
                  <Chip active={showTorque} onClick={() => setShowTorque(!showTorque)}>{showTorque ? "HP + TQ" : "HP ONLY"}</Chip>
                  <span className="hidden font-mono text-[9.5px] uppercase tracking-[0.08em] text-mut-2 sm:block">Load {snap.dynoLoadPct}%</span>
                </>
              }
            />
            <div className="px-2 pb-2 pt-3 sm:px-4">
              <DynoChart samples={snap.pullSamples} vehicle={vehicle} units={units} height={215} showTorque={showTorque} />
            </div>
            <div className="grid grid-cols-2 divide-x divide-line-soft border-y border-line-soft sm:grid-cols-4">
              <Stat label="Peak estimated hp" value={nf(snap.pull.peakHp, 1)} unit="hp" accent hint={snap.pulling ? "Recording" : "Arm a pull to record"} />
              <Stat label="Peak wheel torque" value={nf(torqueValue(snap.pull.peakTorque, units), 0)} unit={torqueUnit(units)} />
              <Stat label="Peak rpm" value={nf(snap.pull.peakRpm)} unit="rpm" />
              <Stat label="Peak roller speed" value={nf(speedValue(snap.pull.peakSpeedKph, units), 1)} unit={speedUnit(units)} />
            </div>
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              <Button variant={snap.pulling ? "danger" : "primary"} size="md" onClick={handlePull}>
                {snap.pulling ? <Square size={12} /> : <Flag size={12} />}
                {snap.pulling ? "End pull & save" : "Arm dyno pull"}
              </Button>
              <Button variant="outline" size="md" onClick={() => dyno.resetSession()}>
                <RotateCcw size={12} /> Reset cell
              </Button>
              <div className="ml-auto flex items-center gap-3 text-mono">
                <span className={cn("flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em]", snap.pulling ? "text-accent" : "text-mut-2")}>
                  <StatusDot tone={snap.pulling ? "accent" : "muted"} pulse={snap.pulling} />
                  {snap.pulling ? `${snap.pullSamples.length} samples recording` : "Standby"}
                </span>
                <span className="hidden font-mono text-[9.5px] uppercase tracking-[0.1em] text-mut-2 md:block">5 hp smoothing · inertia {snap.dynoLoadPct}%</span>
              </div>
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)]">
            <Panel>
              <PanelHeader eyebrow="Run archive" title="Saved pulls" right={<button onClick={() => onNavigate("data")} className="flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-accent hover:underline">Full log <ChevronRight size={10} /></button>} />
              {recentRuns.length === 0 ? (
                <div className="px-4 py-6">
                  <p className="text-[12.5px] text-mut">No pulls saved for this vehicle yet.</p>
                  <p className="mt-1 max-w-sm text-[11.5px] leading-relaxed text-mut-2">Start the engine, select a gear, hold the throttle and arm a pull from the dynamometer panel above. Runs are stored locally against your selected vehicle.</p>
                </div>
              ) : (
                <div className="divide-y divide-line-soft">
                  {recentRuns.map((run) => (
                    <div key={run.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded border border-accent/20 bg-accent/[0.07] font-mono text-[9.5px] text-accent">HP</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium text-fg">{run.id} <span className="font-mono text-[9.5px] uppercase tracking-wider text-mut-2">· gear {run.gear}</span></p>
                        <p className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-mut-2">{timeAgo(run.dateISO)} · load {run.dynoLoad}%</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-right">
                        <div>
                          <p className="value-mono text-[12.5px] text-accent">{nf(run.peakHp, 1)}</p>
                          <p className="label-xs text-[8.5px]">hp est.</p>
                        </div>
                        <div>
                          <p className="value-mono text-[12.5px] text-warm">{nf(torqueValue(run.peakTorque, units), 0)}</p>
                          <p className="label-xs text-[8.5px]">{torqueUnit(units)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel>
              <PanelHeader eyebrow="Drivetrain" title="Ratios & sizing" right={<Chip>{vehicle.gearbox.drivetrain}</Chip>} />
              <div className="space-y-2 px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <span className="label-xs">Current ratio</span>
                  <span className="value-mono text-[12.5px] text-fg">{snap.gear === 0 ? "—" : `${Math.abs(currentRatio).toFixed(3)} : 1`}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="label-xs">Final drive</span>
                  <span className="value-mono text-[12.5px] text-fg">{vehicle.gearbox.finalDrive.toFixed(2)} : 1</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="label-xs">Overall reduction</span>
                  <span className="value-mono text-[12.5px] text-fg">{totalRatio ? totalRatio.toFixed(2) : "—"}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="label-xs">Roller {units === "metric" ? "km/h" : "mph"} / 1,000 rpm</span>
                  <span className="value-mono text-[12.5px] text-accent">{totalRatio ? nf(speedValue(speedPer1000, units), 1) : "—"}</span>
                </div>
                <div className="border-t border-line-soft pt-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="label-xs">Gear set</span>
                    <span className="label-xs">{vehicle.gearbox.speeds} speed · {vehicle.gearbox.type}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {vehicle.gearbox.ratios.map((ratio, index) => (
                      <div key={index} className={cn("rounded border px-1.5 py-1 text-center", snap.gear === index + 1 ? "border-accent/30 bg-accent/[0.08]" : "border-line-soft bg-black/15")}>
                        <p className="font-mono text-[8.5px] uppercase tracking-wide text-mut-2">{index + 1}</p>
                        <p className="value-mono text-[10.5px] text-[#c5d0c2]">{ratio.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <CircleDot size={11} className="text-accent/60" />
                  <p className="text-[11px] leading-relaxed text-mut-2">{vehicle.chassis.tyre} · {(tyreRadiusM(vehicle) * 1000).toFixed(0)} mm rolling radius · {vehicle.chassis.weightKg} kg</p>
                </div>
              </div>
            </Panel>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line-soft bg-black/20 px-3 py-2">
            <p className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-mut-2">
              <Info size={10} className="text-[#71806f]" /> Simulation methodology: wheel torque & speed are derived from the modelled roller state. Crank figures are estimated using the selected drivetrain efficiency ({Math.round(vehicle.gearbox.efficiency * 100)}%).
            </p>
            <button onClick={() => onNavigate("data")} className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-accent hover:underline">Read methodology</button>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <Panel>
            <PanelHeader eyebrow="Vehicle status" title="Engine & roller data" />
            <div className="px-3 pb-4 pt-3">
              <div className="mt-1 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-line-soft bg-black/25 px-3 py-2">
                  <p className="label-xs">Roller speed</p>
                  <p className="mt-0.5 flex items-baseline gap-1">
                    <span className="value-mono text-[22px] leading-none text-fg">{nf(speedValue(snap.speedKph, units), 1)}</span>
                    <span className="font-mono text-[9.5px] text-mut-2">{speedUnit(units)}</span>
                  </p>
                </div>
                <div className="rounded-xl border border-line-soft bg-black/25 px-3 py-2">
                  <p className="label-xs">Crank power est.</p>
                  <p className="mt-0.5 flex items-baseline gap-1">
                    <span className="value-mono text-[22px] leading-none text-accent">{nf(snap.crankPowerHp, 0)}</span>
                    <span className="font-mono text-[9.5px] text-mut-2">hp</span>
                  </p>
                </div>
              </div>

              <details className="mt-3 rounded-lg border border-line-soft bg-black/20 p-2.5">
                <summary className="cursor-pointer label-xs">Powertrain diagnostics</summary>
                <div className="mt-2 space-y-1 font-mono text-[10px] text-mut">
                  <div>Gear {snap.gearLabel} · Gear ratio {snap.gear === 0 ? "—" : nf(currentRatio, 3)} · Final {nf(vehicle.gearbox.finalDrive, 3)}{vehicle.gearbox.primaryReduction ? ` · Primary ${nf(vehicle.gearbox.primaryReduction, 3)}` : ""}</div>
                  <div>Engine {nf(snap.rpm)} rpm · Input {snap.gear === 0 ? "not modelled in neutral" : `${nf(snap.gearboxInputRpm)} rpm`}</div>
                  <div>Wheel {nf(snap.wheelRpm)} rpm · Roller {nf(snap.rollerRpm)} rpm · {nf(speedValue(snap.speedKph, units), 1)} {speedUnit(units)} equivalent</div>
                  <div>Clutch actuator (open) {nf(snap.clutch * 100)}% · Slip {snap.gear === 0 ? "—" : `${nf(snap.clutchSlipRpm)} rpm`} · Torque {nf(snap.clutchTorqueNm)} Nm</div>
                  <div>Engine net {nf(snap.engineTorqueNm)} Nm · Wheel {nf(snap.wheelTorqueNm)} Nm · Wheel power {nf(snap.wheelPowerHp, 1)} hp</div>
                  <div>Dyno load {nf(snap.dynoLoadPct)}% · {nf(snap.resistForceN)} N · Effective throttle {nf(snap.effectiveThrottle * 100)}%</div>
                  {vehicleAudit.errors.map(warning => <div key={warning} className="text-danger">Configuration error: {warning}</div>)}
                  {vehicleAudit.warnings.map(warning => <div key={warning} className="text-warm">Review: {warning}</div>)}
                  {snap.gear > 0 && <div>Ideal at 4,000 rpm in gear {snap.gear}: {nf(speedValue(vehicleAudit.speeds[snap.gear-1]?.at4000 ?? 0, units), 1)} {speedUnit(units)} (no slip; not a speed target)</div>}
                  <p className="pt-1 text-mut-2">Recent engine RPM versus equivalent speed · {speedUnit(units)} horizontally</p>
                  <svg className="h-24 w-full rounded border border-line-soft" viewBox="0 0 300 90" role="img" aria-label="Recent engine RPM versus equivalent road speed" preserveAspectRatio="none">
                    <line x1="0" y1="89" x2="300" y2="89" stroke="#4b594b" />
                    <polyline fill="none" stroke="#cbf466" strokeWidth="2" points={diagnosticTrace.map(point => `${Math.min(300, speedValue(point.speed, units) / (units === "metric" ? 300 : 186) * 300)},${Math.max(0, 89 - point.rpm / Math.max(1, snap.limiterRpm) * 89)}`).join(' ')} />
                  </svg>
                  <div className="flex justify-between text-[9px]"><span>0 {speedUnit(units)}</span><span>{units === "metric" ? 300 : 186} {speedUnit(units)} · vertical: 0–{nf(snap.limiterRpm)} rpm</span></div>
                </div>
              </details>
              <div className="mt-3 grid grid-cols-5 gap-1.5">
                <Lamp icon={<TriangleAlert size={12} />} label="CEL" active={snap.cel} tone="danger" />
                <Lamp icon={<BatteryCharging size={12} />} label="BAT" active={!snap.engineOn} tone="warm" />
                <Lamp icon={<Droplets size={12} />} label="OIL" active={snap.engineOn && snap.oilBar < 1.2} tone="danger" />
                <Lamp icon={<Thermometer size={12} />} label="TEMP" active={snap.coolantC > 102} tone="danger" />
                <Lamp icon={<Fuel size={12} />} label="FUEL" active={snap.fuelPct < 12} tone="warm" />
              </div>

              <div className="mt-3 space-y-1.5 rounded-xl border border-line-soft bg-black/20 p-2.5">
                <MiniRow label="Coolant" value={`${nf(tempValue(snap.coolantC, units), 0)}${tempUnit(units)}`} bar={(snap.coolantC - 20) / 100} tone="teal" />
                <MiniRow label="Oil temp" value={`${nf(tempValue(snap.oilC, units), 0)}${tempUnit(units)}`} bar={(snap.oilC - 20) / 120} tone="warm" />
                <MiniRow label="Oil pressure" value={`${snap.oilBar.toFixed(1)} bar`} bar={snap.oilBar / 6} tone="teal" />
                <MiniRow label="Fuel" value={`${nf(snap.fuelPct, 0)}%`} bar={snap.fuelPct / 100} tone="accent" />
                <MiniRow label="Battery" value={`${snap.batteryV.toFixed(1)} V`} bar={(snap.batteryV - 10) / 5} tone="accent" />
              </div>

              <div className="mt-3 flex items-center justify-between rounded-lg border border-line-soft bg-black/20 px-2.5 py-1.5">
                <span className="label-xs">Clutch</span>
                <span className={cn("flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em]", clutchState === "OPEN" ? "text-warm" : clutchState === "SLIP" ? "text-accent" : "text-[#a6b6a2]")}>
                  <StatusDot tone={clutchState === "ENGAGED" ? "accent" : "warm"} /> {clutchState}
                  {snap.clutchSlipRpm > 20 && <span className="text-mut-2">· {nf(snap.clutchSlipRpm)} rpm Δ</span>}
                </span>
              </div>

              <button
                onClick={() => void dyno.toggleIgnition()}
                disabled={snap.starting}
                className={cn(
                  "mt-3 flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors disabled:opacity-60",
                  snap.engineOn ? "border-danger/25 bg-danger/[0.07] hover:bg-danger/[0.12]" : "border-accent/30 bg-accent/[0.09] hover:bg-accent/[0.15]",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg border", snap.engineOn ? "border-danger/30 text-danger" : "border-accent/30 text-accent")}>
                    <Power size={13} />
                  </span>
                  <span className="text-left">
                    <span className="block text-[12.5px] font-semibold text-fg">{snap.starting ? "Cranking…" : snap.engineOn ? "Shut engine down" : "Start engine"}</span>
                    <span className="block font-mono text-[9px] uppercase tracking-[0.1em] text-mut-2">Ignition · key {keyLabel(bindings.ignition)}</span>
                  </span>
                </span>
                {snap.engineOn ? <Square size={12} className="text-danger/70" /> : <Play size={13} className="text-accent" />}
              </button>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              eyebrow="Driver controls"
              title="Pedals & gearbox"
              right={<Chip active={snap.engineOn} icon={<StatusDot tone={snap.engineOn ? "accent" : "muted"} />}>{snap.engineOn ? "Live" : "Standby"}</Chip>}
            />
            <div className="space-y-3 px-3.5 py-3">
              <div className="grid grid-cols-3 gap-1.5">
                {gearOptions.map((gear) => (
                  <button
                    key={gear.value}
                    onClick={() => dyno.selectGear(gear.value)}
                    className={cn(
                      "h-7 rounded-md border font-mono text-[11.5px] transition-colors",
                      snap.gear === gear.value
                        ? "border-accent/50 bg-accent/[0.14] text-accent shadow-[inset_0_0_0_1px_rgba(203,244,102,0.12)]"
                        : "border-line-soft bg-black/20 text-mut hover:border-line hover:text-fg",
                    )}
                    aria-label={`Select gear ${gear.label}`}
                  >
                    {gear.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="flex-1" onClick={dyno.shiftDown}><ArrowDown size={11} /> Down</Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={dyno.shiftUp}><ArrowUp size={11} /> Up</Button>
              </div>
              <div className="space-y-2.5 border-t border-line-soft pt-3">
                <HoldBar label="Throttle" value={snap.throttle} keyLabel={keyLabel(bindings.throttle)} active={!!held.throttle || snap.throttle > 0.02} {...hold("throttle")} icon={<Wind size={11} />} />
                <HoldBar label="Brake" value={snap.brake} keyLabel={keyLabel(bindings.brake)} active={!!held.brake} {...hold("brake")} icon={<CircleDot size={11} />} tone="danger" />
                <HoldBar label="Clutch" value={snap.clutch} keyLabel={keyLabel(bindings.clutch)} active={!!held.clutch} {...hold("clutch")} icon={<SettingsIcon />} tone="warm" />
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-line-soft bg-black/20 px-2.5 py-2">
                <div>
                  <p className="label-xs">Pull throttle</p>
                  <p className="mt-0.5 text-[10.5px] text-mut-2">Hold to open the throttle body</p>
                </div>
                <button
                  {...hold("throttle")}
                  className="flex h-9 select-none items-center gap-1.5 rounded-lg border border-accent/35 bg-accent/[0.12] px-3 text-[12.5px] font-medium text-accent transition-colors active:bg-accent/25"
                >
                  <Wind size={12} /> Hold to rev
                </button>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader eyebrow="Cell configuration" title="Clutch & load" right={<button onClick={onOpenSettings} aria-label="Open cell settings" className="text-mut-2 transition-colors hover:text-fg"><SlidersHorizontal size={12} /></button>} />
            <div className="px-3.5 py-3">
              <span className="label-xs">Clutch mode</span>
              <div className="mt-1.5">
                <Segmented
                  value={settings.clutchMode}
                  onChange={(mode) => updateSettings({ clutchMode: mode })}
                  options={[
                    { value: "manual", label: "Manual", title: "Clutch must be pressed for every shift" },
                    { value: "assisted", label: "Assisted", title: "Automatic clutch modulation during shifts" },
                    { value: "auto", label: "Bypass", title: "Clutch system automatically handled" },
                  ]}
                />
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-mut-2">
                {settings.clutchMode === "manual"
                  ? "You must hold the clutch to change gear. Dumping the clutch at low rpm can stall the engine."
                  : settings.clutchMode === "assisted"
                    ? "The clutch opens automatically during a shift, then re-engages with slip. You still control the pedal with Space."
                    : "Clutch operation is handled automatically. Shifts interrupt torque and reconnect progressively."}
              </p>
              <div className="mt-3 border-t border-line-soft pt-1">
                <Slider
                  label="Roller load"
                  value={settings.dynoLoad}
                  onChange={(value) => updateSettings({ dynoLoad: value })}
                  display={`${settings.dynoLoad}% · ${nf(snap.resistForceN, 0)} N`}
                  hint="Progressive eddy-current resistance. More load holds the car back and increases measurement duration."
                  compact
                />
                <div className="pt-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="label-xs">Live actuator</span>
                    <span className="value-mono text-[10.5px] text-[#c3cdc1]">Throttle {Math.round(snap.throttle * 100)}%</span>
                  </div>
                  <div className="h-[4px] overflow-hidden rounded-full bg-[#263027]">
                    <div className="h-full rounded-full bg-accent transition-[width] duration-75" style={{ width: `${snap.throttle * 100}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-mut-2">Smooth pedal map ramps at 7.5/s opening and 10.5/s release.</p>
                </div>
              </div>
              <div className="mt-1 divide-y divide-line-soft border-t border-line-soft">
                <Toggle checked={settings.headlights} onChange={(value) => updateSettings({ headlights: value })} label="Headlights" description="Low-beam illumination in the cell." />
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader eyebrow="Engine audio" title={vehicle.sound.label} right={<Chip icon={<Volume2 size={9} />}>Recorded</Chip>} />
            <div className="px-3.5 py-3">
              <div className="flex items-start gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-end justify-center gap-[2px] rounded-lg border border-accent/20 bg-accent/[0.06] px-1.5 pb-1.5">
                  {[0.4, 0.85, 0.56, 1, 0.62, 0.34].map((h, i) => (
                    <span key={i} className="eq-bar w-[2px] rounded-full bg-accent" style={{ height: `${snap.engineOn ? Math.max(20, h * rpmRatio * 100 + 15) : 8}%`, animationDelay: `${i * 80}ms`, animationDuration: `${900 + i * 120}ms` }} />
                  ))}
                </div>
                <p className="text-[11.5px] leading-relaxed text-mut">{vehicle.sound.description}</p>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {vehicle.sound.layers.slice(0, 4).map((layer) => <Chip key={layer}>{layer}</Chip>)}
              </div>
              <div className="mt-3 space-y-1 border-t border-line-soft pt-2">
                <Slider label="Engine level" value={Math.round(settings.audio.engine * 100)} onChange={(value) => updateAudio({ engine: value / 100 })} display={`${Math.round(settings.audio.engine * 100)}%`} compact />
                <Slider label="Master output" value={Math.round(settings.audio.master * 100)} onChange={(value) => updateAudio({ master: value / 100 })} display={`${Math.round(settings.audio.master * 100)}%`} compact />
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="flex-1" onClick={onOpenAudio}><SlidersHorizontal size={11} /> Audio routing</Button>
                <IconButton label={settings.audio.muted ? "Unmute" : "Mute"} onClick={() => updateAudio({ muted: !settings.audio.muted })} active={settings.audio.muted}>
                  <Volume2 size={13} />
                </IconButton>
              </div>
              <p className="mt-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.06em] text-mut-2">
                {dyno.audioArmed ? (dyno.audioReady ? (dyno.audioFallback ? "Synthetic fallback · recording unavailable" : "Recorded engine loops · RPM blend · camera mix") : "Loading engine recordings…") : "Audio starts on first input (browser gesture)"}
              </p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-mut-2">Recorded engine-family approximations; not the exact vehicle. Some RPM and load conditions use pitch shifting or synthetic effects. See the audio manifest for credits.</p>
            </div>
          </Panel>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-3">
        <div className="flex items-center gap-3">
          <Legend color="#cbf466" label="Estimated crank" />
          <Legend color="#e8b25a" label="Wheel torque" />
          <span className="hidden font-mono text-[9.5px] uppercase tracking-[0.08em] text-mut-2 sm:block">Session {sessionTime}</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.08em] text-mut-2">
          <span>Bay 01 · {vehicle.sound.firingNote}</span>
          <span className="text-[#3d4a3f]">/</span>
          <span>{ENGINE_TYPE_SHORT[vehicle.sound.character]}</span>
        </div>
      </div>
    </div>
  );
}

function Lamp({ icon, label, active, tone }: { icon: React.ReactNode; label: string; active: boolean; tone: "danger" | "warm" }) {
  const color = tone === "danger" ? "text-danger" : "text-warm";
  return (
    <div className={cn("flex flex-col items-center gap-1 rounded-md border px-1 py-1.5", active ? tone === "danger" ? "border-danger/30 bg-danger/[0.08]" : "border-warm/30 bg-warm/[0.08]" : "border-line-soft bg-black/20")} title={label}>
      <span className={active ? color : "text-[#4f5c51]"}>{icon}</span>
      <span className={cn("font-mono text-[8px] uppercase tracking-wider", active ? color : "text-[#4f5c51]")}>{label}</span>
    </div>
  );
}

function MiniRow({ label, value, bar, tone }: { label: string; value: string; bar: number; tone: "teal" | "warm" | "accent" }) {
  const colors = { teal: "bg-teal", warm: "bg-warm", accent: "bg-accent" };
  return (
    <div className="flex items-center gap-2">
      <span className="label-xs w-16 shrink-0 text-[9px]">{label}</span>
      <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-[#1d251e]">
        <span className={cn("block h-full rounded-full", colors[tone])} style={{ width: `${Math.max(0, Math.min(1, bar)) * 100}%` }} />
      </span>
      <span className="value-mono w-[56px] text-right text-[10px] text-[#b4c0b1]">{value}</span>
    </div>
  );
}

function SettingsIcon() {
  return <Gauge size={11} />;
}

function HoldBar({
  label,
  value,
  keyLabel,
  active,
  icon,
  tone = "accent",
  ...handlers
}: {
  label: string;
  value: number;
  keyLabel: string;
  active: boolean;
  icon: React.ReactNode;
  tone?: "accent" | "warm" | "danger";
} & {
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
}) {
  const colors = { accent: "#cbf466", warm: "#e8b25a", danger: "#e27455" };
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-mut">{icon}{label}</span>
        <span className="flex items-center gap-1.5"><span className="value-mono text-[10.5px] text-[#bcc7b9]">{Math.round(value * 100)}%</span><Kbd>{keyLabel}</Kbd></span>
      </div>
      <button
        {...handlers}
        aria-label={`Hold ${label}`}
        className={cn("h-6 w-full overflow-hidden rounded-md border bg-[#131a15] p-[3px] text-left transition-colors", active ? "border-accent/30" : "border-line-soft hover:border-line")}
      >
        <span className="block h-full rounded-[3px] transition-[width] duration-100" style={{ width: `${Math.max(2, value * 100)}%`, background: colors[tone], boxShadow: active ? `0 0 12px ${colors[tone]}66` : "none" }} />
      </button>
    </div>
  );
}
