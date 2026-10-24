import * as THREE from '../../vendor/three/three.module.js';

const root = document.getElementById('portrait');
const host = document.getElementById('canvasHost');
const video = document.getElementById('source');
const replay = document.getElementById('replay');
const status = document.getElementById('status');
const error = document.getElementById('error');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
} catch (_) {
  root.classList.add('is-fallback');
  error.hidden = false;
}

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 760 ? 1.2 : 1.5));
  renderer.setClearColor(0x08080d);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10);
  camera.position.z = 5;
  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const columns = innerWidth < 760 ? 128 : 208;
  const rows = Math.round(columns * 4 / 3);
  const count = columns * rows;
  const positions = new Float32Array(count * 3);
  const scatter = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const random = new Float32Array(count);
  let index = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const i = index++;
      positions[i * 3] = (x + .5) / columns - .5;
      positions[i * 3 + 1] = .5 - (y + .5) / rows;
      positions[i * 3 + 2] = 0;
      const angle = Math.random() * Math.PI * 2;
      const distance = .3 + Math.sqrt(Math.random()) * 1.8;
      scatter[i * 3] = Math.cos(angle) * distance;
      scatter[i * 3 + 1] = Math.sin(angle) * distance;
      scatter[i * 3 + 2] = (Math.random() - .5) * .6;
      uv[i * 2] = (x + .5) / columns;
      uv[i * 2 + 1] = 1 - (y + .5) / rows;
      random[i] = Math.random();
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
  geometry.setAttribute('aUv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(random, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uVideo: { value: texture },
      uProgress: { value: reducedMotion ? 1 : 0 },
      uTime: { value: 0 },
      uSize: { value: 2.8 },
      uBrightness: { value: 1.25 }
    },
    vertexShader: `
      attribute vec3 aScatter;
      attribute vec2 aUv;
      attribute float aRandom;
      uniform float uProgress;
      uniform float uTime;
      uniform float uSize;
      varying vec2 vUv;
      varying float vRandom;
      void main(){
        vUv=aUv;
        vRandom=aRandom;
        float delay=aRandom*.52;
        float progress=smoothstep(delay, min(1.,delay+.48),uProgress);
        vec3 p=position;
        p.xy+=aScatter.xy*(1.-progress);
        p.x+=sin(uTime*.65+aRandom*18.)*.0025*progress;
        p.y+=cos(uTime*.8+aRandom*21.)*.002*progress;
        vec4 clip=projectionMatrix*modelViewMatrix*vec4(p,1.);
        gl_Position=clip;
        gl_PointSize=uSize*(.72+.6*aRandom)*(1.+.5*(1.-progress));
      }`,
    fragmentShader: `
      uniform sampler2D uVideo;
      uniform float uBrightness;
      varying vec2 vUv;
      varying float vRandom;
      void main(){
        vec2 center=gl_PointCoord-.5;
        float circle=1.-smoothstep(.34,.5,length(center));
        vec3 color=texture2D(uVideo,vUv).rgb;
        float light=max(max(color.r,color.g),color.b);
        float shoulder=smoothstep(.56,.08,vUv.y);
        float halfWidth=.35+.07*(1.-vUv.y)+.12*shoulder;
        float silhouette=1.-smoothstep(halfWidth-.05,halfWidth+.025,abs(vUv.x-.5));
        float vertical=smoothstep(0.,.09,vUv.y)*(1.-smoothstep(.94,1.,vUv.y));
        float alpha=circle*silhouette*vertical*mix(.46,1.,smoothstep(.035,.33,light));
        color*=uBrightness;
        color+=vec3(.14,.045,.045)*pow(vRandom,8.);
        gl_FragColor=vec4(color,alpha);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  });
  const portrait = new THREE.Points(geometry, material);
  scene.add(portrait);

  const clock = new THREE.Clock();
  let start = null;
  let lastFrame = 0;
  let assembled = false;

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    const aspect = w / h;
    camera.left = -aspect;
    camera.right = aspect;
    camera.top = 1;
    camera.bottom = -1;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    const imageWidth = Math.min(1.48, aspect * (innerWidth < 760 ? 2.2 : 1.7));
    portrait.scale.set(imageWidth, imageWidth * 4 / 3, 1);
    material.uniforms.uSize.value = Math.max(1.45, Math.min(4.2, (imageWidth / (aspect * 2) * w) / columns * .83));
  }
  addEventListener('resize', resize, { passive: true });
  resize();

  function playVideo() {
    video.play().then(() => {
      if (start === null) start = performance.now();
    }).catch(() => {
      status.textContent = '点击光点开始';
    });
  }
  video.addEventListener('error', () => {
    root.classList.add('is-fallback');
    error.hidden = false;
  });
  video.addEventListener('loadeddata', playVideo, { once: true });
  if (video.readyState >= 2) playVideo();

  replay.addEventListener('click', () => {
    playVideo();
    assembled = false;
    start = video.readyState >= 2 ? performance.now() : null;
    status.textContent = '凝光成影';
  });

  function draw(now) {
    requestAnimationFrame(draw);
    if (document.hidden || now - lastFrame < (innerWidth < 760 ? 33 : 25)) return;
    lastFrame = now;
    const t = start === null ? 0 : reducedMotion ? 1 : Math.min(1, (now - start) / 2100);
    material.uniforms.uProgress.value = t;
    material.uniforms.uTime.value = clock.getElapsedTime();
    if (t === 1 && !assembled) {
      assembled = true;
      status.textContent = '重播聚合';
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(draw);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
    else playVideo();
  });
}
