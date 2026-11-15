import { localId } from "../lib/ids";
import { useState } from 'react';
import { DEFAULT_CUSTOM, GOD_CAR, randomCustom, validateCustom, estimateTopSpeed, suggestRatios, type CustomBuild, type CustomSpec } from '../lib/customVehicle';
import { useStore } from '../lib/store';
import { Button, Panel } from './ui';

const copyDefault = () => ({ ...DEFAULT_CUSTOM, ratios: [...DEFAULT_CUSTOM.ratios] });
export function CustomEditor() {
  const { customBuilds, saveCustom, deleteCustom, selectVehicle, settings, updateSettings, storageError } = useStore();
  const [id, setId] = useState<string | null>(null);
  const [spec, setSpec] = useState<CustomSpec>(copyDefault);
  const [ratioText, setRatioText] = useState(DEFAULT_CUSTOM.ratios.join(', '));
  const [message, setMessage] = useState('');
  const [gearCount, setGearCount] = useState(6);
  const patch = (p: Partial<CustomSpec>) => setSpec(v => ({ ...v, ...p }));
  const edit = (b: CustomBuild) => { setId(b.id); setSpec({ ...b.spec, ratios: [...b.spec.ratios] }); setRatioText(b.spec.ratios.join(', ')); setMessage(''); };
  const reset = () => { setId(null); setSpec(copyDefault()); setRatioText(DEFAULT_CUSTOM.ratios.join(', ')); setMessage(''); };
  const loadPreset = (next: CustomSpec) => {
    if (!window.confirm('Replace the current editor fields? Saved builds are not changed.')) return;
    setId(null); setSpec({ ...next, ratios: [...next.ratios] }); setRatioText(next.ratios.join(', '));
    setGearCount(next.ratios.length); setMessage('Preset loaded into the editor. Save build to keep and select it.');
  };
  const numeric = (label: string, key: keyof CustomSpec, step = 1) => <label className="text-xs text-mut">{label}<input className="mt-1 w-full rounded border border-line bg-[#0c110d] p-2 text-fg" type="number" step={step} value={spec[key] as number} onChange={e => patch({ [key]: e.target.valueAsNumber })} /></label>;
  const choose = (label: string, key: 'fuel' | 'layout' | 'drivetrain', choices: string[]) => <label className="text-xs text-mut">{label}<select className="mt-1 w-full rounded border border-line bg-[#0c110d] p-2 text-fg" value={spec[key]} onChange={e => patch({ [key]: e.target.value })}>{choices.map(c => <option key={c}>{c}</option>)}</select></label>;
  const save = () => {
    const ratios = ratioText.split(',').map(x => x.trim() === '' ? NaN : Number(x));
    const next = { ...spec, ratios }; const errors = validateCustom(next);
    if (errors.length) { setMessage(errors.join(' ')); return; }
    const buildId = id ?? localId("custom");
    saveCustom({ id: buildId, spec: next }); setId(buildId); setSpec(next); setMessage(storageError ? 'Build selected for this session. Browser storage is unavailable or protected; it may not be saved.' : 'Build saved and selected.');
  };
  return <Panel className="space-y-4 p-4 sm:p-5">
    <div><h2 className="font-display text-xl text-fg">Custom vehicle editor</h2><p className="mt-1 text-xs text-mut">User-defined estimates, not certified specifications. Audio uses the closest available engine family. Top-speed target is a design goal, not a speed cap.</p></div>
    <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => loadPreset(randomCustom())}>Random specs</Button><Button size="sm" variant="outline" onClick={() => loadPreset(GOD_CAR)}>God Car · 12-speed preset</Button></div>
    <p className="text-xs text-mut">Presets are fictional estimates. God Car uses a recorded V8-family approximation with simulated RPM, load and boost, not an authentic recording of this build.</p>
    {customBuilds.length > 0 && <div className="space-y-2">{customBuilds.map(b => <div key={b.id} className="flex flex-wrap items-center gap-2"><span className="mr-auto text-sm text-fg">{b.spec.name}</span><Button size="sm" variant="outline" onClick={() => selectVehicle(b.id)}>Select</Button><Button size="sm" variant="outline" onClick={() => edit(b)}>Edit / rename</Button><Button size="sm" variant="outline" onClick={() => { edit(b); setId(null); setSpec({ ...b.spec, name: `${b.spec.name} copy`, ratios: [...b.spec.ratios] }); }}>Duplicate</Button><Button size="sm" variant="outline" onClick={() => { if (window.confirm(`Delete ${b.spec.name}? Saved dyno runs are retained.`)) { deleteCustom(b.id); if (id === b.id) reset(); } }}>Delete</Button></div>)}</div>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <label className="text-xs text-mut">Build name<input className="mt-1 w-full rounded border border-line bg-[#0c110d] p-2 text-fg" value={spec.name} maxLength={60} onChange={e => patch({ name:e.target.value })} /></label>
      {choose('Fuel', 'fuel', ['Petrol','Diesel'])}{choose('Layout', 'layout', ['Inline','V','Flat'])}{numeric('Cylinders', 'cylinders')}{numeric('Displacement (cc)', 'displacementCc')}
      <label className="text-xs text-mut">Induction<select className="mt-1 w-full rounded border border-line bg-[#0c110d] p-2 text-fg" value={spec.turbo ? 'Turbo' : 'NA'} onChange={e => patch({turbo:e.target.value === 'Turbo'})}><option>NA</option><option>Turbo</option></select></label>
      {numeric('Power target (hp)', 'powerHp')}{numeric('Peak torque (Nm)', 'torqueNm')}{numeric('Idle (rpm)', 'idleRpm')}{numeric('Redline (rpm)', 'redline')}{numeric('Limiter (rpm)', 'limiter')}{numeric('Flywheel inertia (kg·m²)', 'flywheelInertia', 0.01)}
      <label className="col-span-2 text-xs text-mut">Forward gear ratios (1–12, comma-separated)<input className="mt-1 w-full rounded border border-line bg-[#0c110d] p-2 text-fg" value={ratioText} onChange={e => setRatioText(e.target.value)} /></label>
      {numeric('Reverse ratio', 'reverse', 0.01)}{numeric('Final drive', 'finalDrive', 0.01)}{numeric('Clutch capacity (Nm)', 'clutchCapacityNm')}{choose('Drivetrain', 'drivetrain', ['FWD','RWD','4WD'])}{numeric('Mass (kg)', 'weightKg')}
      <label className="text-xs text-mut">Tyre (determines radius)<input className="mt-1 w-full rounded border border-line bg-[#0c110d] p-2 text-fg" value={spec.tyre} onChange={e => patch({tyre:e.target.value})} /></label>{numeric('Top-speed target (km/h)', 'targetTopSpeed')}
      <label className="text-xs text-mut">Clutch mode (app setting)<select className="mt-1 w-full rounded border border-line bg-[#0c110d] p-2 text-fg" value={settings.clutchMode} onChange={e => updateSettings({clutchMode:e.target.value as typeof settings.clutchMode})}><option value="manual">Manual</option><option value="assisted">Assisted</option><option value="auto">Automatic</option></select></label>
    </div>
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-xs text-mut">Forward gears for automatic ratios<input type="number" min="1" max="12" value={gearCount} onChange={e => setGearCount(e.target.valueAsNumber)} className="ml-2 w-16 rounded border border-line bg-[#0c110d] p-2 text-fg" /></label>
      <Button variant="outline" size="sm" onClick={() => { const ratios = suggestRatios(spec, gearCount); if (!ratios.length) { setMessage('Cannot generate ratios for these tyre, gearing or target values.'); return; } setRatioText(ratios.join(', ')); setMessage('Ratios generated from target speed at redline. Check the estimated achievable speed before saving.'); }}>Generate ratios</Button>
    </div>
    {(() => { const candidate = {...spec, ratios: ratioText.split(',').map(x => x.trim() === '' ? NaN : Number(x))}; const estimate = estimateTopSpeed(candidate); return estimate > 0 ? <p className="text-xs text-mut">Estimated flat-road maximum: <strong className="text-fg">{estimate.toFixed(1)} km/h</strong>. Computed from torque, gearing, tyre radius, mass, losses and the simulator’s approximate aerodynamic resistance. No dyno load, slope or electronic limiter; not a measured result.</p> : null; })()}
    {message && <p role="status" className="text-xs text-accent">{message}</p>}
    <div className="flex gap-2"><Button variant="primary" size="sm" onClick={save}>Save {id ? 'changes' : 'build'}</Button><Button variant="outline" size="sm" onClick={() => { if (window.confirm('Restore editor defaults? Saved builds are not affected.')) reset(); }}>Restore editor defaults</Button></div>
  </Panel>;
}
