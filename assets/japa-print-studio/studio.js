import * as THREE from 'three';
import { RoundedBoxGeometry } from './assets/RoundedBoxGeometry.js';

export const smooth=x=>{x=THREE.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
export const PHASE_SECONDS=8;
export const DURATION=48;
const vec=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

export function createStudio(renderer,logo){
  const scene=new THREE.Scene(),models=[];
  const camera=new THREE.PerspectiveCamera(31,1,.1,60);camera.position.set(5.7,4.2,9.3);camera.lookAt(0,.75,.10);
  const gpu=!renderer.isSoftwareRenderer;
  const material=(color,roughness=.5,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const M={white:material(0xf6f7fa,.36),ink:material(0x151922,.38),rubber:material(0x252831,.9),blue:material(0x1714d9,.32),red:material(0xc6002b,.37),steel:material(0xb7c0cf,.24,.8),aluminum:material(0xd3d8e2,.32,.67),fabric:material(0xf7f6f2,.94),cyan:material(0x00a7c4,.5),magenta:material(0xdd267c,.5),yellow:material(0xe7bd00,.5)};
  const mesh=(geo,mat,parent,pos=[0,0,0])=>{const o=new THREE.Mesh(geo,mat);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
  function box(parent,w,h,d,mat,pos=[0,0,0],radius=.035){return mesh(new RoundedBoxGeometry(w,h,d,gpu?3:2,Math.min(radius,w/3,h/3,d/3)),mat,parent,pos);}
  function cylinder(parent,r,h,mat,pos=[0,0,0],axis='y',segments=48){const o=mesh(new THREE.CylinderGeometry(r,r,h,gpu?segments:32),mat,parent,pos);if(axis==='x')o.rotation.z=Math.PI/2;if(axis==='z')o.rotation.x=Math.PI/2;return o;}
  function tube(parent,points,r,mat,segments=24){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>vec(...p))),segments,r,8,false),mat,parent);}
  function ring(parent,r,thick,mat,pos=[0,0,0],axis='z'){const o=mesh(new THREE.TorusGeometry(r,thick,10,gpu?64:40),mat,parent,pos);if(axis==='y')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.y=Math.PI/2;return o;}
  function nameplate(parent,text,w,h,pos,bg='#151922',fg='#ffffff'){const c=document.createElement('canvas');c.width=768;c.height=128;const a=c.getContext('2d');a.fillStyle=bg;a.fillRect(0,0,c.width,c.height);a.fillStyle=fg;a.font='500 45px Arial';a.textAlign='center';a.textBaseline='middle';a.fillText(text,c.width/2,c.height/2);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t}),parent,pos);}
  function art(kind='pattern'){
    const c=document.createElement('canvas');c.width=c.height=1024;const a=c.getContext('2d');a.fillStyle=kind==='crew'?'#161c2b':kind==='graphic'?'#f9f9f7':'#1610dc';a.fillRect(0,0,1024,1024);
    if(kind==='pattern'||kind==='roll'){
      a.fillStyle='#c8002c';a.beginPath();a.moveTo(710,0);a.lineTo(1024,0);a.lineTo(1024,1024);a.lineTo(260,1024);a.closePath();a.fill();
      a.save();a.translate(512,512);a.rotate(-.35);a.fillStyle='#ffffff';a.fillRect(-800,-90,1600,180);a.fillStyle='#161922';a.fillRect(-800,118,1600,34);a.fillRect(-800,-150,1600,18);a.restore();
      a.fillStyle='#fff';a.fillRect(330,170,365,365);a.drawImage(logo,344,184,337,337);
      a.fillStyle='#fff';a.font='bold 104px Arial';a.textAlign='left';a.fillText('JAPA',95,835);a.font='25px Arial';a.fillText('G L O B A L   T R A D I N G',100,884);
      a.strokeStyle='#ffffff33';a.lineWidth=2;for(let i=0;i<10;i++){a.beginPath();a.moveTo(60+i*12,20);a.lineTo(60+i*12,140);a.stroke();}
    }else if(kind==='crew'){
      a.fillStyle='#1811d8';a.fillRect(0,120,1024,130);a.fillStyle='#c8002c';a.fillRect(0,250,1024,44);a.fillStyle='#fff';a.fillRect(385,335,250,250);a.drawImage(logo,395,345,230,230);a.font='bold 244px Arial';a.textAlign='center';a.fillText('01',512,900);
    }else{a.drawImage(logo,234,250,556,556);}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=gpu?8:1;return t;
  }
  const pattern=art(),graphic=art('graphic'),crew=art('crew');
  const weaveCanvas=document.createElement('canvas');weaveCanvas.width=weaveCanvas.height=128;const wc=weaveCanvas.getContext('2d');wc.fillStyle='#808080';wc.fillRect(0,0,128,128);for(let y=0;y<128;y+=4){wc.fillStyle=y%8?'#999999':'#737373';wc.fillRect(0,y,128,1);}for(let x=0;x<128;x+=4){wc.fillStyle=x%8?'#999999':'#737373';wc.fillRect(x,0,1,128);}const weave=new THREE.CanvasTexture(weaveCanvas);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(15,15);
  function fabric(map=null){const m=new THREE.MeshStandardMaterial({color:0xffffff,map,roughness:.91,side:THREE.DoubleSide,bumpMap:weave,bumpScale:.0035});m.userData.cloth=true;return m;}
  function printed(map){const m=fabric(map),u={value:0};m.userData.reveal=u;m.onBeforeCompile=s=>{s.uniforms.uPrint=u;s.fragmentShader='uniform float uPrint;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat mask = 1.0-smoothstep(uPrint-0.02,uPrint,1.0-vMapUv.y);\ndiffuseColor.rgb = mix(vec3(0.94,0.935,0.92),diffuseColor.rgb,mask);');};return m;}
  function phase(){const r=new THREE.Group();r.userData.parts=[];r.userData.update=()=>{};r.userData.check=()=>true;r.visible=false;scene.add(r);models.push(r);return r;}
  function shaped(parent,points,mat,depth=.03){const s=new THREE.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:2});const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);p.setZ(i,z+.022*Math.cos(x*3)*Math.sin((y+1)*1.5));uv.setXY(i,(x+1.18)/2.36,(y+1.05)/2.1);}p.needsUpdate=true;uv.needsUpdate=true;g.computeVertexNormals();return mesh(g,mat,parent);}
  function shirt(parent,mat,scale=1,polo=false,assemble=null){
    const g=new THREE.Group();g.scale.setScalar(scale);parent.add(g);
    const body=shaped(g,[[-.37,1.02],[-.65,.89],[-.67,.30],[-.62,-1.02],[.62,-1.02],[.67,.30],[.65,.89],[.37,1.02],[.24,.84],[0,.78],[-.24,.84]],mat);
    const left=shaped(g,[[-.65,.89],[-.83,.83],[-1.17,.43],[-.93,.08],[-.67,.30]],mat);
    const right=shaped(g,[[.65,.89],[.83,.83],[1.17,.43],[.93,.08],[.67,.30]],mat);
    if(assemble){[[body,0,[0,.22,0]],[left,.3,[-.12,.18,0]],[right,.55,[.12,.18,0]]].forEach(([obj,delay,from])=>assemble.userData.parts.push({obj,delay,from:vec(...from),target:obj.position.clone()}));}
    const stitch=material(0xbcc1cd,.95);tube(g,[[-.58,-.93,.052],[0,-.94,.057],[.58,-.93,.052]],.004,stitch,16);
    if(polo){const collar=fabric();shaped(g,[[-.37,1.04],[-.035,.84],[-.22,.57],[-.50,.90]],collar).position.z=.045;shaped(g,[[.37,1.04],[.035,.84],[.22,.57],[.50,.90]],collar).position.z=.045;box(g,.055,.40,.028,M.fabric,[0,.61,.072],.008);for(let i=0;i<3;i++)mesh(new THREE.SphereGeometry(.021,12,8),M.ink,g,[0,.76-i*.115,.095]);}
    return g;
  }
  function foot(parent,x,z){box(parent,.33,.06,.36,M.rubber,[x,.03,z],.018);}
  function bolts(parent,points){for(const p of points)cylinder(parent,.022,.012,M.steel,p,'z',12);}
  function press(){
    const r=phase();for(const x of [-1.03,1.03])for(const z of [-.8,.85])foot(r,x,z);
    box(r,2.7,.22,2.65,M.ink,[0,.18,.04],.07);box(r,2.55,.09,2.45,M.aluminum,[0,.335,.10],.022);box(r,2.43,.10,2.28,M.rubber,[0,.43,.1],.025);
    box(r,.42,.88,.40,M.ink,[0,.74,-1.38]);box(r,.94,.16,.38,M.blue,[0,1.22,-1.38]);
    const ink=printed(pattern),tee=shirt(r,ink,.94);tee.rotation.x=-Math.PI/2;tee.position.set(0,.491,.12);tee.name="polyester-garment";
    const paper=mesh(new THREE.PlaneGeometry(2.24,2.10),fabric(),r,[0,.558,.1]);paper.rotation.x=-Math.PI/2;paper.name="transfer-paper";
    const pivot=new THREE.Group();pivot.position.set(0,.735,-1.09);r.add(pivot);
    box(pivot,2.62,.20,2.42,M.white,[0,0,1.18],.055);box(pivot,2.48,.045,2.28,M.blue,[0,.12,1.18],.02);box(pivot,2.55,.05,2.35,M.aluminum,[0,-.13,1.18],.02).name='hot-platen';
    tube(pivot,[[-.74,.16,1.9],[-.74,.46,1.9],[.74,.46,1.9],[.74,.16,1.9]],.045,M.ink,16);
    cylinder(r,.11,.64,M.steel,[0,.735,-1.09],'x');
    box(r,1.32,.10,.16,M.ink,[.45,1.05,-1.4]);box(r,.6,.34,.32,M.white,[.82,1.05,-1.40],.03);nameplate(r,'PRESS',.38,.13,[.82,1.09,-1.231]);
    nameplate(r,'SUBLIMATION',1.04,.12,[0,.18,1.371]);bolts(r,[[-1.1,.18,1.373],[1.1,.18,1.373]]);
    r.userData.update=t=>{const close=smooth((t-1.5)/.85)*(1-smooth((t-4.65)/.85));pivot.rotation.x=-.67*(1-close);paper.position.z=.1+(1-smooth((t-.5)/.7))*2.8+smooth((t-5.65)/.8)*3.9;paper.visible=t<6.5;ink.userData.reveal.value=smooth((t-3.0)/1.4);};
    return r;
  }
  function apparel(){
    const r=phase();for(const x of [-2.45,2.45]){foot(r,x,-.55);box(r,.38,.08,1.08,M.ink,[x,.10,-.55]);cylinder(r,.034,2.48,M.steel,[x,1.38,-.55]);}cylinder(r,.038,4.94,M.steel,[0,2.62,-.55],'x');
    const jerseys=[];[[-1.70,.60,fabric(crew),false],[0,.65,fabric(graphic),true],[1.70,.60,fabric(pattern),false]].forEach(([x,s,mat,polo])=>{
      const garment=shirt(r,mat,s,polo,r);garment.position.set(x,1.49,-.35);garment.name="uniform-"+jerseys.length;jerseys.push(garment);
      const hanger=new THREE.Group();hanger.position.set(x,2.10,-.40);r.add(hanger);tube(hanger,[[-.40,-.07,0],[0,.13,0],[.40,-.07,0],[-.40,-.07,0]],.017,M.steel,14);tube(hanger,[[0,.13,0],[0,.35,0],[.13,.47,0],[.20,.42,0]],.017,M.steel,14);
    });
    const folded=new THREE.Group();folded.position.set(.15,.06,1.02);r.add(folded);for(let i=0;i<3;i++)box(folded,1.1,.12,.7,[M.blue,M.fabric,M.red][i],[0,i*.12,0],.04);nameplate(r,'JAPA / TEAMWEAR',1.15,.12,[.15,.23,1.39]);
    r.userData.update=t=>{for(const p of r.userData.parts)p.obj.position.copy(p.target).addScaledVector(p.from,1-smooth((t-.5-p.delay)/1.0));};
    return r;
  }
  function technologies(){
    const r=phase(),table=new THREE.Group();table.position.set(-.75,0,.45);r.add(table);
    for(const x of [-1.08,1.08])for(const z of [-.65,.65]){foot(table,x,z);box(table,.08,.61,.08,M.steel,[x,.35,z]);}box(table,2.48,.12,1.95,M.white,[0,.72,0]);box(table,2.24,.045,1.74,M.rubber,[0,.805,0]);
    const ink=printed(graphic);const sheet=mesh(new THREE.PlaneGeometry(1.70,1.40),ink,table,[0,.842,.02]);sheet.rotation.x=-Math.PI/2;
    const frame=new THREE.Group();frame.position.set(0,.90,-.75);table.add(frame);
    for(const x of [-1.02,1.02])box(frame,.09,.08,1.72,M.aluminum,[x,0,.77],.012);for(const z of [-.08,1.61])box(frame,2.12,.08,.09,M.aluminum,[0,0,z],.012);
    const gridCanvas=document.createElement('canvas');gridCanvas.width=gridCanvas.height=256;const gc=gridCanvas.getContext('2d');gc.clearRect(0,0,256,256);gc.strokeStyle='#cbd1db';gc.lineWidth=1;for(let i=0;i<=256;i+=8){gc.beginPath();gc.moveTo(i,0);gc.lineTo(i,256);gc.moveTo(0,i);gc.lineTo(256,i);gc.stroke();}const grid=new THREE.CanvasTexture(gridCanvas);grid.colorSpace=THREE.SRGBColorSpace;const screen=mesh(new THREE.PlaneGeometry(1.95,1.59),new THREE.MeshStandardMaterial({map:grid,alphaTest:.5,side:THREE.DoubleSide,roughness:.8}),frame,[0,-.045,.76]);screen.rotation.x=-Math.PI/2;
    const blade=new THREE.Group();frame.add(blade);box(blade,1.73,.11,.045,M.rubber,[0,.01,0],.008);box(blade,1.78,.14,.15,M.red,[0,.15,0],.025);
    const printer=new THREE.Group();printer.position.set(1.74,0,-.48);r.add(printer);box(printer,1.46,.11,1.40,M.ink,[0,.08,0]);box(printer,1.45,.90,1.06,M.white,[0,.60,-.08],.05);box(printer,1.22,.18,.03,M.ink,[0,.43,.466]);box(printer,1.20,.12,.78,M.blue,[0,1.12,-.08],.025);nameplate(printer,'DIGITAL',.74,.12,[0,.85,.465]);
    const sample=mesh(new THREE.PlaneGeometry(.89,.92),fabric(pattern),printer,[0,.25,.68]);sample.rotation.x=-Math.PI/2;
    const inks=[M.cyan,M.magenta,M.yellow,M.ink];inks.forEach((m,i)=>{box(printer,.22,.32,.24,m,[-.42+i*.28,1.35,-.1],.02);box(printer,.18,.05,.18,M.ink,[-.42+i*.28,1.54,-.1],.01);});
    nameplate(table,'SCREEN PRINT',1.15,.12,[0,.72,.981]);
    r.userData.update=t=>{const down=smooth((t-.65)/.65)*(1-smooth((t-4.95)/.8));frame.rotation.x=-.42*(1-down);blade.position.z=.17+1.15*smooth((t-1.5)/2.5);ink.userData.reveal.value=smooth((t-1.5)/2.5);};return r;
  }
  function dtg(){
    const r=phase();for(const x of [-1.45,1.45])for(const z of [-1.1,1.1])foot(r,x,z);box(r,3.52,.24,3.12,M.ink,[0,.20,-.12],.06);
    for(const x of [-1.52,1.52]){box(r,.30,1.30,1.12,M.white,[x,1.03,-.48],.05);box(r,.30,.09,1.10,M.blue,[x,1.725,-.48],.012);}
    box(r,3.30,.30,1.10,M.white,[0,1.92,-.48],.06);box(r,2.65,.11,.39,M.ink,[0,1.60,-.35]);
    box(r,3.3,.65,.30,M.white,[0,1.19,-1.48]);
    cylinder(r,.026,2.76,M.steel,[0,1.42,-.10],'x');cylinder(r,.026,2.76,M.steel,[0,1.56,-.10],'x');
    const carriage=new THREE.Group();r.add(carriage);carriage.position.set(0,1.20,-.10);box(carriage,.43,.36,.42,M.ink);box(carriage,.35,.10,.035,M.blue,[0,.09,.226],.012);box(carriage,.30,.07,.24,M.steel,[0,-.215,0],.008).name='dtg-nozzle';carriage.name='dtg-carriage';
    for(const x of [-.38,.38]){box(r,.045,.10,2.8,M.steel,[x,.53,-.12],.012);for(const z of [-1.2,1.0])box(r,.12,.16,.20,M.ink,[x,.40,z],.02);}
    const tray=new THREE.Group();r.add(tray);tray.position.set(0,.73,1.12);box(tray,1.53,.10,1.95,M.ink);box(tray,1.0,.10,1.45,M.aluminum,[0,-.09,0]);box(tray,1.48,.035,1.90,M.rubber,[0,.068,0],.015);
    const print=printed(graphic),tee=shirt(tray,print,.85);tee.rotation.x=-Math.PI/2;tee.position.set(0,.105,0);tee.name="dtg-garment";
    nameplate(r,'DIRECT TO GARMENT',1.55,.12,[0,1.90,.081]);box(r,.28,.15,.03,M.ink,[1.13,1.91,.09],.015);box(r,.15,.04,.01,M.blue,[1.13,1.93,.112],.005);
    r.userData.update=t=>{const loading=smooth((t-.55)/.8),progress=smooth((t-1.7)/3.5),returning=smooth((t-5.4)/1.2);tray.position.z=1.12-.30*loading-1.64*progress+1.95*returning;carriage.position.x=t>5.3?-1.04:Math.sin(Math.max(0,t-1.6)*4.5)*1.03;print.userData.reveal.value=progress;};
    return r;
  }
  function merchandise(){
    const r=phase(),back=new THREE.Group();back.position.set(.05,0,-1.03);r.add(back);
    for(const x of [-1.62,1.62]){box(back,.50,.09,.54,M.ink,[x,.045,0]);cylinder(back,.025,2.87,M.steel,[x,1.50,0]);}cylinder(back,.038,3.28,M.aluminum,[0,2.95,0],'x');
    const bannerMat=fabric(pattern),geo=new THREE.PlaneGeometry(3.08,2.70,gpu?32:18,gpu?36:24),uv=geo.attributes.uv,pos=geo.attributes.position,flag=mesh(geo,bannerMat,back);
    const lower=cylinder(back,.045,3.12,M.aluminum,[0,.25,.01],'x');
    const mug=new THREE.Group();mug.position.set(-1.58,.11,.96);mug.name="merch-mug";r.add(mug);box(r,1.58,.13,1.35,M.white,[-1.46,.065,.96],.06);
    const profile=[[0,.02],[.43,.02],[.49,.07],[.50,1.16],[.48,1.20],[.435,1.20],[.425,.17],[0,.17]].map(p=>new THREE.Vector2(...p));
    mesh(new THREE.LatheGeometry(profile,gpu?80:56),material(0xfafafa,.18),mug);ring(mug,.46,.025,M.white,[0,1.19,0],'y');
    tube(mug,[[.47,.99,0],[.85,.94,0],[.94,.65,0],[.85,.35,0],[.47,.32,0]],.075,material(0xf8f9fb,.20),40);
    const mugInk=printed(pattern);mesh(new THREE.CylinderGeometry(.503,.503,.84,gpu?80:56,1,true),mugInk,mug,[0,.65,0]);
    const tote=new THREE.Group();tote.position.set(1.28,.93,1.01);tote.name="merch-tote";r.add(tote);box(r,1.60,.13,1.15,M.white,[1.28,.065,1.01],.06);box(tote,1.25,1.60,.30,M.fabric,[0,0,0],.10);
    const toteInk=printed(graphic);mesh(new THREE.PlaneGeometry(1.08,1.40),toteInk,tote,[0,0,.157]);
    for(const z of [-.11,.12])tube(tote,[[-.40,.69,z],[-.38,1.30,z],[0,1.49,z],[.38,1.30,z],[.40,.69,z]],.035,M.fabric,34);
    tube(tote,[[-.53,.64,.16],[-.53,-.69,.16],[.53,-.69,.16],[.53,.64,.16]],.005,material(0xb5b7bd),32);
    r.userData.update=t=>{const f=.18+.82*smooth((t-.65)/2.1);for(let i=0;i<pos.count;i++){const x=(uv.getX(i)-.5)*3.08,s=1-uv.getY(i);pos.setXYZ(i,x,2.95-2.70*s*f,.035+Math.sin(x*3+t*.7)*.026*Math.sin(s*Math.PI));}pos.needsUpdate=true;geo.computeVertexNormals();lower.position.y=2.95-2.70*f;mugInk.userData.reveal.value=smooth((t-1.1)/2.8);toteInk.userData.reveal.value=smooth((t-1.1)/2.8);};
    return r;
  }
  function rolls(){
    const r=phase();for(const x of [-1.66,1.66]){box(r,.45,.12,2.04,M.ink,[x,.06,.22]);box(r,.16,1.45,.38,M.steel,[x,.83,-.31]);box(r,.18,.22,1.57,M.ink,[x,.38,.63]);}
    box(r,3.96,.70,1.12,M.white,[0,1.89,-.12],.065);box(r,3.46,.12,.06,M.ink,[0,1.67,.471],.015);box(r,3.8,.13,1.02,M.blue,[0,2.31,-.12],.03);
    for(const x of [-1.85,1.85])box(r,.24,.39,1.10,M.ink,[x,1.62,-.12],.035);
    cylinder(r,.10,3.38,M.steel,[0,1.51,.49],'x');
    const takeupMat=fabric(pattern);takeupMat.map=pattern.clone();takeupMat.map.needsUpdate=true;const takeup=cylinder(r,.17,2.98,takeupMat,[0,.38,1.35],'x');takeup.name='take-up-roll';
    for(const x of [-1.58,1.58])cylinder(r,.13,.13,M.ink,[x,.38,1.35],'x');
    const feed=cylinder(r,.24,2.98,M.fabric,[0,1.43,-.70],'x');
    const rollMat=fabric(pattern);rollMat.map=pattern.clone();rollMat.map.wrapT=THREE.RepeatWrapping;rollMat.map.needsUpdate=true;
    const g=new THREE.PlaneGeometry(2.94,1.8,gpu?36:20,gpu?42:28),uv=g.attributes.uv,p=g.attributes.position;mesh(g,rollMat,r).name="continuous-web";
    const curve=new THREE.CubicBezierCurve3(vec(0,1.51,.50),vec(0,1.01,.69),vec(0,.55,1.10),vec(0,.55,1.35));
    for(let i=0;i<p.count;i++){const s=1-uv.getY(i),q=curve.getPoint(s);p.setXYZ(i,(uv.getX(i)-.5)*2.94,q.y,q.z);}p.needsUpdate=true;g.computeVertexNormals();
    nameplate(r,'JAPA / ROLL PRINT',1.22,.12,[-.58,1.98,.447]);box(r,.44,.23,.025,M.ink,[1.14,1.98,.46],.02);box(r,.26,.08,.012,M.blue,[1.14,2.0,.479],.008);
    r.userData.update=t=>{rollMat.map.offset.y=-t*.075;takeup.rotation.x=t*.40;feed.rotation.x=-t*.28;};return r;
  }
  scene.add(new THREE.HemisphereLight(0xf4f7ff,0xbcc3ce,1.4));const key=new THREE.DirectionalLight(0xfffcf6,3.4);key.position.set(-3.2,7,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:25});key.shadow.normalBias=.015;key.shadow.bias=-.0001;key.shadow.radius=5;scene.add(key);const fill=new THREE.DirectionalLight(0xe3e7ff,1.0);fill.position.set(4,3,-3);scene.add(fill);
  const platform=cylinder(scene,3.12,.16,material(0xe6e8ef,.72),[0,-.11,0]);platform.castShadow=false;cylinder(scene,3.13,.025,material(0xf5f6f9,.75),[0,-.017,0]);const ground=mesh(new THREE.PlaneGeometry(100,100),new THREE.ShadowMaterial({opacity:.11}),scene,[0,-.20,0]);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  press();apparel();technologies();dtg();merchandise();rolls();
  function update(time){const active=Math.floor(time/8)%6,t=time%8;models.forEach((r,i)=>r.visible=i===active);const r=models[active];r.position.set(t<.6?-8*(1-smooth(t/.6)):t>7.4?8*smooth((t-7.4)/.6):0,0,0);r.rotation.y=-.10;r.userData.update(t);return {active,local:t,visibleModels:1};}
  function fit(w,h){camera.aspect=w/h;const targetWidth=8.1,distance=camera.position.distanceTo(vec(0,.75,.1));const vertical=Math.max(5.45,targetWidth/camera.aspect);camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(vertical/(2*distance)));camera.updateProjectionMatrix();}
  return {scene,camera,models,update,fit};
}
