import { useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronRight,
  Cpu,
  Database,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  History,
  Info,
  SlidersHorizontal,
  Trash2,
  Volume2,
  Waves,
} from "lucide-react";
import { nf, speedUnit, speedValue, tempUnit, tempValue, torqueUnit, torqueValue, timeAgo } from "../lib/format";
import { useStore } from "../lib/store";
import { getVehicle, VEHICLES, type Vehicle } from "../lib/vehicles";
import type { AppView } from "../lib/views";
import { cn } from "../utils/cn";
import { DynoChart } from "./gauges";
import { Button, Chip, Legend, Panel, PanelHeader, SectionHeading, Slider, StatusDot } from "./ui";

type Tab = "history" | "vehicles" | "audio" | "method";

const TABS: { id: Tab; label: string; icon: typeof History }[] = [
  { id: "history", label: "Run history", icon: History },
  { id: "vehicles", label: "Vehicle register", icon: Database },
  { id: "audio", label: "Audio system", icon: Waves },
  { id: "method", label: "Method & validation", icon: Cpu },
];

export function DataLog({
  onNavigate,
  onOpenAudio,
  onOpenDatasheet,
}: {
  onNavigate: (view: AppView) => void;
  onOpenAudio: () => void;
  onOpenDatasheet: (vehicle: Vehicle) => void;
}) {
  const { runs, settings, deleteRun, clearRuns, updateAudio } = useStore();
  const [tab, setTab] = useState<Tab>("history");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const units = settings.units;

  const selectedRun = useMemo(() => runs.find((r) => r.id === selectedRunId) ?? runs[0] ?? null, [runs, selectedRunId]);
  const chartVehicle = selectedRun ? getVehicle(selectedRun.vehicleId) : getVehicle("mustang-gt-2017");
  const bestRun = useMemo(() => runs.reduce((best, run) => (run.peakHp > (best?.peakHp ?? 0) ? run : best), null as (typeof runs)[number] | null), [runs]);

  const exportRuns = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      application: "REALSHIFT dyno simulator",
      disclaimer: "Simulation output. Not a physical load-cell measurement.",
      runs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `realshift-dyno-runs-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bay-bg mx-auto w-full max-w-[1580px] space-y-5 px-3 py-4 sm:px-5 lg:px-6 lg:py-6">
      <SectionHeading
        eyebrow="Data register · local storage"
        title="Measurement & sources"
        description="Recorded pulls, manufacturer source records, audio architecture and the exact physical method behind every number in the simulator."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportRuns} disabled={runs.length === 0}><Download size={12} /> Export runs</Button>
            <Button variant="primary" size="sm" onClick={() => onNavigate("dyno")}><Gauge size={12} /> Back to cell</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryTile label="Saved pulls" value={String(runs.length)} hint="Maximum 14 retained" />
        <SummaryTile label="Best recorded hp" value={bestRun ? nf(bestRun.peakHp, 1) : "—"} unit="hp est." hint={bestRun ? bestRun.label : "No runs recorded"} accent />
        <SummaryTile label="Vehicles in register" value={String(VEHICLES.length)} hint={`${VEHICLES.filter((v) => v.engine.fuel === "Diesel").length} diesel · ${VEHICLES.filter((v) => v.gearbox.drivetrain === "4WD").length} 4WD`} />
        <SummaryTile label="Audio buses" value="7+1" hint="Engine · exhaust · intake · turbo · transmission · dyno · room" />
      </div>

      <div className="thin-scroll flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 px-3 pb-2.5 pt-1 text-[12.5px] font-medium transition-colors",
                tab === item.id ? "text-fg" : "text-mut hover:text-fg",
              )}
            >
              <Icon size={13} className={tab === item.id ? "text-accent" : "text-mut-2"} />
              {item.label}
              {tab === item.id && <span className="absolute inset-x-1 -bottom-px h-[2px] rounded-full bg-accent" />}
            </button>
          );
        })}
      </div>

      {tab === "history" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-4">
            <Panel>
              <PanelHeader
                eyebrow="Latest trace"
                title={selectedRun ? `${selectedRun.id} · ${selectedRun.label}` : "No pull selected"}
                right={
                  selectedRun ? (
                    <>
                      <Chip>{selectedRun.gear === "-1" ? "R" : selectedRun.gear} gear</Chip>
                      <Chip>Load {selectedRun.dynoLoad}%</Chip>
                    </>
                  ) : undefined
                }
              />
              <div className="px-2 py-3 sm:px-4">
                <DynoChart samples={selectedRun?.samples ?? []} vehicle={chartVehicle} units={units} height={240} showTorque />
              </div>
              {selectedRun && (
                <div className="grid grid-cols-2 divide-x divide-line-soft border-t border-line-soft sm:grid-cols-4">
                  <RunStat label="Peak est. crank hp" value={nf(selectedRun.peakHp, 1)} unit="hp" accent />
                  <RunStat label="Peak wheel torque" value={nf(torqueValue(selectedRun.peakTorque, units), 0)} unit={torqueUnit(units)} />
                  <RunStat label="Peak rpm" value={nf(selectedRun.peakRpm)} unit="rpm" />
                  <RunStat label="Peak speed" value={nf(speedValue(selectedRun.peakSpeedKph, units), 1)} unit={speedUnit(units)} />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 border-t border-line-soft px-4 py-2.5">
                <Legend color="#cbf466" label="Estimated crank hp" />
                <Legend color="#e8b25a" label={`Wheel torque (${torqueUnit(units)})`} />
                <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.08em] text-mut-2">{selectedRun ? `${selectedRun.samples.length} samples · ${timeAgo(selectedRun.dateISO)}` : "No samples"}</span>
              </div>
            </Panel>

            <Panel>
              <PanelHeader
                eyebrow="Stored locally"
                title="Run archive"
                right={
                  confirmClear ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[9.5px] uppercase tracking-wide text-danger">Clear all?</span>
                      <Button variant="danger" size="sm" onClick={() => { clearRuns(); setConfirmClear(false); }}>Confirm</Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" onClick={exportRuns} disabled={!runs.length}><Download size={11} /> JSON</Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)} disabled={!runs.length}><Trash2 size={11} /> Clear</Button>
                    </>
                  )
                }
              />
              {runs.length === 0 ? (
                <div className="flex flex-col items-center px-5 py-12 text-center">
                  <History size={22} className="text-mut-2" />
                  <p className="mt-2 text-[13.5px] font-medium text-fg">The archive is empty</p>
                  <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-mut">Arm a dyno pull in Bay 01, build rpm through the gears and select “End & save pull”. The complete sample trace is stored here.</p>
                  <Button variant="primary" size="sm" className="mt-3" onClick={() => onNavigate("dyno")}><Gauge size={11} /> Open Bay 01</Button>
                </div>
              ) : (
                <div className="thin-scroll overflow-x-auto">
                  <table className="w-full min-w-[620px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-line-soft">
                        {["Run", "Vehicle", "Peak hp est.", "Wheel torque", "RPM", "Gear", "Recorded"].map((head) => (
                          <th key={head} className="label-xs px-4 py-2 text-[9.5px] font-normal">{head}</th>
                        ))}
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((run) => {
                        const v = getVehicle(run.vehicleId);
                        const active = selectedRun?.id === run.id;
                        return (
                          <tr
                            key={run.id}
                            onClick={() => setSelectedRunId(run.id)}
                            className={cn("cursor-pointer border-b border-line-soft/60 transition-colors last:border-0", active ? "bg-accent/[0.055]" : "hover:bg-white/[0.025]")}
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <StatusDot tone={active ? "accent" : "muted"} />
                                <span className="value-mono text-[11.5px] text-fg">{run.id}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <p className="text-[12px] text-[#d3ddd1]">{v.make} {v.model}</p>
                              <p className="font-mono text-[9px] uppercase tracking-[0.05em] text-mut-2">{v.engine.code} · {v.year}</p>
                            </td>
                            <td className="px-4 py-2.5 value-mono text-[12.5px] text-accent">{nf(run.peakHp, 1)}</td>
                            <td className="px-4 py-2.5 value-mono text-[11.5px] text-warm">{nf(torqueValue(run.peakTorque, units), 0)} <span className="text-[8.5px] text-mut-2">{torqueUnit(units)}</span></td>
                            <td className="px-4 py-2.5 value-mono text-[11.5px] text-[#c1ccc0]">{nf(run.peakRpm)}</td>
                            <td className="px-4 py-2.5"><span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10.5px] text-fg">{run.gear}</span></td>
                            <td className="px-4 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.05em] text-mut-2">{timeAgo(run.dateISO)}</td>
                            <td className="pr-3">
                              <button
                                onClick={(event) => { event.stopPropagation(); deleteRun(run.id); if (selectedRun?.id === run.id) setSelectedRunId(null); }}
                                aria-label={`Delete ${run.id}`}
                                className="flex h-6 w-6 items-center justify-center rounded text-mut-2 transition-colors hover:bg-danger/10 hover:text-danger"
                              >
                                <Trash2 size={11} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel>
              <PanelHeader eyebrow="Measurement provenance" title="What the trace means" />
              <div className="space-y-3 px-4 py-3">
                <Provenance tone="accent" title="Measured simulation state" text="Engine rpm, gear, clutch position and throttle come directly from the fixed-step drivetrain state at 120 Hz." />
                <Provenance tone="warm" title="Derived from roller state" text="Wheel torque and wheel power are calculated from the modelled engine torque, selected ratio, final drive and simulated roller angular velocity." />
                <Provenance tone="teal" title="Estimated crank output" text="Crank horsepower divides roller-derived wheel power by the vehicle's calibrated drivetrain efficiency. It is always labelled as an estimate." />
                <div className="rounded-lg border border-line-soft bg-black/25 p-2.5">
                  <p className="label-xs mb-1">Run metadata</p>
                  <p className="font-mono text-[10.5px] leading-relaxed text-mut">
                    {selectedRun ? (
                      <>id {selectedRun.id}<br />vehicle {selectedRun.vehicleId}<br />gear {selectedRun.gear} · roller load {selectedRun.dynoLoad}%<br />samples {selectedRun.samples.length} · {new Date(selectedRun.dateISO).toLocaleString("en-GB")}</>
                    ) : (
                      <>No run selected. Recorded runs retain the full sampled trace and configuration.</>
                    )}
                  </p>
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelHeader eyebrow="Session configuration" title="Current simulator setup" />
              <div className="divide-y divide-line-soft">
                <ConfigRow label="Units" value={units === "metric" ? "Metric · km/h, Nm, °C" : "Imperial · mph, lb-ft, °F"} />
                <ConfigRow label="Clutch mode" value={settings.clutchMode === "manual" ? "Manual clutch" : settings.clutchMode === "assisted" ? "Assisted clutch" : "Clutch bypassed"} />
                <ConfigRow label="Dyno load" value={`${settings.dynoLoad}% resistance`} />
                <ConfigRow label="Graphics" value={`${settings.graphics} quality`} />
                <ConfigRow label="Audio schedule" value={`${settings.audioQuality} quality`} />
                <ConfigRow label="Ambient" value={`${nf(tempValue(21.5, units), 1)}${tempUnit(units)} cell`} />
              </div>
              <div className="border-t border-line-soft px-4 py-2.5">
                <button onClick={() => onNavigate("about")} className="flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-accent hover:underline">About this project <ChevronRight size={10} /></button>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === "vehicles" && (
        <div className="space-y-4">
          <Panel>
            <PanelHeader
              eyebrow="Research register"
              title="Verified data & simulation estimates"
              right={<Chip icon={<Database size={9} />}>{VEHICLES.length} builds</Chip>}
            />
            <div className="thin-scroll overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line">
                    {["Vehicle", "Engine", "Induction", "Power", "Torque", "Transmission", "Mass", "Verified", "Sources"].map((head) => (
                      <th key={head} className="label-xs px-3 py-2.5 text-[9.5px] font-normal">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {VEHICLES.map((v) => (
                    <tr key={v.id} className="border-b border-line-soft/70 align-top transition-colors last:border-0 hover:bg-white/[0.02]">
                      <td className="px-3 py-3">
                        <button onClick={() => onOpenDatasheet(v)} className="text-left">
                          <p className="text-[12.5px] font-medium text-fg hover:text-accent">{v.make} {v.model}</p>
                          <p className="font-mono text-[9px] uppercase tracking-[0.05em] text-mut-2">{v.year} · {v.variant}</p>
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <p className="value-mono text-[11px] text-[#c6d1c3]">{nf(v.engine.displacementCc)} cc</p>
                        <p className="font-mono text-[9px] uppercase tracking-[0.04em] text-mut-2">{v.engine.layout} · {v.engine.code}</p>
                      </td>
                      <td className="px-3 py-3"><Chip className="whitespace-nowrap">{v.engine.fuel} · {v.engine.aspiration}</Chip></td>
                      <td className="px-3 py-3"><p className="value-mono text-[12px] text-accent">{v.engine.powerHp} hp</p><p className="font-mono text-[8.5px] text-mut-2">@ {nf(v.engine.powerRpm)}</p></td>
                      <td className="px-3 py-3"><p className="value-mono text-[12px] text-warm">{nf(torqueValue(v.engine.torqueNm, units))} {torqueUnit(units)}</p><p className="font-mono text-[8.5px] text-mut-2">{v.engine.torqueRpm}</p></td>
                      <td className="px-3 py-3"><p className="font-mono text-[10.5px] text-[#c6d1c3]">{v.gearbox.speeds}MT · {v.gearbox.drivetrain}</p><p className="font-mono text-[8.5px] text-mut-2">FD {v.gearbox.finalDrive.toFixed(2)}</p></td>
                      <td className="px-3 py-3"><p className="value-mono text-[11px] text-[#c6d1c3]">{nf(v.chassis.weightKg)} kg</p><p className="font-mono text-[8.5px] text-mut-2">{v.chassis.tyre}</p></td>
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-1 font-mono text-[9.5px] text-accent"><Check size={9} />{v.verified.length}</span>
                        <span className="mt-0.5 flex items-center gap-1 font-mono text-[9px] text-mut-2"><Info size={8} />{v.estimated.length} est.</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          {v.sources.slice(0, 2).map((source) => (
                            <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="flex max-w-[170px] items-center gap-1 truncate text-[9.5px] text-[#a6b59f] hover:text-accent">
                              <ExternalLink size={8} className="shrink-0" /> <span className="truncate">{source.label}</span>
                            </a>
                          ))}
                          <button onClick={() => onOpenDatasheet(v)} className="mt-0.5 flex items-center gap-1 text-left font-mono text-[9px] uppercase tracking-[0.06em] text-accent hover:underline">Full data sheet <ChevronRight size={9} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel>
              <PanelHeader eyebrow="Data integrity" title="Verified versus estimated" />
              <div className="space-y-2 px-4 py-3 text-[12px] leading-relaxed text-mut">
                <p><span className="font-medium text-fg">Verified</span> fields are published headline specifications: displacement, cylinder layout, quoted peak power and torque, rated rpm, transmission type, drivetrain and kerb weight where available from the manufacturer or a documented reference.</p>
                <p><span className="font-medium text-fg">Estimated</span> fields are not claimed as manufacturer facts: intermediate torque-curve shape, flywheel inertia, clutch torque capacity, friction torque, some ratio sets and drivetrain efficiency. These are calibrated to produce plausible simulation behaviour against the published headline numbers.</p>
                <p className="text-mut-2">Body geometry is original procedural work based on published length, width, height and wheelbase; no manufacturer CAD or game-ripped model is used.</p>
              </div>
            </Panel>
            <Panel>
              <PanelHeader eyebrow="Known limitations" title="Stated openly" />
              <div className="space-y-2 px-4 py-3 text-[12px] leading-relaxed text-mut">
                <p>This chassis dyno is a deterministic software simulation, not an instrumented load cell. Power figures are calculated from modelled torque and roller state, then labelled as derived or estimated.</p>
                <p>Engine audio blends licensed recordings at estimated RPM anchors, mostly as engine-family approximations rather than the selected car. Some effects and the fallback remain synthetic.</p>
                <p className="text-mut-2">Vehicles with four-wheel drive have their additional driveline loss modelled explicitly. Tyre slip, torsional vibration and full thermal models are simplified.</p>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === "audio" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Panel>
              <PanelHeader eyebrow="Signal architecture" title="Layered engine audio engine" right={<Chip icon={<Volume2 size={9} />}>Web Audio API</Chip>} />
              <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2">
                <div>
                  <p className="label-xs mb-2">Voice layers per vehicle</p>
                  <div className="space-y-1.5">
                    {["Recorded idle and RPM bands · approximate family", "RPM-driven playback rate and crossfade", "Load-dependent gain and filtering", "Exhaust and intake EQ paths", "Synthetic boost-driven turbo layer", "Diesel-specific recorded loops", "Synthetic ancillary events", "Speed-driven roller and gear layers", "Camera perspective and room reverb"].map((line, index) => (
                      <div key={line} className="flex items-center gap-2 rounded-md border border-line-soft bg-black/20 px-2 py-1.5">
                        <span className="font-mono text-[8.5px] text-accent">{String(index + 1).padStart(2, "0")}</span>
                        <span className="text-[11.5px] text-[#c4cfc1]">{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="label-xs mb-2">Firing model</p>
                  <div className="rounded-lg border border-line-soft bg-[#0a0f0b] p-3">
                    <p className="font-mono text-[11px] leading-relaxed text-[#b8c5b5]">
                      f<span className="text-mut-2">firing</span> = (rpm / 60) × (cylinders / 2)
                    </p>
                    <p className="mt-2 font-mono text-[9.5px] leading-relaxed text-mut-2">
                      A four-cylinder at 3,000 rpm fires at 100 Hz. A V8 at the same speed fires at 200 Hz, before any harmonic shaping. Several vehicles share approximate recording sets; see the audio manifest.
                    </p>
                  </div>
                  <p className="label-xs mb-2 mt-3">State inputs</p>
                  <div className="flex flex-wrap gap-1">
                    {["RPM", "Throttle", "Load", "Boost", "Gear", "Clutch", "Limiter", "Starter", "Wheel speed", "Camera"].map((tag) => <Chip key={tag}>{tag}</Chip>)}
                  </div>
                  <div className="mt-3 rounded-lg border border-warm/20 bg-warm/[0.05] p-2.5">
                    <p className="label-xs text-warm">Audio licence & honesty</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#b7aa92]">Licensed edited recordings are bundled. Most are engine-family approximations; the S2000 high band uses an F20C recording. Sources, licences and limitations are documented in src/assets/engine/MANIFEST.md.</p>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel>
              <PanelHeader eyebrow="State mapping" title="What changes with driving" />
              <div className="grid grid-cols-1 divide-y divide-line-soft sm:grid-cols-2 sm:divide-y-0">
                {[
                  { title: "Throttle", text: "Raises body and exhaust gains, opens intake filter and drives the turbo target pressure." },
                  { title: "Clutch", text: "A disengaged clutch lightly reduces intake contribution; slip is tracked separately from engine rpm." },
                  { title: "Limiter", text: "Fuel cut creates an audible gate on exhaust and body levels without a hard output jump." },
                  { title: "Shift", text: "Emitted only after a mechanical shift is accepted. A rejected shift produces a different, shorter clunk." },
                  { title: "Rollers", text: "Roller and room layers are driven by wheel speed, not engine rpm, so coasting remains audible." },
                  { title: "Shutdown", text: "Engine layers ramp down on shutdown; cranking has a dedicated starter layer before ignition settles to idle." },
                ].map((item) => (
                  <div key={item.title} className="px-4 py-2.5">
                    <p className="text-[12px] font-medium text-fg">{item.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-mut">{item.text}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel>
              <PanelHeader eyebrow="Mixer" title="Output bus levels" right={<button onClick={onOpenAudio} aria-label="Open full audio settings" className="text-mut-2 hover:text-fg"><SlidersHorizontal size={12} /></button>} />
              <div className="space-y-0.5 px-4 py-3">
                <Slider label="Master" value={Math.round(settings.audio.master * 100)} onChange={(value) => updateAudio({ master: value / 100 })} display={`${Math.round(settings.audio.master * 100)}%`} compact />
                <Slider label="Engine" value={Math.round(settings.audio.engine * 100)} onChange={(value) => updateAudio({ engine: value / 100 })} display={`${Math.round(settings.audio.engine * 100)}%`} compact />
                <Slider label="Exhaust" value={Math.round(settings.audio.exhaust * 100)} onChange={(value) => updateAudio({ exhaust: value / 100 })} display={`${Math.round(settings.audio.exhaust * 100)}%`} compact />
                <Slider label="Intake" value={Math.round(settings.audio.intake * 100)} onChange={(value) => updateAudio({ intake: value / 100 })} display={`${Math.round(settings.audio.intake * 100)}%`} compact />
                <Slider label="Turbocharger" value={Math.round(settings.audio.turbo * 100)} onChange={(value) => updateAudio({ turbo: value / 100 })} display={`${Math.round(settings.audio.turbo * 100)}%`} compact />
                <Slider label="Transmission" value={Math.round(settings.audio.transmission * 100)} onChange={(value) => updateAudio({ transmission: value / 100 })} display={`${Math.round(settings.audio.transmission * 100)}%`} compact />
                <Slider label="Dyno / mechanical" value={Math.round(settings.audio.dyno * 100)} onChange={(value) => updateAudio({ dyno: value / 100 })} display={`${Math.round(settings.audio.dyno * 100)}%`} compact />
                <Slider label="Ambience" value={Math.round(settings.audio.ambience * 100)} onChange={(value) => updateAudio({ ambience: value / 100 })} display={`${Math.round(settings.audio.ambience * 100)}%`} compact />
              </div>
              <div className="border-t border-line-soft px-4 py-2.5">
                <Button variant="outline" size="sm" className="w-full" onClick={onOpenAudio}><SlidersHorizontal size={11} /> Full audio routing</Button>
              </div>
            </Panel>
            <Panel>
              <PanelHeader eyebrow="Fleet identity" title="Distinct sound profiles" />
              <div className="divide-y divide-line-soft">
                {VEHICLES.map((v) => (
                  <div key={v.id} className="flex items-center gap-2 px-3 py-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded border border-line-soft font-mono text-[8.5px] text-mut-2">{v.engine.cylinders}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] text-[#ccd7ca]">{v.make} {v.model}</p>
                      <p className="truncate font-mono text-[8.5px] uppercase tracking-[0.04em] text-mut-2">{v.sound.label} · {v.sound.resonanceHz} Hz body</p>
                    </div>
                    <div className="flex items-end gap-[2px]">
                      {[0.4, 0.7, 0.5, 0.9, 0.6].map((h, i) => <span key={i} className="w-[2px] rounded-full bg-accent/40" style={{ height: `${h * v.sound.revHappiness * 12}px` }} />)}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === "method" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <Panel>
              <PanelHeader eyebrow="Fixed timestep · 120 Hz" title="Physical method" right={<Chip icon={<Cpu size={9} />}>Deterministic</Chip>} />
              <div className="space-y-3 px-4 py-4">
                <MethodStep index="01" title="Engine torque & inertia" text="Torque is interpolated from the vehicle's published peak anchors and estimated shape. Net torque subtracts friction, pumping and accessory losses. RPM integrates against flywheel inertia — there is no direct throttle-to-needle mapping." />
                <MethodStep index="02" title="Clutch coupling" text="A slipping clutch transmits capacity × clamp force whenever engine and wheel-side rpm differ. At low slip the driveline locks and both sides integrate with reflected inertia through the selected gear ratio and final drive." />
                <MethodStep index="03" title="Roller loading" text="Roller resistance combines a speed-dependent lever, the configured eddy-current load and road-load estimates. Wheel speed is integrated in SI units from the roller torque balance, including vehicle and roller-equivalent inertia." />
                <MethodStep index="04" title="Power measurement" text="Wheel power uses simulated wheel torque × angular velocity. Estimated crank power divides wheel power by drivetrain efficiency. The graph labels these separately and never presents a simulated value as a physical measurement." />
                <div className="rounded-xl border border-line bg-[#090e0a] p-3">
                  <p className="label-xs mb-2">Core equations</p>
                  <pre className="thin-scroll overflow-x-auto font-mono text-[11px] leading-[1.9] text-[#b7c6b4]">{`α_engine = (T_curve(rpm)·throttle·k_boost − T_friction − T_clutch) / J_flywheel
α_roller = (T_clutch·i_gear·i_final·η − ΣT_load) / (J_dyno + m·r²)
rpm      = ω_wheel · i_gear · i_final · 60/(2π)
P_wheel  = T_wheel · ω_wheel / 745.7        [hp]
P_crank  = P_wheel / η_drivetrain             [estimated]
v        = ω_wheel · r · 3.6                  [km/h]`}</pre>
                </div>
              </div>
            </Panel>
            <Panel>
              <PanelHeader eyebrow="Readout classes" title="Measured, derived, estimated" />
              <div className="grid grid-cols-1 divide-y divide-line-soft sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <ProvenanceBlock tone="accent" label="Simulated state" items={["Engine rpm", "Throttle / brake", "Gear and clutch", "Coolant & oil"]} />
                <ProvenanceBlock tone="warm" label="Roller-derived" items={["Wheel angular speed", "Vehicle speed", "Wheel torque", "Wheel power"]} />
                <ProvenanceBlock tone="teal" label="Estimated" items={["Crank power", "Crank torque", "Peak hp readings", "Drivetrain loss"]} />
              </div>
            </Panel>
          </div>
          <div className="space-y-4">
            <Panel>
              <PanelHeader eyebrow="Acceptance checks" title="Validated behaviours" />
              <div className="divide-y divide-line-soft">
                {[
                  "Engine cranks, settles to idle and shuts down",
                  "RPM follows load with inertia and limiter cut",
                  "Manual clutch requirement blocks a shift",
                  "Gear ratio and final drive change wheel speed",
                  "Roller speed drives the speedometer",
                  "Dyno pull samples map to rpm and gear",
                  "Per-vehicle sound profile uses its own firing frequency",
                  "Custom bindings reject conflicts and persist",
                  "Rev-limiter and stall states trigger warnings",
                  "Runs and settings survive a page reload",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 px-3.5 py-2">
                    <Check size={11} className="mt-0.5 shrink-0 text-accent" />
                    <span className="text-[11.5px] leading-relaxed text-[#bcc8b9]">{item}</span>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel>
              <PanelHeader eyebrow="Architecture" title="Independent systems" />
              <div className="space-y-1.5 px-3.5 py-3">
                {[
                  ["sim/physics.ts", "engine, clutch, gearbox, roller state"],
                  ["lib/audio.ts", "recorded loops and auxiliary effects"],
                  ["sim/store.tsx", "bindings, persistence, input manager"],
                  ["three/CarScene.tsx", "original procedural bay & vehicles"],
                  ["lib/vehicles.ts", "sourced vehicle database"],
                ].map(([file, description]) => (
                  <div key={file} className="rounded-md border border-line-soft bg-black/20 px-2 py-1.5">
                    <p className="font-mono text-[10px] text-accent/80">{file}</p>
                    <p className="mt-0.5 text-[10.5px] text-mut-2">{description}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-line-soft px-3.5 py-2.5">
                <button onClick={() => onNavigate("about")} className="flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-accent hover:underline"><BookOpen size={10} /> Project context & creator <ChevronRight size={9} /></button>
              </div>
            </Panel>
            <Panel className="px-4 py-3">
              <p className="label-xs mb-1">Need a source?</p>
              <p className="text-[11.5px] leading-relaxed text-mut">Open any vehicle's data sheet from the register or garage for its exact verified list, calibrated estimates and reference links.</p>
              <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => onOpenDatasheet(getVehicle("mustang-gt-2017"))}><FileText size={11} /> Example: Mustang GT datasheet</Button>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value, unit, hint, accent }: { label: string; value: string; unit?: string; hint: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-[linear-gradient(160deg,#131a14,#0d120f)] px-3 py-2.5">
      <p className="label-xs">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className={cn("value-mono text-[20px] leading-none", accent ? "text-accent" : "text-fg")}>{value}</span>
        {unit && <span className="font-mono text-[9px] uppercase text-mut-2">{unit}</span>}
      </p>
      <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.04em] text-mut-2">{hint}</p>
    </div>
  );
}

function RunStat({ label, value, unit, accent }: { label: string; value: string; unit: string; accent?: boolean }) {
  return (
    <div className="px-4 py-2.5">
      <p className="label-xs text-[9px]">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1"><span className={cn("value-mono text-[16px]", accent ? "text-accent" : "text-fg")}>{value}</span><span className="font-mono text-[8.5px] text-mut-2">{unit}</span></p>
    </div>
  );
}

function Provenance({ tone, title, text }: { tone: "accent" | "warm" | "teal"; title: string; text: string }) {
  const colors = { accent: "bg-accent", warm: "bg-warm", teal: "bg-teal" };
  return (
    <div className="flex items-start gap-2">
      <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", colors[tone])} />
      <div>
        <p className="text-[11.5px] font-medium text-fg">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-mut">{text}</p>
      </div>
    </div>
  );
}

function ProvenanceBlock({ tone, label, items }: { tone: "accent" | "warm" | "teal"; label: string; items: string[] }) {
  const colors = { accent: "text-accent", warm: "text-warm", teal: "text-teal" };
  return (
    <div className="px-4 py-3">
      <p className={cn("font-mono text-[10px] uppercase tracking-[0.1em]", colors[tone])}>{label}</p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => <li key={item} className="flex items-center gap-1.5 text-[11px] text-mut"><span className="h-[2px] w-2 rounded bg-current opacity-50" />{item}</li>)}
      </ul>
    </div>
  );
}

function MethodStep({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-accent/20 bg-accent/[0.06] font-mono text-[9.5px] text-accent">{index}</span>
      <div>
        <p className="text-[12.5px] font-medium text-fg">{title}</p>
        <p className="mt-0.5 max-w-2xl text-[11.5px] leading-relaxed text-mut">{text}</p>
      </div>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2">
      <span className="label-xs">{label}</span>
      <span className="text-right font-mono text-[10.5px] text-[#c2cec0]">{value}</span>
    </div>
  );
}

