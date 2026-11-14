import { VEHICLES, type Vehicle, type SoundCharacter } from './vehicles';

/** User-entered targets define an estimated curve, not a manufacturer dyno result. */
export interface CustomSpec {
  name: string; fuel: 'Petrol' | 'Diesel'; cylinders: number; layout: 'Inline' | 'V' | 'Flat';
  displacementCc: number; turbo: boolean; powerHp: number; torqueNm: number;
  idleRpm: number; redline: number; limiter: number; flywheelInertia: number;
  ratios: number[]; reverse: number; finalDrive: number; clutchCapacityNm: number;
  drivetrain: 'FWD' | 'RWD' | '4WD'; weightKg: number; tyre: string; targetTopSpeed: number;
}
export interface CustomBuild { id: string; spec: CustomSpec }
export const DEFAULT_CUSTOM: CustomSpec = {
  name: 'My build', fuel: 'Petrol', cylinders: 4, layout: 'Inline', displacementCc: 2000,
  turbo: false, powerHp: 200, torqueNm: 240, idleRpm: 800, redline: 7000, limiter: 7200,
  flywheelInertia: 0.2, ratios: [3.6, 2.1, 1.45, 1.1, 0.9, 0.75], reverse: 3.5,
  finalDrive: 4.1, clutchCapacityNm: 350, drivetrain: 'FWD', weightKg: 1400,
  tyre: '225/45R18', targetTopSpeed: 240,
};

export function validateCustom(s: CustomSpec): string[] {
  const errors: string[] = [];
  const range = (name: string, value: number, min: number, max: number) => {
    if (!Number.isFinite(value) || value < min || value > max) errors.push(`${name} must be ${min}–${max}.`);
  };
  if (!s.name.trim()) errors.push('Enter a build name.');
  if (!['Petrol', 'Diesel'].includes(s.fuel) || !['Inline', 'V', 'Flat'].includes(s.layout) || !['FWD', 'RWD', '4WD'].includes(s.drivetrain)) errors.push('Invalid engine or drivetrain selection.');
  range('Cylinders', s.cylinders, 2, 12); if (!Number.isInteger(s.cylinders)) errors.push('Cylinder count must be a whole number.');
  range('Displacement', s.displacementCc, 300, 10000); range('Power', s.powerHp, 20, 1500);
  range('Torque', s.torqueNm, 30, 2000); range('Idle', s.idleRpm, 500, 1800);
  range('Redline', s.redline, 2500, 11000); range('Limiter', s.limiter, 2600, 11500);
  if (s.redline <= s.idleRpm + 1000 || s.limiter < s.redline) errors.push('Redline must exceed idle by 1000 rpm, and limiter must be at or above redline.');
  range('Flywheel inertia', s.flywheelInertia, 0.05, 1); range('Mass', s.weightKg, 400, 5000);
  range('Reverse ratio', s.reverse, 0.3, 8); range('Final drive', s.finalDrive, 1, 8);
  range('Clutch capacity', s.clutchCapacityNm, 50, 3000); range('Target top speed', s.targetTopSpeed, 50, 500);
  if (!Array.isArray(s.ratios) || s.ratios.length < 1 || s.ratios.length > 8 || s.ratios.some(r => !Number.isFinite(r) || r < 0.2 || r > 8)) errors.push('Enter 1–8 forward ratios between 0.2 and 8.');
  else if (s.ratios.some((r, i) => i > 0 && r >= s.ratios[i - 1])) errors.push('Forward ratios must decrease from first gear.');
  const match = /^(\d{3})\/(\d{2})R(\d{2})$/i.exec(s.tyre.trim());
  if (!match || +match[1] < 100 || +match[1] > 400 || +match[2] < 20 || +match[2] > 90 || +match[3] < 12 || +match[3] > 24) errors.push('Tyre must be in the format 225/45R18, with realistic dimensions.');
  const powerTorque = s.powerHp * 745.7 / (s.redline * 0.9 * Math.PI / 30);
  if (powerTorque > s.torqueNm * 1.05) errors.push('Power target requires more torque at peak-power RPM than your peak torque target. Reduce power or raise torque/redline.');
  return errors;
}

