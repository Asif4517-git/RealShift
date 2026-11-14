import { strict as assert } from 'node:assert';
import { DynoSimulation, type ClutchMode } from '../src/lib/physics';
import { VEHICLES } from '../src/lib/vehicles';
const dt = 1 / 120;
function run(sim: DynoSimulation, seconds: number) { for (let i = 0; i < seconds / dt; i++) sim.tick(dt); }
for (const vehicle of [VEHICLES[0], VEHICLES.find(v => v.engine.fuel === 'Diesel')!, VEHICLES.find(v => v.engine.cylinders === 8)!]) {
  for (const mode of ['manual', 'assisted', 'auto'] as ClutchMode[]) {
    const sim = new DynoSimulation(vehicle); sim.setClutchMode(mode); sim.startEngine(); run(sim, 5);
    assert(sim.engineOn, `${vehicle.id} ${mode}: start`);
    const idle = sim.rpm;
    assert(Math.abs(idle - vehicle.engine.idleRpm) < 200, `idle ${idle}`);
    sim.setInputs({throttle: 0.4}); run(sim, 0.5); assert(sim.rpm > idle, 'neutral rev'); assert.equal(sim.wheelOmega, 0);
    sim.setInputs({throttle: 0}); run(sim, 4);
    if (mode === 'manual') { sim.setInputs({clutch: 1}); run(sim, 0.5); }
    const before = sim.rpm; sim.selectGear(1); assert.equal(sim.rpm, before, 'selection must not assign RPM');
    if (mode === 'manual') { run(sim, 0.4); assert(Math.abs(sim.rpm-before) < 80, `clutch open ${sim.rpm} ${before}`); }
    sim.setInputs({throttle: 0.8}); run(sim, 0.25);
    if (mode === 'manual') { sim.setInputs({clutch: 0.72}); run(sim, 1); sim.setInputs({clutch: 0.55}); run(sim, 1); }
    sim.setInputs({throttle: 0.7, clutch: 0}); run(sim, 5);
    assert(Number.isFinite(sim.rpm) && sim.wheelOmega > 0, `launch ${vehicle.id} ${mode} rpm ${sim.rpm} wheel ${sim.wheelOmega}`);
    if (mode === 'manual') {sim.setInputs({clutch: 1}); run(sim, 0.4);}
    const shiftRpm = sim.rpm; sim.selectGear(2); assert.equal(sim.gear, 2); assert.equal(sim.rpm, shiftRpm, 'no shift snap');
    sim.setInputs({clutch: 0, throttle: 0.5}); run(sim, 2);
    assert(Number.isFinite(sim.rpm) && sim.rpm <= vehicle.engine.limiter + 220);
    console.log(vehicle.id,mode,'idle',Math.round(idle),'after shift',Math.round(sim.rpm),'speed',Math.round(sim.snapshot().speedKph));
  }
}

// Unsafe downshifts are rejected instead of forcing an over-rev.
{
  const sim = new DynoSimulation(VEHICLES[0]);
  sim.clutchMode = 'auto'; sim.engineOn = true; sim.rpm = 3500;
  sim.gear = 3;
  sim.wheelOmega = sim.vehicle.engine.limiter * 1.2 * (2 * Math.PI / 60) / (sim.vehicle.gearbox.ratios[0] * sim.vehicle.gearbox.finalDrive);
  const before = sim.rpm; sim.selectGear(1);
  assert.equal(sim.gear, 3); assert.equal(sim.rpm, before); assert(sim.drainEvents().includes('overrev-reject'));
}
// Dumping the clutch against the brake can stall a manual car.
{
  const sim = new DynoSimulation(VEHICLES[0]); sim.clutchMode = 'manual'; sim.startEngine(); run(sim, 4);
  sim.setInputs({clutch: 1, brake: 1}); run(sim, 0.5); sim.selectGear(1);
  sim.setInputs({clutch: 0}); run(sim, 3); assert(sim.stalled, 'manual stall');
}
// Long-running numerical stability on the same fixed-step model used by the app.
{
  const sim = new DynoSimulation(VEHICLES[0]); sim.clutchMode = 'auto'; sim.startEngine(); run(sim, 3);
  sim.selectGear(1); sim.setInputs({throttle: 0.45}); run(sim, 180);
  assert(Number.isFinite(sim.rpm) && Number.isFinite(sim.wheelOmega));
  assert(sim.rpm >= 0 && sim.rpm <= sim.vehicle.engine.limiter + 220);
}
console.log('Unsafe downshift, manual stall and 180-second fixed-step stability passed.');
