import { tyreRadiusM, type Vehicle } from "./vehicles";

export type ClutchMode = "manual" | "assisted" | "auto";

export interface SimInputs {
  throttle: number;
  brake: number;
  clutch: number;
  steer: number;
}

export interface PullSample {
  rpm: number;
  crankHp: number;
  wheelHp: number;
  torqueNm: number;
}

export interface PullStats {
  peakHp: number;
  peakTorque: number;
  peakRpm: number;
  peakSpeedKph: number;
  startedAt: number | null;
}

export interface DynoRun {
  id: string;
  vehicleId: string;
  label: string;
  dateISO: string;
  peakHp: number;
  peakTorque: number;
  peakRpm: number;
  peakSpeedKph: number;
  gear: string;
  samples: PullSample[];
  dynoLoad: number;
}

export type SimEvent =
  | "crank"
  | "ignition"
  | "shutdown"
  | "stall"
  | "start-refused"
  | "shift-up"
  | "shift-down"
  | "gear-reject"
  | "limiter"
  | "bov"
  | "pop"
  | "pull-start"
  | "pull-end";

export interface SimSnapshot {
  vehicleId: string;
  engineOn: boolean;
  starting: boolean;
  stalled: boolean;
  rpm: number;
  idleRpm: number;
  redline: number;
  limiterRpm: number;
  speedKph: number;
  rollerRpm: number;
  gear: number;
  gearLabel: string;
  clutch: number;
  clutchEngaged: boolean;
  throttle: number;
  brake: number;
  steer: number;
  boostBar: number;
  boostMax: number;
  coolantC: number;
  oilC: number;
  oilBar: number;
  fuelPct: number;
  batteryV: number;
  cel: boolean;
  limiterActive: boolean;
  clutchSlipRpm: number;
  engineTorqueNm: number;
  wheelTorqueNm: number;
  wheelPowerHp: number;
  crankPowerHp: number;
  crankPowerKw: number;
  pulling: boolean;
  pullSamples: PullSample[];
  pull: PullStats;
  dynoLoadPct: number;
  gearboxInputRpm: number;
  clutchHeatPct: number;
  resistForceN: number;
  ambientC: number;
  odometerKm: number;
  runSeconds: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const smooth = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

const EMPTY_PULL: PullStats = {
  peakHp: 0,
  peakTorque: 0,
  peakRpm: 0,
  peakSpeedKph: 0,
  startedAt: null,
};

export class DynoSimulation {
  vehicle: Vehicle;
  clutchMode: ClutchMode = "assisted";
  dynoLoad = 34;

  engineOn = false;
  starting = false;
  stalled = false;
  rpm = 0;
  gear = 0;
  wheelOmega = 0; // rad/s, signed. + = forward
  clutchPedal = 0; // driver input 0 released → 1 pressed
  clutchActual = 0; // smoothed actuator
  throttle = 0;
  throttleTarget = 0;
  brake = 0;
  steer = 0;
  autoClutchTimer = 0;
  startTimer = 0;
  stallTimer = 0;
  boost = 0;
  boostWasHigh = false;
  clutchHeat = 0;
  idleIntegral = 0;
  inputShaftRpm = 0;

  fuelCutTimer = 0;
  limiterActive = false;
  clutchSlipRpm = 0;
  engineTorque = 0;
  wheelTorque = 0;
  enginePowerHp = 0;
  enginePowerKw = 0;
  wheelPowerHp = 0;
  crankPowerHp = 0;

  coolantC = 28;
  oilC = 26;
  oilBar = 0;
  fuelPct = 82;
  batteryV = 12.4;
  cel = false;
  odometerKm = 48_210;
  runSeconds = 0;

  pulling = false;
  pullSamples: PullSample[] = [];
  pull: PullStats = { ...EMPTY_PULL };
  lastSampleRpm = 0;
  lastSampleTime = 0;
  sampleClock = 0;

  events: SimEvent[] = [];
  wheelRadius: number;

  constructor(vehicle: Vehicle) {
    this.vehicle = vehicle;
    this.wheelRadius = tyreRadiusM(vehicle);
  }

