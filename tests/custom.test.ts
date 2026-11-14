import { strict as assert } from 'node:assert';
import { DEFAULT_CUSTOM, customVehicle, validateCustom } from '../src/lib/customVehicle';
import { DynoSimulation } from '../src/lib/physics';
assert.deepEqual(validateCustom(DEFAULT_CUSTOM), []);
assert(validateCustom({ ...DEFAULT_CUSTOM, ratios: [1,2] }).length);
assert(validateCustom({ ...DEFAULT_CUSTOM, tyre: 'bad' }).length);
assert(validateCustom({ ...DEFAULT_CUSTOM, powerHp: 1500, torqueNm: 30 }).length);
const vehicle = customVehicle({id:'custom-test', spec:DEFAULT_CUSTOM});
assert.equal(vehicle.gearbox.ratios.length, 6);
assert.equal(vehicle.engine.powerHp, 200);
for (const mode of ['manual','assisted','auto'] as const) {
  const sim = new DynoSimulation(vehicle); sim.setClutchMode(mode); sim.startEngine();
  for(let i=0;i<480;i++) sim.tick(1/120);
  assert(sim.engineOn); if(mode==='manual') { sim.setInputs({clutch:1}); for(let i=0;i<60;i++) sim.tick(1/120); }
  const old = sim.rpm; sim.selectGear(1); assert.equal(sim.rpm,old);
  sim.setInputs({throttle:0.8}); for(let i=0;i<30;i++) sim.tick(1/120);
  if(mode==='manual') { sim.setInputs({clutch:0.72}); for(let i=0;i<120;i++) sim.tick(1/120); sim.setInputs({clutch:0.55}); for(let i=0;i<120;i++) sim.tick(1/120); }
  sim.setInputs({clutch:0}); for(let i=0;i<1000;i++) sim.tick(1/120);
  assert(Number.isFinite(sim.rpm) && sim.wheelOmega > 0, mode);
}
console.log('Custom validation, construction and simulation checks passed.');
