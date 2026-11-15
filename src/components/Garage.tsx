import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CarFront,
  Check,
  ChevronRight,
  Cog,
  Database,
  FileText,
  Fuel,
  Gauge,
  Info,
  Search,
  Volume2,
  Weight,
  Zap,
} from "lucide-react";
import porschePhoto from "../assets/cars/porsche-9912.jpg?inline";
import swiftPhoto from "../assets/cars/swift-2018.jpg?inline";
import corollaPhoto from "../assets/cars/corolla-altis.jpg?inline";
import mx5Photo from "../assets/cars/mx5-nd.jpg?inline";
import hiluxPhoto from "../assets/cars/hilux-2018.jpg?inline";
import fortunerPhoto from "../assets/cars/fortuner-2021.jpg?inline";
import golfPhoto from "../assets/cars/golf-mk7.jpg?inline";
import s2000Photo from "../assets/cars/s2000-ap1.jpg?inline";
import bmw320Photo from "../assets/cars/bmw-320d-f30.jpg?inline";
import mustangPhoto from "../assets/cars/mustang-gt.jpg?inline";
import civicPhoto from "../assets/cars/civic-fk8.jpg?inline";
import supraPhoto from "../assets/cars/gr-supra.jpg?inline";
import m3Photo from "../assets/cars/m3-g80.jpg?inline";
import { CustomEditor } from "./CustomEditor";
import { customVehicle } from "../lib/customVehicle";
import { DynoSimulation } from "../lib/physics";
import { nf, torqueUnit, torqueValue } from "../lib/format";
import { useStore } from "../lib/store";
import { ENGINE_TYPE_SHORT, VEHICLES, type Vehicle } from "../lib/vehicles";
import type { AppView } from "../lib/views";
import { cn } from "../utils/cn";
import CarScene from "../three/CarScene";
import { CarBlueprint, TorqueCurveBars } from "./gauges";
import { Button, Chip, EqBars, Panel, SectionHeading, StatusDot } from "./ui";

const PHOTOS: Record<string, { src: string; description: string }> = {
  '911-carrera-s-9912': { src: porschePhoto, description: '2018 Porsche 911 Carrera S 991.2, representative trim' },
  'swift-1.2-2018': { src: swiftPhoto, description: '2018 Swift GLX, representative trim and market' },
  'corolla-altis-1.8': { src: corollaPhoto, description: '2018 Corolla Altis 1.8 V, representative facelift and market' },
  'mazda-mx5-nd2-2020': { src: mx5Photo, description: '2015 MX-5 ND 2.0, representative earlier model' },
  'hilux-2.8-2018': { src: hiluxPhoto, description: 'Hilux Invincible X 2.4, representative trim' },
  'toyota-fortuner-2021-28-mt': { src: fortunerPhoto, description: 'Fortuner SRZ 2.7 petrol, representative trim' },
  'golf-gti-mk7': { src: golfPhoto, description: 'Golf GTI Mk7, representative trim' },
  's2000-ap1': { src: s2000Photo, description: 'Honda S2000 AP1, representative trim' },
  'bmw-320d-f30': { src: bmw320Photo, description: 'BMW 320d F30, representative trim' },
  'mustang-gt-2017': { src: mustangPhoto, description: 'Ford Mustang GT S550, representative trim' },
  'civic-type-r-fk8-2017': { src: civicPhoto, description: 'Honda Civic Type R FK8, representative trim' },
  'toyota-gr-supra-a90-2023-manual': { src: supraPhoto, description: 'GR Supra, representative trim' },
  'bmw-m3-g80-2021-manual': { src: m3Photo, description: 'G80 M3 Competition, representative trim' },
};

type Filter = "all" | "petrol" | "diesel" | "turbo" | "na" | "4wd";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All vehicles" },
  { id: "petrol", label: "Petrol" },
  { id: "diesel", label: "Diesel" },
  { id: "turbo", label: "Forced induction" },
  { id: "na", label: "Naturally aspirated" },
  { id: "4wd", label: "4WD" },
];

