import { createFilm } from './film.js';
const $=s=>document.querySelector(s),audio=$('#narration');let film,playing=false,position=0;
await Promise.all([document.fonts.load('800 60px Manrope'),document.fonts.load('400 52px Cormorant'),document.fonts.load('italic 400 100px Cormorant')]);
try{film=createFilm($('#film'));}catch(error){console.error(error);const c=$('#film').getContext('2d');c.fillStyle='#eee9dc';c.fillRect(0,0,720,1280);c.fillStyle='#24251f';c.font='40px Georgia';c.fillText('Watch the finished film',100,620);$('#overlay').onclick=()=>location.href='/films/maison-legacy.mp4';}
const format=t=>'00:'+String(Math.floor(t)).padStart(2,'0');
function update(){const chapter=film?.render(position);$('#seek').value=position;$('#time').textContent=format(position);document.querySelectorAll('[data-time]').forEach((b,i)=>b.classList.toggle('active',i===chapter));}
function setPlaying(value){if(!film)return;playing=value;if(playing&&position>=22){position=0;audio.currentTime=0;}document.querySelector('.player').classList.toggle('playing',playing);$('#play').textContent=playing?'Ⅱ':'▶';$('#overlay span').textContent=playing?'Ⅱ':'▶';$('#play').setAttribute('aria-label',playing?'Pause film':'Play film');if(playing){audio.currentTime=Math.min(position,audio.duration||22);audio.play().catch(()=>setPlaying(false));}else audio.pause();}
$('#play').onclick=$('#play-large').onclick=()=>setPlaying(!playing);if(film)$('#overlay').onclick=()=>setPlaying(!playing);
$('#seek').oninput=e=>{position=+e.target.value;audio.currentTime=position;update();};$('#mute').onclick=()=>{audio.muted=!audio.muted;$('#mute').textContent=audio.muted?'◖×':'◖))';$('#mute').setAttribute('aria-label',audio.muted?'Unmute voiceover':'Mute voiceover');};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('.film-wrap').requestFullscreen();}catch{}};
document.querySelectorAll('[data-time]').forEach(button=>button.onclick=()=>{position=+button.dataset.time;audio.currentTime=position;update();setPlaying(true);});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['BUTTON','INPUT','A'].includes(document.activeElement.tagName)){e.preventDefault();setPlaying(!playing);}});
const exporting=new URLSearchParams(location.search).has('render');let last=performance.now();function tick(now){let delta=Math.min(.1,(now-last)/1000);last=now;if(playing){position=audio.ended?position+delta:audio.currentTime;if(position>=22){position=22;setPlaying(false);}if(film)update();}requestAnimationFrame(tick);}update();if(!exporting)requestAnimationFrame(tick);
window.renderFrame=t=>{playing=false;audio.pause();position=t;return film.render(t);};window.filmReady=!!film;
