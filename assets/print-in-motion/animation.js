import * as THREE from 'three';
import { RoundedBoxGeometry } from './assets/RoundedBoxGeometry.js';
import { SoftwareRenderer } from './software-renderer.js';

const PHASES = [
  ['Full Sublimation Printing', 'Vibrant colour meets fabric, edge to edge.'],
  ['Commercial Apparel & Uniforms', 'Individual panels come together. A team takes shape.'],
  ['Diverse Printing Technologies', 'Ink, screens and precision. Possibilities in every pass.'],
  ['Direct-to-Garment (DTG)', 'A blank canvas becomes something unmistakably yours.'],
  ['Merchandise & Large-Format Sublimation Fabric', 'Everyday objects and sweeping fabric, reimagined in colour.'],
  ['Print Roll Services', 'A continuous flow of colour, ready for the next creation.']
];
const viewport = document.querySelector('#viewport');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const embed = new URLSearchParams(location.search).get('embed') === '1';
if (embed) document.body.classList.add('panel-mode');
let renderer, scene, camera, clock, models = [], particles = [], time = 0, playing = !reducedMotion, speed = 1, lastPhase = -1, frame = 0;
let suspended = false, needsRender = true, failed = false;
const C = {ink:0x303d40, cream:0xf5f1e7, orange:0xee744b, cyan:0x5aabb2, yellow:0xe8bb57, pink:0xcf7b91, metal:0xaab6ad, white:0xfffcf4};
const mat = (color, roughness=.6, metalness=0) => new THREE.MeshStandardMaterial({color,roughness,metalness});
const M = {cream:mat(C.cream),ink:mat(C.ink,.42),orange:mat(C.orange,.44),cyan:mat(C.cyan),yellow:mat(C.yellow),pink:mat(C.pink),metal:mat(C.metal,.25,.65),white:mat(C.white,.85),fabric:mat(0xf5efe0,.97)};
const clamp = THREE.MathUtils.clamp;
const smooth = x => {x=clamp(x,0,1);return x*x*(3-2*x);};
const easeOut = x=>1-Math.pow(1-clamp(x,0,1),3);
const v3 = (x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

function mesh(geo,material,parent,pos=[0,0,0]) {
  const o = new THREE.Mesh(geo,material);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function box(parent,w,h,d,material,pos=[0,0,0],radius=.055) {
  const r = Math.min(radius,w/3,h/3,d/3);
  return mesh(new RoundedBoxGeometry(w,h,d,renderer?.isSoftwareRenderer?1:3,r),material,parent,pos);
}
function cylinder(parent,r1,r2,h,material,pos=[0,0,0],axis='y',segments=48) {
  const o=mesh(new THREE.CylinderGeometry(r1,r2,h,renderer?.isSoftwareRenderer?24:segments),material,parent,pos);
  if(axis==='x')o.rotation.z=Math.PI/2;if(axis==='z')o.rotation.x=Math.PI/2;return o;
}
function torus(parent,r,tube,material,pos=[0,0,0],arc=Math.PI*2) {return mesh(new THREE.TorusGeometry(r,tube,10,64,arc),material,parent,pos);}
function line(parent,points,color=0xb5bcae,opacity=1) {
  const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>v3(...p))),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));parent.add(o);return o;
}
function assembly(root,obj,delay=0,from=[0,.9,0]) {root.userData.parts.push({obj,target:obj.position.clone(),from:v3(...from),delay});return obj;}
function root() {const o=new THREE.Group();o.userData.parts=[];o.userData.updates=[];o.visible=false;scene.add(o);models.push(o);return o;}

