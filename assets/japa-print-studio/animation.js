import * as THREE from 'three';
import { SoftwareRenderer } from './software-renderer.js';
import { RoomEnvironment } from './assets/RoomEnvironment.js';
import { createStudio, DURATION, PHASE_SECONDS } from './studio.js';

const PHASES=[
  ['Full Sublimation Printing','Printed transfer paper, aligned polyester fabric, heat, then a clean reveal.'],
  ['Commercial Apparel & Uniforms','Cut panels join into JAPA teamwear, finished with collars and stitched hems.'],
  ['Diverse Printing Technologies','Screen printing and digital inkjet, each with its own tools and motion.'],
  ['Direct-to-Garment (DTG)','The garment travels on its platen as the print head lays down the design.'],
  ['Merchandise & Large-Format Sublimation Fabric','JAPA artwork on coated merchandise and a large-format fabric display.'],
  ['Print Roll Services','Printed media feeds smoothly from the printer onto a supported take-up roll.']
];
const ACTIONS=[['Align transfer','Heat transfer','Lift and reveal'],['Cut panels','Join and finish','Teamwear, complete'],['Prepare screen','Apply ink','Screen and digital print'],['Load garment','Print in passes','Unload the platen'],['Prepare artwork','Print and unfurl','JAPA, on every surface'],['Load the roll','Print and feed','Wind onto take-up roll']];
const viewport=document.querySelector('#viewport'),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(window.self!==window.top)document.body.classList.add('is-framed');
if(new URLSearchParams(location.search).get('embed')==='1')document.body.classList.add('panel-mode');

let renderer,world,clock,time=reducedMotion?6.8:0,playing=!reducedMotion,speed=1,lastPhase=-1,lastUI=-1,needsRender=true,suspended=false,failed=false;
const ui={title:document.querySelector('#activeTitle'),number:document.querySelector('#activeNumber'),description:document.querySelector('#activeDescription'),action:document.querySelector('#actionLabel'),clock:document.querySelector('#timecode'),scrubber:document.querySelector('#scrubber')};
function resize(){if(!renderer||!world)return;const w=viewport.clientWidth,h=viewport.clientHeight;if(!w||!h)return;renderer.setSize(w,h);world.fit(w,h);needsRender=true;}
function updateUI(){
  const phase=Math.floor(time/8)%6,local=time%8;
  if(lastPhase!==phase){ui.title.textContent=PHASES[phase][0];ui.number.textContent=String(phase+1).padStart(2,'0');ui.description.textContent=PHASES[phase][1];document.querySelectorAll('.phase').forEach((b,i)=>{b.classList.toggle('active',i===phase);b.toggleAttribute('aria-current',i===phase);if(i===phase)b.setAttribute('aria-current','step');});lastPhase=phase;}
  const fraction=local/8;document.querySelectorAll('.phase-line').forEach((b,i)=>b.style.transform=`scaleX(${i===phase?fraction:0})`);document.querySelectorAll('.timeline-segments i').forEach((b,i)=>b.style.width=`${100*(i<phase?1:i===phase?fraction:0)}%`);
  ui.clock.textContent=`00:${String(Math.floor(time)).padStart(2,'0')}`;ui.scrubber.value=time;ui.scrubber.setAttribute('aria-valuetext',`${time.toFixed(1)} seconds, ${PHASES[phase][0]}`);ui.action.textContent=ACTIONS[phase][local<1.6?0:local<5.4?1:2];
  viewport.dataset.phase=String(phase);viewport.dataset.localTime=local.toFixed(2);viewport.dataset.visibleModels='1';
}
function setPlaying(value){playing=!!value;document.querySelector('#pauseIcon').toggleAttribute('hidden',!playing);document.querySelector('#playIcon').toggleAttribute('hidden',playing);document.querySelector('#playButton').setAttribute('aria-label',playing?'Pause animation':'Play animation');document.querySelector('#playbackLabel').textContent=playing?'PLAYING':'PAUSED';document.querySelector('#sceneState').textContent=playing?'THE JAPA STUDIO':'STUDIO PAUSED';document.querySelector('.scene-label').classList.toggle('is-paused',!playing);clock?.getDelta();needsRender=true;}
function seek(seconds){time=((Number(seconds)%DURATION)+DURATION)%DURATION;needsRender=true;updateUI();}
function setPhase(index){seek(THREE.MathUtils.clamp(Number(index),0,5)*PHASE_SECONDS+(playing?.65:6.8));}
function setPanel(value){document.body.classList.toggle('panel-mode',value);const url=new URL(location.href);value?url.searchParams.set('embed','1'):url.searchParams.delete('embed');history.replaceState(null,'',url);resize();}

function animate(){
  requestAnimationFrame(animate);
  if(failed||suspended)return;
  const dt=Math.min(clock.getDelta(),.1);
  if(playing)time=(time+dt*speed)%DURATION;
  if(!playing&&!needsRender)return;
  needsRender=false;
  world.update(time);
  renderer.render(world.scene,world.camera);
  if(Math.abs(time-lastUI)>.06||!playing){updateUI();lastUI=time;}
}
for(const b of document.querySelectorAll('[data-phase]'))b.addEventListener('click',()=>setPhase(b.dataset.phase));
document.querySelector('#playButton').addEventListener('click',()=>setPlaying(!playing));document.querySelector('#restartButton').addEventListener('click',()=>seek(0));document.querySelector('#speedSelect').addEventListener('change',e=>speed=Number(e.target.value));document.querySelector('#panelButton').addEventListener('click',()=>setPanel(true));document.querySelector('#exitPanel').addEventListener('click',()=>setPanel(false));
ui.scrubber.addEventListener('input',e=>{setPlaying(false);seek(Math.min(47.99,Number(e.target.value)));});
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();setPlaying(!playing);}if(e.key==='ArrowRight')setPhase((Math.floor(time/8)+1)%6);if(e.key==='ArrowLeft')setPhase((Math.floor(time/8)+5)%6);if(e.key==='Escape')setPanel(false);});
document.addEventListener('visibilitychange',()=>{suspended=document.hidden;clock?.getDelta();});

try{
  const logo=new Image();logo.src='./assets/japa-logo.jpg';await logo.decode();

  try{
    renderer=new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'highp',
    });
  }catch{
    renderer=new SoftwareRenderer();
  }

  // Crystal-clear high resolution scaling (up to 2x for sharp retina/tablet displays)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);

  world = createStudio(renderer, logo);
  if(!renderer.isSoftwareRenderer){
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    world.scene.environment = pmrem.fromScene(room, .04).texture;
    room.dispose();
    pmrem.dispose();
    world.scene.environmentIntensity = 0.50;
  }
  viewport.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  viewport.dataset.renderer = renderer.isSoftwareRenderer ? 'depth-buffered-cpu' : 'webgl';
  renderer.domElement.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    failed = true;
    document.querySelector('#fallback').hidden = false;
  });
  resize();
  new ResizeObserver(resize).observe(viewport);
  clock = new THREE.Clock();
  setPlaying(playing);
  document.querySelector('#loading').hidden = true;
  updateUI();
  animate();
  window.PrintMotion={play:()=>setPlaying(true),pause:()=>setPlaying(false),setPhase,seek,resize,getState:()=>({phase:Math.floor(time/8),time,playing,speed,models:6,visibleModels:world.models.filter(m=>m.visible).length,renderer:renderer.isSoftwareRenderer?'depth-buffered CPU':'WebGL'})};
}catch(error){
  console.error('JAPA studio could not initialize', error);
  failed=true;
  document.querySelector('#loading').hidden=true;
  document.querySelector('#fallback').hidden=false;
}
