// A small CPU renderer keeps the real 3D scene running when hardware WebGL is unavailable.
// Both rendering paths use the same meshes, camera, materials and animation timeline.
import * as THREE from 'three';

export class SoftwareRenderer {
  constructor(){this.domElement=document.createElement('canvas');this.ctx=this.domElement.getContext('2d',{alpha:true});this.ratio=1;this.shadowMap={};this.patterns=new WeakMap();this.colors=new WeakMap();this.width=1;this.height=1;this.isSoftwareRenderer=true;}
  setPixelRatio(r){this.ratio=Math.min(r,1.5);}
  setClearColor(){}
  setSize(w,h){this.width=w;this.height=h;this.domElement.width=Math.round(w*this.ratio);this.domElement.height=Math.round(h*this.ratio);this.domElement.style.width=w+'px';this.domElement.style.height=h+'px';}
  pattern(texture){if(!texture?.image)return null;let p=this.patterns.get(texture);if(!p){p=this.ctx.createPattern(texture.image,'repeat');this.patterns.set(texture,p);}return p;}
  render(scene,camera){
    const ctx=this.ctx,w=this.width,h=this.height;ctx.setTransform(this.ratio,0,0,this.ratio,0,0);ctx.clearRect(0,0,w,h);
    scene.updateMatrixWorld();camera.updateMatrixWorld();camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    const proj=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    const center=new THREE.Vector3(0,-.12,0).project(camera),bottomY=(1-center.y)*h/2;
    const shadow=ctx.createRadialGradient(w/2,bottomY,0,w/2,bottomY,w*.32);shadow.addColorStop(0,'rgba(72,76,52,.18)');shadow.addColorStop(.7,'rgba(72,76,52,.045)');shadow.addColorStop(1,'rgba(72,76,52,0)');
    ctx.save();ctx.translate(0,bottomY*.67);ctx.scale(1,.33);ctx.fillStyle=shadow;ctx.fillRect(0,0,w,h*3);ctx.restore();
    const tris=[],light=new THREE.Vector3(-.4,.8,.65).normalize(),normal=new THREE.Vector3(),c=new THREE.Color();
    scene.traverseVisible(obj=>{
      if(!obj.isMesh||!obj.geometry||obj.material?.isShadowMaterial)return;
      const g=obj.geometry,mat=Array.isArray(obj.material)?obj.material[0]:obj.material;if(!mat||mat.opacity===0||mat.wireframe)return;
      const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,idx=g.index?.array;
      const count=idx?idx.length:p.count,transform=new THREE.Matrix4().multiplyMatrices(proj,obj.matrixWorld),nm=new THREE.Matrix3().getNormalMatrix(obj.matrixWorld);
      const projected=new Float64Array(p.count*3);const point=new THREE.Vector3();
      for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(transform);projected[i*3]=(point.x+1)*w/2;projected[i*3+1]=(1-point.y)*h/2;projected[i*3+2]=point.z;}
      c.copy(mat.color||new THREE.Color(0xffffff)).convertLinearToSRGB();
      const base=[c.r*255,c.g*255,c.b*255];
      for(let i=0;i<count;i+=3){
        const a=idx?idx[i]:i,b=idx?idx[i+1]:i+1,d=idx?idx[i+2]:i+2;
        const ax=projected[a*3],ay=projected[a*3+1],bx=projected[b*3],by=projected[b*3+1],dx=projected[d*3],dy=projected[d*3+1];
        const area=(bx-ax)*(dy-ay)-(by-ay)*(dx-ax);
        if(Math.abs(area)<.03||mat.side!==THREE.DoubleSide&&area>=0)continue;
        if(Math.max(ax,bx,dx)<0||Math.min(ax,bx,dx)>w||Math.max(ay,by,dy)<0||Math.min(ay,by,dy)>h)continue;
        normal.set(n?(n.getX(a)+n.getX(b)+n.getX(d))/3:0,n?(n.getY(a)+n.getY(b)+n.getY(d))/3:1,n?(n.getZ(a)+n.getZ(b)+n.getZ(d))/3:0).applyMatrix3(nm).normalize();
        if(area>=0)normal.negate();
        const bright=mat.isMeshBasicMaterial?1:Math.min(1,.69+Math.max(0,normal.dot(light))*.33);
        let texture=mat.map,white=false;
        if(texture&&mat.userData.reveal&&uv){const v=(uv.getY(a)+uv.getY(b)+uv.getY(d))/3;white=1-v>mat.userData.reveal.value;if(white)texture=null;}
        tris.push({xy:[ax,ay,bx,by,dx,dy],layer:obj.userData.softwareLayer||0,z:(projected[a*3+2]+projected[b*3+2]+projected[d*3+2])/3,base:white?[242,237,222]:base,bright,texture,uv:texture&&uv?[uv.getX(a),uv.getY(a),uv.getX(b),uv.getY(b),uv.getX(d),uv.getY(d)]:null,opacity:mat.transparent?mat.opacity:1});
      }
    });
    tris.sort((a,b)=>a.layer-b.layer||b.z-a.z);
    for(const t of tris){
      const q=t.xy;ctx.globalAlpha=t.opacity;ctx.beginPath();ctx.moveTo(q[0],q[1]);ctx.lineTo(q[2],q[3]);ctx.lineTo(q[4],q[5]);ctx.closePath();
      ctx.fillStyle=`rgb(${Math.round(t.base[0]*t.bright)},${Math.round(t.base[1]*t.bright)},${Math.round(t.base[2]*t.bright)})`;ctx.fill();if(!t.texture){ctx.lineWidth=.4;ctx.strokeStyle=ctx.fillStyle;ctx.stroke();}
      if(t.texture&&t.uv){
        const image=t.texture.image,tw=image.width,th=image.height,u=t.uv,ox=t.texture.offset.x,oy=t.texture.offset.y;
        const u0=(u[0]+ox)*tw,v0=(1-u[1]-oy)*th,u1=(u[2]+ox)*tw,v1=(1-u[3]-oy)*th,u2=(u[4]+ox)*tw,v2=(1-u[5]-oy)*th;
        const det=(u1-u0)*(v2-v0)-(u2-u0)*(v1-v0);
        if(Math.abs(det)>.001){
          const aa=((q[2]-q[0])*(v2-v0)-(q[4]-q[0])*(v1-v0))/det,bb=((q[3]-q[1])*(v2-v0)-(q[5]-q[1])*(v1-v0))/det;
          const cc=((q[4]-q[0])*(u1-u0)-(q[2]-q[0])*(u2-u0))/det,dd=((q[5]-q[1])*(u1-u0)-(q[3]-q[1])*(u2-u0))/det;
          const ee=q[0]-aa*u0-cc*v0,ff=q[1]-bb*u0-dd*v0;
          ctx.save();const cx=(q[0]+q[2]+q[4])/3,cy=(q[1]+q[3]+q[5])/3;ctx.beginPath();for(let j=0;j<3;j++){const px=q[j*2],py=q[j*2+1],dl=Math.hypot(px-cx,py-cy)||1;const ex=px+(px-cx)/dl*.6,ey=py+(py-cy)/dl*.6;if(j===0)ctx.moveTo(ex,ey);else ctx.lineTo(ex,ey);}ctx.closePath();ctx.clip();ctx.transform(aa,bb,cc,dd,ee,ff);ctx.fillStyle=this.pattern(t.texture);ctx.fillRect(Math.min(u0,u1,u2)-2,Math.min(v0,v1,v2)-2,Math.max(u0,u1,u2)-Math.min(u0,u1,u2)+4,Math.max(v0,v1,v2)-Math.min(v0,v1,v2)+4);ctx.restore();
          if(t.bright<.99){ctx.fillStyle=`rgba(25,31,31,${1-t.bright})`;ctx.fill();}
        }
      }
    }
    ctx.globalAlpha=1;
  }
}