export function customVehicle(build: CustomBuild): Vehicle {
  const s = build.spec;
  const base = VEHICLES[0];
  const peakRpm = Math.round(s.redline * 0.9);
  const powerTorque = s.powerHp * 745.7 / (peakRpm * Math.PI / 30);
  const torquePeakRpm = Math.round(s.idleRpm + (peakRpm - s.idleRpm) * (s.turbo ? 0.4 : 0.65));
  let character: SoundCharacter = s.fuel === 'Diesel' ? 'turbo-diesel-i4' : s.layout === 'Flat' && s.cylinders === 6 ? 'turbo-flat6' : s.layout === 'V' && s.cylinders >= 8 ? 'na-petrol-v8' : s.layout === 'V' && s.cylinders === 6 ? 'na-petrol-v6' : s.layout === 'Inline' && s.cylinders === 6 ? 'na-petrol-i6' : s.turbo ? 'turbo-petrol-i4' : 'na-petrol-i4';
  return {
    ...base, id: build.id, make: 'Custom', model: s.name.trim(), variant: 'User build', year: new Date().getFullYear(), generation: 'Estimated configuration',
    tags: ['Custom', s.turbo ? 'Turbocharged' : 'Naturally aspirated'],
    engine: { ...base.engine, code: 'CUSTOM', displacementCc: s.displacementCc, cylinders: s.cylinders, layout: `${s.layout}-${s.cylinders}`, fuel: s.fuel,
      induction: s.turbo ? 'Turbocharged' : 'Naturally aspirated', aspiration: s.fuel === 'Diesel' && s.turbo ? 'Turbo Diesel' : s.turbo ? 'Turbo' : 'NA',
      powerHp: s.powerHp, powerRpm: peakRpm, torqueNm: s.torqueNm, torqueRpm: `~${torquePeakRpm} rpm`, idleRpm: s.idleRpm, redline: s.redline, limiter: s.limiter,
      flywheelInertia: s.flywheelInertia, frictionTorque: Math.max(10, s.displacementCc / 100), boostBar: s.turbo ? 1 : undefined,
      torqueCurve: [{rpm:s.idleRpm,nm:s.torqueNm*0.55},{rpm:torquePeakRpm,nm:s.torqueNm},{rpm:peakRpm,nm:powerTorque},{rpm:s.limiter + 1,nm:powerTorque*0.8}],
    },
    gearbox: { ...base.gearbox, type: `${s.ratios.length}-speed custom manual`, speeds: s.ratios.length, ratios: [...s.ratios], reverse: s.reverse, finalDrive: s.finalDrive, drivetrain: s.drivetrain, clutchCapacityNm: s.clutchCapacityNm, efficiency: s.drivetrain === '4WD' ? 0.85 : 0.9 },
    chassis: { ...base.chassis, weightKg: s.weightKg, tyre: s.tyre.toUpperCase(), wheelDiameterIn: Number(s.tyre.match(/R(\d{2})$/i)?.[1] || 18) },
    dyno: { peakPowerHp:s.powerHp, measuredWheelHp:s.powerHp*(s.drivetrain === '4WD' ? 0.85 : 0.9), driveLoss:s.drivetrain === '4WD' ? 0.15 : 0.1, note: `Estimated; ${s.targetTopSpeed} km/h target is not a speed cap.` },
    sound: { ...base.sound, character, label: 'Approximate engine-family audio', description: 'Uses the nearest available recorded family, not a recording of this build.', turbo:s.turbo, diesel:s.fuel === 'Diesel', firingNote:`${s.cylinders} cylinders`, layers:['Approximate recorded engine'] },
    verified: [], estimated: ['All custom specifications, curve shape, losses and acoustic profile'], sources: [], notes: 'User-defined simulation, not a verified real vehicle. Top-speed target does not override physics.',
  };
}
