import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
try {
  for (const viewport of [{width:1440,height:900},{width:390,height:844}]) {
    const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.BASE_URL||'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
    await page.getByText('Powertrain diagnostics',{exact:true}).click();
    await page.getByRole('img',{name:'Recent engine RPM versus equivalent road speed'}).waitFor();
    await page.getByText(/Wheel 0 rpm · Roller 0 rpm/).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth===document.documentElement.clientWidth),true);
    await page.screenshot({path:`/tmp/realshift-diagnostics-${viewport.width}.png`});
    assert.deepEqual(errors,[]);await page.close();
  }
  console.log('Diagnostic panel and chart render on desktop and mobile without overflow.');
} finally { await browser.close(); }