function texture(kind='pattern',theme=0) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');
  const pal = theme ? ['#4d9fa9','#f1b75f','#f3ebd9','#d97051','#283b43'] : ['#e77550','#f2bd5d','#f7ecd6','#5b9faa','#303d48'];
  ctx.fillStyle=pal[0];ctx.fillRect(0,0,1024,1024);
  if(kind==='pattern') {
    ctx.save();ctx.translate(512,512);ctx.rotate(-.35);ctx.fillStyle=pal[2];ctx.fillRect(-800,-120,1600,240);ctx.fillStyle=pal[4];ctx.fillRect(-800,160,1600,110);ctx.fillStyle=pal[1];ctx.fillRect(-800,-370,1600,110);ctx.restore();
    ctx.fillStyle=pal[3];ctx.beginPath();ctx.arc(850,150,310,0,Math.PI*2);ctx.fill();ctx.fillStyle=pal[1];ctx.beginPath();ctx.arc(850,150,160,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=pal[2];ctx.lineWidth=9;for(let i=0;i<7;i++){ctx.beginPath();ctx.arc(40,950,135+i*27,-Math.PI/2,0);ctx.stroke();}
    ctx.save();ctx.translate(250,575);ctx.rotate(-.35);ctx.fillStyle=pal[4];ctx.font='bold 119px Arial';ctx.fillText('MAKE',0,0);ctx.font='22px Arial';ctx.fillText('S O M E T H I N G  G O O D',4,37);ctx.restore();
    ctx.fillStyle=pal[2];for(let i=0;i<6;i++){ctx.fillRect(680+i*28,740,9,120-i*9);}
  } else if(kind==='graphic') {
    ctx.fillStyle='#f6efdf';ctx.fillRect(0,0,1024,1024);ctx.fillStyle=pal[0];ctx.beginPath();ctx.arc(512,420,255,0,Math.PI*2);ctx.fill();ctx.fillStyle=pal[1];ctx.beginPath();ctx.arc(512,420,168,0,Math.PI*2);ctx.fill();ctx.fillStyle=pal[4];ctx.fillRect(230,390,560,80);ctx.fillStyle='#f7f1e3';ctx.font='bold 87px Arial';ctx.textAlign='center';ctx.fillText('CREATE',512,460);ctx.fillStyle=pal[4];ctx.font='23px Arial';ctx.fillText('S O M E T H I N G  O R I G I N A L',512,760);
  } else {
    ctx.fillStyle=theme?'#e77c55':'#344e57';ctx.fillRect(0,0,1024,1024);ctx.fillStyle=theme?'#344e57':'#f5efe0';ctx.font='bold 190px Arial';ctx.textAlign='center';ctx.fillText('CREW',512,465);ctx.font='bold 290px Arial';ctx.fillText('01',512,740);ctx.fillStyle='#e6b660';ctx.fillRect(440,315,144,16);
  }
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
const pattern=texture(), pattern2=texture('pattern',1), graphic=texture('graphic'),crew=texture('crew');
const fabricMat=(map)=>new THREE.MeshStandardMaterial({map,roughness:.95,side:THREE.DoubleSide});
function printMat(map) {
  const m=fabricMat(map), u={value:0};m.userData.reveal=u;
  m.onBeforeCompile=s=>{s.uniforms.uPrint=u;s.fragmentShader='uniform float uPrint;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat printMask = 1.0-smoothstep(uPrint-0.045,uPrint,1.0-vMapUv.y);\ndiffuseColor.rgb = mix(vec3(0.91,0.895,0.855),diffuseColor.rgb,printMask);');};
  return m;
}
function shapeMesh(parent,points,material,depth=.045,bevel=.018) {
  const s=new THREE.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,steps:1,curveSegments:8});
  g.computeBoundingBox();const b=g.boundingBox,uv=g.attributes.uv,pos=g.attributes.position;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(pos.getX(i)+1.18)/2.36,(pos.getY(i)+1.05)/2.1);uv.needsUpdate=true;
  return mesh(g,material,parent);
}
function shirt(parent,material,{scale=1,polo=false,root:r=null,delay=0}={}) {
  const g=new THREE.Group();parent.add(g);g.scale.setScalar(scale);
  const body=shapeMesh(g,[[-.37,1.02],[-.65,.89],[-.68,.3],[-.62,-1.02],[.62,-1.02],[.68,.3],[.65,.89],[.37,1.02],[.26,.84],[0,.77],[-.26,.84]],material);
  const left=shapeMesh(g,[[-.65,.89],[-.83,.83],[-1.17,.43],[-.93,.08],[-.67,.3]],material);
  const right=shapeMesh(g,[[.65,.89],[.83,.83],[1.17,.43],[.93,.08],[.67,.3]],material);
  if(r){assembly(r,body,delay,[0,.7,-.2]);assembly(r,left,delay+.15,[-1.5,.3,0]);assembly(r,right,delay+.28,[1.5,.3,0]);}
  const seamMat=new THREE.LineBasicMaterial({color:0xe5ddcb,transparent:true,opacity:.42});
  const seam=(a)=>{const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(a.map(p=>v3(...p))),seamMat);g.add(l);};
  seam([[-.58,-.91,.075],[.58,-.91,.075]]);seam([[-1.08,.39,.075],[-.91,.19,.075]]);seam([[1.08,.39,.075],[.91,.19,.075]]);
  if(polo) {
    const col=mat(0xece5d3,.95);shapeMesh(g,[[-.37,1.04],[-.04,.84],[-.22,.57],[-.51,.9]],col).position.z=.07;
    shapeMesh(g,[[.37,1.04],[.04,.84],[.22,.57],[.51,.9]],col).position.z=.07;
    box(g,.055,.4,.035,M.fabric,[0,.6,.11],.01);
    for(let i=0;i<3;i++)mesh(new THREE.SphereGeometry(.025,10,8),M.ink,g,[0,.75-i*.12,.145]);
    box(g,.27,.28,.025,M.fabric,[.37,.26,.09],.015);line(g,[[.25,.39,.11],[.49,.39,.11]],0xc9c6b8);
  }
  return g;
}
function label(parent,text,width,height,color='#e9eee1',bg='#344147') {
  const c=document.createElement('canvas');c.width=512;c.height=128;const a=c.getContext('2d');a.fillStyle=bg;a.fillRect(0,0,512,128);a.font='bold 47px Arial';a.textAlign='center';a.textBaseline='middle';a.fillStyle=color;a.fillText(text,256,65);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  return mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:t}),parent);
}
function hanger(parent,x,y,z) {
  const pts=[[-.56,-.17,0],[0,.13,0],[.56,-.17,0],[-.56,-.17,0]];const h=new THREE.Group();parent.add(h);h.position.set(x,y,z);
  const curve=new THREE.CatmullRomCurve3(pts.map(p=>v3(...p)),false,'catmullrom',0);
  mesh(new THREE.TubeGeometry(curve,24,.023,6,false),M.metal,h);
  const hook=torus(h,.10,.022,M.metal,[.08,.29,0],Math.PI*1.5);hook.rotation.z=-Math.PI/2;line(h,[[0,.13,0],[0,.29,0]],0x929e94);
  return h;
}