  setVehicle(vehicle: Vehicle) {
    this.vehicle = vehicle;
    this.wheelRadius = tyreRadiusM(vehicle);
    this.resetSession();
  }

  resetSession() {
    this.engineOn = false;
    this.starting = false;
    this.stalled = false;
    this.rpm = 0;
    this.gear = 0;
    this.wheelOmega = 0;
    this.clutchPedal = 0;
    this.clutchActual = 0;
    this.throttle = 0;
    this.throttleTarget = 0;
    this.brake = 0;
    this.boost = 0;
    this.fuelCutTimer = 0;
    this.limiterActive = false;
    this.coolantC = 28;
    this.oilC = 26;
    this.oilBar = 0;
    this.fuelPct = 82;
    this.batteryV = 12.4;
    this.cel = false;
    this.pulling = false;
    this.pullSamples = [];
    this.pull = { ...EMPTY_PULL };
    this.runSeconds = 0;
    this.stallTimer = 0;
    this.clutchHeat = 0;
    this.idleIntegral = 0;
    this.inputShaftRpm = 0;
  }

  setClutchMode(mode: ClutchMode) {
    if (this.clutchMode === mode) return;
    this.clutchMode = mode;
    if (mode === "auto") this.clutchActual = 0;
  }

  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  private emit(event: SimEvent) {
    this.events.push(event);
    if (this.events.length > 20) this.events.shift();
  }

  get gearLabel() {
    if (this.gear === -1) return "R";
    if (this.gear === 0) return "N";
    return String(this.gear);
  }

  private totalRatio() {
    const g = this.vehicle.gearbox;
    if (this.gear === 0) return 0;
    if (this.gear === -1) return -g.reverse * g.finalDrive;
    return g.ratios[this.gear - 1] * g.finalDrive;
  }

  startEngine() {
    if (this.engineOn || this.starting) return;
    const clutchOpen = this.clutchActual > 0.55;
    if (this.gear !== 0 && !clutchOpen) {
      this.emit("start-refused");
      return;
    }
    this.starting = true;
    this.stalled = false;
    this.startTimer = 0;
    this.rpm = 80;
    this.emit("crank");
  }

  stopEngine() {
    if (!this.engineOn && !this.starting) return;
    this.engineOn = false;
    this.starting = false;
    this.clutchSlipRpm = 0;
    this.emit("shutdown");
  }

  toggleIgnition() {
    if (this.engineOn || this.starting) this.stopEngine();
    else this.startEngine();
  }

  // Convenience start used by the keyboard shortcut: if a gear is selected
  // without the clutch, select neutral rather than refusing the crank.
  smartIgnition() {
    if (this.engineOn || this.starting) {
      this.stopEngine();
      return;
    }
    this.startEngine();
  }

  shiftUp() {
    this.shift(1);
  }

  shiftDown() {
    this.shift(-1);
  }

  private canShift() {
    if (this.clutchMode !== "manual") return true;
    return this.clutchActual > 0.45;
  }

  selectGear(target: number) {
    const top = this.vehicle.gearbox.speeds;
    if (target < -1 || target > top || target === this.gear) return;
    if (!this.canShift()) {
      this.emit("gear-reject");
      return;
    }
    const previous = this.gear;
    this.gear = target;
    if (this.clutchMode === "assisted" && target !== 0) {
      this.clutchActual = 1;
      this.autoClutchTimer = 0.42;
    }
    if (this.clutchMode === "auto") {
      this.clutchActual = 0;
      if (target !== 0) this.syncRpmToWheels();
    }
    if (target !== 0 && previous === 0 && this.clutchActual < 0.4 && this.clutchMode === "manual" && this.throttle > 0.2) {
      this.emit("pop");
    }
    this.emit(target > previous ? "shift-up" : "shift-down");
  }

