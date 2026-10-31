import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultProject,totalFrames,sceneStart} from '../src/shared/project.js';
import {fitScenesToNarration,cueSceneTransitions} from '../src/shared/timing.js';

test('fits the timeline to a recording by script weight, without claiming speech recognition',()=>{
  const p=defaultProject();p.audio.narration={assetId:'voice',volume:1,offset:.5};p.scenes[1].narration='one two three four five six seven eight nine ten eleven twelve';
  const fitted=fitScenesToNarration(p,[{id:'voice',kind:'audio',duration:18}]);
  assert.equal(totalFrames(fitted),Math.round(18.5*p.fps));assert.ok(fitted.scenes[1].duration>fitted.scenes[4].duration);
  assert.equal(p.scenes[1].duration,4.5);assert.ok(fitted.scenes.every(s=>s.duration>=1&&s.duration<=30));
});
test('refuses impossible narration timing and never extends footage past its source',()=>{
  const p=defaultProject();p.audio.narration={assetId:'voice',volume:1,offset:0};
  assert.throws(()=>fitScenesToNarration(p,[{id:'voice',kind:'audio',duration:2}]),/duration limits/);
  p.scenes[0]={...p.scenes[0],type:'footage',assetId:'clip'};
  const fitted=fitScenesToNarration(p,[{id:'voice',kind:'audio',duration:18},{id:'clip',kind:'video',duration:2}]);assert.ok(fitted.scenes[0].duration<=2);
});
test('aligns selected effects to cuts and adds built-in cues without replacing extra tracks',()=>{
  const p=defaultProject();const result=cueSceneTransitions(p,[{id:'demo-swish'}]);
  assert.equal(result.audio.effects.length,4);assert.equal(result.audio.effects[0].assetId,'demo-swish');
  result.audio.effects.forEach((effect,i)=>assert.equal(effect.offset,Number(sceneStart(p,i+1).toFixed(3))));
  assert.equal(p.audio.effects[0].offset,4.65);
});
