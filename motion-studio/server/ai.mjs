import {normalizeAIPlan} from './project.mjs';
export function aiConfigured(){return Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL && process.env.AI_MODEL);}
export async function aiStoryboard(brief,direction){
  if(!aiConfigured()) throw new Error('AI is not configured. Set AI_BASE_URL, AI_API_KEY and AI_MODEL on the server, or use the local draft.');
  const base=new URL(process.env.AI_BASE_URL);
  if(base.protocol!=='https:' && !(base.protocol==='http:'&&['127.0.0.1','localhost','::1','[::1]'].includes(base.hostname))) throw new Error('AI_BASE_URL must use HTTPS (HTTP is permitted only for a local test service).');
  const response=await fetch(`${base.toString().replace(/\/$/,'')}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.AI_API_KEY}`},signal:AbortSignal.timeout(60000),body:JSON.stringify({model:process.env.AI_MODEL,temperature:0.6,messages:[{role:'system',content:'You are a motion design director. Return only JSON: {"name":"...","scenes":[{"name":"...","title":"...","subtitle":"...","narration":"...","type":"kinetic|diagram|object-phone|object-clock|object-globe","duration":5,"labels":["A","B","C"]}]}. Create 3–6 short scenes, prioritize 2D, use at most one small 3D object and only when relevant, avoid invented facts and statistics, make copy concise. Do not claim uploaded media or generated narration exists.'},{role:'user',content:`Direction: ${direction}\nBrief: ${brief}`} ]})});
  if(!response.ok) throw new Error(`AI provider returned HTTP ${response.status}. Check the server configuration.`);
  const body=await response.json();let content=body?.choices?.[0]?.message?.content;
  if(typeof content!=='string') throw new Error('AI provider returned no text.');
  content=content.replace(/^\s*```(?:json)?\s*/i,'').replace(/\s*```\s*$/,'');
  try{return normalizeAIPlan(JSON.parse(content),direction);}catch(e){throw new Error(`Could not use AI storyboard: ${e.message}`);}
}