  private shift(dir: 1 | -1) {
    const top = this.vehicle.gearbox.speeds;
    const next = this.gear + dir;
    if (next > top || next < -1) return;
    if (!this.canShift()) {
      this.emit("gear-reject");
      return;
    }
    const previous = this.gear;
    this.gear = next;
    if (this.clutchMode === "assisted" && next !== 0) {
      this.clutchActual = 1;
      this.autoClutchTimer = 0.42;
    }
    if (this.clutchMode === "auto") {
      this.clutchActual = 0;
      if (next !== 0) {
        const rpmFromWheel = Math.abs(this.wheelOmega) * this.wheelRadius;
        void rpmFromWheel;
        this.syncRpmToWheels();
      }
    }
    if (next !== 0 && previous === 0 && this.clutchActual < 0.4 && this.clutchMode === "manual" && this.throttle > 0.2) {
      this.emit("pop");
    }
    this.emit(dir > 0 ? "shift-up" : "shift-down");
  }

  private syncRpmToWheels() {
    const ratio = this.totalRatio();
    if (this.gear === 0 || Math.abs(ratio) < 0.01) return;
    const rpm = Math.abs((this.wheelOmega * ratio * 60) / (2 * Math.PI));
    // Never drag a stationary engine below idle when a gear is selected:
    // below the idle threshold the clutch slips instead of locking.
    if (rpm >= this.vehicle.engine.idleRpm * 0.9) {
      this.rpm = clamp(rpm, 0, this.vehicle.engine.limiter + 200);
    }
  }

  startPull() {
    this.pulling = true;
    this.pullSamples = [];
    this.lastSampleRpm = 0;
    this.lastSampleTime = performance.now();
    this.sampleClock = 0;
    this.pull = { ...EMPTY_PULL, startedAt: performance.now() };
    this.emit("pull-start");
  }

  endPull(): DynoRun | null {
    if (!this.pulling) return null;
    this.pulling = false;
    this.emit("pull-end");
    const p = this.pull;
    if (this.pullSamples.length < 3) return null;
    return {
      id: `RUN-${String(Math.floor(Math.random() * 900) + 100)}`,
      vehicleId: this.vehicle.id,
      label: `${this.vehicle.make} ${this.vehicle.model}`,
      dateISO: new Date().toISOString(),
      peakHp: Math.round(p.peakHp * 10) / 10,
      peakTorque: Math.round(p.peakTorque * 10) / 10,
      peakRpm: Math.round(p.peakRpm),
      peakSpeedKph: Math.round(p.peakSpeedKph * 10) / 10,
      gear: this.gearLabel,
      samples: [...this.pullSamples],
      dynoLoad: this.dynoLoad,
    };
  }

  private torqueAt(rpm: number) {
    const curve = this.vehicle.engine.torqueCurve;
    if (rpm <= curve[0].rpm) return curve[0].nm;
    for (let i = 1; i < curve.length; i++) {
      if (rpm <= curve[i].rpm) {
        const a = curve[i - 1];
        const b = curve[i];
        const t = (rpm - a.rpm) / (b.rpm - a.rpm);
        return a.nm + (b.nm - a.nm) * smooth(t);
      }
    }
    const last = curve[curve.length - 1];
    const prev = curve[curve.length - 2];
    const fall = (rpm - last.rpm) / 500;
    return Math.max(last.nm * (1 - fall * 0.35), prev.nm * 0.35);
  }

  setInputs(inputs: Partial<SimInputs>) {
    if (inputs.throttle !== undefined) this.throttleTarget = clamp(inputs.throttle, 0, 1);
    if (inputs.brake !== undefined) this.brake = clamp(inputs.brake, 0, 1);
    if (inputs.clutch !== undefined) this.clutchPedal = clamp(inputs.clutch, 0, 1);
    if (inputs.steer !== undefined) this.steer = clamp(inputs.steer, -1, 1);
  }

