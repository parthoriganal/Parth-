export const DURATION = 74;
export const CHAPTERS = [
 {start:0,end:12,title:'An invisible object.',label:'NOT THE HOLE',detail:'The glow comes from matter outside the event horizon.'},
 {start:12,end:27,title:'Matter becomes light.',label:'ACCRETION DISK',detail:'Hot orbiting gas radiates. The black hole itself does not glow.'},
 {start:27,end:41,title:'The long way around.',label:'GRAVITATIONAL LENSING',detail:'Light from the far side can reach the observer along a curved path. Trajectories shown schematically.'},
 {start:41,end:57,title:'A shadow, not a surface.',label:'TWO DIFFERENT EDGES',detail:'For a distant observer of a non-rotating black hole: shadow radius ≈ 2.6 × horizon radius.'},
 {start:57,end:74,title:'A portrait of an edge.',label:'LIGHT REVEALS THE UNSEEN',detail:'An illustrative model, not telescope data. No view of the interior is shown.'},
];
export const NARRATION = [
 {at:0,duration:10.30,file:'01-hook.mp3',text:"A black hole is invisible. So why do we keep drawing a ring of fire? The answer is stranger than the picture. That glow isn't the hole. It's the universe around it."},
 {at:12,duration:13.15,file:'02-disk.mp3',text:"Gas spirals inward, forming an accretion disk. As it heats up, it radiates. But the dark boundary at the centre is different. Cross the event horizon, and even light cannot get back out."},
 {at:27,duration:11.37,file:'03-lensing.mp3',text:"Outside that boundary, gravity bends light's path. Some light from the far side of the disk curves over the black hole and reaches us. We're seeing behind it. Not through it."},
 {at:41,duration:13.50,file:'04-shadow.mp3',text:"And that dark patch? It's a shadow, shaped by light being captured and bent. It looks larger than the event horizon itself. The bright ring is not a solid surface. It's a pattern made by light."},
 {at:57,duration:11.72,file:'05-ending.mp3',text:"So a black hole image isn't a photograph of the inside. It's a portrait of an edge we cannot see beyond. The darkness tells us what is missing. The light tells us why."},
];
// Sentence-level captions are weighted within the measured, slowed voice clips.
export const CAPTIONS = NARRATION.flatMap(n=>{
 const sentences=n.text.match(/[^.!?]+[.!?]+/g)||[n.text];
 const total=sentences.reduce((a,s)=>a+s.trim().split(/\s+/).length,0);
 let cursor=n.at;
 return sentences.map(s=>{const length=s.trim().split(/\s+/).length/total*n.duration;
 const cue={start:cursor,end:cursor+length,text:s.trim()};cursor+=length;return cue;});
});
export function chapterAt(t){return CHAPTERS.findIndex(c=>t>=c.start&&t<c.end) < 0 ? 4 : CHAPTERS.findIndex(c=>t>=c.start&&t<c.end);}
