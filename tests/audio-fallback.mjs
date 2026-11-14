// Deliberately fail recorded-asset decoding and verify truthful fallback status.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] });
const page = await browser.newPage(); const errors=[]; page.on('pageerror', e=>errors.push(e.message));
await page.addInitScript(() => { AudioContext.prototype.decodeAudioData = () => Promise.reject(new Error('simulated decode failure')); });
try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/', {waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Start',exact:true}).first().click();
  await page.waitForFunction(() => window.__REALSHIFT_AUDIO__?.levels()?.modelReady, null, {timeout:90000});
  const model=await page.evaluate(()=>window.__REALSHIFT_AUDIO__.levels().model);
  assert.equal(model,'synthetic-fallback');
  await page.getByText('Synthetic fallback · recording unavailable').waitFor({timeout:30000});
  assert.deepEqual(errors,[]); console.log('Recorded audio decode failure falls back and is labelled correctly.');
} finally { await browser.close(); }