function makeSublimation() {
  const r=root();r.rotation.y=-.12;
  assembly(r,box(r,2.5,.2,2.65,M.ink,[0,.12,.1],.08),0,[0,-.8,0]);
  assembly(r,box(r,2.15,.15,2.20,M.cream,[0,.32,.23]),.06,[0,-.6,0]);
  assembly(r,box(r,.32,1.9,.42,M.ink,[0,1.18,-.87]),.15,[0,1.5,0]);
  cylinder(r,.15,.15,.65,M.metal,[0,1.8,-.84],'x');
  const printed=printMat(pattern);const tee=shirt(r,printed,{scale:.9});tee.rotation.x=-Math.PI/2;tee.position.set(0,.45,.28);assembly(r,tee,.2,[0,.6,.8]);
  const pivot=new THREE.Group();pivot.position.set(0,1.5,-.85);r.add(pivot);assembly(r,pivot,.3,[0,1.1,0]);
  box(pivot,2.18,.20,2.14,M.cream,[0,0,.95],.07);box(pivot,2.07,.045,2.02,M.orange,[0,.13,.95],.02);
  box(pivot,2.12,.065,2.08,M.ink,[0,-.12,.95]);
  for(const x of [-.7,.7])box(pivot,.09,.24,.11,M.ink,[x,.25,1.69]);
  cylinder(pivot,.055,.055,1.5,M.ink,[0,.39,1.69],'x');
  const control=box(r,.55,.42,.38,M.cream,[.59,1.48,-.89]);const screen=box(r,.32,.16,.015,M.ink,[.59,1.53,-.69],.01);label(r,'185°',.25,.09,'#a7d4bf').position.set(.59,1.53,-.679);
  const badge=label(pivot,'HEAT / TRANSFER',.8,.11,'#edeee4');badge.position.set(0,.19,1.49);badge.rotation.x=-Math.PI/2;
  for(const x of [-1,1])for(const z of [-.8,.8])cylinder(r,.1,.12,.13,M.ink,[x,0,z]);
  r.userData.updates.push(t=>{const close=smooth((t-1.65)/.85)*(1-smooth((t-4.2)/1.0));pivot.rotation.x=-.52*(1-close);pivot.position.y=1.5-close*.86;printed.userData.reveal.value=smooth((t-2.2)/2.0);tee.position.z+=smooth((t-5.5)/1.4)*.30;});
  return r;
}

