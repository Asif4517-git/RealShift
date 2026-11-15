import { tyreRadiusM, type Vehicle } from './vehicles';

/** Ideal no-slip speed in a gear, not an acceleration or top-speed prediction. */
export function theoreticalGearSpeedKph(vehicle: Vehicle, gear: number, engineRpm: number): number {
  const ratio = vehicle.gearbox.ratios[gear - 1];
  if (!Number.isFinite(ratio) || ratio <= 0 || vehicle.gearbox.finalDrive <= 0 || !Number.isFinite(engineRpm) || engineRpm < 0) return NaN;
  return engineRpm / (ratio * vehicle.gearbox.finalDrive * (vehicle.gearbox.primaryReduction ?? 1)) * 2 * Math.PI * tyreRadiusM(vehicle) * 60 / 1000;
}

export interface VehicleAudit { errors: string[]; warnings: string[]; speeds: {gear:number; at1000:number; at4000:number; atRedline:number}[] }
/** Flags structural errors and suspicious values. A plausible ratio is not proof
 * of an independently verified manufacturer's specification. */
export function auditVehicle(v: Vehicle): VehicleAudit {
  const errors: string[] = [], warnings: string[] = [];
  const {engine:e, gearbox:g} = v;
  if (!Number.isInteger(g.speeds) || g.speeds < 1 || g.speeds > 12 || g.ratios.length !== g.speeds) errors.push('Gear count does not match ratios.');
  if (g.ratios.some((r,i) => !Number.isFinite(r) || r <= 0 || (i > 0 && r >= g.ratios[i-1]))) errors.push('Forward ratios must be finite, positive and decreasing.');
  if (!Number.isFinite(g.finalDrive) || g.finalDrive <= 0 || !Number.isFinite(g.reverse) || g.reverse <= 0) errors.push('Invalid final drive or reverse ratio.');
  if (g.primaryReduction !== undefined && (!Number.isFinite(g.primaryReduction) || g.primaryReduction <= 0)) errors.push('Invalid primary reduction.');
  if (g.finalDrive < 2 || g.finalDrive > 6) warnings.push('Final drive outside typical road-car range; review.');
  if (!/\d{3}\/\d{2}R\d{2}/i.test(v.chassis.tyre)) errors.push('Missing or malformed tyre dimensions.');
  if (!Number.isFinite(e.flywheelInertia) || e.flywheelInertia <= 0 || !Number.isFinite(g.clutchCapacityNm) || g.clutchCapacityNm <= 0) errors.push('Invalid engine inertia or clutch capacity.');
  if (!(e.idleRpm > 0 && e.redline > e.idleRpm && e.limiter >= e.redline)) errors.push('Invalid engine RPM limits.');
  if (e.torqueCurve.length < 2 || e.torqueCurve.some((p,i) => !Number.isFinite(p.rpm) || !Number.isFinite(p.nm) || p.nm < 0 || (i>0 && p.rpm <= e.torqueCurve[i-1].rpm))) errors.push('Invalid or unordered torque curve.');
  if (!(g.efficiency > 0 && g.efficiency <= 1) || !(v.chassis.weightKg > 0)) errors.push('Invalid efficiency or mass.');
  if (g.clutchCapacityNm < e.torqueNm) warnings.push('Clutch capacity is lower than rated peak torque; sustained slip is possible.');
  if (v.estimated.some(s => /ratio|final.drive/i.test(s))) warnings.push('Ratios or final drive are estimates; independent verification is required.');
  const speeds = g.ratios.map((_,i)=>({gear:i+1,at1000:theoreticalGearSpeedKph(v,i+1,1000),at4000:theoreticalGearSpeedKph(v,i+1,4000),atRedline:theoreticalGearSpeedKph(v,i+1,e.redline)}));
  if (speeds.some(s => !Number.isFinite(s.at1000) || s.atRedline > 500)) warnings.push('Theoretical gearing requires review; values are not achievable-speed predictions.');
  return {errors,warnings,speeds};
}
