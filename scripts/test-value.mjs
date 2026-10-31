import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import Chromium from '@sparticuz/chromium';
const browser=await chromium.launch({executablePath:await Chromium.executablePath(),env:{...process.env,LD_LIBRARY_PATH:'/tmp/maison-browser/lib'},args:[...Chromium.args,'--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173/value.html');await page.waitForFunction(()=>window.filmReady,null,{timeout:60000});
 assert.equal(await page.locator('canvas').getAttribute('width'),'720');
 assert.equal(await page.locator('#seek').getAttribute('max'),'24');
 await page.locator('[data-time="12"]').click();await page.waitForFunction(()=>document.querySelector('.player').classList.contains('playing'));
 assert.equal(await page.locator('[data-time="12"]').getAttribute('class'),'active');
 await page.locator('#play').click();assert(!(await page.locator('.player').getAttribute('class')).includes('playing'));
 await page.locator('#mute').click();assert(await page.locator('audio').evaluate(a=>a.muted));await page.locator('#mute').click();assert(!(await page.locator('audio').evaluate(a=>a.muted)));
 await page.locator('#seek').evaluate(el=>{el.value=18;el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await page.locator('#time').textContent(),'00:18');assert.equal(await page.locator('[data-time="16"]').getAttribute('class'),'active');
 const hashes=[];for(const t of [2.5,6.5,10.5,14.5,18.5,22.5]){hashes.push(await page.evaluate(t=>{window.renderFrame(t);return document.querySelector('#film').toDataURL().slice(-3000)},t));}
 assert.equal(new Set(hashes).size,6,'All six scenes must render distinct frames');
 await page.evaluate(()=>window.renderFrame(6.5));await page.screenshot({path:'/tmp/value-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'/tmp/value-mobile.png',fullPage:true});
 const audioResponse=await page.request.get('http://localhost:5173/audio/value-master.mp3');assert.equal(audioResponse.status(),200);
 assert.equal(await page.locator('audio').evaluate(a=>Math.round(a.duration)),24);
 assert.deepEqual(errors,[]);console.log('PASS: six distinct 3D sequences; SVG readiness; chapter playback; pause; mute/unmute; seeking; 24-second audio; mobile layout; zero page errors.');
}finally{await browser.close();}
