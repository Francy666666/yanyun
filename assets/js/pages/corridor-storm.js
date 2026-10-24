/* Rain and splashes stay outside the covered passage. Animation runs on the GPU. */
window.createCorridorStorm=function(THREE,scene,camera,mobile,reduced){
  const group=new THREE.Group();group.name='前三段·竹林风雨';scene.add(group);
  const uniforms={stormTime:{value:0},stormAmount:{value:1},stormGust:{value:0},stormEye:{value:camera.position}};
  const count=mobile?4000:9000;
  const geo=new THREE.InstancedBufferGeometry();
  geo.setIndex([0,1,2,0,2,3]);
  geo.setAttribute('position',new THREE.Float32BufferAttribute([-.5,0,0,.5,0,0,.5,1,0,-.5,1,0],3));
  const seeds=new Float32Array(count*4);
  for(let i=0;i<count;i++){seeds[i*4]=Math.random();seeds[i*4+1]=Math.random();seeds[i*4+2]=Math.random();seeds[i*4+3]=Math.random();}
  geo.setAttribute('seed',new THREE.InstancedBufferAttribute(seeds,4));geo.instanceCount=count;
  const rain=new THREE.Mesh(geo,new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`attribute vec4 seed;uniform float stormTime,stormGust;uniform vec3 stormEye;varying float rainAlpha;varying float along;varying float across;varying float sunlit;
    void main(){float age=fract(seed.y-stormTime*(.90+seed.w*.35));
      float z=stormEye.z+10.-seed.z*60.;float side=seed.x<.5?-1.:1.;
      float x=side*(5.9+pow(fract(seed.x*2.),2.)*15.);
      float y=.06+age*12.;float length=.30+seed.w*.26;
      float slant=.23+stormGust*.13;
      x+=(.5-age)*12.*slant;
      // Rain crossing into the covered passage fades at the eaves instead of sticking to a boundary.
      float shelter=smoothstep(4.48,4.85,abs(x));
      vec3 p=vec3(x,y,z);vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]);
      p+=right*position.x*(.009+seed.w*.007);
      p.y+=position.y*length;p.x-=position.y*length*slant;
      rainAlpha=(1.-smoothstep(88.,128.,-z))*(.32+seed.w*.22)*shelter;along=position.y;across=position.x*2.;
      float shaft=pow(.5+.5*sin((x+y*.36)*1.1+z*.24),10.);
      sunlit=shaft*(.55+.45*pow(.5+.5*sin(z*.43),4.));
      gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,
    fragmentShader:`uniform float stormAmount;varying float rainAlpha,along,across,sunlit;void main(){float edge=1.-smoothstep(.25,1.,abs(across));float a=sin(along*3.14159)*rainAlpha*stormAmount*edge*(1.+sunlit*.55);vec3 tint=mix(vec3(.57,.69,.72),vec3(.94,.89,.70),sunlit);gl_FragColor=vec4(tint,a);}`
  }));rain.frustumCulled=false;group.add(rain);
  const splashGeo=new THREE.InstancedBufferGeometry();
  splashGeo.setIndex([0,1,2,0,2,3]);
  splashGeo.setAttribute('position',new THREE.Float32BufferAttribute([-1,0,-1,1,0,-1,1,0,1,-1,0,1],3));
  splashGeo.setAttribute('seed',new THREE.InstancedBufferAttribute(seeds.slice(0,(mobile?64:140)*4),4));splashGeo.instanceCount=mobile?64:140;
  const splashes=new THREE.Mesh(splashGeo,new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`attribute vec4 seed;uniform float stormTime;uniform vec3 stormEye;varying vec2 uvRing;varying float ringAge,ringFade;
    void main(){float age=fract(stormTime*(1.1+seed.w)+seed.y);float side=seed.x<.5?-1.:1.;
      vec3 center=vec3(side*(4.25+fract(seed.x*2.)*10.),.019,stormEye.z+7.-seed.z*43.);
      float r=.035+age*.19;uvRing=position.xz;ringAge=age;ringFade=1.-smoothstep(88.,128.,-center.z);
      gl_Position=projectionMatrix*viewMatrix*vec4(center+position*r,1.);}`,
    fragmentShader:`uniform float stormAmount;varying vec2 uvRing;varying float ringAge,ringFade;
    void main(){float d=length(uvRing);float ring=1.-smoothstep(.035,.095,abs(d-.76));float a=ring*(1.-ringAge)*.24*stormAmount*ringFade;gl_FragColor=vec4(.63,.75,.73,a);}`
  }));splashes.frustumCulled=false;group.add(splashes);
  return {update(t,amount,scale){
    group.visible=amount>.005&&!reduced;
    const gust=reduced?0:amount*(.40+.60*Math.pow(.5+.5*Math.sin(t*.74+Math.sin(t*.19)),2));
    uniforms.stormTime.value=t;uniforms.stormAmount.value=amount;uniforms.stormGust.value=gust;
    geo.instanceCount=Math.round(count*Math.min(1,Math.max(.45,scale)));
    document.body.dataset.weather=amount>.01?'rain':'water';
    return gust;
  }};
};
