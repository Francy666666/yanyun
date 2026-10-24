(()=>{'use strict';
const status=document.getElementById('status');
if(!window.THREE){status.textContent='未能加载场景，请检查 assets/vendor/three/three.global.js';return;}
try{
const mobile=matchMedia('(pointer:coarse)').matches,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const embedded=window.parent!==window&&new URLSearchParams(location.search).get('embedded')==='1';
const sendParent=(type,extra={})=>{if(embedded)parent.postMessage({channel:'corridor-water-v1',type,...extra},'*');};
let worldActive=!embedded,entry=null,entryAcknowledged=false;
const captions=new JourneyCaptions(enabled=>sendParent('subtitle-setting',{enabled}));
captions.setActive(!embedded);if(!embedded)captions.enter(8);
const entryVeil=new WaterJourneyVeil();
const entrySkip=document.createElement('button');entrySkip.className='journey-skip';entrySkip.textContent='跳过 ›';entrySkip.hidden=true;document.body.append(entrySkip);
function finishEntry(){
 const heading=entry&&!entry.simple?Math.PI:0;
 entry=null;camera.position.set(0,2.6,-37);yaw=targetYaw=heading;pitch=targetPitch=-.16;
 camera.rotation.set(pitch,yaw,0);camera.updateMatrixWorld();pointerAnchor=null;
 entryVeil.set(0);entrySkip.hidden=true;captions.enter(8);document.body.classList.remove('journey-active');
 delete document.body.dataset.journeyTime;delete document.body.dataset.journeyPitch;
}
entrySkip.onclick=finishEntry;
document.getElementById('exit-world').onclick=e=>{if(embedded){e.preventDefault();worldActive=false;captions.transition();captions.setActive(false);sendParent('exit');}};
addEventListener('message',e=>{
 if(!embedded||e.source!==parent||e.data?.channel!=='corridor-water-v1')return;
 if(e.data.type==='subtitle-setting'&&typeof e.data.enabled==='boolean')captions.setEnabled(e.data.enabled);
 if(e.data.type==='enter'){
  worldActive=true;entryAcknowledged=false;entry={elapsed:0,turnStarted:false,simple:!!e.data.simple||reduced,skip:!!e.data.skip};
  captions.setActive(true);captions.transition();
  pointerDown=null;document.body.classList.add('journey-active');entrySkip.hidden=false;entryVeil.set(.16);
 }
 if(e.data.type==='suspend'){worldActive=false;entry=null;entryVeil.set(0);captions.transition();captions.setActive(false);}
});

const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
const quality=new SceneQuality(renderer,mobile);renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x020813);document.body.prepend(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.1,230);camera.position.set(0,2.6,0);camera.rotation.order='YXZ';
const count=mobile?12:18,rings=Array.from({length:count},()=>new THREE.Vector4(0,0,-100,0));
const uniforms={uTime:{value:0},uBlue:{value:0},uRings:{value:rings},uEye:{value:camera.position},uQuiet:{value:reduced?1:0}};
const common=`
precision highp float;
uniform float uTime;uniform float uBlue;
float hash3(vec3 p){p=fract(p*.3183099+vec3(.17,.31,.47));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float n=0.,a=.55;for(int i=0;i<4;i++){n+=a*noise3(p);p=p*2.03+vec3(3.1,7.2,1.8);a*=.5;}return n;}
vec3 worldLight(vec3 d){
 float t=uTime*.014;
 vec3 p=d*3.1;
 vec3 q=vec3(fbm(p+vec3(t,0,-t)),fbm(p+vec3(4.7,t,1.3)),fbm(p+vec3(-t,9.2,t)));
 float v=fbm(p+q*3.4);
 float fold=fbm(p*2.4+q*2.1);
 float stream=smoothstep(.38,.69,v);
  vec3 dark=mix(vec3(.001,.005,.018),vec3(.002,.006,.024),uBlue);
  vec3 mid=mix(vec3(.003,.11,.30),vec3(.012,.09,.30),uBlue);
  vec3 bright=mix(vec3(.015,.48,.80),vec3(.10,.38,.62),uBlue);
 vec3 col=mix(dark,mid,stream);
 col=mix(col,bright,smoothstep(.55,.73,v)*.90);
 float gold=smoothstep(.58,.77,fold)*smoothstep(.45,.64,v);
  col+=mix(vec3(.02,.40,.72),vec3(.015,.24,.52),uBlue)*gold*.72;
 float ribbon=pow(max(0.,1.-abs(fold-.53)*18.),3.)*stream;
 col+=mix(vec3(.008,.29,.62),vec3(.08,.26,.47),uBlue)*ribbon*.23;
 // Broad curved light ribbons reveal the enclosure without a visible mesh.
 float arc=exp(-pow((d.y-.18-.22*sin(atan(d.x,d.z)*2.0))/.11,2.));
 col+=vec3(.003,.035,.09)*arc*(.4+v);
 // Reference palette: deep blue shadows, luminous blue and restrained cyan highlights.
 float veil=smoothstep(.32,.70,v);
 vec3 paint=mix(vec3(.001,.006,.022),vec3(.003,.055,.19),veil);
 float blueLight=smoothstep(.43,.68,fold+.10*(q.x-q.z))*smoothstep(.36,.63,v);
 paint=mix(paint,vec3(.004,.19,.43),blueLight*.78);
 float softLight=smoothstep(.59,.79,v)*smoothstep(.40,.66,fold);
 paint=mix(paint,vec3(.025,.55,.82),softLight*.70);
 float silk=exp(-pow((fold-.55)/.047,2.))*smoothstep(.46,.69,v);
 paint+=vec3(.008,.27,.51)*silk*.28;
 paint+=vec3(.002,.019,.06)*arc;
 col=mix(paint,col,uBlue);
 return col;
}
vec3 finish(vec3 c){c=vec3(1.)-exp(-max(c,vec3(0.))*1.45);return pow(c,vec3(.84));}
`;
// Cache the slowly drifting light field. Each refresh is spread across six frames.
const lightTarget=new THREE.WebGLCubeRenderTarget(mobile?128:256,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,generateMipmaps:false,depthBuffer:false});
const lightScene=new THREE.Scene(),lightCamera=new THREE.CubeCamera(.1,5,lightTarget);
const lightUniforms={uTime:{value:0},uBlue:{value:0}};
const lightMaterial=new THREE.ShaderMaterial({uniforms:lightUniforms,side:THREE.BackSide,depthWrite:false,vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:common+`varying vec3 vDir;void main(){gl_FragColor=vec4(worldLight(normalize(vDir)),1.);}`});
lightScene.add(new THREE.Mesh(new THREE.SphereGeometry(2,24,12),lightMaterial));
uniforms.uWorldMap={value:lightTarget.texture};
const cachedCommon=common.replace(/vec3 worldLight\(vec3 d\)\{[\s\S]*?\n\}/,`uniform samplerCube uWorldMap;vec3 worldLight(vec3 d){return textureCube(uWorldMap,normalize(d)).rgb;}`);
let lastLightTime=-100,lastLightBlue=-1,lightFace=6,lightWarm=false;
lightCamera.coordinateSystem=renderer.coordinateSystem;
lightCamera.updateCoordinateSystem();lightCamera.updateMatrixWorld(true);
// Freeze time and palette for each complete cube so neighbouring faces agree.
function updateLightField(){
 if(lightFace===6&&(time-lastLightTime>=(mobile?.5:.25)||Math.abs(uniforms.uBlue.value-lastLightBlue)>.02)){
  lightFace=0;lastLightTime=time;lastLightBlue=uniforms.uBlue.value;
  lightUniforms.uTime.value=time;lightUniforms.uBlue.value=lastLightBlue;
 }
 if(lightFace===6)return;
 const previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel();
 renderer.setRenderTarget(lightTarget,lightFace);
 renderer.render(lightScene,lightCamera.children[lightFace]);
 renderer.setRenderTarget(previous,face,mip);
 lightFace++;if(lightFace===6)lightWarm=true;
 renderer.domElement.dataset.lightFace=String(lightFace);
}
const sphereMat=new THREE.ShaderMaterial({uniforms,side:THREE.BackSide,depthWrite:false,vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:cachedCommon+`varying vec3 vDir;void main(){vec3 d=normalize(vDir);vec3 c=worldLight(d);c*=.72+.28*smoothstep(-.1,.8,d.y);gl_FragColor=vec4(finish(c),1.);}`});
const sphere=new THREE.Mesh(new THREE.SphereGeometry(96,80,48),sphereMat);sphere.name='巨型流光球壁';sphere.renderOrder=-1;scene.add(sphere);
const waterMat=new THREE.ShaderMaterial({uniforms,side:THREE.DoubleSide,vertexShader:`varying vec3 vPos;void main(){vec4 w=modelMatrix*vec4(position,1.);vPos=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:cachedCommon+`
uniform vec4 uRings[${count}];uniform vec3 uEye;varying vec3 vPos;
void main(){
 vec2 p=vPos.xz;float t=uTime;vec2 slope=vec2(0.);
 slope+=vec2(.62,.28)*cos(dot(p,vec2(.62,.28))-t*.55)*.045;
 slope+=vec2(-.33,.76)*cos(dot(p,vec2(-.33,.76))+t*.42)*.029;
 slope+=vec2(1.8,-1.1)*cos(dot(p,vec2(1.8,-1.1))-t*.8)*.006;
 float glint=0.;
 for(int i=0;i<${count};i++){
  vec4 r=uRings[i];float age=t-r.z;
  if(age>0.&&age<5.4){
   vec2 delta=p-r.xy;float dist=length(delta);float front=age*1.55;
   float tail=front-dist;
   float gate=smoothstep(-.12,.12,tail)*(1.-smoothstep(1.7,2.8,tail));
   float env=exp(-age*.53)*gate*r.w/(1.+dist*.38);
   env*=1.-smoothstep(.7,2.8,fwidth(dist)*24.);
   float phase=dist*24.-age*37.2;
   slope+=delta/max(dist,.025)*cos(phase)*env*.27;
   glint+=pow(max(0.,sin(phase)),12.)*env*.15;
  }
 }
 vec3 n=normalize(vec3(-slope.x,1.,-slope.y));
 vec3 view=normalize(uEye-vPos);bool below=uEye.y<-.6;if(below)n=-n;vec3 reflected=reflect(-view,n);
 vec3 c=worldLight(reflected);
 float fresnel=.12+.88*pow(1.-max(dot(n,view),0.),3.);
 vec3 depth=mix(vec3(.001,.006,.021),vec3(.002,.012,.033),uBlue);
 c=mix(depth,c,.54+fresnel*.43);
 float fractured=pow(max(0.,dot(n,normalize(vec3(-.35,1.,-.4)))),75.);
 float lightPatch=smoothstep(.53,.72,noise3(vec3(p*.9,t*.08)));
 c+=mix(vec3(.025,.46,.77),vec3(.02,.32,.64),uBlue)*fractured*lightPatch*.35;
 c+=mix(vec3(.008,.32,.60),vec3(.004,.20,.46),uBlue)*glint;
 float dist=length(p);float horizon=smoothstep(48.,94.,dist);
 vec3 farColor=worldLight(normalize(vec3(p.x,.9,p.y)))*.55;
 c=mix(c,farColor,horizon*.76);
 if(below){
  // Soft refraction and moving bands give the rotating camera a readable water ceiling.
  vec3 refracted=refract(-view,n,1.0/1.333);
  vec3 ceiling=worldLight(vec3(refracted.x,abs(refracted.y),refracted.z));
  float bands=pow(.5+.5*sin(p.x*.8+p.y*.38+t*.6+sin(p.y*.6-t*.32)),8.);
  c=mix(c,ceiling,.55)+vec3(.008,.12,.19)*(.35+bands*.65);
 }
 gl_FragColor=vec4(finish(c),1.);
}`});
const water=new THREE.Mesh(new THREE.CircleGeometry(95.8,192),waterMat);water.rotation.x=-Math.PI/2;water.position.y=-.6;water.name='雨滴涟漪水面';scene.add(water);
let time=0,paused=reduced,targetYaw=0,targetPitch=-.16,yaw=0,pitch=-.16,blueTarget=0,ringIndex=0,nextRain=.1;
let pointerDown=null,dragged=false,pointerAnchor={x:.5,y:.5,yaw:0,pitch:-.16};
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),hit=new THREE.Vector3(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),.6);
const clamp=THREE.MathUtils.clamp;
function ring(x,z,power){rings[ringIndex].set(x,z,time,power);ringIndex=(ringIndex+1)%count;}
function dropAt(e){pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);raycaster.setFromCamera(pointer,camera);if(raycaster.ray.intersectPlane(plane,hit)&&hit.length()<93)ring(hit.x,hit.z,1.7);}
const canvas=renderer.domElement;
canvas.addEventListener('pointerdown',e=>{if(entry)return;pointerDown={x:e.clientX,y:e.clientY,yaw:targetYaw,pitch:targetPitch};dragged=false;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{
 if(entry)return;
 if(mobile){if(!pointerDown)return;const dx=e.clientX-pointerDown.x,dy=e.clientY-pointerDown.y;dragged ||= Math.hypot(dx,dy)>7;targetYaw=clamp(pointerDown.yaw-dx/innerWidth*2.3,pointerDown.yaw-1.14,pointerDown.yaw+1.14);targetPitch=clamp(pointerDown.pitch+dy/innerHeight*1.8,-.70,.96);}
 else{const x=e.clientX/innerWidth,y=e.clientY/innerHeight;if(!pointerAnchor){pointerAnchor={x,y,yaw:targetYaw,pitch:targetPitch};return;}targetYaw=pointerAnchor.yaw-(x-pointerAnchor.x)*2.28;targetPitch=clamp(pointerAnchor.pitch-(y-pointerAnchor.y)*1.66,-.70,.96);if(pointerDown)dragged ||= Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)>7;}
});
canvas.addEventListener('pointerup',e=>{if(pointerDown&&!dragged)dropAt(e);pointerDown=null;});canvas.addEventListener('pointercancel',()=>{pointerDown=null;});
document.getElementById('home').onclick=()=>{if(entry)return;targetYaw=0;targetPitch=-.16;pointerAnchor=null;};
document.getElementById('palette').onclick=e=>{blueTarget=1-blueTarget;e.currentTarget.textContent=blueTarget?'深蓝 / 换色':'亮蓝 / 换色';};
const pause=document.getElementById('pause');pause.textContent=paused?'继续':'暂停';pause.onclick=()=>{paused=!paused;pause.textContent=paused?'继续':'暂停';pause.setAttribute('aria-pressed',String(paused));};
if(mobile)document.getElementById('hint').textContent='手指拖动环视 · 轻触水面泛起涟漪';
// Rain populates visible foreground and mid-distance, leaving quiet gaps between clusters.
for(let i=0;i<count;i++){rings[i].set((Math.random()-.5)*26,-2-Math.random()*28,-Math.random()*5,.6+Math.random()*.5);}ringIndex=0;
const clock=new THREE.Clock();let ready=false;
function animate(){requestAnimationFrame(animate);const rawDt=clock.getDelta(),dt=Math.min(rawDt,.05);if(document.hidden||window.sceneVisible===false||(!worldActive&&ready))return;quality.sample(rawDt);
 const ease=1.-Math.exp(-dt*4.5);yaw+=(targetYaw-yaw)*ease;pitch+=(targetPitch-pitch)*ease;
 camera.rotation.set(pitch,yaw,0);camera.updateMatrixWorld();
 uniforms.uBlue.value+=(blueTarget-uniforms.uBlue.value)*(1.-Math.exp(-dt*2.));
 if(!paused){time+=dt;uniforms.uTime.value=time;if(time>=nextRain){
 const angle=-yaw+(Math.random()-.5)*1.7,distance=3+Math.pow(Math.random(),1.5)*34;
 ring(Math.sin(angle)*distance,-Math.cos(angle)*distance,.45+Math.random()*.55);nextRain=time+(mobile?.16:.12)+Math.random()*.14;}}
 if(entry){
  entry.elapsed+=Math.min(rawDt,.1);
  const elapsed=Math.min(WaterJourneyMotion.duration,WaterJourneyMotion.handoff+entry.elapsed);
  if(entry.skip){finishEntry();}
  else {
   const m=WaterJourneyMotion.sample(elapsed,entry.simple);
   camera.position.set(0,-.6+m.y,m.z);
   camera.rotation.set(m.pitch,0,m.roll);
   entryVeil.set(m.veil);camera.updateMatrixWorld();
   document.body.dataset.journeyTime=elapsed.toFixed(3);
   document.body.dataset.journeyPitch=m.pitch.toFixed(3);
   if(elapsed>=WaterJourneyMotion.duration)finishEntry();
  }
 }

 updateLightField();
 if(!lightWarm)return;
 renderer.render(scene,camera);
 if(embedded&&worldActive&&!entryAcknowledged){entryAcknowledged=true;sendParent('enter-ready');}
 if(!ready){ready=true;document.body.classList.add('ready');sendParent('ready');}}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();quality.resize();renderer.setSize(innerWidth,innerHeight);});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.body.classList.remove('ready');status.textContent='画面暂时中断，请刷新重试';});
animate();
}catch(e){status.textContent='场景未能启动：'+e.message;console.error(e);}
})();
