// Browser acceptance checks. Requires puppeteer-core and a local server.
const assert=require('node:assert/strict');
(async()=>{
 const puppeteer=require('puppeteer-core');let executablePath=process.env.CHROMIUM_PATH,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'];
 if(!executablePath){let c=require('@sparticuz/chromium');c=c.default||c;executablePath=await c.executablePath();args=c.args;}
 const browser=await puppeteer.launch({executablePath,args,headless:true});
 try{
 const page=await browser.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
 await page.goto(process.env.FILM_URL||'http://127.0.0.1:8090');
 await page.waitForFunction(()=>window.lightfall,{timeout:120000});
 await page.evaluate(()=>window.lightfall.setRenderScale(.25));await page.click('#begin');await page.waitForFunction(()=>window.lightfall.time>.2,{timeout:30000});
 await page.evaluate(()=>window.lightfall.pause());
 const first=await page.evaluate(()=>window.lightfall.time);await new Promise(r=>setTimeout(r,250));assert.equal(await page.evaluate(()=>window.lightfall.time),first);
 for(const [t,title] of [[5,'An invisible object.'],[18,'Matter becomes light.'],[32,'The long way around.'],[49,'A shadow, not a surface.'],[63,'A portrait of an edge.']]){
  await page.evaluate(t=>window.lightfall.seek(t),t);
  assert.equal(await page.$eval('#chapterTitle',e=>e.textContent),title);
 }
 await page.click('#sound');assert.equal(await page.$eval('#sound',e=>e.getAttribute('aria-pressed')),'false');
 await page.click('#captions');assert.equal(await page.$eval('#captions',e=>e.getAttribute('aria-pressed')),'false');
 await page.evaluate(()=>window.lightfall.seek(74));assert.equal(await page.$eval('#ending',e=>e.hidden),false);
 await page.click('#replay');await page.waitForFunction(()=>window.lightfall.time<5);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);console.log('PASS: mobile play, audio clock, pause, five chapters, seek, mute, captions, end card, replay, no overflow, no HTTP/JS/shader errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
