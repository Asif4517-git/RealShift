import { prepareLoop } from "./audioLoop";
// REALSHIFT audio: locally bundled, licensed engine recordings, blended by
// simulated RPM. A procedural fallback is used only when decoding fails.
// Sources, approximations, and missing load bands: src/assets/engine/MANIFEST.md.

import i3Idle from "../assets/engine/i3_idle.mp3?inline";
import i4Idle from "../assets/engine/i4s_idle.mp3?inline";
import i4Rev from "../assets/engine/i4_rev.mp3?inline";
import i4RevB from "../assets/engine/i4b_rev.mp3?inline";
import s2000High from "../assets/engine/i4hi_hi.mp3?inline";
import dieselIdle from "../assets/engine/d4s_idle.mp3?inline";
import dieselRev from "../assets/engine/d4s_rev.mp3?inline";
import i6Idle from "../assets/engine/i6_idle.mp3?inline";
import i6TurboRev from "../assets/engine/i6t_rev.mp3?inline";
import v8Crank from "../assets/engine/v8_crank.mp3?inline";
import v8Mid from "../assets/engine/v8xbb_rev.mp3?inline";
import v8Idle from "../assets/engine/v8x57_idle.mp3?inline";
import v8Rev from "../assets/engine/v8x57_rev.mp3?inline";
import v8High from "../assets/engine/v8xsc_hi.mp3?inline";
import v6Idle from "../assets/engine/v6_idle.mp3?inline";
import v6Rev from "../assets/engine/v6_rev.mp3?inline";
import flatMid from "../assets/engine/f6_mid.mp3?inline";
import flatHigh from "../assets/engine/f6_hi.mp3?inline";
import { recordedFamily } from "./audioFamilies";
import type { SimEvent, SimSnapshot } from "./physics";
import type { Vehicle } from "./vehicles";

export interface AudioVolumes {
  master: number;
  engine: number;
  exhaust: number;
  intake: number;
  turbo: number;
  transmission: number;
  dyno: number;
  ambience: number;
  muted: boolean;
}

export const DEFAULT_AUDIO: AudioVolumes = {
  master: 0.8,
  engine: 0.88,
  exhaust: 0.74,
  intake: 0.46,
  turbo: 0.5,
  transmission: 0.4,
  dyno: 0.3,
  ambience: 0.22,
  muted: false,
};

export type AudioQuality = "low" | "medium" | "high";
export type CameraPresetAudio = "cinematic" | "front" | "rear" | "side" | "engine" | "cockpit" | "cluster";

interface Mode {
  hz: number;
  amp: number;
  decay: number;
  phase: number;
}

interface Voice {
  id: string;
  cylinders: number;
  eventsPerRev: number;
  firingOrder: number[];
  idleRpm: number;
  redline: number;
  limiter: number;
  diesel: boolean;
  turbo: boolean;
  twinturbo: boolean;
  pulseRise: number;
  pulseDecay: number;
  jitter: number;
  imbalance: number;
  rasp: number;
  brightness: number;
  idleInstability: number;
  exhaustModes: Mode[];
  intakeModes: Mode[];
  mechanical: number;
  panWidth: number;
  redlineScream: number;
  boostBar: number;
}


const CROSSPLANE = [0, 1, 0.45, 0.9, 0.1, 0.8, 0.55, 1];

