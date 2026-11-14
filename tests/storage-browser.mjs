// A blocked or full browser storage must not crash the app or promise persistence.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] });
const page = await browser.newPage();
const errors = []; page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => { Storage.prototype.setItem = function() { throw new DOMException('Quota exceeded', 'QuotaExceededError'); }; });
try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/', {waitUntil:'domcontentloaded'});
  await page.getByRole('alert').getByText(/storage is unavailable, full/i).waitFor({timeout:90000});
  await page.getByRole('button', {name:'Garage', exact:true}).first().click();
  await page.getByLabel('Build name').fill('Unsaved build');
  await page.getByRole('button', {name:'Save build', exact:true}).click();
  assert.equal(await page.getByRole('alert').count(), 1);
  await page.getByText(/Build selected for this session/).waitFor();
  assert.deepEqual(errors, []);
  const corrupt = await browser.newPage();
  await corrupt.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('realshift.custom.v1', '[null]');
      localStorage.setItem('realshift.runs.v1', '{broken');
      sessionStorage.setItem('seeded', 'yes');
    }
  });
  const corruptErrors=[]; corrupt.on('pageerror', e => corruptErrors.push(e.message));
  await corrupt.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/', {waitUntil:'domcontentloaded'});
  await corrupt.getByRole('alert').waitFor({timeout:90000});
  assert.deepEqual(await corrupt.evaluate(() => [localStorage.getItem('realshift.custom.v1'), localStorage.getItem('realshift.runs.v1')]), ['[null]', '{broken']);
  assert.deepEqual(corruptErrors, []);
  console.log('Storage failure is visible; malformed records are not overwritten.');
} finally { await browser.close(); }
