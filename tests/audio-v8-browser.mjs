import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Start',exact:true}).first().click();
  await page.waitForFunction(()=>window.__REALSHIFT_AUDIO__?.levels()?.modelReady,null,{timeout:90000});
  const stats=await page.evaluate(()=>window.__REALSHIFT_AUDIO__.levels());
  assert.equal(stats.model,'recorded-engine-loops');assert.equal(stats.starter,'recorded-v8');assert.equal(stats.vehicle,'mustang-gt-2017');assert.deepEqual(errors,[]);
  console.log('V8 engine loops and Corvette-derived starter decoded in Chromium.');
} finally { await browser.close(); }
