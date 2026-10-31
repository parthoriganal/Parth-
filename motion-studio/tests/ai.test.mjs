import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';
import {aiStoryboard,aiConfigured} from '../server/ai.mjs';

test('OpenAI-compatible adapter handles a local mock without leaking credentials',async(t)=>{
  let requestSeen;const server=http.createServer(async(req,res)=>{let data='';for await(const c of req)data+=c;requestSeen={auth:req.headers.authorization,path:req.url,body:JSON.parse(data)};res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({name:'An idea',scenes:[{name:'Opening',title:'A clear idea',subtitle:'A supporting line',narration:'A clear idea',type:'kinetic',duration:4,labels:['A','B','C']}]})}}]}));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());const old={...process.env};t.after(()=>{for(const k of ['AI_BASE_URL','AI_API_KEY','AI_MODEL'])if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];});
  process.env.AI_BASE_URL=`http://127.0.0.1:${server.address().port}/v1`;process.env.AI_API_KEY='test-secret';process.env.AI_MODEL='test-model';assert.equal(aiConfigured(),true);
  const result=await aiStoryboard('A story about learning together.','Educational explainer');assert.equal(result.source,'ai');assert.equal(result.scenes[0].title,'A clear idea');assert.equal(requestSeen.path,'/v1/chat/completions');assert.equal(requestSeen.auth,'Bearer test-secret');assert.equal(requestSeen.body.model,'test-model');assert.equal(JSON.stringify(result).includes('test-secret'),false);
});
