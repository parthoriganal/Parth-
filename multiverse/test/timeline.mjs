import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.min.js';
import { Timeline, CHAPTERS, FILM_DURATION } from '../src/film/timeline.js';
import { createWorld } from '../src/world/world.js';
const timeline = new Timeline(THREE);
for(let t=0;t<=FILM_DURATION;t+=0.125){
 const s=timeline.sample(t);
 assert.ok(Number.isFinite(s.camera.pos.length()));
 assert.ok(s.effects.portalForm>=0 && s.effects.portalForm<=1);
 assert.ok(s.effects.fade>=0 && s.effects.fade<=1);
 assert.ok(s.chapterIndex>=0 && s.chapterIndex<5);
}
for(let i=0;i<5;i++)assert.equal(timeline.sample(CHAPTERS[i].start).chapterIndex,i);
const world=createWorld({starCount:100});
for(const t of [0,13,29,40,51.2,62,78])world.update(1,t,timeline.sample(t),1);
assert.ok(world.scene.children.length>=6);
world.dispose();
console.log('PASS: 625 timeline samples, five boundaries, complete world assembly and update.');
