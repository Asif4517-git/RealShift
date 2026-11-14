// Start `npm run dev -- --host 0.0.0.0`, then set BASE_URL and CHROMIUM_PATH.
// Chromium must have its system dependencies available. Run with `npm run test:browser`.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(() => {
  window.__decoded = 0; window.__decodeFailures = 0;
  const original = AudioContext.prototype.decodeAudioData;
  AudioContext.prototype.decodeAudioData = function(...args) {
    return original.apply(this, args).then(buffer => { window.__decoded++; return buffer; }, e => { window.__decodeFailures++; throw e; });
  };
});
try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('realshift.settings.v1', '{"obsolete":true}'); localStorage.setItem('realshift.settings.v2', JSON.stringify({graphics:'performance',audio:{master:0.2}})); localStorage.setItem('realshift.bindings.v1', JSON.stringify({ignition:'KeyO'})); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Garage', exact: true }).first().click();
  await page.getByLabel('Build name').fill('Browser build');
  await page.getByRole('button', { name: 'Save build', exact: true }).click();
  await page.getByText('Build saved and selected.').waitFor();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Garage', exact: true }).first().click();
  await page.getByText('Browser build', { exact: true }).first().waitFor();
  await page.getByRole('button', { name: 'Edit / rename' }).click();
  await page.getByLabel('Build name').fill('Edited browser build');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('button', { name: 'Enter dyno bay' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).first().click();
  await page.waitForFunction(() => window.__decoded > 0, null, { timeout: 30000 });
  await page.getByRole('button', { name: 'Arm dyno pull' }).first().waitFor({state:'visible'}); await page.waitForFunction(() => { const b=[...document.querySelectorAll('button')].find(b => b.textContent.includes('Arm dyno pull')); return b && !b.disabled; }, null, { timeout: 90000 });
  assert.equal(await page.getByText('Powertrain offline').count(), 0, 'engine starts');
  await page.keyboard.down('w'); await page.waitForTimeout(1000); await page.keyboard.up('w');
  await page.waitForTimeout(2500);
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Arm dyno pull' }).first().click();
  await page.getByRole('button', { name: 'End & save pull' }).waitFor();
  await page.keyboard.down('w');
  await page.waitForFunction(() => /(?:[3-9]|[1-9][0-9]+) samples recording/i.test(document.body.innerText), null, { timeout: 90000 });
  await page.keyboard.up('w');
  await page.getByRole('button', { name: 'End & save pull' }).click();
  await page.getByRole('button', { name: 'Audio & settings' }).first().click();
  await page.getByRole('button', { name: 'Reset all settings' }).click();
  await page.getByRole('button', { name: 'Confirm reset' }).click();
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => ({ settings: JSON.parse(localStorage.getItem('realshift.settings.v2')), builds: JSON.parse(localStorage.getItem('realshift.custom.v1')), runs: JSON.parse(localStorage.getItem('realshift.runs.v1')), legacy:localStorage.getItem('realshift.settings.v1'), bindings:JSON.parse(localStorage.getItem('realshift.bindings.v1')), decoded:window.__decoded, failures:window.__decodeFailures }));
  assert.equal(state.builds[0].spec.name, 'Edited browser build');
  assert.equal(state.settings.clutchMode, 'assisted'); assert.equal(state.settings.graphics, 'high'); assert.equal(state.settings.audio.master, 0.8); assert.equal(state.bindings.ignition, 'KeyI'); assert(state.runs.length > 0); assert.equal(state.legacy, null);
  assert(state.decoded > 0); assert.equal(state.failures, 0); assert.deepEqual(errors, []);
  console.log(`Browser journey passed; ${state.decoded} recorded samples decoded; ${state.runs.length} run(s) preserved.`);
} finally { await browser.close(); }
