import {createHash} from 'node:crypto';
import {createReadStream, existsSync} from 'node:fs';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';

async function checksum(file) {
  const h=createHash('sha256');
  for await(const chunk of createReadStream(file)) h.update(chunk);
  return h.digest('hex');
}

async function main() {
  const root=resolve(process.argv[2]??'out/meridian');
  const still=process.argv[3];
  const doc=JSON.parse(await readFile(resolve(root,'bundle/project.json'),'utf8'));
  if (still===undefined) {
    const staged=JSON.parse(await readFile(resolve(root,'stage-qa.json'),'utf8'));
    if (staged.project_id!==doc.project_id) throw new Error('Staging receipt does not match the production bundle');
  }
  const executable=process.env.CHROME_PATH ?? ['/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
  if (!executable) throw new Error('Set CHROME_PATH to an installed headless Chromium/Chrome executable');
  const serveUrl=await bundle({entryPoint:fileURLToPath(new URL('index.jsx',import.meta.url)),
    publicDir:resolve(root,'public'),outDir:resolve(root,'motion-bundle'),enableCaching:false});
  const browser=await openBrowser('chrome',{browserExecutable:executable,chromiumOptions:{gl:'swangle'},logLevel:'warn'});
  try {
    const inputProps={doc};
    const composition=await selectComposition({serveUrl,id:'Meridian',inputProps,puppeteerInstance:browser,logLevel:'warn'});
    if (still!==undefined) {
      const frame=Number(still);
      if (!Number.isInteger(frame) || frame<0 || frame>=doc.frames) throw new Error('Invalid still frame');
      await renderStill({serveUrl,composition,inputProps,puppeteerInstance:browser,frame,
        imageFormat:'png',output:resolve(root,`motion-frame-${frame}.png`),logLevel:'warn'});
      return;
    }
    const out=resolve(root,'visual.mp4');
    let reported=-1;
    await renderMedia({serveUrl,composition,inputProps,puppeteerInstance:browser,outputLocation:out,
      codec:'h264',crf:17,pixelFormat:'yuv420p',hardwareAcceleration:'disable',x264Preset:'fast',
      muted:true,concurrency:2,colorSpace:'bt709',logLevel:'warn',
      onProgress:({progress})=>{const p=Math.floor(progress*10);if(p>reported){reported=p;console.log(`Remotion ${p*10}%`);}}});
    await writeFile(resolve(root,'visual-receipt.json'),JSON.stringify({project_id:doc.project_id,frames:doc.frames,
      sha256:await checksum(out),engine:'Remotion 4.0.544 / Chromium CPU'},null,2)+'\n');
  } finally {
    await browser.close({silent:true});
  }
}
main().catch((error)=>{
  if (process.env.GITHUB_ACTIONS==='true') console.error(`::error title=Remotion::${String(error.message).replaceAll('%','%25').replaceAll('\n','%0A').slice(0,2000)}`);
  console.error(error);
  process.exitCode=1;
});
