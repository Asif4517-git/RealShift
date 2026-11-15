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
    const rpm=Math.min(3000,v.engine.redline*0.7), ratio=v.gearbox.ratios[gear-1]*v.gearbox.finalDrive*(v.gearbox.primaryReduction??1);
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
  const r=tyreRadiusM(v),ratio=v.gearbox.ratios[1]*v.gearbox.finalDrive*(v.gearbox.primaryReduction??1);
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
  const ratio=v.gearbox.ratios[0]*v.gearbox.finalDrive*(v.gearbox.primaryReduction??1);
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

for (const v of vehicles) for (const mode of ['manual','assisted','auto'] as const) {
  // Closed-throttle clutch transmits engine braking into the rolling wheels.
  const coast = new DynoSimulation(v); coast.setClutchMode(mode); coast.engineOn = true;
  coast.gear = 2; coast.rpm = Math.min(3500, v.engine.redline * 0.8);
  coast.wheelOmega = coast.rpm * 2 * Math.PI / 60 / (v.gearbox.ratios[1] * v.gearbox.finalDrive);
  coast.dynoLoad=0; coast.tick(dt);
  assert(coast.clutchTorque < 0 && coast.wheelTorque < 0, `${v.id} ${mode}: engine braking`);
  const ratio=v.gearbox.ratios[1]*v.gearbox.finalDrive*(v.gearbox.primaryReduction??1);
  assert(Math.abs(coast.wheelTorque - coast.clutchTorque * ratio / v.gearbox.efficiency)<1e-7, `${v.id} ${mode}: overrun loss`);
  // Reverse accelerates in the opposite direction without a fixed speed cap.
  const reverse = new DynoSimulation(v); reverse.setClutchMode(mode); reverse.engineOn=true;
  reverse.gear=-1; reverse.rpm=v.engine.idleRpm;
  if (mode === 'manual') { reverse.clutchActual=1; reverse.clutchPedal=1; }
  reverse.setInputs({throttle:0.7});
  for(let i=0;i<120;i++) reverse.tick(dt);
  reverse.setInputs({clutch:0});
  for(let i=0;i<600;i++) reverse.tick(dt);
  assert(reverse.wheelOmega < 0, `${v.id} ${mode}: reverse launch`);
  assert(reverse.snapshot().wheelPowerHp>=0, `${v.id} ${mode}: reverse power`);
  // A direction-changing engagement at speed is rejected in either direction.
  reverse.clutchActual=1;
  reverse.selectGear(1);
  assert.equal(reverse.gear,-1,`${v.id} ${mode}: forward selected while reversing`);
  const forward=new DynoSimulation(v);forward.setClutchMode(mode);forward.gear=1;
  forward.wheelOmega=10;forward.clutchActual=1;forward.selectGear(-1);
  assert.equal(forward.gear,1,`${v.id} ${mode}: reverse selected while moving forward`);
}
console.log('Engine braking, reverse launch and direction-change safety passed across fleet.');

// A fuel limiter cannot clamp a mechanically driven crank below its actual RPM.
{
 const v=VEHICLES[0], s=new DynoSimulation(v); s.setClutchMode('manual');s.engineOn=true;
 s.gear=1;s.rpm=v.engine.limiter+500;s.wheelOmega=s.rpm*2*Math.PI/60/(v.gearbox.ratios[0]*v.gearbox.finalDrive);
 s.tick(dt);assert(s.rpm>v.engine.limiter+220,'mechanical over-rev must not be hidden');
}

// At a settled full-load torque-curve anchor, net crank output must equal
// the published/modelled net anchor; friction and boost must not be deducted twice.
for (const v of vehicles) {
  const anchor=v.engine.torqueCurve.find(p=>p.rpm>=Math.max(v.engine.idleRpm*1.6,1200) && p.rpm<v.engine.limiter-250)!;
  assert(anchor,`${v.id}: usable torque anchor`);
  const s=new DynoSimulation(v);s.engineOn=true;s.gear=0;s.rpm=anchor.rpm;
  s.throttle=1;s.throttleTarget=1;
  if(v.engine.boostBar) s.boost=v.engine.boostBar * Math.max(0,Math.min(1,(anchor.rpm-900)/1900)) ** 2 * (3-2*Math.max(0,Math.min(1,(anchor.rpm-900)/1900)));
  s.tick(dt);
  assert(Math.abs(s.engineTorque-anchor.nm)<1e-8,`${v.id}: full-load curve anchor ${s.engineTorque} vs ${anchor.nm}`);
}
console.log('Full-load curve anchors are net crank torque across fleet.');

// The net crank curve should match the rated power at the manufacturer's
// rated RPM, within 5%; this does not certify the rest of an estimated curve.
for (const v of VEHICLES) {
  assert(!auditVehicle(v).warnings.some(w=>w.includes('rated power RPM')),`${v.id}: rated power and torque curve disagree`);
}
{
 const bad=structuredClone(VEHICLES[0]);bad.engine.torqueCurve=bad.engine.torqueCurve.map(p=>({...p,nm:p.nm*0.5}));
 assert(auditVehicle(bad).warnings.some(w=>w.includes('rated power RPM')));
 bad.chassis.tyre='junk 185/65R15 trailing';assert(auditVehicle(bad).errors.some(w=>w.includes('tyre')));
}