function makeUniforms() {
  const r=root();
  const rail=new THREE.Group();r.add(rail);assembly(r,rail,0,[0,1.5,-1]);
  for(const x of [-1.75,1.75]){cylinder(rail,.035,.035,2.8,M.metal,[x,1.36,-.65]);box(rail,.5,.07,.65,M.cream,[x,.015,-.65]);}
  cylinder(rail,.035,.035,3.53,M.metal,[0,2.76,-.65],'x');
  const garments=[];
  [[-1.12,1.30,-.45,.72,M.fabric,false],[1.14,1.33,-.51,.75,fabricMat(pattern2),false],[0,1.36,.32,.96,fabricMat(crew),true]].forEach(([x,y,z,s,m,p],i)=>{
    const garment=shirt(r,m,{scale:s,polo:p,root:r,delay:.15+i*.2});garment.position.set(x,y,z);garment.userData.baseRotation=i===0?.18:i===1?-.17:.05;garment.rotation.y=garment.userData.baseRotation;hanger(garment,0,1.01,-.02);garments.push(garment);
  });
  const stack=new THREE.Group();r.add(stack);stack.position.set(1.3,.08,.88);stack.rotation.y=-.18;assembly(r,stack,.6,[1,-.2,0]);
  for(let i=0;i<3;i++)box(stack,.85,.11,.6,[M.cream,M.orange,M.cyan][i],[0,i*.12,0],.04);
  r.userData.updates.push(t=>{garments.forEach((g,i)=>{g.rotation.z=Math.sin(t*.95+i)*.018;g.rotation.y=g.userData.baseRotation+Math.sin(t*.65+i)*.035;});});
  return r;
}

function makeTechnologies() {
  const r=root();
  assembly(r,box(r,3.7,.18,2.3,M.ink,[0,.18,.0]),0,[0,-1,0]);
  assembly(r,box(r,3.5,.15,2.15,M.cream,[0,.38,0]),.05,[0,-.7,0]);
  for(const x of [-1.5,1.5])assembly(r,box(r,.22,1.55,.52,M.cream,[x,1.18,-.42]),.15,[x*.2,.7,0]);
  assembly(r,box(r,3.35,.48,.68,M.cream,[0,1.97,-.42]),.25,[0,1,0]);
  box(r,3.1,.10,.06,M.ink,[0,1.84,-.05],.02);cylinder(r,.035,.035,2.8,M.metal,[0,1.68,-.16],'x');
  const head=new THREE.Group();r.add(head);head.position.set(0,1.59,-.16);assembly(r,head,.4,[0,.8,0]);box(head,.55,.48,.52,M.ink);box(head,.47,.14,.04,M.orange,[0,.12,.29]);
  const dots=[];[M.cyan,M.pink,M.yellow,M.ink].forEach((m,i)=>{const b=new THREE.Group();r.add(b);b.position.set(-.63+i*.42,2.53,-.42);assembly(r,b,.36+i*.1,[0,1.3,0]);box(b,.30,.46,.38,m);box(b,.26,.09,.31,M.cream,[0,.28,0]);dots.push(b);});
  const paperMat=printMat(pattern2);const sheet=mesh(new THREE.PlaneGeometry(2.45,1.55),paperMat,r,[0,.49,.17]);sheet.rotation.x=-Math.PI/2;
  const side=new THREE.Group();r.add(side);side.position.set(-1.7,.75,.95);side.rotation.set(-.2,.25,-.20);assembly(r,side,.3,[-1,.4,0]);
  box(side,.85,.85,.08,M.orange);const screen=mesh(new THREE.PlaneGeometry(.69,.69,8,8),new THREE.MeshStandardMaterial({color:0xd8ded1,wireframe:true,transparent:true,opacity:.65}),side,[0,0,.06]);box(side,.65,.10,.08,M.ink,[0,.17,.11]);
  const tile=new THREE.Group();r.add(tile);tile.position.set(1.22,.69,1);tile.rotation.set(-.25,-.25,.15);assembly(r,tile,.65,[1.5,.5,0]);box(tile,.7,.7,.055,M.cream);mesh(new THREE.PlaneGeometry(.58,.58),fabricMat(graphic),tile,[0,0,.045]);
  const name=label(r,'CMYK / CREATIVE SYSTEM',1.35,.13);name.position.set(0,2.01,-.061);
  r.userData.updates.push(t=>{head.position.x=Math.sin((t-1.1)*2)*1.08;paperMat.userData.reveal.value=smooth((t-1.7)/3.7);dots.forEach((b,i)=>b.position.y+=Math.sin(t*1.8+i)*.025);});return r;
}

