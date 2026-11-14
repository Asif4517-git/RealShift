import { useCallback, useEffect, useRef, useState } from "react";
import { EngineAudio, type CameraPresetAudio } from "../lib/audio";
import {
  DynoSimulation,
  type ClutchMode,
  type DynoRun,
  type SimSnapshot,
} from "../lib/physics";
import { useKeyboardControls, useStore, type BindingAction } from "../lib/store";

const FIXED_STEP = 1 / 120;

export interface Notice {
  kind: "warn" | "info" | "danger";
  text: string;
}

export function useDyno(inputEnabled: boolean) {
  const { vehicle, settings, bindings, addRun } = useStore();
  const simRef = useRef<DynoSimulation | null>(null);
  const audioRef = useRef<EngineAudio | null>(null);
  const heldRef = useRef<Partial<Record<BindingAction, boolean>>>({});
  const audioReadyRef = useRef(false);
  const virtualRef = useRef<Partial<Record<BindingAction, boolean>>>({});
  const noticeTimer = useRef<number | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [audioArmed, setAudioArmed] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  if (!simRef.current) simRef.current = new DynoSimulation(vehicle);
  if (!audioRef.current) audioRef.current = new EngineAudio(vehicle);
  const sim = simRef.current;
  const audio = audioRef.current;

  const [snapshot, setSnapshot] = useState<SimSnapshot>(() => {
    const sim0 = new DynoSimulation(vehicle);
    return sim0.snapshot();
  });

  const showNotice = useCallback((next: Notice) => {
    setNotice(next);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3200);
  }, []);

  const armAudio = useCallback(async () => {
    await audio.ensureStarted();
    audio.setVolumes(settings.audio);
    audio.setQuality(settings.audioQuality);
    setAudioArmed(true);
    setAudioReady(audio.ready);
  }, [audio, settings.audio, settings.audioQuality]);

  const startEngine = useCallback(async () => {
    await armAudio();
    sim.startEngine();
    setSnapshot(sim.snapshot());
  }, [armAudio, sim]);

  const stopEngine = useCallback(() => {
    sim.stopEngine();
    setSnapshot(sim.snapshot());
  }, [sim]);

  const toggleIgnition = useCallback(() => {
    if (sim.engineOn || sim.starting) stopEngine();
    else void startEngine();
  }, [sim, startEngine, stopEngine]);

  const shiftUp = useCallback(() => {
    void armAudio();
    sim.shiftUp();
    setSnapshot(sim.snapshot());
  }, [armAudio, sim]);

  const shiftDown = useCallback(() => {
    void armAudio();
    sim.shiftDown();
    setSnapshot(sim.snapshot());
  }, [armAudio, sim]);

  const selectGear = useCallback((gear: number) => {
    void armAudio();
    sim.selectGear(gear);
    setSnapshot(sim.snapshot());
  }, [armAudio, sim]);

  const setVirtualInput = useCallback((action: "throttle" | "brake" | "clutch", pressed: boolean) => {
    virtualRef.current[action] = pressed;
    if (action === "throttle" && pressed) void armAudio();
  }, [armAudio]);

  const inputEnabledRef = useRef(inputEnabled);
  inputEnabledRef.current = inputEnabled;

  const held = useKeyboardControls({
    bindings,
    enabled: inputEnabled,
    onPress: (action) => {
      if (action === "shiftUp") shiftUp();
      else if (action === "shiftDown") shiftDown();
      else if (action === "ignition") toggleIgnition();
    },
  });
  heldRef.current = held;

  // Keep the mechanical state in sync with user configuration.
  useEffect(() => {
    if (!inputEnabled) virtualRef.current = {};
  }, [inputEnabled]);
  useEffect(() => {
    sim.setClutchMode(settings.clutchMode);
  }, [sim, settings.clutchMode]);
  useEffect(() => {
    sim.dynoLoad = settings.dynoLoad;
  }, [sim, settings.dynoLoad]);
  useEffect(() => {
    audio.setVehicle(vehicle);
    sim.setVehicle(vehicle);
    setSnapshot(sim.snapshot());
  }, [vehicle, audio, sim]);
  useEffect(() => {
    audio.setVolumes(settings.audio);
  }, [audio, settings.audio]);
  useEffect(() => {
    audio.setQuality(settings.audioQuality);
  }, [audio, settings.audioQuality]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let accumulator = 0;
    let lastUi = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const elapsed = Math.min(0.12, (now - last) / 1000);
      last = now;
      accumulator += elapsed;
      if (accumulator > 0.3) accumulator = 0.3;

      const hybrid = (action: BindingAction) =>
        inputEnabledRef.current && !!(heldRef.current[action] || virtualRef.current[action]);
      sim.setInputs({
        throttle: hybrid("throttle") ? 1 : 0,
        brake: hybrid("brake") ? 1 : 0,
        clutch: hybrid("clutch") ? 1 : 0,
        steer: (hybrid("steerRight") ? 1 : 0) - (hybrid("steerLeft") ? 1 : 0),
      });

      while (accumulator >= FIXED_STEP) {
        sim.tick(FIXED_STEP);
        accumulator -= FIXED_STEP;
      }

      const events = sim.drainEvents();
      for (const event of events) {
        audio.playEvent(event);
        if (event === "gear-reject") {
          showNotice({ kind: "warn", text: "Clutch required. Press and hold the clutch before shifting." });
        } else if (event === "overrev-reject") {
          showNotice({ kind: "warn", text: "Gear rejected: roller speed would mechanically over-rev the engine." });
        } else if (event === "start-refused") {
          showNotice({ kind: "warn", text: "Select neutral or press the clutch before cranking." });
        } else if (event === "stall") {
          showNotice({ kind: "danger", text: "Engine stalled. Press ignition to restart." });
        }
      }

      const next = sim.snapshot();
      audio.sync(next);
      if (!audioReadyRef.current && audio.ready) {
        audioReadyRef.current = true;
        setAudioReady(true);
      }
      if (now - lastUi > 55) {
        lastUi = now;
        setSnapshot(next);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [sim, audio, showNotice]);

  useEffect(() => {
    return () => {
      audio.dispose();
    };
  }, [audio]);

  const startPull = useCallback(() => {
    sim.startPull();
    setSnapshot(sim.snapshot());
    showNotice({ kind: "info", text: "Dyno pull armed. Build rpm through the gears, then end the pull to save." });
  }, [showNotice, sim]);

  const endPull = useCallback((): DynoRun | null => {
    const run = sim.endPull();
    if (run) addRun(run);
    setSnapshot(sim.snapshot());
    return run;
  }, [addRun, sim]);

  const resetSession = useCallback(() => {
    sim.resetSession();
    virtualRef.current = {};
    setSnapshot(sim.snapshot());
    showNotice({ kind: "info", text: "Session reset. All rollers stopped, gearbox in neutral." });
  }, [sim, showNotice]);

  const setClutchMode = useCallback((mode: ClutchMode) => {
    sim.setClutchMode(mode);
  }, [sim]);

  const setAudioCamera = useCallback((camera: CameraPresetAudio) => {
    audio.setCamera(camera);
  }, [audio]);

  return {
    snapshot,
    sim,
    vehicle,
    audioArmed,
    audioReady,
    setAudioCamera,
    notice,
    held,
    startEngine,
    stopEngine,
    toggleIgnition,
    shiftUp,
    shiftDown,
    selectGear,
    setVirtualInput,
    startPull,
    endPull,
    resetSession,
    setClutchMode,
    armAudio,
    dismissNotice: () => setNotice(null),
  };
}

export type DynoController = ReturnType<typeof useDyno>;
