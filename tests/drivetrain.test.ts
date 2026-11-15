import { strict as assert } from 'node:assert';
import { DynoSimulation, type ClutchMode } from '../src/lib/physics';
import { VEHICLES, tyreRadiusM } from '../src/lib/vehicles';
import { DEFAULT_CUSTOM, GOD_CAR, customVehicle } from '../src/lib/customVehicle';
import { ROLLER_RADIUS_M } from '../src/lib/dynoGeometry';
import { roadLoadN } from '../src/lib/roadLoad';
import { auditVehicle, theoreticalGearSpeedKph } from '../src/lib/vehicleValidation';
const dt=1/120;
const vehicles=[...VEHICLES,customVehicle({id:'custom-test',spec:DEFAULT_CUSTOM}),customVehicle({id:'custom-god',spec:GOD_CAR})];
for (const v of vehicles) {
  const audit=auditVehicle(v); assert.deepEqual(audit.errors,[],`${v.id}: ${audit.errors.join('; ')}`);
  for (const mode of ['manual','assisted','auto'] as ClutchMode[]) for (let gear=1; gear<=v.gearbox.speeds;gear++) {
    const sim=new DynoSimulation(v); sim.setClutchMode(mode); sim.engineOn=true; sim.gear=gear;
    const rpm=Math.min(3000,v.engine.redline*0.7), ratio=v.gearbox.ratios[gear-1]*v.gearbox.finalDrive;
    sim.rpm=rpm; sim.wheelOmega=rpm*(2*Math.PI/60)/ratio; sim.throttle=0.35; sim.throttleTarget=0.35; sim.dynoLoad=20;
    for(let i=0;i<60;i++) sim.tick(dt);
    const s=sim.snapshot(); const expected=s.wheelRpm*ratio;
    assert(Math.abs(s.rpm-expected)<2,`${v.id} ${mode} gear ${gear}: slip ${s.rpm-expected}`);
    assert(Math.abs(s.speedKph-theoreticalGearSpeedKph(v,gear,s.gearboxInputRpm))<1e-7,`${v.id} speed / input`);
    assert(Math.abs(s.speedKph/3.6-s.wheelRpm*2*Math.PI/60*tyreRadiusM(v))<1e-8);
    assert(Math.abs(s.speedKph/3.6-s.rollerRpm*2*Math.PI/60*ROLLER_RADIUS_M)<1e-8);
  }
  // One-step wheel angular acceleration is explained by delivered torque and road/dyno load.
  const sim=new DynoSimulation(v);sim.engineOn=true;sim.gear=2;sim.rpm=2500;
  const r=tyreRadiusM(v),ratio=v.gearbox.ratios[1]*v.gearbox.finalDrive;
  sim.wheelOmega=sim.rpm*2*Math.PI/60/ratio;sim.throttle=0.4;sim.throttleTarget=0.4;sim.dynoLoad=35;
  const old=sim.wheelOmega, inertia=(v.chassis.weightKg+1250)*r*r+9+(v.gearbox.drivetrain==='4WD'?4:0);
  const resistance=roadLoadN(v.chassis.weightKg,v.chassis.widthMm,v.chassis.heightMm,old*r)+35*7.2;
  sim.tick(dt);
  assert(Math.abs((sim.wheelOmega-old)*inertia/dt-(sim.clutchTorque*ratio*v.gearbox.efficiency-resistance*r))<1e-6,`${v.id} torque balance`);
  if (sim.wheelPowerHp > 0) assert(Math.abs(sim.crankPowerHp* v.gearbox.efficiency-sim.wheelPowerHp)<1e-8,`${v.id} power estimate`);
  // With the clutch held open, roller deceleration is directly affected by load.
  const coast = (load: number) => { const c=new DynoSimulation(v);c.engineOn=true;c.gear=2;c.rpm=2500;c.wheelOmega=old;c.clutchActual=1;c.clutchPedal=1;c.dynoLoad=load;c.tick(dt);return c.wheelOmega; };
  assert(coast(100)<coast(0),`${v.id} dyno resistance`);
  console.log(`${v.id}: ${v.gearbox.speeds} gears × 3 modes, torque balance passed; ${audit.warnings.length} review flags`);
}
// Clutch open means independent crank speed, with slip observable instead of hidden.
{
 const s=new DynoSimulation(VEHICLES[0]);s.engineOn=true;s.gear=1;s.rpm=2500;s.clutchActual=1;s.clutchPedal=1;s.tick(dt);
 assert(s.clutchSlipRpm>2000);assert.equal(s.wheelOmega,0);assert.equal(s.clutchTorque,0);
}

// Held throttle must remain interrupted during an assisted upshift until the
// actuator reconnects. This prevents free-revving with an open clutch.
for (const v of vehicles) for (const mode of ['assisted','auto'] as const) {
  const sim=new DynoSimulation(v);sim.setClutchMode(mode);sim.engineOn=true;sim.gear=1;
  const ratio=v.gearbox.ratios[0]*v.gearbox.finalDrive;
  sim.rpm=Math.min(3500,v.engine.redline*0.8);sim.wheelOmega=sim.rpm*2*Math.PI/60/ratio;
  sim.throttle=0.8;sim.throttleTarget=0.8;sim.selectGear(2);
  for(let i=0;i<180;i++) {
    sim.tick(dt);
    if(sim.shiftInProgress) assert.equal(sim.effectiveThrottle,0,`${v.id} ${mode}: upshift throttle cut`);
  }
  assert(!sim.shiftInProgress && sim.effectiveThrottle>0.7,`${v.id} ${mode}: shift completion`);
  assert(sim.clutchSlipRpm<2,`${v.id} ${mode}: reconnected clutch`);
}
console.log('Held-throttle assisted upshift cut and reconnection passed across fleet.');

// Changing to manual during an assisted shift must not leave the throttle cut stuck.
{
 const s=new DynoSimulation(VEHICLES[0]);s.engineOn=true;s.gear=1;s.selectGear(2);s.setClutchMode('manual');
 assert(!s.shiftInProgress && s.autoClutchTimer===0);
}
