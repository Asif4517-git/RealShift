import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
const page = await browser.newPage({viewport:{width:390,height:844}});
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Garage',exact:true}).first().click();
  page.once('dialog',d=>d.accept()); await page.getByRole('button',{name:'Random specs'}).click();
  assert.match(await page.getByLabel('Build name').inputValue(),/^Random /);
  await page.getByRole('button',{name:'Save build',exact:true}).click();
  await page.getByText('Build saved and selected.').waitFor();
  page.once('dialog',d=>d.accept()); await page.getByRole('button',{name:'God Car · 12-speed preset'}).click();
  assert.equal(await page.getByLabel('Build name').inputValue(),'God Car');
  assert.equal((await page.getByLabel('Forward gear ratios (1–12, comma-separated)').inputValue()).split(',').length,12);
  await page.getByRole('button',{name:'Save build',exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('realshift.custom.v1')).length===2);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Select gear 12'}).waitFor();
  await page.getByRole('button',{name:'Select gear 12'}).click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="Select gear 12"]')?.className.includes('border-accent'));
  const state=await page.evaluate(()=>({builds:JSON.parse(localStorage.getItem('realshift.custom.v1')),width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert.equal(state.builds[1].spec.ratios.length,12); assert.equal(state.scroll,state.width); assert.deepEqual(errors,[]);
  console.log('Random build and 12-speed God Car save, reload and gear selection passed on mobile.');
} finally { await browser.close(); }