  tick(dt: number) {
    dt = clamp(dt, 0.0005, 0.05);
    const v = this.vehicle;
    const eng = v.engine;
    const gearbox = v.gearbox;
    const r = this.wheelRadius;
    rateLimitThrottle(this, dt);
    if (this.engineOn) this.runSeconds += dt;

    // Clutch actuator / assistant
    if (this.autoClutchTimer > 0) this.autoClutchTimer = Math.max(0, this.autoClutchTimer - dt);
    let clutchTarget = this.clutchPedal;
    if (this.clutchMode === "assisted") clutchTarget = Math.max(clutchTarget, this.autoClutchTimer > 0 ? 1 : 0);
    if (this.clutchMode === "auto") clutchTarget = 0;
    const clutchRate = this.clutchMode === "auto" ? 3 : 4.2;
    this.clutchActual += clamp(clutchTarget - this.clutchActual, -clutchRate * dt, clutchRate * dt);
    this.clutchActual = clamp(this.clutchActual, 0, 1);

    // Startup sequence
    if (this.starting) {
      this.startTimer += dt;
      const crank = eng.crankingRpm;
      this.rpm = crank * (0.78 + Math.sin(this.startTimer * 23) * 0.08);
      this.engineOn = false;
      if (this.startTimer > 0.92) {
        this.starting = false;
        this.engineOn = true;
        this.rpm = eng.idleRpm * 1.42;
        this.coolantC = Math.max(this.coolantC, 32);
        this.emit("ignition");
      }
    }

    // Air charge
    const turbo = !!eng.boostBar;
    let boostTarget = 0;
    if (turbo && this.engineOn) {
      boostTarget = (eng.boostBar ?? 0) * smooth((this.rpm - 900) / 1900) * (0.35 + this.throttle * 0.65);
    }
    const spoolTau = eng.aspiration === "Twin-Turbo" ? 0.18 : eng.fuel === "Diesel" ? 0.34 : 0.26;
    this.boost += (boostTarget - this.boost) * Math.min(1, dt / spoolTau);
    if (this.boost < 0) this.boost = 0;
    if (this.throttle > 0.55) this.boostWasHigh = true;
    if (this.boostWasHigh && this.throttle < 0.12) {
      this.boostWasHigh = false;
      if (turbo) this.emit("bov");
    }

    let grossTorque = 0;
    const friction =
      eng.frictionTorque * (0.55 + 0.7 * (this.rpm / eng.redline)) + (this.throttle < 0.05 ? 0 : 2);

    if (this.fuelCutTimer > 0) this.fuelCutTimer -= dt;

    if (this.engineOn) {
      const boostFactor = turbo
        ? 0.58 + 0.42 * clamp(this.boost / Math.max(eng.boostBar ?? 1, 0.1), 0, 1.1)
        : 1;
      grossTorque = this.torqueAt(this.rpm) * this.throttle * boostFactor;
      if (this.throttle < 0.07) {
        const idleWindow = this.rpm < eng.idleRpm + 420;
        const error = eng.idleRpm - this.rpm;
        this.idleIntegral = clamp(this.idleIntegral + error * dt * 2.4, -5, 26);
        const gov = clamp(error * 0.32 + this.idleIntegral, -22, 90);
        grossTorque += friction + (idleWindow ? gov : Math.min(0, gov));
        // Closed-throttle pumping / engine-braking term grows with speed.
        grossTorque -= eng.frictionTorque * 0.55 * clamp(this.rpm / eng.redline, 0, 1.2);
      } else {
        this.idleIntegral *= Math.max(0, 1 - dt * 6);
      }
      // Assisted / bypass modes provide a low-speed anti-stall torque reserve.
      // Manual mode gets no such aid and can stall like a real car.
      if (this.clutchMode !== "manual" && this.gear !== 0 && this.rpm < eng.idleRpm * 1.5) {
        const reserve = this.vehicle.engine.torqueCurve.reduce((max, point) => Math.max(max, point.nm), 0) * 0.34;
        grossTorque += reserve * smooth((eng.idleRpm * 1.55 - this.rpm) / (eng.idleRpm * 0.75));
      }
      // Rev limiter: fuel cut with hysteresis
      if (this.rpm >= eng.limiter && this.fuelCutTimer <= 0 && this.fuelCutTimer > -999) {
        this.fuelCutTimer = 0.09;
        this.limiterActive = true;
        this.emit("limiter");
      }
      if (this.fuelCutTimer > 0) {
        grossTorque = 0;
      } else if (this.rpm < eng.limiter - 220) {
        this.limiterActive = false;
      }
    }

    const clutchOpen = this.gear === 0 || this.clutchActual > 0.97;
    // Progressive clamp curve: pedal travel 0–18% is free play, force builds
    // through the bite point and fully clamps near the top of the travel.
    const clampForce = smooth(((1 - this.clutchActual) - 0.14) / 0.78);
    // Friction fade: sustained slip heats the friction disc and reduces capacity.
    const fade = 1 - clamp(this.clutchHeat / 140, 0, 0.38);
    const ratio = this.totalRatio();
    let clutchTorque = 0;

    if (!clutchOpen && ratio !== 0 && this.engineOn) {
      const wheelRpm = Math.abs((this.wheelOmega * ratio * 60) / (2 * Math.PI));
      const delta = this.rpm - wheelRpm;
      let capacity = gearbox.clutchCapacityNm * clampForce * fade;
      // Anti-stall bite limiting: never ask the engine for more than it can hold
      // against the clutch below its assisted idle floor.
      if (this.clutchMode !== "manual" && this.rpm < eng.idleRpm * 1.55) {
        const holdable = Math.max(28, grossTorque - friction + 12);
        capacity = Math.min(capacity, holdable);
      }
      clutchTorque = Math.sign(delta) * Math.min(capacity, Math.abs(delta) * 1.4 + 18);
      // Slip energy is torque through the speed difference; heat rises and cools.
      const slipEnergy = Math.abs(clutchTorque * delta) / 1000;
      this.clutchHeat = clamp(this.clutchHeat + slipEnergy * dt * 0.9 - dt * 0.55, 0, 160);
      if (Math.abs(delta) < 6 && clampForce > 0.85) clutchTorque = 0;
      this.clutchSlipRpm = Math.abs(delta);
    } else {
      this.clutchSlipRpm = 0;
    }

    const locked =
      !clutchOpen && this.engineOn && clampForce > 0.9 && this.clutchSlipRpm < 90 && ratio !== 0;

    const resistForceAtWheel =
      sign(this.wheelOmega) * (v.chassis.weightKg * 9.81 * 0.014 + 0.5 * 1.2 * 2.2 * (v.chassis.widthMm / 1000) * Math.pow(this.wheelOmega * r, 2)) +
      sign(this.wheelOmega) * this.dynoLoad * 7.2 +
      sign(this.wheelOmega) * this.brake * 14500;
    const resistTorque = resistForceAtWheel * r;

    if (locked) {
      const driveTorque = (grossTorque - friction) * ratio * gearbox.efficiency;
      const engineInertiaAtWheel = eng.flywheelInertia * ratio * ratio * gearbox.efficiency;
      const rollerEquivalentKg = 900;
      const inertia =
        engineInertiaAtWheel +
        (v.chassis.weightKg + rollerEquivalentKg) * r * r +
        9 +
        (gearbox.drivetrain === "4WD" ? 4 : 0);
      let alpha = (driveTorque - resistTorque) / inertia;
      if (Math.abs(this.wheelOmega) < 0.5 && this.brake > 0.05) alpha = 0;
      this.wheelOmega += alpha * dt;
      if (this.brake > 0.02 && sign(this.wheelOmega) !== sign(this.wheelOmega - alpha * dt)) {
        this.wheelOmega = 0;
      }
      let newRpm = Math.abs((this.wheelOmega * ratio * 60) / (2 * Math.PI));
      this.rpm = clamp(newRpm, 0, eng.limiter + 120);
      if (this.rpm < eng.idleRpm * 0.52 && Math.abs(this.wheelOmega) * r * 3.6 < 8) {
        this.stallTimer += dt;
        if (this.stallTimer > 0.65) this.stall();
      } else {
        this.stallTimer = 0;
      }
    } else {
      // Engine free / slipping
      const netEngineTorque = grossTorque - friction - clutchTorque;
      if (this.engineOn) {
        const rpmPerSec = (netEngineTorque / eng.flywheelInertia) * (60 / (2 * Math.PI));
        this.rpm += rpmPerSec * dt;
        this.rpm = clamp(this.rpm, 0, eng.limiter + 220);
        if (this.rpm >= eng.limiter && this.fuelCutTimer <= 0) {
          this.fuelCutTimer = 0.09;
          this.limiterActive = true;
          this.emit("limiter");
        }
      } else {
        this.rpm = Math.max(0, this.rpm - (26 / eng.flywheelInertia) * dt * 9.55);
        this.limiterActive = false;
      }

      const drivenTorque = clutchTorque * ratio * gearbox.efficiency;
      const wheelInertia = (v.chassis.weightKg + 1250) * r * r + 9;
      if (!clutchOpen) {
        this.wheelOmega += ((drivenTorque - resistTorque) / wheelInertia) * dt;
      } else {
        this.wheelOmega += (-resistTorque / wheelInertia) * dt;
      }
      if (this.brake > 0.03 && Math.abs(this.wheelOmega) < 0.25) this.wheelOmega = 0;
      if (this.wheelOmega * this.brake > 0) {
        // brake opposes motion, handled by resist sign
      }
      this.stallTimer = 0;
      if (!this.engineOn) this.clutchSlipRpm = 0;
    }

    // Speed limit reverse & sanity
    // Gearbox input-shaft speed (signed by the selected ratio) for instruments.
    this.inputShaftRpm = ratio !== 0 ? (this.wheelOmega * ratio * 60) / (2 * Math.PI) : 0;
    if (this.gear === -1 && Math.abs(this.wheelOmega) * r * 3.6 > 9 && this.throttle > 0.2) {
      this.wheelOmega *= 0.995;
    }
    let speedMs = this.wheelOmega * r;
    if (this.gear === -1 && speedMs < -11) {
      this.wheelOmega = -11 / r;
      speedMs = -11;
    }
    if (this.gear >= 0 && speedMs < 0) this.wheelOmega *= 0.98;
    if (Math.abs(speedMs) < 0.02 && this.throttle < 0.02) this.wheelOmega = 0;

    // Temperatures & ancillaries
    const targetCoolant = this.engineOn ? 88 + this.throttle * 4 : this.coolantC - (this.coolantC - 26) * dt * 0.02;
    this.coolantC += (targetCoolant - this.coolantC) * Math.min(1, dt / 22);
    const targetOil = this.engineOn ? 93 + this.throttle * 9 + (this.rpm / eng.limiter) * 5 : this.oilC - (this.oilC - 24) * dt * 0.02;
    this.oilC += (targetOil - this.oilC) * Math.min(1, dt / 30);
    this.oilBar = this.engineOn ? 1.1 + (this.rpm / eng.redline) * 4.1 : 0;
    this.batteryV = this.engineOn ? 14.1 : this.starting ? 11.8 : 12.4;
    if (this.engineOn) this.fuelPct = Math.max(0, this.fuelPct - dt * (0.0007 + this.throttle * 0.0028));
    this.cel = this.stalled;

    // Torque + power model (wheel values measured/derived from roller state)
    const wheelAngular = Math.abs(this.wheelOmega);
    const transmittedCrankTorque = locked
      ? grossTorque - friction
      : Math.abs(clutchTorque) * (this.engineOn ? 1 : 0);
    this.wheelTorque = transmittedCrankTorque * ratio * gearbox.efficiency * 0.92;
    this.wheelPowerHp = (Math.max(0, this.wheelTorque) * wheelAngular) / 745.7;
    this.enginePowerKw = (Math.abs(grossTorque) * this.rpm) / 9549;
    this.enginePowerHp = Math.max(0, this.enginePowerKw) * 1.34102;
    this.crankPowerHp = (this.wheelPowerHp / Math.max(gearbox.efficiency * 0.94, 0.6)) * (gearbox.drivetrain === "4WD" ? 0.92 : 1);
    this.engineTorque = grossTorque - friction;

    // Save live pull
    if (this.pulling) {
      const now = performance.now();
      this.sampleClock += dt;
      if (this.engineOn) {
        this.pull.peakHp = Math.max(this.pull.peakHp, this.crankPowerHp);
        this.pull.peakTorque = Math.max(this.pull.peakTorque, Math.abs(this.wheelTorque));
        this.pull.peakRpm = Math.max(this.pull.peakRpm, this.rpm);
        this.pull.peakSpeedKph = Math.max(this.pull.peakSpeedKph, Math.abs(this.wheelOmega) * r * 3.6);
      }
      const sampleDue = this.rpm - this.lastSampleRpm > 110 || this.sampleClock > 0.26;
      if (sampleDue && this.rpm > 900 && this.engineOn) {
        const hp = Math.max(0, this.crankPowerHp);
        const wt = Math.max(0, this.wheelTorque);
        this.pullSamples.push({
          rpm: Math.round(this.rpm),
          crankHp: Math.round(hp * 10) / 10,
          wheelHp: Math.round(Math.max(0, this.wheelPowerHp) * 10) / 10,
          torqueNm: Math.round(wt),
        });
        if (this.pullSamples.length > 140) this.pullSamples.shift();
        this.lastSampleRpm = this.rpm;
        this.lastSampleTime = now;
        this.sampleClock = 0;
        this.pull.peakHp = Math.max(this.pull.peakHp, hp);
        this.pull.peakTorque = Math.max(this.pull.peakTorque, wt);
        this.pull.peakRpm = Math.max(this.pull.peakRpm, this.rpm);
        this.pull.peakSpeedKph = Math.max(this.pull.peakSpeedKph, Math.abs(this.wheelOmega) * r * 3.6);
      }
    }
    this.odometerKm += (Math.abs(this.wheelOmega) * r * dt) / 1000;
  }