function makeDTG() {
  const r=root();
  assembly(r,box(r,3.25,.30,2.3,M.ink,[0,.17,-.2]),0,[0,-.7,0]);
  assembly(r,box(r,3.1,.85,1.10,M.cream,[0,.87,-.70]),.15,[0,1.4,-.4]);
  for(const x of [-1.36,1.36])assembly(r,box(r,.35,1.15,.65,M.cream,[x,1.32,-.45]),.12,[x*.5,.6,0]);
  assembly(r,box(r,3.12,.22,.95,M.cream,[0,1.91,-.55]),.27,[0,1,0]);
  box(r,2.7,.10,.045,M.ink,[0,1.61,-.1]);
  cylinder(r,.035,.035,2.55,M.metal,[0,1.48,-.16],'x');
  const carriage=new THREE.Group();r.add(carriage);carriage.position.set(0,1.38,-.05);assembly(r,carriage,.4,[0,.7,0]);box(carriage,.63,.44,.49,M.ink);box(carriage,.50,.10,.035,M.cyan,[0,.11,.26]);
  const tray=new THREE.Group();r.add(tray);tray.position.set(0,.65,.63);assembly(r,tray,.25,[0,0,1.4]);box(tray,1.85,.12,2.2,M.ink);box(tray,1.78,.04,2.1,M.fabric,[0,.08,0]);
  const printed=printMat(graphic),tee=shirt(tray,printed,{scale:.85});tee.rotation.x=-Math.PI/2;tee.position.set(0,.13,0);
  const button=mesh(new THREE.SphereGeometry(.055,16,12),M.cyan,r,[1.2,1.03,-.13]);const l=label(r,'DTG / DIRECT TO GARMENT',1.13,.12);l.position.set(-.30,.99,-.135);
  [M.cyan,M.pink,M.yellow,M.ink].forEach((m,i)=>box(r,.16,.3,.20,m,[-.42+i*.28,2.13,-.5],.025));
  r.userData.updates.push(t=>{carriage.position.x=Math.sin((t-1.1)*2.4)*1.03;tray.position.z+=.15*Math.sin(t*.7)+smooth((t-4.6)/1.0)*.7;printed.userData.reveal.value=smooth((t-1.7)/3.3);});return r;
}