function hashString(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function buildVoice(vehicle: Vehicle): Voice {
  const v = vehicle;
  const seed = hashString(v.id);
  const diesel = v.sound.diesel;
  const cylinders = v.engine.cylinders;
  const isV = v.engine.layout.includes("V");
  const flat = v.engine.layout.includes("Flat");
  const v8 = cylinders === 8;
  const displacement = v.engine.displacementCc;
  const resonance = v.sound.resonanceHz;
  const redline = v.engine.redline;
  const turbo = !!v.engine.boostBar;
  const jitter = (diesel ? 0.0011 : 0.0008) * (0.7 + (1 - v.sound.revHappiness) * 0.6);
  const exhaustModes: Mode[] = [
    { hz: resonance * 0.62 + seed * 8, amp: 1, decay: v8 ? 5.4 : 7.2, phase: seed * Math.PI },
    { hz: resonance * 1.32, amp: 0.72, decay: 9, phase: 0.8 + seed },
    { hz: resonance * 2.15 + 22, amp: 0.46, decay: 13, phase: 1.7 },
    { hz: resonance * 3.7 + 45, amp: 0.3, decay: 19, phase: 0.4 },
    { hz: 860 + seed * 420, amp: v.sound.rasp * 0.42, decay: 28, phase: 2.2 },
    { hz: 1650 + seed * 800, amp: v.sound.rasp * 0.3, decay: 36, phase: 1.1 },
  ];
  const intakeModes: Mode[] = [
    { hz: 90 + seed * 60, amp: 0.8, decay: 6, phase: seed },
    { hz: 230 + seed * 120, amp: 0.65, decay: 8, phase: 0.6 },
    { hz: 540 + seed * 260, amp: 0.5, decay: 11, phase: 1.4 },
    { hz: 980 + seed * 480, amp: 0.34, decay: 16, phase: 2.1 },
    { hz: 1900 + seed * 900, amp: 0.22 * (0.5 + v.sound.revHappiness), decay: 22, phase: 0.9 },
  ];

  return {
    id: v.id,
    cylinders,
    eventsPerRev: cylinders / 2,
    firingOrder: v8 ? CROSSPLANE : Array.from({ length: cylinders }, (_, i) => 0.55 + 0.45 * Math.abs(Math.sin(i * 2.1 + seed * 3))),
    idleRpm: v.engine.idleRpm,
    redline,
    limiter: v.engine.limiter,
    diesel,
    turbo,
    twinturbo: v.engine.aspiration === "Twin-Turbo",
    pulseRise: diesel ? 0.0032 : 0.0042 - (displacement / 6000) * 0.0016,
    pulseDecay: diesel ? 0.05 : 0.06 + (1 - v.sound.revHappiness) * 0.022 + (isV ? 0.008 : 0),
    jitter,
    imbalance: diesel ? 0.11 : v8 ? 0.075 : isV ? 0.05 : 0.032,
    rasp: v.sound.rasp,
    brightness: diesel ? 0.72 : flat ? 0.95 : v8 ? 0.9 : v.sound.revHappiness * 0.9,
    idleInstability: diesel ? 0.16 : v.engine.cylinders <= 4 ? 0.085 : 0.04,
    exhaustModes,
    intakeModes,
    mechanical: diesel ? 0.55 : isV ? 0.3 : 0.24,
    panWidth: v8 ? 0.5 : flat ? 0.32 : 0.26,
    redlineScream: v.sound.revHappiness,
    boostBar: v.engine.boostBar ?? 0,
  };
}

/** Deterministic PRNG so a vehicle renders the same voice every session. */
function rng(seed: number) {
  let state = Math.floor(seed * 2147483647) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

interface Rendered {
  left: Float32Array;
  right: Float32Array;
  rms: number;
  peak: number;
}

/**
 * Renders a seamless loop of combustion cycles at one RPM anchor.
 * Pulse train -> multiple resonant exhaust/intake modes -> saturating stages.
 */
function renderEngineLoop(voice: Voice, rpm: number, sampleRate: number, seconds: number): Rendered {
  const fire = Math.max(5, (rpm / 60) * voice.eventsPerRev);
  const events = Math.max(12, Math.min(128, Math.round(fire * seconds)));
  const loopSamples = Math.round((events / fire) * sampleRate);
  const fadeSamples = Math.round(sampleRate * 0.045);
  const total = loopSamples + fadeSamples;
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  const random = rng(hashString(voice.id) + rpm);
  const rpmRatio = Math.min(1.25, rpm / voice.redline);

  // Per-event pulse: table generated once and reused for every firing event.
  const tailSec = Math.min(0.115, 0.05 + 0.06 * (1 - rpmRatio) + (voice.diesel ? 0.015 : 0));
  const tableSamples = Math.round(tailSec * sampleRate);
  const exhaustTables: { table: Float32Array; pan: number }[] = voice.exhaustModes.map((mode) => {
    const table = new Float32Array(tableSamples);
    const decay = mode.decay * (1 + rpmRatio * 1.8);
    for (let i = 0; i < tableSamples; i++) {
      const t = i / sampleRate;
      const env = (1 - Math.exp(-t / voice.pulseRise)) * Math.exp(-t * decay);
      table[i] = Math.sin(2 * Math.PI * mode.hz * t + mode.phase) * env * mode.amp;
    }
    return { table, pan: 0 };
  });
  const intakeTables = voice.intakeModes.map((mode, index) => {
    const table = new Float32Array(tableSamples);
    const decay = mode.decay * (1 + rpmRatio * 2.2);
    for (let i = 0; i < tableSamples; i++) {
      const t = i / sampleRate;
      const env = (1 - Math.exp(-t / (voice.pulseRise * 1.6))) * Math.exp(-t * decay);
      table[i] = Math.sin(2 * Math.PI * mode.hz * t + mode.phase) * env * mode.amp * (1 + rpmRatio * 0.8);
    }
    return { table, pan: index % 2 === 0 ? -0.18 : 0.18 };
  });
  // Air/exhaust broadband transient, unique per cylinder.
  const noiseTables: Float32Array[] = Array.from({ length: Math.min(8, voice.cylinders) }, (_, cylinder) => {
    const table = new Float32Array(tableSamples);
    const local = rng(hashString(voice.id) + cylinder + rpm * 0.01);
    const lowpassHz = 900 + voice.brightness * 2600 + rpmRatio * 2400;
    const k = 1 - Math.exp((-2 * Math.PI * lowpassHz) / sampleRate);
    let state = 0;
    for (let i = 0; i < tableSamples; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * (26 + rpmRatio * 60)) * (1 - Math.exp(-t / (voice.diesel ? 0.0016 : 0.0022)));
      state += k * ((local() * 2 - 1) - state);
      table[i] = state * env;
    }
    return table;
  });

  const periodSamples = sampleRate / fire;
  const basePhase = random() * Math.PI * 2;
  for (let event = 0; event < events; event++) {
    const cylinder = event % voice.cylinders;
    const bankPan = voice.cylinders >= 6 ? (cylinder % 2 === 0 ? -voice.panWidth : voice.panWidth) : (cylinder % 2 === 0 ? -0.09 : 0.09);
    const uneven = voice.firingOrder[cylinder] ?? 1;
    // real cross-plane engines have uneven exhaust pulse energy
    const amplitude = 1 - voice.imbalance / 2 + uneven * voice.imbalance;
    const wobble = 1 + (random() * 2 - 1) * voice.jitter * fire * 8;
    const start = Math.round((event / fire + (random() * 2 - 1) * voice.jitter * 0.6) * sampleRate);
    const startWobble = Math.round(start + (wobble - 1) * periodSamples * 0.12);
    const exhaustGain = amplitude * (voice.diesel ? 1.05 : 1);
    for (const { table, pan } of exhaustTables) {
      const gl = (1 - Math.max(0, pan + bankPan)) * 0.5 + 0.5;
      const gr = 1.5 - gl;
      const offset = Math.max(0, startWobble);
      const limit = Math.min(table.length, total - offset);
      for (let i = 0; i < limit; i++) {
        const sample = table[i] * exhaustGain;
        left[offset + i] += sample * gl;
        right[offset + i] += sample * gr;
      }
    }
    for (const { table, pan } of intakeTables) {
      const gl = 1 - Math.max(0, pan) * 0.8;
      const gr = 1 + Math.min(0, pan) * 0.8;
      const offset = Math.max(0, startWobble + Math.round(sampleRate * 0.0008));
      const limit = Math.min(table.length, total - offset);
      for (let i = 0; i < limit; i++) {
        const sample = table[i] * amplitude * 0.44;
        left[offset + i] += sample * gl;
        right[offset + i] += sample * gr;
      }
    }
    const noise = noiseTables[cylinder];
    const noiseOffset = Math.max(0, startWobble + Math.round(sampleRate * 0.0004));
    const noiseLimit = Math.min(noise.length, total - noiseOffset);
    const noiseGain = (voice.diesel ? 0.28 : 0.15) * (0.6 + rpmRatio * 0.9);
    for (let i = 0; i < noiseLimit; i++) {
      const sample = noise[i] * noiseGain;
      left[noiseOffset + i] += sample * (0.9 + bankPan);
      right[noiseOffset + i] += sample * (1.1 - bankPan);
    }
  }

  // Derived channels: soft saturation, high-frequency roll-off, firing-order fundamental
  const saturation = voice.diesel ? 1.7 : 1.25 + voice.rasp;
  const tilt = 1700 + voice.brightness * 4200 + rpmRatio * 2600;
  const lowK = 1 - Math.exp((-2 * Math.PI * tilt) / sampleRate);
  const subK = 1 - Math.exp((-2 * Math.PI * (65 + voice.exhaustModes[0].hz * 0.4)) / sampleRate);
  let hpL = 0;
  let hpR = 0;
  let lpL = 0;
  let lpR = 0;
  let subL = 0;
  let subR = 0;
  const dcBlock = 1 - Math.exp((-2 * Math.PI * 28) / sampleRate);
  for (let i = 0; i < total; i++) {
    const t = i / sampleRate;
    // mechanical firing-order body (valvetrain / block)
    const mechanical = Math.sin(2 * Math.PI * fire * t + basePhase) * voice.mechanical * (0.27 + rpmRatio * 0.4)
      + Math.sin(2 * Math.PI * fire * 2 * t + 1.2) * voice.mechanical * 0.13;
    const l = left[i] + mechanical * (0.9 + rpmRatio * 0.3);
    const r = right[i] + mechanical * (1.1 - rpmRatio * 0.3);
    const satL = Math.tanh(l * saturation);
    const satR = Math.tanh(r * saturation);
    lpL += lowK * (satL - lpL);
    lpR += lowK * (satR - lpR);
    subL += subK * (satL - subL);
    subR += subK * (satR - subR);
    const mergedL = lpL * 0.78 + subL * (voice.cylinders >= 8 ? 0.6 : 0.4);
    const mergedR = lpR * 0.78 + subR * (voice.cylinders >= 8 ? 0.6 : 0.4);
    hpL += dcBlock * (mergedL - hpL);
    hpR += dcBlock * (mergedR - hpR);
    left[i] = mergedL - hpL;
    right[i] = mergedR - hpR;
  }

  // Seamless loop: equal-power fold the tail back into the head.
  for (let i = 0; i < fadeSamples; i++) {
    const p = i / fadeSamples;
    const fadeOut = Math.cos(p * Math.PI * 0.5) * Math.sqrt(2) * 0.5 + 0.5;
    const fadeIn = 1 - fadeOut;
    const tailIndex = loopSamples + i;
    if (tailIndex < total) {
      left[i] = left[i] * fadeIn + left[tailIndex] * fadeOut * 0.9;
      right[i] = right[i] * fadeIn + right[tailIndex] * fadeOut * 0.9;
    }
  }

  let peak = 0;
  let sum = 0;
  const final = loopSamples;
  // gentle idle instability, applied as a slow cyclic amplitude wobble
  if (voice.idleInstability > 0 && rpm < voice.idleRpm * 1.5) {
    for (let i = 0; i < final; i++) {
      const t = i / sampleRate;
      const wobble = 1 + Math.sin(2 * Math.PI * 2.1 * t) * voice.idleInstability * 0.25 + Math.sin(2 * Math.PI * 5.7 * t) * voice.idleInstability * 0.12;
      left[i] *= wobble;
      right[i] *= wobble;
    }
  }
  for (let i = 0; i < final; i++) {
    const p = Math.max(Math.abs(left[i]), Math.abs(right[i]));
    if (p > peak) peak = p;
    sum += left[i] * left[i] + right[i] * right[i];
  }
  const rms = Math.sqrt(sum / (final * 2)) || 1;
  const targetRms = 0.175;
  const scale = Math.min(4.2, targetRms / rms);
  peak = 0;
  for (let i = 0; i < final; i++) {
    left[i] = Math.tanh(left[i] * scale * 0.75) * 0.92;
    right[i] = Math.tanh(right[i] * scale * 0.75) * 0.92;
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  return { left: left.slice(0, final), right: right.slice(0, final), rms, peak };
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function makeBuffer(ctx: BaseAudioContext, rendered: Rendered) {
  const buffer = ctx.createBuffer(2, rendered.left.length, ctx.sampleRate);
  buffer.copyToChannel(new Float32Array(rendered.left), 0);
  buffer.copyToChannel(new Float32Array(rendered.right), 1);
  return buffer;
}

function makeNoise(ctx: BaseAudioContext, seconds = 3, pink = true) {
  const buffer = ctx.createBuffer(2, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      if (!pink) {
        data[i] = white * 0.5;
      } else {
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11;
      }
    }
  }
  return buffer;
}

function makeImpulse(ctx: BaseAudioContext, seconds = 2.1, decay = 2.6) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      const early = i < ctx.sampleRate * 0.06 ? (Math.random() * 2 - 1) * 0.55 : 0;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 30 ? 0 : 1) * 0.5 + early;
    }
  }
  return buffer;
}

