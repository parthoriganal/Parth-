export const FPS = 24;
export const VISUAL_TYPES = [
  {id:'cinematic', label:'Cinematic image', short:'Cinematic', description:'An atmospheric image with subtle camera movement.'},
  {id:'kinetic', label:'Kinetic typography', short:'Typography', description:'Expressive type and layered motion.'},
  {id:'diagram', label:'Vector explainer', short:'Diagram', description:'A connected three-part Motion Canvas diagram.'},
  {id:'infographic', label:'Data infographic', short:'Infographic', description:'Animated bars for your verified percentage data.'},
  {id:'object-phone', label:'3D smartphone', short:'3D object', description:'A lit, procedural smartphone used as a supporting object.'},
  {id:'object-clock', label:'3D clock', short:'3D object', description:'A lit, procedural clock used as a supporting object.'},
  {id:'object-globe', label:'3D globe', short:'3D object', description:'A lit, procedural globe used as a supporting object.'},
  {id:'photo', label:'Photo', short:'Photo', description:'A user-supplied still image.'},
  {id:'footage', label:'Footage', short:'Footage', description:'A user-supplied video clip.'},
];
export const DIRECTIONS = ['Futuristic technology', 'Documentary', 'Educational explainer', 'Cinematic promotion'];
export const DIRECTION_ACCENTS = {'Futuristic technology':'#a992ff','Documentary':'#eebc92','Educational explainer':'#8ddbd3','Cinematic promotion':'#e393ad'};
export const makeId = () => globalThis.crypto?.randomUUID?.() || `scene-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
export const sceneFrames = (scene, fps=FPS) => Math.max(1, Math.round(Number(scene.duration) * fps));
export const totalFrames = (project) => project.scenes.reduce((sum,s) => sum + sceneFrames(s,project.fps),0);
export const totalSeconds = (project) => totalFrames(project) / project.fps;
export const sceneStart = (project, index) => project.scenes.slice(0,index).reduce((sum,s)=>sum+sceneFrames(s,project.fps),0) / project.fps;
export const dimensions = (project, preview=false) => {
  const large = project.resolution === '4k' && !preview;
  return project.format === 'vertical' ? {width:large?2160:1080,height:large?3840:1920} : {width:large?3840:1920,height:large?2160:1080};
};
export const formatTime = (seconds) => {const n=Math.max(0,Math.floor(seconds));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;};
export const visualLabel = (type) => VISUAL_TYPES.find(v=>v.id===type)?.label || type;
export function defaultProject(){return {
  version:1, name:'The future is in motion',
  brief:'A cinematic film about how creative ideas become powerful stories. Make it optimistic, human and forward-looking.',
  direction:'Futuristic technology', format:'landscape', resolution:'1080p', fps:FPS, accent:'#a992ff',
  scenes:[
    {id:'opening',name:'A new perspective',type:'cinematic',title:'The future\nis in motion.',subtitle:'Every great story starts with a new perspective.',narration:'Every great story starts with a new perspective.',duration:5,assetId:'demo-earth',labels:['IDEA','MOTION','IMPACT']},
    {id:'idea',name:'The big idea',type:'kinetic',title:'Make the complex\nfeel simple.',subtitle:'Transform big ideas into stories that move people.',narration:'Transform big ideas into stories that move people.',duration:4.5,assetId:null,labels:['IDEA','MOTION','IMPACT']},
    {id:'system',name:'From idea to impact',type:'diagram',title:'From insight\nto impact.',subtitle:'Clarity, craft, and a little bit of imagination.',narration:'Clarity, craft, and a little bit of imagination.',duration:5,assetId:null,labels:['INSIGHT','STORY','IMPACT']},
    {id:'object',name:'Connected by design',type:'object-phone',title:'A world of ideas.\nIn your hands.',subtitle:'Bring every detail into focus.',narration:'Bring every detail into focus.',duration:5,assetId:null,labels:['IDEA','MOTION','IMPACT']},
    {id:'outro',name:'The next chapter',type:'kinetic',title:'Create what\ncomes next.',subtitle:'A new chapter starts with you.',narration:'A new chapter starts with you.',duration:4.5,assetId:null,labels:['IDEA','MOTION','IMPACT']},
  ],
  audio:{music:{assetId:'demo-score',volume:0.35,offset:0},narration:null,effects:[{id:'fx-demo',assetId:'demo-swish',volume:0.35,offset:4.65}]}
};}
export function newScene(){return {id:makeId(),name:'Untitled scene',type:'kinetic',title:'Your next\nbig idea.',subtitle:'Add a supporting line to your story.',narration:'',duration:4,assetId:null,labels:['IDEA','STORY','IMPACT']};}
export function trackList(project){return [project.audio?.music&&{...project.audio.music,kind:'music'},project.audio?.narration&&{...project.audio.narration,kind:'narration'},...(project.audio?.effects||[]).map(e=>({...e,kind:'effect'}))].filter(Boolean);}
