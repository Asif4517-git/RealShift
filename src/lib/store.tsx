import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_AUDIO, type AudioQuality, type AudioVolumes } from "../lib/audio";
import type { ClutchMode, DynoRun } from "../lib/physics";
import type { CameraPreset } from "../three/CarScene";
import type { ClusterTheme } from "../components/clusters";
import { DEFAULT_VEHICLE_ID, getVehicle, VEHICLES } from "../lib/vehicles";
import { customVehicle, validateCustom, type CustomBuild } from "./customVehicle";

export type Units = "metric" | "imperial";
export type GraphicsQuality = "performance" | "balanced" | "high";

export type BindingAction =
  | "throttle"
  | "brake"
  | "steerLeft"
  | "steerRight"
  | "clutch"
  | "shiftUp"
  | "shiftDown"
  | "ignition";

export interface KeyBinding {
  action: BindingAction;
  label: string;
  hint: string;
  group: "Driving" | "Transmission" | "System";
}

export const KEY_BINDINGS: KeyBinding[] = [
  { action: "throttle", label: "Throttle", hint: "Hold to open the throttle body", group: "Driving" },
  { action: "brake", label: "Brake", hint: "Hydraulic brake at the rollers", group: "Driving" },
  { action: "steerLeft", label: "Steer left", hint: "Steering input (bay positioning)", group: "Driving" },
  { action: "steerRight", label: "Steer right", hint: "Steering input (bay positioning)", group: "Driving" },
  { action: "clutch", label: "Clutch", hint: "Hold to disengage the drivetrain", group: "Transmission" },
  { action: "shiftUp", label: "Shift up", hint: "Next sequential gear", group: "Transmission" },
  { action: "shiftDown", label: "Shift down", hint: "Previous gear / reverse", group: "Transmission" },
  { action: "ignition", label: "Ignition", hint: "Start or stop the engine", group: "System" },
];

export const DEFAULT_BINDINGS: Record<BindingAction, string> = {
  throttle: "KeyW",
  brake: "KeyS",
  steerLeft: "KeyA",
  steerRight: "KeyD",
  clutch: "Space",
  shiftUp: "ArrowUp",
  shiftDown: "ArrowDown",
  ignition: "KeyI",
};

export interface Settings {
  audio: AudioVolumes;
  audioQuality: AudioQuality;
  graphics: GraphicsQuality;
  units: Units;
  clutchMode: ClutchMode;
  dynoLoad: number;
  headlights: boolean;
  autoPullRecord: boolean;
  reducedMotion: boolean;
  cluster: ClusterTheme;
  camera: CameraPreset;
}

export const DEFAULT_SETTINGS: Settings = {
  audio: DEFAULT_AUDIO,
  audioQuality: "high",
  graphics: "high",
  units: "metric",
  clutchMode: "assisted",
  dynoLoad: 26,
  headlights: true,
  autoPullRecord: true,
  reducedMotion: false,
  cluster: "sport",
  camera: "cinematic",
};

interface StoreValue {
  settings: Settings;
  bindings: Record<BindingAction, string>;
  vehicleId: string;
  vehicle: ReturnType<typeof getVehicle>;
  runs: DynoRun[];
  customBuilds: CustomBuild[];
  storageError: boolean;
  saveCustom: (build: CustomBuild) => void;
  deleteCustom: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  updateAudio: (patch: Partial<AudioVolumes>) => void;
  setBinding: (action: BindingAction, code: string) => void;
  resetBinding: (action: BindingAction) => void;
  resetBindings: () => void;
  resetAllSettings: () => void;
  selectVehicle: (id: string) => void;
  addRun: (run: DynoRun) => void;
  deleteRun: (id: string) => void;
  clearRuns: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);