function cloth(parent,w,h,material,pos,mode='banner') {
  const geo=new THREE.PlaneGeometry(w,h,renderer?.isSoftwareRenderer?14:40,renderer?.isSoftwareRenderer?18:48);const original=geo.attributes.position.array.slice();const o=mesh(geo,material,parent,pos);
  return {mesh:o,update(t){const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=original[i*3],y=original[i*3+1];p.setZ(i,Math.sin(x*3+t*1.6)*.065+Math.sin(y*4+t)*.035);}p.needsUpdate=true;geo.computeVertexNormals();}};
}
function makeMerchandise() {
  const r=root();
  const banner=new THREE.Group();r.add(banner);banner.position.set(.12,1.47,-.82);banner.rotation.y=.1;assembly(r,banner,.1,[0,1.3,-.5]);
  const flag=cloth(banner,2.45,2.6,fabricMat(pattern2),[0,0,0]);for(const x of [-1.31,1.31])cylinder(banner,.024,.024,2.82,M.metal,[x,-.02,-.04]);cylinder(banner,.024,.024,2.65,M.metal,[0,1.35,-.04],'x');
  for(const x of [-1.31,1.31])box(banner,.38,.07,.5,M.cream,[x,-1.43,-.04]);
  const mug=new THREE.Group();r.add(mug);mug.position.set(-1.10,.11,.95);mug.rotation.y=.3;assembly(r,mug,.25,[-1,.8,.5]);
  const profile=[[0,.04],[.46,.04],[.54,.09],[.56,1.18],[.53,1.22],[.48,1.22],[.46,.18],[0,.18]].map(a=>new THREE.Vector2(...a));
  const mugmat=fabricMat(pattern);mesh(new THREE.LatheGeometry(profile,64),mugmat,mug);const rim=torus(mug,.512,.027,M.cream,[0,1.21,0]);rim.rotation.x=Math.PI/2;
  const handle=torus(mug,.34,.085,M.cream,[.62,.7,0]);handle.scale.x=.84;
  const tote=new THREE.Group();r.add(tote);tote.position.set(1.0,.85,.88);tote.rotation.set(.03,-.15,-.07);assembly(r,tote,.4,[1.4,1,0]);
  box(tote,1.23,1.38,.25,M.fabric,[0,-.07,0],.12);mesh(new THREE.PlaneGeometry(1.04,1.2),fabricMat(graphic),tote,[0,-.07,.132]);
  for(const z of [-.10,.14]){const p=[[-.39,.55,z],[-.39,1.18,z],[0,1.35,z],[.39,1.18,z],[.39,.55,z]].map(p=>v3(...p));mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p),36,.04,8,false),M.fabric,tote);}
  line(tote,[[-.51,.53,.14],[-.51,-.63,.14],[.51,-.63,.14],[.51,.53,.14]],0xc7bda8);
  r.userData.updates.push(t=>{flag.update(t);mug.rotation.y=.3+Math.sin(t*.5)*.17;tote.rotation.z=-.07+Math.sin(t)*.025;});return r;
}

function makeRolls() {
  const r=root();
  for(const x of [-1.55,1.55]){assembly(r,box(r,.16,1.52,.38,M.ink,[x,.78,-.30]),0,[x*.3,-.6,0]);box(r,.5,.12,1.4,M.ink,[x,.06,-.3]);}
  assembly(r,box(r,3.8,.72,.98,M.cream,[0,1.90,-.35]),.15,[0,1,-.3]);
  box(r,3.3,.11,.05,M.ink,[0,1.72,.17]);
  const roll=cylinder(r,.19,.19,3.2,M.metal,[0,1.46,.08],'x');
  const topRoll=cylinder(r,.14,.14,2.88,fabricMat(pattern2),[0,1.55,.32],'x');
  for(const x of [-1.78,1.78])box(r,.22,.46,1.02,M.ink,[x,1.7,-.35]);
  const l=label(r,'COLOUR / CONTINUOUS',1.1,.12);l.position.set(-.55,1.98,.149);
  const panel=box(r,.40,.22,.02,M.ink,[1.18,1.97,.155],.02);const led=box(r,.22,.07,.01,M.cyan,[1.18,1.99,.17],.01);
  const geo=new THREE.PlaneGeometry(2.81,2.5,renderer?.isSoftwareRenderer?16:42,renderer?.isSoftwareRenderer?24:55);const attr=geo.attributes.position,uv=geo.attributes.uv;
  const printed=fabricMat(pattern2);const output=mesh(geo,printed,r);output.frustumCulled=false;
  const updateFabric=t=>{for(let i=0;i<attr.count;i++){const s=1-uv.getY(i);const x=(uv.getX(i)-.5)*2.81;attr.setXYZ(i,x,1.46*Math.pow(1-s,2)+.08+Math.sin(x*3+t)*.018*s,.34+1.65*Math.pow(s,3));}attr.needsUpdate=true;geo.computeVertexNormals();};
  const tube=new THREE.Group();r.add(tube);tube.position.set(-2.05,.24,.75);tube.rotation.z=.14;assembly(r,tube,.5,[-1.1,.7,0]);cylinder(tube,.23,.23,1.8,fabricMat(pattern),[0,.9,0]);cylinder(tube,.15,.15,.035,mat(0xc8a47a),[0,1.82,0]);cylinder(tube,.065,.065,.04,M.ink,[0,1.842,0]);
  const moving=texture('pattern',1);moving.wrapT=THREE.RepeatWrapping;printed.map=moving;
  r.userData.updates.push(t=>{topRoll.rotation.x=t*.7;roll.rotation.x=t*.7;updateFabric(t);moving.offset.y=-t*.065;});return r;
}

