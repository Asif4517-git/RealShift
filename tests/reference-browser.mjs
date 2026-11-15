import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
try {
 for(const id of ['swift-1.2-2018','911-carrera-s-9912']) {
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  await context.addInitScript(({id})=>{localStorage.setItem('realshift.vehicle.v1',JSON.stringify(id));localStorage.setItem('realshift.settings.v2',JSON.stringify({graphics:'performance'}));},{id});
  const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.getByText('Powertrain diagnostics',{exact:true}).click();
  await page.getByRole('button',{name:'Start',exact:true}).first().click();
  await page.waitForFunction(()=>!document.body.innerText.includes('Powertrain offline'),null,{timeout:90000});
  await page.getByRole('button',{name:'Select gear 1'}).click();
  await page.keyboard.down('w');
  await page.waitForFunction(()=>{ const e=[...document.querySelectorAll('div')].find(x=>/^Wheel [\d,.]+ rpm · Roller/.test(x.textContent||''));return e && Number(e.textContent.match(/^Wheel ([\d,.]+)/)[1].replace(',',''))>20; },null,{timeout:90000});
  await page.keyboard.up('w');
  const graph=await page.getByRole('img',{name:'Recent engine RPM versus equivalent road speed'}).locator('polyline').getAttribute('points');
  assert(graph.trim().split(' ').length>2, `${id} graph must update`);
  await page.getByRole('button',{name:'Select gear 2'}).click();
  await page.getByText(/Gear 2 · Gear ratio/).waitFor({timeout:30000});
  assert.deepEqual(errors,[]); console.log(`${id}: ignition, acceleration, gear selection and live diagnostic trace passed`);
  await context.close();
 }
} finally {await browser.close()}