const SETTINGS_KEY = "realshift.settings.v2";
const BINDINGS_KEY = "realshift.bindings.v1";
const VEHICLE_KEY = "realshift.vehicle.v1";
const RUNS_KEY = "realshift.runs.v1";
const CUSTOM_KEY = "realshift.custom.v1";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<T>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && !Array.isArray(fallback)) {
      return { ...(fallback as object), ...(parsed as object) } as T;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  // Keep unrecognized records intact rather than replacing them with a filtered/empty list.
  const protectedKeys = useRef<Set<string> | null>(null);
  if (!protectedKeys.current) {
    const protectedSet = new Set<string>();
    for (const key of [CUSTOM_KEY, RUNS_KEY]) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const data: unknown = JSON.parse(raw);
        const valid = Array.isArray(data) && data.every(item => {
          if (!item || typeof item !== "object") return false;
          if (key === CUSTOM_KEY) {
            try { return typeof item.id === "string" && item.id.startsWith("custom-") && validateCustom(item.spec).length === 0; } catch { return false; }
          }
          return typeof item.id === "string" && typeof item.vehicleId === "string" && typeof item.label === "string" && Array.isArray(item.samples);
        });
        if (!valid) protectedSet.add(key);
      } catch { protectedSet.add(key); }
    }
    protectedKeys.current = protectedSet;
  }
  const [storageError, setStorageError] = useState(protectedKeys.current.size > 0);
  const persist = useCallback((key: string, value: unknown) => {
    if (protectedKeys.current?.has(key)) return;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { setStorageError(true); }
  }, []);
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    ...load<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS),
    audio: { ...DEFAULT_AUDIO, ...(load<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS).audio ?? {}) },
  }));
  const [bindings, setBindings] = useState<Record<BindingAction, string>>(() =>
    load<Record<BindingAction, string>>(BINDINGS_KEY, DEFAULT_BINDINGS),
  );
  const [customBuilds, setCustomBuilds] = useState<CustomBuild[]>(() => {
    const builds = load<CustomBuild[]>(CUSTOM_KEY, []);
    return Array.isArray(builds) ? builds.filter(b => { try { return typeof b.id === "string" && b.id.startsWith("custom-") && validateCustom(b.spec).length === 0; } catch { return false; } }) : [];
  });
  const [vehicleId, setVehicleId] = useState<string>(() => {
    const stored = load<string>(VEHICLE_KEY, DEFAULT_VEHICLE_ID);
    return VEHICLES.some((v) => v.id === stored) || customBuilds.some(b => b.id === stored) ? stored : DEFAULT_VEHICLE_ID;
  });
  const [runs, setRuns] = useState<DynoRun[]>(() => {
    const value = load<DynoRun[]>(RUNS_KEY, []);
    return Array.isArray(value) ? value.filter(r => r && typeof r.id === "string" && typeof r.vehicleId === "string" && typeof r.label === "string" && Array.isArray(r.samples)) : [];
  });

  useEffect(() => { persist(CUSTOM_KEY, customBuilds); }, [customBuilds, persist]);
  useEffect(() => { persist(SETTINGS_KEY, settings); }, [settings, persist]);
  useEffect(() => { persist(BINDINGS_KEY, bindings); }, [bindings, persist]);
  useEffect(() => { persist(VEHICLE_KEY, vehicleId); }, [vehicleId, persist]);
  useEffect(() => { persist(RUNS_KEY, runs.slice(0, 14)); }, [runs, persist]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);
  const updateAudio = useCallback((patch: Partial<AudioVolumes>) => {
    setSettings((prev) => ({ ...prev, audio: { ...prev.audio, ...patch } }));
  }, []);
  const setBinding = useCallback((action: BindingAction, code: string) => {
    setBindings((prev) => ({ ...prev, [action]: code }));
  }, []);
  const resetBinding = useCallback((action: BindingAction) => {
    setBindings((prev) => ({ ...prev, [action]: DEFAULT_BINDINGS[action] }));
  }, []);
  const resetBindings = useCallback(() => setBindings({ ...DEFAULT_BINDINGS }), []);
  const resetAllSettings = useCallback(() => {
    // Remove legacy settings as well, without touching runs or selected vehicle.
    try { localStorage.removeItem("realshift.settings.v1"); } catch { /* storage unavailable */ }
    setSettings({ ...DEFAULT_SETTINGS, audio: { ...DEFAULT_AUDIO } });
    setBindings({ ...DEFAULT_BINDINGS });
  }, []);
  const selectVehicle = useCallback((id: string) => {
    if (VEHICLES.some((v) => v.id === id) || customBuilds.some(b => b.id === id)) setVehicleId(id);
  }, [customBuilds]);
  const saveCustom = useCallback((build: CustomBuild) => {
    if (validateCustom(build.spec).length) return;
    setCustomBuilds(prev => [...prev.filter(b => b.id !== build.id), build]);
    setVehicleId(build.id);
  }, []);
  const deleteCustom = useCallback((id: string) => {
    setCustomBuilds(prev => prev.filter(b => b.id !== id));
    setVehicleId(prev => prev === id ? DEFAULT_VEHICLE_ID : prev);
  }, []);
  const addRun = useCallback((run: DynoRun) => {
    setRuns((prev) => [run, ...prev].slice(0, 14));
  }, []);
  const deleteRun = useCallback((id: string) => {
    setRuns((prev) => prev.filter((r) => r.id !== id));
  }, []);
  const clearRuns = useCallback(() => setRuns([]), []);

  const selectedBuild = customBuilds.find(b => b.id === vehicleId);
  const selectedVehicle = useMemo(() => selectedBuild ? customVehicle(selectedBuild) : getVehicle(vehicleId), [selectedBuild, vehicleId]);

  const value = useMemo<StoreValue>(
    () => ({
      settings,
      bindings,
      vehicleId,
      vehicle: selectedVehicle,
      customBuilds, saveCustom, deleteCustom, storageError,
      runs,
      updateSettings,
      updateAudio,
      setBinding,
      resetBinding,
      resetBindings,
      resetAllSettings,
      selectVehicle,
      addRun,
      deleteRun,
      clearRuns,
    }),
    [settings, bindings, vehicleId, selectedVehicle, runs, customBuilds, storageError, saveCustom, deleteCustom, updateSettings, updateAudio, setBinding, resetBinding, resetBindings, resetAllSettings, selectVehicle, addRun, deleteRun, clearRuns],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/** Central keyboard input manager. No component should hardcode a control key. */
export function useKeyboardControls(options: {
  bindings: Record<BindingAction, string>;
  enabled: boolean;
  onPress: (action: BindingAction) => void;
}) {
  const { bindings, enabled, onPress } = options;
  const [held, setHeld] = useState<Partial<Record<BindingAction, boolean>>>({});
  const bindingsRef = useRef(bindings);
  const pressRef = useRef(onPress);
  bindingsRef.current = bindings;
  pressRef.current = onPress;

  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      return ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable;
    };
    const down = (e: KeyboardEvent) => {
      if (!enabled || isTyping(e.target)) return;
      const entries = Object.entries(bindingsRef.current) as [BindingAction, string][];
      const action = entries.find(([, code]) => code === e.code)?.[0];
      if (!action) return;
      e.preventDefault();
      if (e.repeat) return;
      setHeld((prev) => ({ ...prev, [action]: true }));
      pressRef.current(action);
    };
    const up = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const entries = Object.entries(bindingsRef.current) as [BindingAction, string][];
      const action = entries.find(([, code]) => code === e.code)?.[0];
      if (!action) return;
      e.preventDefault();
      setHeld((prev) => ({ ...prev, [action]: false }));
    };
    const clear = () => setHeld({});
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up, { passive: false });
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
    };
  }, [bindings, enabled]);

  return held;
}

export function keyLabel(code: string) {
  if (!code) return "—";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `NUM ${code.slice(6)}`;
  const map: Record<string, string> = {
    Space: "SPACE",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    ShiftLeft: "L SHIFT",
    ShiftRight: "R SHIFT",
    ControlLeft: "L CTRL",
    ControlRight: "R CTRL",
    AltLeft: "L ALT",
    AltRight: "R ALT",
    Enter: "ENTER",
    Escape: "ESC",
    Tab: "TAB",
    Backspace: "BKSP",
    CapsLock: "CAPS",
  };
  return map[code] ?? code.replace(/([A-Z])/g, " $1").toUpperCase();
}