function makeWorld() {
  scene=new THREE.Scene();scene.background=null;
  camera=new THREE.PerspectiveCamera(32,1,.1,60);camera.position.set(6.4,4.6,8.7);camera.lookAt(0,.95,.0);
  scene.add(new THREE.HemisphereLight(0xfffbed,0xb6b6a1,3.0));
  const key=new THREE.DirectionalLight(0xfff7e5,4);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.025;key.shadow.bias=-.00015;key.shadow.radius=4;scene.add(key);
  const fill=new THREE.DirectionalLight(0xd9e9f5,1.5);fill.position.set(4,4,-3);scene.add(fill);
  const floor=mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.085}),scene,[0,-.16,0]);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
  const platform=cylinder(scene,2.75,2.78,.14,mat(0xe5e5d8,.92),[0,-.10,0]);platform.castShadow=false;platform.userData.softwareLayer=-2;
  const platformTop=cylinder(scene,2.75,2.75,.025,mat(0xf4f2e8,.95),[0,-.017,0]);platformTop.userData.softwareLayer=-1;
  const ring=torus(scene,2.74,.008,mat(0xd6d8c9),[0,-.003,0]);ring.rotation.x=Math.PI/2;ring.userData.softwareLayer=-1;
  for(let i=0;i<28;i++){const a=i/28*Math.PI*2;const len=i%7===0?.13:.055;line(scene,[[Math.cos(a)*2.62,.001,Math.sin(a)*2.62],[Math.cos(a)*(2.62-len),.001,Math.sin(a)*(2.62-len)]],0xc8ccba,.55);}
  makeSublimation();makeUniforms();makeTechnologies();makeDTG();makeMerchandise();makeRolls();
  for(let i=0;i<14;i++){
    const p=mesh(i%3===0?new THREE.TorusGeometry(.075,.018,6,16):new RoundedBoxGeometry(.085,.085,.085,2,.015),[M.cyan,M.orange,M.yellow,M.pink][i%4],scene);
    p.userData={angle:i/14*Math.PI*2,radius:2.65+(i%3)*.13,y:.30+(i%5)*.38,speed:.08+(i%4)*.018};particles.push(p);
  }
}