export function Garage({
  onNavigate,
  onOpenDatasheet,
}: {
  onNavigate: (view: AppView) => void;
  onOpenDatasheet: (vehicle: Vehicle) => void;
}) {
  const { vehicle, selectVehicle, settings, customBuilds } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [paintIndex, setPaintIndex] = useState(0);
  const units = settings.units;

  useEffect(() => {
    setPaintIndex(0);
  }, [vehicle.id]);

  const still = useMemo(() => new DynoSimulation(vehicle).snapshot(), [vehicle]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...VEHICLES, ...customBuilds.map(customVehicle)].filter((candidate) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "petrol" && candidate.engine.fuel === "Petrol") ||
        (filter === "diesel" && candidate.engine.fuel === "Diesel") ||
        (filter === "turbo" && candidate.engine.aspiration.includes("Turbo")) ||
        (filter === "na" && candidate.engine.aspiration === "NA") ||
        (filter === "4wd" && candidate.gearbox.drivetrain === "4WD");
      const haystack = `${candidate.make} ${candidate.model} ${candidate.variant} ${candidate.engine.code} ${candidate.engine.layout} ${candidate.tags.join(" ")}`.toLowerCase();
      return matchesFilter && (!q || haystack.includes(q));
    });
  }, [filter, query, customBuilds]);

  const selectAndEnter = () => {
    onNavigate("dyno");
  };

  return (
    <div className="bay-bg mx-auto w-full max-w-[1580px] space-y-5 px-3 py-4 sm:px-5 lg:px-6 lg:py-6">
      <SectionHeading
        eyebrow={`Vehicle database · ${VEHICLES.length} builds · ${VEHICLES.filter((v) => v.engine.fuel === "Diesel").length} diesel`}
        title="The garage"
        description="Every vehicle carries its own engine, torque curve, gearbox, final drive, dashboard and sound architecture. Select a build to load it into Bay 01."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => onNavigate("data")}>
              <Database size={13} /> Data register
            </Button>
            <Button variant="primary" size="sm" onClick={() => onNavigate("dyno")}>
              <Gauge size={13} /> Enter dyno bay
            </Button>
          </>
        }
      />

      <Panel className="overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)]">
          <div className="order-2 flex flex-col p-4 sm:p-5 lg:order-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip active icon={<StatusDot tone="accent" />}>Loaded in bay 01</Chip>
              {vehicle.tags.slice(0, 3).map((tag) => <Chip key={tag}>{tag}</Chip>)}
            </div>
            <div className="mt-3">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-mut">{vehicle.make} · {vehicle.year}</p>
              <h2 className="mt-1 font-display text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] text-fg sm:text-[34px]">{vehicle.model}</h2>
              <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#9aa894]">{vehicle.variant} · {vehicle.generation}</p>
            </div>

            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-mut">
              {vehicle.engine.displacementCc} cc {vehicle.engine.layout.toLowerCase()}, {vehicle.engine.induction.toLowerCase()}. {vehicle.sound.description}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <SpecTile icon={<Zap size={12} />} label="Power" value={nf(vehicle.engine.powerHp)} unit="hp" hint={`@ ${nf(vehicle.engine.powerRpm)} rpm`} />
              <SpecTile icon={<Gauge size={12} />} label="Torque" value={nf(torqueValue(vehicle.engine.torqueNm, units))} unit={torqueUnit(units)} hint={vehicle.engine.torqueRpm} accent />
              <SpecTile icon={<Cog size={12} />} label="Gearbox" value={String(vehicle.gearbox.speeds)} unit="MT" hint={vehicle.gearbox.drivetrain} />
              <SpecTile icon={<Weight size={12} />} label="Kerb weight" value={nf(vehicle.chassis.weightKg)} unit="kg" hint={`${nf(vehicle.engine.redline)} rpm redline`} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1.1fr_1fr]">
              <div className="rounded-xl border border-line-soft bg-black/20 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="label-xs flex items-center gap-1.5"><Volume2 size={10} /> Sound signature</span>
                  <EqBars level={0.55} />
                </div>
                <p className="mt-1 text-[12.5px] font-medium text-fg">{vehicle.sound.label}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {vehicle.sound.layers.slice(0, 3).map((layer) => <span key={layer} className="font-mono text-[9px] uppercase tracking-[0.06em] text-mut-2">{layer}</span>)}
                </div>
              </div>
              <div className="rounded-xl border border-line-soft bg-black/20 px-3 py-2.5">
                <span className="label-xs">Torque anchor curve</span>
                <div className="mt-1.5">
                  <TorqueCurveBars vehicle={vehicle} units={units} />
                </div>
                <p className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.05em] text-mut-2">Published anchors + estimated interpolation</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="primary" size="lg" onClick={selectAndEnter}><Gauge size={14} /> Enter Bay 01</Button>
              <Button variant="outline" size="lg" onClick={() => onOpenDatasheet(vehicle)}><FileText size={13} /> Technical datasheet</Button>
            </div>
            <div className="mt-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.08em] text-mut-2">
              <Check size={10} className="text-accent/70" /> {vehicle.verified.length} verified specifications
              <span className="text-[#3d493e]">/</span>
              <Info size={10} /> {vehicle.estimated.length} calibrated estimates
            </div>
          </div>

          <div className="relative order-1 min-h-[280px] border-b border-line-soft bg-[#090d0a] sm:min-h-[340px] lg:order-2 lg:border-b-0 lg:border-l">
            <CarScene vehicle={vehicle} state={still} camera="cinematic" cameraNonce={0} mode="studio" graphics={settings.graphics} headlights={settings.headlights} paintIndex={paintIndex} />
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
              <div className="rounded-md border border-white/10 bg-black/50 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#b4c4b0] backdrop-blur-sm">
                Vehicle bay · Studio inspection
              </div>
              <div className="rounded-md border border-white/10 bg-black/50 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#b4c4b0] backdrop-blur-sm">
                Drag to orbit
              </div>
            </div>
            <div className="pointer-events-auto absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
              <div className="rounded-lg border border-white/10 bg-black/55 px-2.5 py-1.5 backdrop-blur-md">
                <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-mut-2">Paint</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {vehicle.paint.map((paint, index) => (
                    <button
                      key={paint.name}
                      aria-label={`Paint ${paint.name}`}
                      title={paint.name}
                      onClick={() => setPaintIndex(index)}
                      className={cn("h-4 w-4 rounded-full border transition-all", paintIndex === index ? "scale-110 border-accent shadow-[0_0_0_2px_rgba(203,244,102,0.2)]" : "border-white/25 hover:scale-105")}
                      style={{ background: paint.hex }}
                    />
                  ))}
                  <span className="ml-1 hidden font-mono text-[9px] uppercase tracking-[0.08em] text-[#c0cbbe] sm:block">{vehicle.paint[paintIndex]?.name}</span>
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/55 px-2.5 py-1.5 text-right backdrop-blur-md">
                <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-mut-2">Body</p>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#c6d1c3]">{vehicle.bodyStyle} · original 3D</p>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="thin-scroll flex gap-1 overflow-x-auto">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              onClick={() => setFilter(option.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors",
                filter === option.id ? "border-accent/45 bg-accent/[0.1] text-accent" : "border-line bg-black/20 text-mut hover:border-[#38463b] hover:text-fg",
              )}
            >
              {option.label}
              <span className="ml-1.5 text-[8.5px] opacity-60">
                {option.id === "all" ? VEHICLES.length + customBuilds.length : [...VEHICLES, ...customBuilds.map(customVehicle)].filter((v) =>
                  option.id === "petrol" ? v.engine.fuel === "Petrol" :
                  option.id === "diesel" ? v.engine.fuel === "Diesel" :
                  option.id === "turbo" ? v.engine.aspiration.includes("Turbo") :
                  option.id === "na" ? v.engine.aspiration === "NA" :
                  v.gearbox.drivetrain === "4WD").length}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-[240px]">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mut-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search model or engine…"
            aria-label="Search vehicles"
            className="h-8 w-full rounded-lg border border-line bg-[#0c110d] pl-8 pr-2 text-[12.5px] text-fg placeholder:text-mut-2 focus:border-accent/40 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="label-xs">{filtered.length} vehicle{filtered.length === 1 ? "" : "s"} matching</p>
        <p className="hidden font-mono text-[9.5px] uppercase tracking-[0.08em] text-mut-2 sm:block">All builds · manual transmission · rear/roller tested</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((candidate) => {
          const selected = candidate.id === vehicle.id;
          return (
            <button
              key={candidate.id}
              onClick={() => selectVehicle(candidate.id)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-[linear-gradient(170deg,#121813_0%,#0c100d_100%)] text-left transition-all duration-200",
                selected ? "border-accent/35 shadow-[0_0_0_1px_rgba(203,244,102,0.08),0_18px_50px_-24px_rgba(203,244,102,0.2)]" : "border-line hover:-translate-y-0.5 hover:border-[#38473b]",
              )}
            >
              <div className="flex items-start justify-between gap-2 px-4 pt-3.5">
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-mut-2">{candidate.make} · {candidate.country}</p>
                  <h3 className="mt-0.5 truncate font-display text-[16px] font-semibold tracking-tight text-fg">{candidate.model}</h3>
                  <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.05em] text-mut">{candidate.variant}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {selected ? <Chip active icon={<Check size={8} />}>In bay</Chip> : <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-mut-2">{candidate.year}</span>}
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-mut-2">{candidate.bodyStyle}</span>
                </div>
              </div>
              <div className="relative mx-3 mt-1 overflow-hidden rounded-xl border border-white/[0.045] bg-[radial-gradient(ellipse_at_50%_20%,rgba(203,244,102,0.045),transparent_65%)] px-2 py-2">
                {PHOTOS[candidate.id] ? <img src={PHOTOS[candidate.id].src} alt={PHOTOS[candidate.id].description} className="h-[78px] w-full rounded-lg object-cover" /> : <CarBlueprint vehicle={candidate} className="h-[78px] opacity-90 transition-opacity group-hover:opacity-100" />}
                {PHOTOS[candidate.id] && <span className="absolute bottom-1 left-2 rounded bg-black/70 px-1 font-mono text-[8px] text-white">Representative trim · see photo credits below</span>}
                <span className="absolute right-2 top-2 rounded border border-white/[0.07] px-1 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-mut-2">{ENGINE_TYPE_SHORT[candidate.sound.character]}</span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-line-soft border-t border-line-soft">
                <MiniSpec label="Power" value={nf(candidate.engine.powerHp)} unit="hp" />
                <MiniSpec label="Torque" value={nf(torqueValue(candidate.engine.torqueNm, units))} unit={torqueUnit(units)} />
                <MiniSpec label="Drive" value={candidate.gearbox.drivetrain} unit={`${candidate.gearbox.speeds}MT`} />
              </div>
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Fuel size={9} className="shrink-0 text-mut-2" />
                  <span className="truncate font-mono text-[9px] uppercase tracking-[0.06em] text-mut-2">{candidate.engine.code} · {nf(candidate.engine.displacementCc)} cc</span>
                </div>
                <span className="flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.08em] text-[#9aa994] transition-colors group-hover:text-accent">
                  Select <ArrowUpRight size={10} />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-mut-2">Photo credits: <a className="underline" href="https://commons.wikimedia.org/wiki/File:2023_Toyota_Supra_(2).jpg" target="_blank" rel="noopener noreferrer">GR Supra — Calreyn88</a> and <a className="underline" href="https://commons.wikimedia.org/wiki/File:BMW_M3_Competition_(G80)_Auto_Zuerich_2021_IMG_0043.jpg" target="_blank" rel="noopener noreferrer">G80 M3 — Alexander Migl</a>, <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. Displayed with cropping; photos show representative trims. Additional photos: <a className="underline" href="https://commons.wikimedia.org/wiki/File:Volkswagen_Golf_GTI_Mk7_Deep_Black_Pearl_(1).jpg" target="_blank" rel="noopener noreferrer">Golf — Damian B Oh</a> and <a className="underline" href="https://commons.wikimedia.org/wiki/File:Honda_CIVIC_TYPE_R_(DBA-FK8)_front.jpg" target="_blank" rel="noopener noreferrer">Civic — Tokumeigakarinoaoshima</a> (CC BY-SA 4.0); <a className="underline" href="https://commons.wikimedia.org/wiki/File:2001_Honda_S2000_(5003700541)_(cropped).jpg" target="_blank" rel="noopener noreferrer">S2000 — Spanish Coches</a> and <a className="underline" href="https://commons.wikimedia.org/wiki/File:BMW_320d_F30_(7097736969).jpg" target="_blank" rel="noopener noreferrer">320d — nakhon100</a> (<a className="underline" href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noopener noreferrer">CC BY 2.0</a>); <a className="underline" href="https://commons.wikimedia.org/wiki/File:Ford_Mustang_GT,_20.5.2017_(2).jpg" target="_blank" rel="noopener noreferrer">Mustang — DariuszSankowski</a> (<a className="underline" href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener noreferrer">CC0</a>). <a className="underline" href="https://commons.wikimedia.org/wiki/File:2018_Toyota_Hilux_Invincible_X_D-4d_4WD_2.4_Front.jpg" target="_blank" rel="noopener noreferrer">Hilux — Vauxford</a> and <a className="underline" href="https://commons.wikimedia.org/wiki/File:2021_Toyota_Fortuner_SRZ_2.7_4x2_(Indonesia)_front_view_01.jpg" target="_blank" rel="noopener noreferrer">Fortuner — Andra Febrian</a> (CC BY-SA 4.0; pictured trims differ from the simulated vehicles). <a className="underline" href="https://commons.wikimedia.org/wiki/File:Suzuki_Swift_1.2_GLX_2018_(39796731854).jpg" target="_blank" rel="noopener noreferrer">Swift — RL GNZLZ</a> (<a className="underline" href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 2.0</a>); <a className="underline" href="https://commons.wikimedia.org/wiki/File:2018_Toyota_Corolla_Altis_(E170)_1.8_V_(front),_East_Surabaya.jpg" target="_blank" rel="noopener noreferrer">Corolla — Alex Neman</a> and <a className="underline" href="https://commons.wikimedia.org/wiki/File:2015_Mazda_MX-5_ND_2.0_SKYACTIV-G_160_i-ELOOP_Rubinrot-Metallic_Vorderansicht.jpg" target="_blank" rel="noopener noreferrer">MX-5 — Kickaffe (Mario von Berg)</a> (CC BY-SA 4.0). These are representative models and are resized and cropped. <a className="underline" href="https://commons.wikimedia.org/wiki/File:2018_Porsche_911_Carrera_S.jpg" target="_blank" rel="noopener noreferrer">911 Carrera S — TTTNIS</a> (CC0; resized and cropped). Other cards use original blueprints.</p>
      <CustomEditor />

      {filtered.length === 0 && (
        <Panel className="flex flex-col items-center justify-center gap-2 px-5 py-14 text-center">
          <CarFront size={24} className="text-mut-2" />
          <p className="text-sm font-medium text-fg">No vehicle matches that filter</p>
          <p className="max-w-sm text-[12.5px] text-mut">Try a different engine architecture or clear the search field.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => { setFilter("all"); setQuery(""); }}>Reset filters</Button>
        </Panel>
      )}

      <Panel className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <Info size={13} className="mt-0.5 shrink-0 text-[#7d8b7c]" />
          <p className="max-w-3xl text-[11.5px] leading-relaxed text-mut-2">
            Bodies are original procedural geometry built to each vehicle's published length, width, height and wheelbase. They are not licensed manufacturer CAD. Headline engine figures come from manufacturer or documented sources; interpolated curve shape, flywheel inertia, clutch capacity and some gear ratios are calibrated estimates. See the technical datasheet for per-vehicle sourcing.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onOpenDatasheet(vehicle)} className="shrink-0">
          Open datasheet <ChevronRight size={11} />
        </Button>
      </Panel>
    </div>
  );
}

function SpecTile({ icon, label, value, unit, hint, accent }: { icon: React.ReactNode; label: string; value: string; unit: string; hint: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line-soft bg-[#0b100d] px-2.5 py-2">
      <div className="flex items-center justify-between">
        <span className="label-xs text-[9.5px]">{label}</span>
        <span className="text-mut-2">{icon}</span>
      </div>
      <p className="mt-1 flex items-baseline gap-1">
        <span className={cn("value-mono text-[17px] leading-none", accent ? "text-accent" : "text-fg")}>{value}</span>
        <span className="font-mono text-[9px] uppercase text-mut-2">{unit}</span>
      </p>
      <p className="mt-1 truncate font-mono text-[8.5px] uppercase tracking-[0.03em] text-mut-2">{hint}</p>
    </div>
  );
}

function MiniSpec({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="px-3 py-2">
      <p className="label-xs text-[9px]">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1">
        <span className="value-mono text-[13.5px] text-[#d3ddd0]">{value}</span>
        <span className="font-mono text-[8px] uppercase text-mut-2">{unit}</span>
      </p>
    </div>
  );
}
