import express from 'express';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {mkdir,rm,readdir} from 'node:fs/promises';
import yazl from 'yazl';
import {initAssets,upload,acceptUpload,listAssets,getAsset,ROOT,STORAGE} from './assets.mjs';
import {prepareEnvironment} from './environment.mjs';
import {validateProject,localStoryboard} from './project.mjs';
import {aiConfigured,aiStoryboard} from './ai.mjs';
import {startRender,getJob,publicJob} from './render.mjs';
import {writeHyperframes} from './hyperframes.mjs';

const port=Number(process.env.PORT||3000),app=express();
app.disable('x-powered-by');
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');next();});
app.use(express.json({limit:'2mb'}));
await initAssets();
let tools={ready:false,error:null};
prepareEnvironment().then(()=>{tools={ready:true,error:null};}).catch(e=>{console.error('Render environment:',e.message);tools={ready:false,error:e.message};});
app.get('/api/status',(req,res)=>res.json({app:'Frame Studio',tools,ai:{configured:aiConfigured(),mode:aiConfigured()?'configured':'local'},engines:{remotion:'Full composition, 3D and media',hyperframes:'HTML-based 2D composition'},limits:{uploadMB:150,maxDurationSeconds:180},telemetry:'disabled for HyperFrames'}));
app.get('/api/assets',(req,res)=>res.json({assets:listAssets()}));
app.get('/api/assets/:id',(req,res)=>{const asset=getAsset(req.params.id);if(!asset)return res.status(404).json({error:'Asset not found.'});res.type(asset.mime);res.setHeader('Cache-Control','private, max-age=3600');res.sendFile(asset.path);});
app.post('/api/assets',upload.single('file'),async(req,res,next)=>{try{res.status(201).json({asset:await acceptUpload(req.file)});}catch(e){res.status(400).json({error:e.message});}});
app.post('/api/storyboard',async(req,res)=>{
  const {brief,direction,mode}=req.body||{};
  if(typeof brief!=='string'||brief.trim().length<8||brief.length>4000)return res.status(400).json({error:'The brief must contain 8–4000 characters.'});
  try{const plan=mode==='ai'?await aiStoryboard(brief,direction):localStoryboard(brief,direction,listAssets());res.json(plan);}catch(e){res.status(400).json({error:e.message});}
});
app.post('/api/validate',(req,res)=>{const engine=req.body?.engine==='hyperframes'?'hyperframes':'remotion';res.json(validateProject(req.body?.project,{engine}));});
app.post('/api/renders',(req,res)=>{
  const engine=req.body?.engine==='hyperframes'?'hyperframes':'remotion',project=req.body?.project;const check=validateProject(project,{engine});
  if(!check.valid)return res.status(400).json({error:'The project needs attention before rendering.',...check});
  if(!tools.ready)return res.status(503).json({error:tools.error||'The renderer is still preparing. Try again in a moment.'});
  try{const job=startRender(project,engine,port);res.status(202).json({job:publicJob(job),validation:check});}catch(e){res.status(409).json({error:e.message});}
});
app.get('/api/renders/:id',(req,res)=>{const job=getJob(req.params.id);if(!job)return res.status(404).json({error:'Render not found.'});res.json({job:publicJob(job)});});
app.get('/api/renders/:id/download',(req,res)=>{const job=getJob(req.params.id);if(!job||job.status!=='complete')return res.status(404).json({error:'Finished render not found.'});const name=job.project.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'film';res.download(join(job.dir,'final.mp4'),`${name}.mp4`);});
app.post('/api/hyperframes/export',async(req,res)=>{
  const project=req.body?.project,check=validateProject(project,{engine:'hyperframes'});if(!check.valid)return res.status(400).json({error:'The project is not compatible with HyperFrames.',...check});
  const dir=join(STORAGE,'exports',randomUUID());
  try{await mkdir(dir,{recursive:true});await writeHyperframes(project,dir,{includeAudio:true});res.attachment('frame-hyperframes-project.zip');const zip=new yazl.ZipFile();zip.outputStream.on('error',err=>{console.error(err);res.destroy(err)});res.on('close',()=>rm(dir,{recursive:true,force:true}).catch(()=>{}));const add=async(folder,prefix='')=>{for(const entry of await readdir(folder,{withFileTypes:true})){const relative=prefix?`${prefix}/${entry.name}`:entry.name;const full=join(folder,entry.name);if(entry.isDirectory())await add(full,relative);else if(entry.isFile())zip.addFile(full,relative);}};await add(dir);zip.outputStream.pipe(res);zip.end();}catch(e){await rm(dir,{recursive:true,force:true}).catch(()=>{});if(!res.headersSent)res.status(500).json({error:e.message});else res.destroy(e);}
});
app.use('/api',(req,res)=>res.status(404).json({error:'API route not found.'}));
app.use((err,req,res,next)=>{if(err){console.error(err);res.status(err.code==='LIMIT_FILE_SIZE'?413:400).json({error:err.code==='LIMIT_FILE_SIZE'?'File exceeds the 150 MB upload limit.':err.message});}else next();});
if(process.env.NODE_ENV==='production'){
  app.use(express.static(join(ROOT,'dist')));app.use((req,res)=>res.sendFile(join(ROOT,'dist/index.html')));
}else{
  const {createServer:createViteServer}=await import('vite');
  const vite=await createViteServer({root:ROOT,server:{middlewareMode:true,allowedHosts:true,hmr:false,watch:{ignored:['**/storage/**','**/.scratch/**']}},appType:'spa'});app.use(vite.middlewares);
}
app.listen(port,'0.0.0.0',()=>console.log(`Frame Studio is listening on 0.0.0.0:${port}`));