function resize() {
  if(!renderer)return;const w=viewport.clientWidth,h=viewport.clientHeight;if(w<1||h<1)return;
  renderer.setSize(w,h);camera.aspect=w/h;
  // A constant horizontal viewing width keeps the workshop inside narrow login columns.
  const targetWidth=camera.aspect<1.15?6.5:7.3;
  const distance=11.75;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(targetWidth/(2*distance*camera.aspect)));
  camera.fov=clamp(camera.fov,23,63);camera.updateProjectionMatrix();needsRender=true;
}
function updateModel(r,local,isPrevious=false) {
  const p=local;const entry=easeOut(p/.85);const exit=isPrevious?1-easeOut(p/.85):1;
  r.visible=true;r.scale.setScalar(isPrevious?Math.max(.001,exit):Math.max(.001,.4+.6*entry));
  r.position.set(isPrevious?-.65*(1-exit):.5*(1-entry),isPrevious?-.6*(1-exit):.2*(1-entry),0);
  r.rotation.y=(isPrevious?-.40*(1-exit):.35*(1-entry))-.10+Math.sin(time*.13)*.065;
  for(const part of r.userData.parts){const progress=easeOut((p-part.delay)/1.05);part.obj.position.copy(part.target).addScaledVector(part.from,1-progress);}
  const work=isPrevious?8+p:p;for(const update of r.userData.updates)update(work);
}
function updateUI(phase,local) {
  if(phase!==lastPhase){document.querySelector('#activeNumber').textContent=String(phase+1).padStart(2,'0');document.querySelector('#activeTitle').textContent=PHASES[phase][0];document.querySelector('#activeDescription').textContent=PHASES[phase][1];document.querySelectorAll('.phase').forEach((b,i)=>{b.classList.toggle('active',phase===i);if(phase===i)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});lastPhase=phase;}
  const fraction=clamp(local/8,0,1);document.querySelectorAll('.phase-line').forEach((b,i)=>b.style.transform=`scaleX(${i===phase?fraction:0})`);
  document.querySelectorAll('.timeline i').forEach((b,i)=>b.style.width=`${(i<phase?1:i===phase?fraction:0)*100}%`);
  document.querySelector('#timecode').textContent=`00:${String(Math.floor(time%48)).padStart(2,'0')}`;
}
function render() {
  requestAnimationFrame(render);if(failed||suspended)return;
  const dt=Math.min(clock.getDelta(),.06);if(playing)time=(time+dt*speed)%48;
  if(!playing&&!needsRender)return;needsRender=false;frame++;
  const phase=Math.floor(time/8)%6,local=time%8;models.forEach(r=>r.visible=false);
  updateModel(models[phase],local);
  if(time>=8&&local<.85)updateModel(models[(phase+5)%6],local,true);
  else if(time<.85&&frame>120)updateModel(models[5],local,true);
  particles.forEach((p,i)=>{const u=p.userData,a=u.angle+time*u.speed;p.position.set(Math.cos(a)*u.radius,u.y+Math.sin(time*.65+i)*.1,Math.sin(a)*u.radius*.65);p.rotation.set(time*.25+i,time*.35,Math.PI/5);p.scale.setScalar(.7+.25*Math.sin(local*.7+i));});
  renderer.render(scene,camera);if(frame%3===0||!playing)updateUI(phase,local);
}
function setPlaying(value){playing=!!value;document.querySelector('#pauseIcon').toggleAttribute('hidden',!playing);document.querySelector('#playIcon').toggleAttribute('hidden',playing);document.querySelector('#playButton').setAttribute('aria-label',playing?'Pause animation':'Play animation');document.querySelector('#playbackLabel').textContent=playing?'PLAYING':'PAUSED';document.querySelector('#sceneState').textContent=playing?'CRAFTING IN 3D':'PAUSED IN 3D';document.querySelector('.scene-label').classList.toggle('is-paused',!playing);clock?.getDelta();needsRender=true;}
function setPhase(i){time=clamp(Number(i),0,5)*8+(playing?1.25:5.8);needsRender=true;updateUI(Math.floor(time/8),time%8);}
function setPanel(value){document.body.classList.toggle('panel-mode',value);const url=new URL(location.href);value?url.searchParams.set('embed','1'):url.searchParams.delete('embed');history.replaceState(null,'',url);resize();}
document.querySelectorAll('[data-phase]').forEach(b=>b.addEventListener('click',()=>setPhase(b.dataset.phase)));
document.querySelectorAll('[data-seek]').forEach(b=>b.addEventListener('click',()=>setPhase(b.dataset.seek)));
document.querySelector('#playButton').addEventListener('click',()=>setPlaying(!playing));
document.querySelector('#restartButton').addEventListener('click',()=>{time=0;needsRender=true;lastPhase=-1;updateUI(0,0);});
document.querySelector('#speedSelect').addEventListener('change',e=>speed=Number(e.target.value));
document.querySelector('#panelButton').addEventListener('click',()=>setPanel(true));
document.querySelector('#exitPanel').addEventListener('click',()=>setPanel(false));
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();setPlaying(!playing);}if(e.key==='ArrowRight')setPhase((Math.floor(time/8)+1)%6);if(e.key==='ArrowLeft')setPhase((Math.floor(time/8)+5)%6);if(e.key==='Escape')setPanel(false);});
document.addEventListener('visibilitychange',()=>{suspended=document.hidden;clock?.getDelta();});

try{
  const probe=document.createElement('canvas');
  const canUseGPU=!!probe.getContext('webgl2');
  if(canUseGPU){try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch{renderer=new SoftwareRenderer();}}
  else renderer=new SoftwareRenderer();
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.setClearColor(0x000000,0);
  viewport.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;document.querySelector('#fallback').hidden=false;});
  makeWorld();resize();new ResizeObserver(resize).observe(viewport);clock=new THREE.Clock();setPlaying(playing);
  if(reducedMotion)time=3;document.querySelector('#loading').hidden=true;updateUI(Math.floor(time/8),time%8);render();
  window.PrintMotion={play:()=>setPlaying(true),pause:()=>setPlaying(false),setPhase,getState:()=>({phase:Math.floor(time/8),time,playing,speed,models:models.length,webgl:!!renderer}),seek:seconds=>{time=((Number(seconds)%48)+48)%48;needsRender=true;},resize};
}catch(error){console.error('Print studio could not initialize',error);failed=true;document.querySelector('#loading').hidden=true;document.querySelector('#fallback').hidden=false;}
