import { strict as assert } from 'node:assert';
import { DEFAULT_CUSTOM, customVehicle, validateCustom, estimateTopSpeed, suggestRatios } from '../src/lib/customVehicle';
import { recordedFamily } from '../src/lib/audioFamilies';
import { DynoSimulation } from '../src/lib/physics';
assert.deepEqual(validateCustom(DEFAULT_CUSTOM), []);
assert.equal(recordedFamily('90° V8',8,false),'petrol-v8');
assert.equal(recordedFamily('V-12',12,false),null);
assert.equal(recordedFamily('Flat-4',4,false),null);
assert.equal(recordedFamily('V-8',8,true),null);
assert.equal(customVehicle({id:'custom-v12',spec:{...DEFAULT_CUSTOM,layout:'V',cylinders:12}}).sound.character,'custom-synth');
assert(estimateTopSpeed(DEFAULT_CUSTOM) > 50);
assert.equal(suggestRatios(DEFAULT_CUSTOM, 6).length, 6);
assert.deepEqual(suggestRatios(DEFAULT_CUSTOM, 0), []);
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
const recording = new DynoSimulation(vehicle); recording.startEngine();
for (let i=0;i<480;i++) recording.tick(1/120);
recording.startPull(); recording.setInputs({throttle: 1});
for (let i=0;i<600;i++) recording.tick(1/120);
const run = recording.endPull(); assert(run?.vehicleSnapshot);
const originalName = run.vehicleSnapshot.model; vehicle.model = 'Modified afterwards';
assert.equal(run.vehicleSnapshot.model, originalName);
console.log('Custom validation, construction and simulation checks passed.');
