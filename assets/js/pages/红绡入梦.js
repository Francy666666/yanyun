import * as THREE from '../../vendor/three/three.module.js';

const stage = document.getElementById('stage');
const host = document.getElementById('scene');
const play = document.getElementById('play');
const playLabel = document.getElementById('playLabel');
const fallbackNote = document.getElementById('fallbackNote');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
} catch (_) {
  fallbackNote.hidden = false;
}

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 760 ? 1.35 : 1.75));
  renderer.setClearColor(0x100b13, 1);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.z = 8;
  const clock = new THREE.Clock();
  const pointer = new THREE.Vector2();
  const smoothPointer = new THREE.Vector2();
  const image = new THREE.TextureLoader().load('图片/红绡角色.jpg', () => {
    resize();
    stage.classList.add('is-ready');
  }, undefined, () => { fallbackNote.hidden = false; });
  image.colorSpace = THREE.SRGBColorSpace;

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      uniforms: {
        image: { value: image },
        cover: { value: new THREE.Vector2(1, 1) },
        offset: { value: new THREE.Vector2() },
        time: { value: 0 },
        flash: { value: 0 }
      },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `
        uniform sampler2D image;
        uniform vec2 cover;
        uniform vec2 offset;
        uniform float time;
        uniform float flash;
        varying vec2 vUv;
        void main(){
          vec2 uv=(vUv-.5)*cover+.5+offset;
          vec3 color=texture2D(image,uv).rgb;
          float vignette=1.-.24*smoothstep(.2,.76,length(vUv-.5));
          float warm=smoothstep(.65,.98,vUv.x)*.025;
          color*=vignette;
          color+=vec3(.8,.35,.18)*(warm+flash*.13);
          gl_FragColor=vec4(color,1.);
        }`
    })
  );
  backdrop.position.z = -1;
  scene.add(backdrop);

  function sprite(kind) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (kind === 'dust') {
      const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
      glow.addColorStop(0, 'rgba(255,237,180,1)');
      glow.addColorStop(.22, 'rgba(255,205,117,.78)');
      glow.addColorStop(1, 'rgba(255,173,81,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 64, 64);
    } else {
      ctx.translate(32, 32);
      ctx.rotate(-.4);
      ctx.fillStyle = '#e59382';
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.bezierCurveTo(18, -19, 22, 2, 0, 25);
      ctx.bezierCurveTo(-18, 12, -22, -11, 0, -24);
      ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
  }

  const mobile = innerWidth < 760;
  const groups = [
    { count: mobile ? 48 : 92, texture: sprite('dust'), size: .2, tint: 0xf6d5a5, speed: .12, blend: THREE.AdditiveBlending },
    { count: mobile ? 12 : 25, texture: sprite('petal'), size: .31, tint: 0xdd7880, speed: .26, blend: THREE.NormalBlending }
  ];
  const systems = groups.map((group, groupIndex) => {
    const positions = new Float32Array(group.count * 3);
    const seeds = new Float32Array(group.count);
    for (let i = 0; i < group.count; i++) {
      positions[i * 3] = (Math.random() - .5) * 14;
      positions[i * 3 + 1] = (Math.random() - .5) * 11;
      positions[i * 3 + 2] = groupIndex ? Math.random() * 2 + .2 : Math.random() * 3 - .5;
      seeds[i] = Math.random() * Math.PI * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({
      map: group.texture, color: group.tint, size: group.size,
      transparent: true, depthWrite: false, alphaTest: .02,
      blending: group.blend, sizeAttenuation: true,
      opacity: groupIndex ? .68 : .9
    }));
    scene.add(points);
    return { ...group, points, positions, seeds };
  });

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.15, 2.17, 96),
    new THREE.MeshBasicMaterial({ color: 0xeac17e, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
  );
  ring.position.set(.6, .1, -.7);
  scene.add(ring);

  let width = 1;
  let height = 1;
  let pulseStart = -10;
  let revealTimer;
  let lastFrame = 0;
  function resize() {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 9;
    backdrop.scale.set(visibleHeight * camera.aspect, visibleHeight, 1);
    const cover = backdrop.material.uniforms.cover.value;
    const imageAspect = 1086 / 1448;
    const screenAspect = width / height;
    cover.set(screenAspect > imageAspect ? 1 : screenAspect / imageAspect,
      screenAspect > imageAspect ? imageAspect / screenAspect : 1);
  }
  addEventListener('resize', resize, { passive: true });
  resize();

  stage.addEventListener('pointermove', (event) => {
    const rect = stage.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1,
      1 - (event.clientY - rect.top) / rect.height * 2);
  }, { passive: true });
  stage.addEventListener('pointerleave', () => pointer.set(0, 0));

  function perform() {
    pulseStart = clock.elapsedTime;
    clearTimeout(revealTimer);
    stage.classList.remove('is-revealed');
    playLabel.textContent = '再看';
    revealTimer = setTimeout(() => stage.classList.add('is-revealed'), reducedMotion ? 0 : 650);
  }
  play.addEventListener('click', perform);

  function frame(ms) {
    requestAnimationFrame(frame);
    if (document.hidden || !host.getClientRects().length || ms - lastFrame < (mobile ? 33 : 25)) return;
    lastFrame = ms;
    const t = clock.getElapsedTime();
    smoothPointer.lerp(pointer, reducedMotion ? .02 : .045);
    const pulse = Math.max(0, 1 - (t - pulseStart) / 1.45);
    backdrop.material.uniforms.offset.value.set(-smoothPointer.x * .012, -smoothPointer.y * .009);
    backdrop.material.uniforms.time.value = t;
    backdrop.material.uniforms.flash.value = pulse * pulse;
    for (const system of systems) {
      if (!reducedMotion) {
        const attribute = system.points.geometry.attributes.position;
        for (let i = 0; i < system.count; i++) {
          const y = i * 3 + 1;
          const x = i * 3;
          system.positions[y] += system.speed * .012 * (pulse ? 1 + pulse * 8 : 1);
          system.positions[x] += Math.sin(t * .7 + system.seeds[i]) * .0008;
          if (system.positions[y] > 6) system.positions[y] = -6;
        }
        attribute.needsUpdate = true;
      }
      system.points.position.x = smoothPointer.x * (system.speed * .65);
      system.points.position.y = smoothPointer.y * (system.speed * .32);
    }
    ring.material.opacity = pulse * .34;
    ring.scale.setScalar(1 + (1 - pulse) * .35);
    ring.rotation.z = t * .07;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
} else {
  play.addEventListener('click', () => {
    stage.classList.toggle('is-revealed');
    playLabel.textContent = '再看';
  });
}
