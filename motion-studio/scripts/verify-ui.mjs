import assert from 'node:assert/strict';
import {chromium as playwright} from 'playwright-core';
import chromium from '@sparticuz/chromium';
import {prepareEnvironment} from '../server/environment.mjs';
import {defaultProject} from '../src/shared/project.js';
const base=process.env.STUDIO_URL||'http://127.0.0.1:3000';
const env=await prepareEnvironment();const browser=await playwright.launch({headless:true,executablePath:env.browser,args:chromium.args,env:env.env});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(base,{waitUntil:'networkidle',timeout:90000});
  assert.match(await page.title(),/Frame/);assert.equal(await page.locator('.scene-card').count(),5);
  assert.ok(await page.getByText('Local draft · no AI connected').isVisible() || await page.getByText('AI provider connected').isVisible());
  await page.locator('.scene-card').nth(2).click();
  const diagram=page.locator('canvas[aria-label="Animated vector diagram"]');await diagram.waitFor();
  await page.waitForFunction(()=>{const c=document.querySelector('canvas[aria-label="Animated vector diagram"]');if(!c)return false;let data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return data.some((v,i)=>i%4===3&&v>0)},null,{timeout:15000});
  console.log('✓ Motion Canvas diagram preview paints pixels');
  await page.locator('.scene-card').nth(3).click();
  for(const type of ['object-phone','object-clock','object-globe']){
    await page.getByLabel('VISUAL FORMAT').selectOption(type);const canvas=page.locator('canvas[aria-label="Lit three-dimensional object"]');await canvas.waitFor();await page.waitForTimeout(500);assert.ok((await canvas.evaluate(c=>c.toDataURL().length))>5000,`${type} canvas is blank`);console.log(`✓ ${type} WebGL preview`);
  }
  await page.getByRole('button',{name:'Export video'}).click();await page.getByLabel('RENDER ENGINE').selectOption('hyperframes');await page.getByText(/HyperFrames export supports 2D/).waitFor();assert.equal(await page.getByRole('button',{name:'Render MP4'}).isDisabled(),true);await page.getByRole('button',{name:'Close export dialog'}).click();
  await page.getByLabel('VISUAL FORMAT').selectOption('infographic');await page.getByLabel('Data value 1').fill('42');await page.getByLabel('Data value 2').fill('73');await page.waitForTimeout(500);assert.match(await page.locator('.stage').innerText(),/42%/);console.log('✓ editable data infographic and engine validation');
  await page.getByRole('button',{name:'Vertical',exact:true}).click();assert.ok(await page.locator('.stage-vertical').isVisible());assert.match(await page.locator('.preview-meta').innerText(),/9:16/);
  await page.locator('.inspector-tabs button').nth(1).click();await page.getByLabel('Choose Narration from library').selectOption('demo-score');assert.ok(await page.getByText('Original ambient score').first().isVisible());await page.getByRole('button',{name:'Fit scenes to narration'}).click();assert.match(await page.locator('.sync-message').innerText(),/fitted approximately/);await page.getByRole('button',{name:'Auto-cue transitions'}).click();assert.match(await page.locator('.sync-message').innerText(),/aligned to scene cuts/);assert.equal(await page.locator('.audio-track').count(),6);
  await page.locator('.inspector-tabs button').nth(0).click();const before=await page.locator('.scene-card').count();await page.getByRole('button',{name:'Add scene',exact:true}).first().click();assert.equal(await page.locator('.scene-card').count(),before+1);await page.getByTitle('Delete scene').click();assert.equal(await page.locator('.scene-card').count(),before);
  await page.locator('.brief-input').fill('A phone connects people. The process begins with 42% adoption. A better story moves us.');await page.getByRole('button',{name:'Create local storyboard'}).click();await page.waitForFunction(()=>document.querySelectorAll('.scene-card').length===3);assert.ok((await page.locator('body').innerText()).includes('Local storyboard created'));
  await page.waitForTimeout(800);const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('frame-studio-project-v1')));assert.equal(saved.scenes[0].type,'object-phone');assert.equal(saved.scenes[1].type,'infographic');assert.equal(saved.format,'vertical');
  await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.scene-card').count(),3);assert.ok(await page.locator('.stage-vertical').isVisible());
  await page.locator('input[accept="application/json,.json"]').setInputFiles({name:'project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(defaultProject()))});await page.waitForFunction(()=>document.querySelectorAll('.scene-card').length===5);
  console.log('✓ editing, audio library, scene controls, planning, approximate audio timing, autosave and JSON import');
  const mobile=await browser.newPage({viewport:{width:390,height:844}});await mobile.goto(base,{waitUntil:'networkidle',timeout:90000});const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,'mobile page overflows horizontally');assert.ok(await mobile.getByText('Start with a story').isVisible());await mobile.close();console.log('✓ responsive mobile layout');
  assert.deepEqual(errors,[]);console.log('UI verification passed.');
} finally {await browser.close();}