  private stall() {
    this.engineOn = false;
    this.stalled = true;
    this.stallTimer = 0;
    this.rpm = Math.min(this.rpm, this.vehicle.engine.idleRpm * 0.7);
    this.emit("stall");
  }

  snapshot(): SimSnapshot {
    const eng = this.vehicle.engine;
    const wheelAngular = Math.abs(this.wheelOmega);
    const speedKph = wheelAngular * this.wheelRadius * 3.6;
    const wheelRpm = (wheelAngular * 60) / (2 * Math.PI);
    return {
      vehicleId: this.vehicle.id,
      engineOn: this.engineOn,
      starting: this.starting,
      stalled: this.stalled,
      rpm: this.rpm,
      idleRpm: eng.idleRpm,
      redline: eng.redline,
      limiterRpm: eng.limiter,
      speedKph,
      rollerRpm: wheelRpm,
      gear: this.gear,
      gearLabel: this.gearLabel,
      clutch: this.clutchActual,
      clutchEngaged: this.clutchActual < 0.35,
      throttle: this.throttle,
      brake: this.brake,
      steer: this.steer,
      boostBar: this.boost,
      boostMax: eng.boostBar ?? 0,
      coolantC: this.coolantC,
      oilC: this.oilC,
      oilBar: this.oilBar,
      fuelPct: this.fuelPct,
      batteryV: this.batteryV,
      cel: this.cel,
      limiterActive: this.limiterActive,
      clutchSlipRpm: this.clutchSlipRpm,
      engineTorqueNm: this.engineTorque,
      wheelTorqueNm: Math.abs(this.wheelTorque),
      wheelPowerHp: Math.max(0, this.wheelPowerHp),
      crankPowerHp: Math.max(0, this.crankPowerHp),
      crankPowerKw: Math.max(0, this.crankPowerHp) * 0.7457,
      pulling: this.pulling,
      pullSamples: this.pullSamples,
      pull: this.pull,
      dynoLoadPct: this.dynoLoad,
      gearboxInputRpm: Math.abs(this.inputShaftRpm),
      clutchHeatPct: Math.min(100, this.clutchHeat),
      resistForceN: this.dynoLoad * 7.2,
      ambientC: 21.5,
      odometerKm: this.odometerKm,
      runSeconds: this.runSeconds,
    };
  }
}

function rateLimitThrottle(sim: DynoSimulation, dt: number) {
  const rate = sim.throttleTarget > sim.throttle ? 7.5 : 10.5;
  sim.throttle += clamp(sim.throttleTarget - sim.throttle, -rate * dt, rate * dt);
}