export class EngineAudio {
  ctx: AudioContext | null = null;
  vehicle: Vehicle;
  private voice!: Voice;
  volumes: AudioVolumes = { ...DEFAULT_AUDIO };
  quality: AudioQuality = "high";
  camera: CameraPresetAudio = "cinematic";

  private master!: GainNode;
  private limiter!: DynamicsCompressorNode;
  private analyser!: AnalyserNode;
  private engineBus!: GainNode;
  private exhaustBus!: GainNode;
  private intakeBus!: GainNode;
  private turboBus!: GainNode;
  private transBus!: GainNode;
  private dynoBus!: GainNode;
  private ambBus!: GainNode;
  private reverb!: ConvolverNode;
  private reverbGain!: GainNode;

  private bandGains: GainNode[] = [];
  private bandSources: AudioBufferSourceNode[] = [];
  private bandAnchors: number[] = [];
  private bodyFilter!: BiquadFilterNode;
  private exhaustFilter!: BiquadFilterNode;
  private intakeFilter!: BiquadFilterNode;
  private engineGain!: GainNode;
  private mechanicalGain!: GainNode;
  private exhaustGain!: GainNode;
  private intakeGain!: GainNode;
  private idleRough!: GainNode;
  private spatialPanner!: StereoPannerNode;
  private spatialLowpass!: BiquadFilterNode;
  private cockpitSend!: GainNode;

