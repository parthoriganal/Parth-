import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import Chromium from '@sparticuz/chromium';
const browser=await chromium.launch({executablePath:await Chromium.executablePath(),env:{...process.env,LD_LIBRARY_PATH:'/tmp/maison-browser/lib'},args:[...Chromium.args,'--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173');await page.waitForFunction(()=>window.filmReady);
 assert.equal(await page.locator('canvas').getAttribute('width'),'720');
 await page.locator('[data-time="11"]').click();await page.waitForFunction(()=>document.querySelector('.player').classList.contains('playing'));
 assert.equal(await page.locator('[data-time="11"]').getAttribute('class'),'active');
 await page.locator('#play').click();assert(!(await page.locator('.player').getAttribute('class')).includes('playing'));
 await page.locator('#mute').click();assert(await page.locator('audio').evaluate(a=>a.muted));await page.locator('#mute').click();assert(!(await page.locator('audio').evaluate(a=>a.muted)));
 await page.locator('#seek').evaluate(el=>{el.value=17;el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await page.locator('#time').textContent(),'00:17');assert.equal(await page.locator('[data-time="15"]').getAttribute('class'),'active');
 await page.evaluate(()=>window.renderFrame(2));await page.screenshot({path:'/tmp/maison-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'/tmp/maison-mobile.png',fullPage:true});
 const audioResponse=await page.request.get('http://localhost:5173/audio/legacy-master.mp3');assert.equal(audioResponse.status(),200);
 assert.deepEqual(errors,[]);console.log('PASS: WebGL rendering, chapter playback, pause, mute/unmute, seeking, self-hosted audio, mobile layout, and zero page errors.');
}finally{await browser.close();}
