import { strict as assert } from 'node:assert';
import { DEFAULT_CUSTOM, GOD_CAR, randomCustom, customVehicle, validateCustom, estimateTopSpeed, suggestRatios } from '../src/lib/customVehicle';
import { localId } from '../src/lib/ids';
import { tyreRadiusM } from '../src/lib/vehicles';
import { recordedFamily } from '../src/lib/audioFamilies';
import { DynoSimulation } from '../src/lib/physics';
assert.deepEqual(validateCustom(DEFAULT_CUSTOM), []);
assert.notEqual(localId('RUN'), localId('RUN'));
const spaced = customVehicle({id:'custom-space', spec:{...DEFAULT_CUSTOM, tyre:' 225/45r18 '}});
assert(Math.abs(tyreRadiusM(spaced) - 0.32985) < 1e-8);
assert.equal(spaced.chassis.wheelDiameterIn, 18);
assert.equal(recordedFamily('90° V8',8,false),'petrol-v8');
assert.equal(recordedFamily('V-12',12,false),null);
assert.equal(recordedFamily('Flat-4',4,false),null);
assert.equal(recordedFamily('V-8',8,true),null);
assert.equal(customVehicle({id:'custom-v12',spec:{...DEFAULT_CUSTOM,layout:'V',cylinders:12}}).sound.character,'custom-synth');
assert(estimateTopSpeed(DEFAULT_CUSTOM) > 180, 'road load should not use an unrealistically high drag area');
assert.deepEqual(validateCustom(GOD_CAR), []);
assert.equal(suggestRatios(GOD_CAR, 12).length, 12);
for (let i=0;i<1000;i++) { const build=randomCustom(); assert.deepEqual(validateCustom(build), [], `random build ${i}`); assert(estimateTopSpeed(build)>0); }
for (const mode of ['manual','assisted','auto'] as const) {
  const god = new DynoSimulation(customVehicle({id:'custom-god-test',spec:GOD_CAR})); god.setClutchMode(mode); god.startEngine();
  for(let i=0;i<480;i++) god.tick(1/120);
  if (mode==='manual') { god.setInputs({clutch:1}); for(let i=0;i<60;i++) god.tick(1/120); }
  for(let gear=1;gear<=12;gear++) { god.selectGear(gear); assert.equal(god.gear,gear,`${mode} gear ${gear}`); for(let i=0;i<10;i++) god.tick(1/120); }
  assert(Number.isFinite(god.rpm));
  god.selectGear(1); god.setInputs({throttle:0.8});
  if (mode==='manual') { god.setInputs({clutch:0.65}); for(let i=0;i<240;i++) god.tick(1/120); }
  god.setInputs({clutch:0}); for(let i=0;i<1200;i++) god.tick(1/120);
  assert(god.wheelOmega > 0 && Number.isFinite(god.rpm), `${mode} God Car launch`);
}
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