  private turboWhistle!: OscillatorNode;
  private turboGain!: GainNode;
  private turboNoiseGain!: GainNode;
  private turboFilter!: BiquadFilterNode;

  private rollerNoiseGain!: GainNode;
  private rollerFilter!: BiquadFilterNode;
  private rollerHum!: OscillatorNode;
  private rollerHumGain!: GainNode;
  private tyreGain!: GainNode;
  private tyreFilter!: BiquadFilterNode;

  private gearWhine!: OscillatorNode;
  private gearWhineGain!: GainNode;

  private noiseBuffer: AudioBuffer | null = null;
  private lastEventAt = 0;
  private exhaustFactor = 1;
  private intakeFactor = 1;
  private modelsReady = false;
  private fallback = false;
  private rendering = false;
  private decoded = new Map<string, AudioBuffer>();
  private starterBuffer: AudioBuffer | null = null;
  private audioPeak = 0;
  private audioRms = 0;
  private started = false;

  constructor(vehicle: Vehicle) {
    this.vehicle = vehicle;
    this.voice = buildVoice(vehicle);
  }

  get running() {
    return !!this.ctx && this.ctx.state === "running";
  }

  get ready() {
    return this.modelsReady;
  }

  get usingFallback() {
    return this.fallback;
  }

  async ensureStarted() {
    if (!this.ctx) this.build();
    if (this.ctx && this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        /* user gesture required */
      }
    }
    if (this.ctx && !this.modelsReady) {
      await this.renderModels();
    }
  }

  setVehicle(vehicle: Vehicle) {
    const changed = vehicle !== this.vehicle;
    this.vehicle = vehicle;
    this.voice = buildVoice(vehicle);
    if (!changed || !this.ctx) return;
    this.stopBandSources();
    this.starterBuffer = null;
    this.modelsReady = false;
    void this.renderModels();
  }

  setVolumes(volumes: AudioVolumes) {
    this.volumes = volumes;
    if (!this.ctx) return;
    const muted = volumes.muted ? 0 : 1;
    this.set(this.master.gain, volumes.master * muted, 0.05);
    this.set(this.engineGain.gain, volumes.engine * 0.82, 0.05);
    this.set(this.exhaustBus.gain, volumes.exhaust, 0.05);
    this.set(this.intakeBus.gain, volumes.intake, 0.05);
    this.set(this.turboBus.gain, volumes.turbo, 0.05);
    this.set(this.transBus.gain, volumes.transmission, 0.05);
    this.set(this.dynoBus.gain, volumes.dyno, 0.05);
    this.set(this.ambBus.gain, volumes.ambience * 0.9, 0.05);
  }

  setQuality(quality: AudioQuality) {
    this.quality = quality;
    if (!this.ctx) return;
    this.spatialLowpass.Q.value = quality === "high" ? 0.85 : 0.6;
    this.rollerFilter.Q.value = quality === "high" ? 1.4 : 0.7;

  }

  setCamera(camera: CameraPresetAudio) {
    if (this.camera === camera) return;
    this.camera = camera;
    if (!this.ctx) return;
    this.applyCamera();
  }

  private applyCamera() {
    const map: Record<CameraPresetAudio, { pan: number; tone: number; exhaust: number; intake: number; cabin: number; room: number; turbo: number }> = {
      cinematic: { pan: 0.05, tone: 15000, exhaust: 1, intake: 1, cabin: 0, room: 0.34, turbo: 1 },
      front: { pan: -0.18, tone: 16000, exhaust: 0.62, intake: 1.5, cabin: 0, room: 0.24, turbo: 1.25 },
      rear: { pan: 0.24, tone: 14000, exhaust: 1.5, intake: 0.5, cabin: 0, room: 0.3, turbo: 0.75 },
      side: { pan: 0.28, tone: 15000, exhaust: 1.1, intake: 0.9, cabin: 0, room: 0.3, turbo: 0.9 },
      engine: { pan: 0, tone: 13000, exhaust: 0.7, intake: 1.35, cabin: 0, room: 0.2, turbo: 1.35 },
      cockpit: { pan: 0, tone: 1900, exhaust: 0.32, intake: 1.1, cabin: 1, room: 0.08, turbo: 0.4 },
      cluster: { pan: 0, tone: 2200, exhaust: 0.38, intake: 1, cabin: 0.9, room: 0.1, turbo: 0.45 },
    };
    const profile = map[this.camera];
    this.set(this.spatialPanner.pan, profile.pan, 0.25);
    this.set(this.spatialLowpass.frequency, profile.tone, 0.25);
    this.exhaustFactor = profile.exhaust;
    this.intakeFactor = profile.intake;
    this.set(this.intakeFilter.Q, 0.6 + profile.intake * 0.4, 0.2);
    this.set(this.cockpitSend.gain, profile.cabin, 0.15);
    this.set(this.reverbGain.gain, this.volumes.ambience * profile.room, 0.2);
    this.set(this.turboBus.gain, this.volumes.turbo * profile.turbo, 0.2);
  }

  private async renderModels() {
    if (!this.ctx || this.rendering) return;
    this.rendering = true;
    const vehicle = this.vehicle;
    const voice = this.voice;
    const context = this.ctx;
    // Sample anchor RPMs were measured by the loop editor; see the manifest.
    // Non-matching vehicles are explicitly approximate, not OEM recordings.
    const family = recordedFamily(vehicle.engine.layout, voice.cylinders, voice.diesel);
    const clips: [string, number][] = family === "diesel-i4"
      ? [[dieselIdle, 887], [dieselRev, 2191]]
      : family === "petrol-i3" ? [[i3Idle, 880]]
      : family === "petrol-flat6" ? [[v6Idle, 651], [flatMid, 3706], [flatHigh, 5193]]
      : family === "petrol-v8" ? [[v8Idle, 805], [v8Rev, 1444], [v8Mid, 2265], [v8High, 6478]]
      : family === "petrol-i6" ? [[i6Idle, 757], [i6TurboRev, 3530]]
      : family === "petrol-v6" ? [[v6Idle, 651], [v6Rev, 4111]]
      : family === "petrol-i4" ? [[i4Idle, 877], [i4Rev, 2274], [vehicle.engine.code === "F20C" ? s2000High : i4RevB, vehicle.engine.code === "F20C" ? 7317 : 2529]]
      : [];
    let buffers: AudioBuffer[];
    let fallback = false;
    let starterBuffer: AudioBuffer | null = null;
    try {
      if (!family) throw new Error("No recording for this engine family");
      buffers = await Promise.all(clips.map(async ([url]) => {
        const cached = this.decoded.get(url);
        if (cached) return cached;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Audio sample: ${response.status}`);
        const buffer = prepareLoop(context, await context.decodeAudioData(await response.arrayBuffer()));
        if (this.ctx === context) this.decoded.set(url, buffer);
        return buffer;
      }));
      // A separately recorded V8 starter is optional; it is never treated as an
      // engine-speed loop. Other families continue to use the procedural starter.
      if (family === "petrol-v8") {
        try {
          starterBuffer = this.decoded.get(v8Crank) ?? null;
          if (!starterBuffer) {
            const response = await fetch(v8Crank);
            if (!response.ok) throw new Error(`Starter sample: ${response.status}`);
            starterBuffer = await context.decodeAudioData(await response.arrayBuffer());
            if (this.ctx === context) this.decoded.set(v8Crank, starterBuffer);
          }
        } catch (error) {
          console.warn("Recorded starter unavailable; using synthetic starter", error);
        }
      }
    } catch (error) {
      if (this.ctx !== context || vehicle !== this.vehicle) { this.rendering = false; if (this.ctx === context) void this.renderModels(); return; }
      fallback = true;
      console.warn("Recorded engine audio unavailable; using synthetic fallback", error);
      const rate = this.ctx.sampleRate;
      buffers = [voice.idleRpm, voice.redline * 0.46, voice.redline * 0.85]
        .map((rpm) => prepareLoop(context, makeBuffer(context, renderEngineLoop(voice, rpm, rate, 1.15))));
      clips.splice(0, clips.length, ["", voice.idleRpm], ["", voice.redline * 0.46], ["", voice.redline * 0.85]);
    }
    if (this.ctx !== context || vehicle !== this.vehicle) {
      this.rendering = false;
      if (this.ctx === context) void this.renderModels();
      return;
    }
    this.stopBandSources();
    for (const buffer of buffers) {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(this.bodyFilter);
      source.start();
      this.bandSources.push(source);
      this.bandGains.push(gain);
    }
    this.bandAnchors = clips.map((clip) => clip[1]);
    this.fallback = fallback;
    this.starterBuffer = starterBuffer;
    this.modelsReady = true;
    this.rendering = false;
    this.setVolumes(this.volumes);
    this.applyCamera();
    // prime band levels without a jump
    const snapshot = {
      rpm: voice.idleRpm, idleRpm: voice.idleRpm, redline: voice.redline, throttle: 0, effectiveThrottle: 0,
    } as unknown as SimSnapshot;
    this.updateBands(snapshot, true);
  }

  private stopBandSources() {
    for (const source of this.bandSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        /* already stopped */
      }
    }
    for (const gain of this.bandGains) gain.disconnect();
    this.bandSources = [];
    this.bandGains = [];
    this.modelsReady = false;
  }

  private build() {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor({ latencyHint: "interactive" });
    const ctx = this.ctx;
    this.noiseBuffer = prepareLoop(ctx, makeNoise(ctx, 3.2));

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 26;
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -16;
    glue.knee.value = 22;
    glue.ratio.value = 4;
    glue.attack.value = 0.01;
    glue.release.value = 0.28;
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -3.2;
    this.limiter.knee.value = 3;
    this.limiter.ratio.value = 18;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.12;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    hp.connect(glue);
    glue.connect(this.limiter);
    this.limiter.connect(this.analyser);
    this.analyser.connect(this.master);
    this.master.connect(ctx.destination);

    const bus = () => {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(hp);
      return gain;
    };
    this.engineBus = bus();
    this.engineBus.gain.value = 1;
    this.exhaustBus = bus();
    this.intakeBus = bus();
    this.turboBus = bus();
    this.transBus = bus();
    this.dynoBus = bus();
    this.ambBus = bus();

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = makeImpulse(ctx, 2.0, 2.9);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0.16;
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(hp);

    // Core engine voice chain
    this.bandGains = [];
    this.bodyFilter = ctx.createBiquadFilter();
    this.bodyFilter.type = "lowpass";
    this.bodyFilter.frequency.value = 6200;
    this.bodyFilter.Q.value = 0.6;
    this.spatialLowpass = ctx.createBiquadFilter();
    this.spatialLowpass.type = "lowpass";
    this.spatialLowpass.frequency.value = 15000;
    this.spatialLowpass.Q.value = 0.85;
    this.spatialPanner = ctx.createStereoPanner();
    this.spatialPanner.pan.value = 0.05;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = this.volumes.engine * 0.95;
    this.bodyFilter.connect(this.spatialLowpass);
    this.spatialLowpass.connect(this.spatialPanner);
    this.spatialPanner.connect(this.engineGain);
    this.engineGain.connect(this.engineBus);
    const engineSend = ctx.createGain();
    engineSend.gain.value = 0.22;
    this.engineGain.connect(engineSend);
    engineSend.connect(this.reverb);

    // Exhaust EQ + gain (fed from the same combustion voice, band-limited)
    this.exhaustFilter = ctx.createBiquadFilter();
    this.exhaustFilter.type = "lowpass";
    this.exhaustFilter.frequency.value = 3800;
    this.exhaustFilter.Q.value = 1.1;
    const exhaustHp = ctx.createBiquadFilter();
    exhaustHp.type = "highpass";
    exhaustHp.frequency.value = 55;
    this.exhaustGain = ctx.createGain();
    this.exhaustGain.gain.value = 1;
    this.spatialLowpass.connect(this.exhaustFilter);
    this.exhaustFilter.connect(exhaustHp);
    exhaustHp.connect(this.exhaustGain);
    this.exhaustGain.connect(this.exhaustBus);
    const exhaustSend = ctx.createGain();
    exhaustSend.gain.value = 0.34;
    this.exhaustBus.connect(exhaustSend);
    exhaustSend.connect(this.reverb);

    // Intake: a separate band-passed path from the same rendered combustion
    this.intakeFilter = ctx.createBiquadFilter();
    this.intakeFilter.type = "bandpass";
    this.intakeFilter.frequency.value = 720;
    this.intakeFilter.Q.value = 0.9;
    this.intakeGain = ctx.createGain();
    this.intakeGain.gain.value = 0.8;
    this.spatialLowpass.connect(this.intakeFilter);
    this.intakeFilter.connect(this.intakeGain);
    this.intakeGain.connect(this.intakeBus);

    // Cabin filter path (interior perspective)
    const cabinFilter = ctx.createBiquadFilter();
    cabinFilter.type = "lowpass";
    cabinFilter.frequency.value = 1650;
    this.cockpitSend = ctx.createGain();
    this.cockpitSend.gain.value = 0;
    this.spatialLowpass.connect(cabinFilter);
    cabinFilter.connect(this.cockpitSend);
    this.cockpitSend.connect(this.engineBus);

    // Idle roughness — amplitude modulation only at low rpm
    this.idleRough = ctx.createGain();
    this.idleRough.gain.value = 1;

    // Turbocharger
    this.turboWhistle = ctx.createOscillator();
    this.turboWhistle.type = "sine";
    this.turboWhistle.frequency.value = 4200;
    this.turboGain = ctx.createGain();
    this.turboGain.gain.value = 0;
    const whistle2 = ctx.createOscillator();
    whistle2.type = "sine";
    whistle2.frequency.value = 8400;
    const whistle2Gain = ctx.createGain();
    whistle2Gain.gain.value = 0.22;
    whistle2.connect(whistle2Gain);
    whistle2Gain.connect(this.turboGain);
    this.turboWhistle.connect(this.turboGain);
    this.turboGain.connect(this.turboBus);
    const turboNoise = ctx.createBufferSource();
    turboNoise.buffer = this.noiseBuffer;
    turboNoise.loop = true;
    this.turboFilter = ctx.createBiquadFilter();
    this.turboFilter.type = "bandpass";
    this.turboFilter.frequency.value = 3600;
    this.turboFilter.Q.value = 2.2;
    this.turboNoiseGain = ctx.createGain();
    this.turboNoiseGain.gain.value = 0;
    turboNoise.connect(this.turboFilter);
    this.turboFilter.connect(this.turboNoiseGain);
    this.turboNoiseGain.connect(this.turboBus);
    this.turboWhistle.start();
    whistle2.start();
    turboNoise.start();

    // Mechanical firing body
    this.mechanicalGain = ctx.createGain();
    this.mechanicalGain.gain.value = 0.2;
    this.mechanicalGain.connect(this.engineBus);

    // Dyno bed: broadband rollers, tyre contact hiss, low hum
    const rollerNoise = ctx.createBufferSource();
    rollerNoise.buffer = this.noiseBuffer;
    rollerNoise.loop = true;
    this.rollerFilter = ctx.createBiquadFilter();
    this.rollerFilter.type = "bandpass";
    this.rollerFilter.frequency.value = 460;
    this.rollerFilter.Q.value = 1.4;
    this.rollerNoiseGain = ctx.createGain();
    this.rollerNoiseGain.gain.value = 0;
    rollerNoise.connect(this.rollerFilter);
    this.rollerFilter.connect(this.rollerNoiseGain);
    this.rollerNoiseGain.connect(this.dynoBus);
    rollerNoise.start();
    const tyreNoise = ctx.createBufferSource();
    tyreNoise.buffer = this.noiseBuffer;
    tyreNoise.loop = true;
    this.tyreFilter = ctx.createBiquadFilter();
    this.tyreFilter.type = "bandpass";
    this.tyreFilter.frequency.value = 1450;
    this.tyreFilter.Q.value = 0.8;
    this.tyreGain = ctx.createGain();
    this.tyreGain.gain.value = 0;
    tyreNoise.connect(this.tyreFilter);
    this.tyreFilter.connect(this.tyreGain);
    this.tyreGain.connect(this.dynoBus);
    tyreNoise.start();
    this.rollerHum = ctx.createOscillator();
    this.rollerHum.type = "sawtooth";
    this.rollerHum.frequency.value = 18;
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = "lowpass";
    humFilter.frequency.value = 160;
    this.rollerHumGain = ctx.createGain();
    this.rollerHumGain.gain.value = 0;
    this.rollerHum.connect(humFilter);
    humFilter.connect(this.rollerHumGain);
    this.rollerHumGain.connect(this.dynoBus);
    this.rollerHum.start();

    // Gearbox whine driven by speed
    this.gearWhine = ctx.createOscillator();
    this.gearWhine.type = "sawtooth";
    this.gearWhine.frequency.value = 320;
    const whineFilter = ctx.createBiquadFilter();
    whineFilter.type = "bandpass";
    whineFilter.frequency.value = 1000;
    whineFilter.Q.value = 2.6;
    this.gearWhineGain = ctx.createGain();
    this.gearWhineGain.gain.value = 0;
    this.gearWhine.connect(whineFilter);
    whineFilter.connect(this.gearWhineGain);
    this.gearWhineGain.connect(this.transBus);
    this.gearWhine.start();

    // Workshop ambience
    const amb = ctx.createBufferSource();
    amb.buffer = this.noiseBuffer;
    amb.loop = true;
    const ambFilter = ctx.createBiquadFilter();
    ambFilter.type = "lowpass";
    ambFilter.frequency.value = 240;
    const ambGain = ctx.createGain();
    ambGain.gain.value = 0.5;
    amb.connect(ambFilter);
    ambFilter.connect(ambGain);
    ambGain.connect(this.ambBus);
    amb.start();
    const room = ctx.createBufferSource();
    room.buffer = this.noiseBuffer;
    room.loop = true;
    const roomFilter = ctx.createBiquadFilter();
    roomFilter.type = "bandpass";
    roomFilter.frequency.value = 620;
    roomFilter.Q.value = 0.4;
    const roomGain = ctx.createGain();
    roomGain.gain.value = 0.14;
    room.connect(roomFilter);
    roomFilter.connect(roomGain);
    roomGain.connect(this.ambBus);
    room.start();

    this.started = true;
    this.setVolumes(this.volumes);
    this.applyCamera();
    this.exposeDiagnostics();
  }

  private exposeDiagnostics() {
    const self = this;
    (window as unknown as { __REALSHIFT_AUDIO__: unknown }).__REALSHIFT_AUDIO__ = {
      levels() {
        if (!self.analyser) return null;
        const data = new Float32Array(self.analyser.fftSize);
        self.analyser.getFloatTimeDomainData(data);
        let peak = 0;
        let sum = 0;
        for (const value of data) {
          const abs = Math.abs(value);
          if (abs > peak) peak = abs;
          sum += value * value;
        }
        self.audioPeak = peak;
        self.audioRms = Math.sqrt(sum / data.length);
        return {
          peak: self.audioPeak,
          rms: self.audioRms,
          modelReady: self.modelsReady,
          vehicle: self.vehicle.id,
          character: self.vehicle.sound.character,
          ctx: self.ctx?.state,
          model: self.fallback ? "synthetic-fallback" : "recorded-engine-loops",
          starter: self.starterBuffer ? "recorded-v8" : "synthetic",
        };
      },
      profile() {
        return { ...self.voice, exhaustModes: self.voice.exhaustModes.map((m) => m.hz) };
      },
    };
  }

  private updateBands(state: SimSnapshot, immediate = false) {
    if (!this.ctx) return;
    const rpm = Math.max(0, state.rpm);
    const load = state.effectiveThrottle;
    const ratio = Math.min(1.1, rpm / this.voice.redline);
    const anchors = this.bandAnchors;
    const weights = anchors.map(() => 0);
    if (rpm <= anchors[0]) weights[0] = 1;
    else if (rpm >= anchors[anchors.length - 1]) weights[anchors.length - 1] = 1;
    else {
      const upper = anchors.findIndex((anchor) => anchor >= rpm);
      const t = (rpm - anchors[upper - 1]) / (anchors[upper] - anchors[upper - 1]);
      weights[upper - 1] = Math.cos(t * Math.PI / 2);
      weights[upper] = Math.sin(t * Math.PI / 2);
    }
    const running = state.engineOn;
    const loadLift = 0.72 + load * 0.28;
    this.bandGains.forEach((gain, index) => {
      this.set(gain.gain, weights[index] * (running ? loadLift : 0), immediate ? 0.01 : 0.025);
      const source = this.bandSources[index];
      if (source) {
        const rate = Math.min(2.5, Math.max(0.45, rpm / anchors[index]));
        this.set(source.playbackRate, rpm > 0 ? rate : 1, 0.025);
      }
    });
    this.set(this.idleRough.gain, state.rpm < this.voice.idleRpm * 1.5 && running ? 1 : 0.96);
    this.set(this.spatialLowpass.frequency, 4800 + ratio * 8200 + load * 2400, 0.08);
    this.set(this.bodyFilter.frequency, 2400 + ratio * 5200 + load * 1400, 0.08);
    this.set(this.exhaustFilter.frequency, 2200 + ratio * 4600 + load * 1600, 0.08);
    this.set(this.intakeFilter.frequency, 380 + ratio * 1150 + load * 380, 0.1);
    this.set(this.mechanicalGain.gain, this.voice.mechanical * (0.6 + ratio * 0.8) * (0.4 + load * 0.6), 0.1);
  }

  sync(state: SimSnapshot) {
    if (!this.ctx) return;
    if (this.vehicle.id !== state.vehicleId) return;
    if (!this.modelsReady) {
      void this.renderModels();
      return;
    }
    const running = state.engineOn || state.starting;
    const ratio = Math.min(1.1, state.rpm / this.voice.redline);
    this.updateBands(state);

    // Idle texture — natural cyclic instability, not a static loop
    if (running && state.rpm < this.voice.idleRpm * 1.5 && this.ctx) {
      const wobble = 1 + Math.sin(this.ctx.currentTime * 2.1) * this.voice.idleInstability * 0.3
        + Math.sin(this.ctx.currentTime * 5.3 + 1.2) * this.voice.idleInstability * 0.12;
      this.idleRough.gain.setTargetAtTime(wobble, this.ctx.currentTime, 0.05);
    } else {
      this.idleRough.gain.setTargetAtTime(1, this.ctx.currentTime, 0.2);
    }

    // Turbocharger — pressure-driven spool, not throttle binary
    const boostRatio = state.boostMax > 0 ? Math.min(1.1, state.boostBar / state.boostMax) : 0;
    if (this.voice.turbo) {
      const spool = state.engineOn ? Math.max(0, boostRatio) * (0.35 + state.effectiveThrottle * 0.9) : 0;
      this.set(this.turboGain.gain, spool * 0.055, 0.12);
      this.set(this.turboNoiseGain.gain, spool * 0.09, 0.16);
      this.set(this.turboWhistle.frequency, 2600 + boostRatio * 3600 + ratio * 1200, 0.15);
      this.set(this.turboFilter.frequency, 1800 + boostRatio * 5200 + ratio * 1400, 0.15);
      this.set(this.turboBus.gain, this.volumes.turbo * (0.55 + boostRatio * 0.9), 0.15);
    } else {
      this.set(this.turboGain.gain, 0, 0.2);
      this.set(this.turboNoiseGain.gain, 0, 0.2);
    }

    // Load, overrun and clutch state shape the engine timbre.
    const load = state.effectiveThrottle;
    const freeRev = state.clutch > 0.5 || state.gear === 0;
    const overrun = state.effectiveThrottle < 0.08 && state.rpm > this.voice.idleRpm * 1.8 && state.engineOn;
    const tractionLoad = clamp01(Math.max(0, state.clutchTorqueNm) / Math.max(1, this.vehicle.gearbox.clutchCapacityNm));
    this.set(this.exhaustFilter.Q, overrun ? 2.1 : 1.1, 0.12);
    this.set(this.intakeGain.gain, this.volumes.intake * this.intakeFactor * (overrun ? 0.16 : 0.4 + load * 0.85 + ratio * 0.3), 0.1);
    this.set(this.exhaustGain.gain, this.exhaustFactor * (overrun ? 0.72 : 0.86 + tractionLoad * 0.3), 0.12);
    this.set(this.mechanicalGain.gain, this.voice.mechanical * (0.55 + ratio * 0.9) * (freeRev ? 1.05 : 0.65 + load * 0.55), 0.12);
    this.set(this.engineGain.gain, this.volumes.engine * 0.95 * (freeRev ? 0.9 + ratio * 0.12 : 0.88 + load * 0.18), 0.1);

    // Drivetrain and dyno layers are driven by wheel speed, never engine rpm alone
    const speed = Math.min(1, state.speedKph / 150);
    this.set(this.rollerNoiseGain.gain, speed * 0.32 + (running ? 0.004 : 0), 0.12);
    this.set(this.rollerFilter.frequency, 320 + speed * 1400, 0.15);
    this.set(this.tyreGain.gain, speed * 0.12, 0.15);
    this.set(this.tyreFilter.frequency, 1100 + speed * 2600, 0.15);
    this.set(this.rollerHum.frequency, 10 + state.rollerRpm * 0.55, 0.12);
    this.set(this.rollerHumGain.gain, speed * 0.06, 0.15);
    this.set(this.gearWhine.frequency, 180 + state.rollerRpm * 4.2, 0.15);
    this.set(this.gearWhineGain.gain, speed * 0.003 * (state.gear === 0 ? 0.2 : 1), 0.15);
    this.set(this.reverbGain.gain, this.volumes.ambience * (this.camera === "cockpit" || this.camera === "cluster" ? 0.25 : 1.2), 0.2);
    if (!state.engineOn) this.set(this.turboGain.gain, 0, 0.3);
  }

  private set(param: AudioParam, value: number, timeConstant = 0.05) {
    if (!this.ctx) return;
    param.setTargetAtTime(value, this.ctx.currentTime, Math.max(0.004, timeConstant));
  }

  playEvent(event: SimEvent) {
    if (!this.ctx || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    if (now - this.lastEventAt < 0.045 && (event === "pop" || event === "limiter")) return;
    this.lastEventAt = now;
    switch (event) {
      case "crank":
        this.starter(now);
        break;


      case "bov":
        this.blowOff(now);
        break;



      default:
        break;
    }
  }

  private starter(time: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    // The first 0.92 s of the Corvette recording covers the simulated crank;
    // fade the cut so it does not abruptly overlap the live idle loops.
    if (this.starterBuffer) {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const duration = Math.min(0.92, this.starterBuffer.duration);
      source.buffer = this.starterBuffer;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.35, time + 0.025);
      gain.gain.setValueAtTime(0.35, time + Math.max(0.025, duration - 0.12));
      gain.gain.linearRampToValueAtTime(0, time + duration);
      source.connect(gain); gain.connect(this.transBus);
      source.start(time); source.stop(time + duration);
      source.onended = () => { source.disconnect(); gain.disconnect(); };
      return;
    }
    const duration = 0.95;
    const osc = ctx.createOscillator();
    const motor = ctx.createOscillator();
    const gain = ctx.createGain();
    const whine = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(32, time);
    osc.frequency.linearRampToValueAtTime(41, time + duration);
    motor.type = "sawtooth";
    motor.frequency.setValueAtTime(115, time);
    motor.frequency.linearRampToValueAtTime(138, time + duration);
    whine.gain.value = 0.14;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.16, time + 0.05);
    gain.gain.setValueAtTime(0.16, time + duration - 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(filter);
    motor.connect(whine);
    whine.connect(filter);
    filter.connect(gain);
    gain.connect(this.transBus);
    osc.start(time);
    motor.start(time);
    osc.stop(time + duration + 0.02);
    motor.stop(time + duration + 0.02);
    this.burst(0.6, 1800, 0.05, this.transBus, 1.3);
  }

  private blowOff(_time: number) {
    this.burst(0.24, 3300, 0.11, this.turboBus, 3.2);
    this.burst(0.35, 1400, 0.05, this.turboBus, 1.1);
  }

  private burst(duration: number, frequency: number, level: number, destination: AudioNode, q = 1.1) {
    if (!this.ctx || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const time = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(time);
    source.stop(time + duration + 0.02);
  }

  dispose() {
    this.stopBandSources();
    this.decoded.clear();
    this.starterBuffer = null;
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.started = false;
    this.modelsReady = false;
    this.rendering = false;
  }

  get isBuilt() {
    return this.started;
  }
}
