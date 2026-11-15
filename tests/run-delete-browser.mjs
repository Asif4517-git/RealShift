// Individual run deletion must be explicitly confirmed.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] });
const page = await browser.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.addInitScript(() => {
  if (!sessionStorage.seeded) {
    localStorage.setItem('realshift.runs.v1', JSON.stringify([{id:'RUN-test',vehicleId:'mustang-gt-2017',label:'Ford Mustang GT',dateISO:new Date().toISOString(),peakHp:100,peakTorque:150,peakRpm:3000,peakSpeedKph:40,gear:'2',samples:[],dynoLoad:26}]));
    sessionStorage.seeded = 'yes';
  }
});
try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/', {waitUntil:'domcontentloaded'});
  await page.getByRole('button', {name:'Full log'}).first().click();
  const button = page.getByRole('button', {name:'Delete RUN-test'});
  page.once('dialog', dialog => dialog.dismiss()); await button.click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('realshift.runs.v1')).length), 1);
  page.once('dialog', dialog => dialog.accept()); await button.click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('realshift.runs.v1')).length === 0);
  assert.deepEqual(errors, []); console.log('Run deletion cancellation and confirmation passed.');
} finally { await browser.close(); }
