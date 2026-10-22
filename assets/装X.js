import * as THREE from 'three';

(function () {
  const 页 = document.getElementById('装X');
  const 甲 = document.getElementById('甲');
  const 乙 = document.getElementById('乙');
  const 大台 = document.getElementById('大台');
  const 台签 = document.getElementById('台签');
  const 选择 = document.getElementById('选择');
  const 提示 = document.getElementById('提示');
  const 播放钮 = document.getElementById('播放');
  const 进度 = document.getElementById('进度');
  const 进度条 = document.getElementById('进度条');
  const 时间 = document.getElementById('时间');
  const 静音钮 = document.getElementById('静音');
  const 入戏钮 = document.getElementById('入戏');
  const 谢幕 = document.getElementById('谢幕');
  const 指数 = document.getElementById('指数');
  const 谢幕印 = document.getElementById('谢幕印');
  const 重看 = document.getElementById('重看');
  const 收戏 = document.getElementById('收戏');
  const 彩 = document.getElementById('彩');
  const 章 = document.getElementById('章');
  const 退出 = document.getElementById('退出');
  const 盖章 = document.getElementById('盖章');
  const 换幕 = document.getElementById('换幕');

  const 状态 = {
    opened: false,
    act: null,
    muted: false,
    immersive: false,
    charging: false,
    chargeAt: 0,
    applause: 0,
    ended: false,
    exiting: false
  };

  const 当前视频 = () => (状态.act === 'A' ? 甲 : 乙);
  const 格式化 = (t) => {
    if (!Number.isFinite(t)) t = 0;
    return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  };
  const 震动 = (ms) => { try { navigator.vibrate?.(ms); } catch (_) {} };

  /* ---------------- 声音 ---------------- */
  let 音频 = null;
  function 锣(音量 = .08, 基频 = 110) {
    if (状态.muted) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      音频 = 音频 || new AC();
      if (音频.state === 'suspended') 音频.resume();
      const t = 音频.currentTime;
      const 总 = 音频.createGain();
      总.gain.value = 音量;
      const 滤波 = 音频.createBiquadFilter();
      滤波.type = 'lowpass';
      滤波.frequency.value = 1000;
      总.connect(滤波);
      滤波.connect(音频.destination);
      [[1, .5, 3], [2.4, .2, 2.3], [3.7, .12, 1.8], [5.2, .06, 1.2]].forEach(([倍, 增益, 时长]) => {
        const o = 音频.createOscillator();
        const g = 音频.createGain();
        o.type = 'sine';
        o.frequency.value = 基频 * 倍;
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(增益, t + .015);
        g.gain.exponentialRampToValueAtTime(.0001, t + 时长);
        o.connect(g); g.connect(总);
        o.start(t); o.stop(t + 时长 + .1);
      });
    } catch (_) {}
  }

  /* ---------------- 花瓣 ---------------- */
  function 撒花(x, y, 数量 = 12, 金色 = false) {
    for (let i = 0; i < 数量; i++) {
      const p = document.createElement('i');
      p.className = '花瓣' + (金色 ? ' 金' : '');
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.setProperty('--dx', (Math.random() * 260 - 130).toFixed(0) + 'px');
      p.style.setProperty('--dy', (Math.random() * 170 + 70).toFixed(0) + 'px');
      p.style.setProperty('--r', (Math.random() * 180 - 90).toFixed(0) + 'deg');
      p.style.setProperty('--t', (1.3 + Math.random() * .8).toFixed(2) + 's');
      p.style.animationDelay = (Math.random() * .25).toFixed(2) + 's';
      页.appendChild(p);
      setTimeout(() => p.remove(), 2600);
    }
  }
  function 屏中撒花(金色 = false) {
    const r = 大台.getBoundingClientRect();
    撒花(r.left + r.width * (.2 + Math.random() * .6), r.top + r.height * (.55 + Math.random() * .3), 金色 ? 14 : 9, 金色);
  }

  /* ---------------- Three：日光、月、尘 ---------------- */
  let 渲染器 = null, 场景 = null, 相机 = null, 金尘 = null, 红尘 = null, 雪尘 = null, 光板 = null;
  let 鼠标x = 0, 鼠标y = 0, 目标x = 0, 目标y = 0;

  function 造尘(数量, 颜色, 尺寸) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(数量 * 3);
    const seed = new Float32Array(数量);
    for (let i = 0; i < 数量; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * 7;
      pos[i * 3 + 1] = (Math.random() * 2 - 1) * 4.5;
      pos[i * 3 + 2] = (Math.random() * 2 - 1) * 2.5 - .5;
      seed[i] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 颜色, size: 尺寸, transparent: true, opacity: .5,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    const p = new THREE.Points(geo, mat);
    p.userData.seed = seed;
    return p;
  }

  function 初始化Three() {
    try {
      const canvas = document.getElementById('粒子');
      渲染器 = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
      渲染器.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      渲染器.setSize(innerWidth, innerHeight);
      渲染器.setClearColor(0x000000, 0);

      场景 = new THREE.Scene();
      相机 = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, .1, 60);
      相机.position.set(0, 0, 6);

      const 光材质 = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: new THREE.Color(0xfff0cc) },
          uPos: { value: new THREE.Vector2(.68, .82) },
          uTime: { value: 0 },
          uAlpha: { value: .55 }
        },
        vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `
          varying vec2 vUv;
          uniform vec3 uColor;
          uniform vec2 uPos;
          uniform float uTime;
          uniform float uAlpha;
          void main(){
            vec2 p = vUv;
            float d = distance(p, uPos);
            float sun = smoothstep(.24, 0.0, d);
            float ang = atan(p.y - uPos.y, p.x - uPos.x);
            float rays = pow(max(0.0, sin(ang * 14.0 + uTime * .15)), 10.0) * smoothstep(.75, 0.0, d) * .16;
            float haze = smoothstep(.72, 0.0, d) * .22;
            vec3 col = uColor * (sun * .75 + rays + haze);
            float a = (sun * .48 + rays + haze) * uAlpha;
            gl_FragColor = vec4(col, a);
          }
        `
      });
      光板 = new THREE.Mesh(new THREE.PlaneGeometry(20, 12), 光材质);
      光板.position.z = -3;
      光板.renderOrder = -1;
      场景.add(光板);

      金尘 = 造尘(520, 0xd8b06a, .045);
      红尘 = 造尘(360, 0x9a4a3a, .04);
      雪尘 = 造尘(420, 0xbfd6de, .038);
      场景.add(金尘, 红尘, 雪尘);

      addEventListener('pointermove', (e) => {
        目标x = (e.clientX / innerWidth - .5) * 2;
        目标y = (e.clientY / innerHeight - .5) * 2;
      }, { passive: true });

      addEventListener('resize', () => {
        渲染器.setSize(innerWidth, innerHeight);
        相机.aspect = innerWidth / innerHeight;
        相机.updateProjectionMatrix();
      });

      const 动 = () => {
        requestAnimationFrame(动);
        if (document.hidden) return;
        鼠标x += (目标x - 鼠标x) * .035;
        鼠标y += (目标y - 鼠标y) * .035;
        相机.position.x = 鼠标x * .35;
        相机.position.y = -鼠标y * .22;
        相机.lookAt(0, 0, 0);
        if (光板) 光板.material.uniforms.uTime.value = performance.now() * .001;
        [金尘, 红尘, 雪尘].forEach((p) => {
          const pos = p.geometry.attributes.position.array;
          const seed = p.userData.seed;
          const 速 = p === 雪尘 ? .006 : .002;
          for (let i = 0; i < seed.length; i++) {
            pos[i * 3 + 1] -= 速 + seed[i] * 速;
            pos[i * 3] += Math.sin(performance.now() * .00018 + seed[i] * 9) * .0007;
            if (pos[i * 3 + 1] < -4.5) pos[i * 3 + 1] = 4.5;
          }
          p.geometry.attributes.position.needsUpdate = true;
        });
        渲染器.render(场景, 相机);
      };
      动();
    } catch (_) {
      渲染器 = null;
    }
  }

  function 三设主题(主题) {
    if (!光板) return;
    const u = 光板.material.uniforms;
    if (主题 === 'A') {
      u.uColor.value.setHex(0xe0a24a);
      u.uPos.value.set(.16, .55);
      u.uAlpha.value = .28;
      金尘.material.opacity = .8; 红尘.material.opacity = .28; 雪尘.material.opacity = .04;
      相机.position.z = 5.7;
    } else if (主题 === 'B') {
      u.uColor.value.setHex(0x9fc6d8);
      u.uPos.value.set(.72, .78);
      u.uAlpha.value = .18;
      金尘.material.opacity = .12; 红尘.material.opacity = .45; 雪尘.material.opacity = .75;
      相机.position.z = 5.8;
    } else {
      u.uColor.value.setHex(0xfff0cc);
      u.uPos.value.set(.1, .72);
      u.uAlpha.value = .22;
      金尘.material.opacity = .55; 红尘.material.opacity = .18; 雪尘.material.opacity = .08;
      相机.position.z = 6;
    }
  }

  /* ---------------- 主题 / 选择 ---------------- */
  function 设主题(act) {
    页.classList.remove('主题日', '主题暮', '主题夜');
    页.classList.add(act === 'A' ? '主题暮' : act === 'B' ? '主题夜' : '主题日');
    三设主题(act || '日');
    try {
      parent.postMessage({ type: '装X-主题', value: act === 'A' ? '暮' : act === 'B' ? '夜' : '日' }, '*');
    } catch (_) {}
  }

  function 选择戏(act) {
    if (状态.opened) return;
    状态.opened = true;
    状态.act = act;
    状态.ended = false;
    选择.classList.add(act === 'A' ? '选甲' : '选乙');
    台签.textContent = act === 'A' ? '亮相 · 0:05' : '正片 · 0:26';
    提示.style.opacity = '0';
    设主题(act);
    换幕.classList.remove('闪');
    void 换幕.offsetWidth;
    换幕.classList.add('闪');
    锣(.09, act === 'A' ? 220 : 110);
    震动(18);
    setTimeout(() => {
      页.classList.add('已开');
      放片();
    }, 900);
  }

  /* ---------------- 播放 ---------------- */
  function 更新时间() {
    const v = 当前视频();
    const dur = Number.isFinite(v.duration) ? v.duration : (状态.act === 'A' ? 5.2 : 25.9);
    const cur = Number.isFinite(v.currentTime) ? v.currentTime : 0;
    const 比 = dur ? Math.max(0, Math.min(1, cur / dur)) : 0;
    进度条.style.width = (比 * 100).toFixed(2) + '%';
    时间.textContent = `${格式化(cur)} / ${格式化(dur)}`;
    播放钮.textContent = v.paused ? '▶' : '❚❚';
  }

  function 放片() {
    if (!状态.act) return;
    const v = 当前视频();
    const 另 = 状态.act === 'A' ? 乙 : 甲;
    另.pause();
    另.currentTime = 0;
    v.currentTime = 0;
    v.muted = 状态.muted;
    v.play().catch(() => {});
    页.classList.add('播放中');
    页.classList.toggle('演甲', 状态.act === 'A');
    页.classList.toggle('演乙', 状态.act === 'B');
    谢幕.hidden = true;
    台签.textContent = 状态.act === 'A' ? '亮相 · 0:05' : '正片 · 0:26';
    更新时间();
  }

  function 谢幕显示() {
    if (状态.exiting) return;
    退出沉浸();
    状态.ended = true;
    页.classList.remove('播放中');
    谢幕印.textContent = 状态.act === 'A' ? '彩' : '绝';
    谢幕.hidden = false;
    指数.textContent = '0.0';
    const 起 = performance.now();
    const 跑 = () => {
      const p = Math.min(1, (performance.now() - 起) / 1200);
      指数.textContent = (99.9 * (1 - Math.pow(1 - p, 3))).toFixed(1);
      if (p < 1) requestAnimationFrame(跑);
    };
    跑();
    锣(.12, 88);
    震动([20, 40, 30]);
  }

  function 收盘() {
    甲.pause(); 乙.pause();
    甲.currentTime = 0; 乙.currentTime = 0;
    状态.opened = false;
    状态.act = null;
    状态.ended = false;
    状态.exiting = false;
    页.classList.remove('已开', '播放中', '演甲', '演乙');
    选择.classList.remove('选甲', '选乙');
    台签.textContent = '装X时刻';
    提示.style.opacity = '';
    谢幕.hidden = true;
    退出沉浸();
    设主题(null);
    更新时间();
  }

  [甲, 乙].forEach((v) => {
    v.addEventListener('ended', () => { if (状态.act === (v === 甲 ? 'A' : 'B')) 谢幕显示(); });
    v.addEventListener('timeupdate', () => { if (当前视频() === v) 更新时间(); });
    v.addEventListener('loadedmetadata', () => { if (当前视频() === v) 更新时间(); });
    v.addEventListener('play', () => { 播放钮.textContent = '❚❚'; });
    v.addEventListener('pause', () => { 播放钮.textContent = '▶'; });
  });

  /* ---------------- 戏牌 ---------------- */
  选择.querySelectorAll('[data-act]').forEach((b) => {
    b.addEventListener('click', () => 选择戏(b.dataset.act));
  });

  /* ---------------- 控制 ---------------- */
  播放钮.addEventListener('click', () => {
    if (!状态.act) return;
    const v = 当前视频();
    if (v.paused) v.play().catch(() => {}); else v.pause();
  });
  静音钮.addEventListener('click', () => {
    状态.muted = !状态.muted;
    甲.muted = 状态.muted;
    乙.muted = 状态.muted;
    静音钮.textContent = 状态.muted ? '静' : '声';
  });

  let 拖进度 = false;
  function 定位(e) {
    const r = 进度.getBoundingClientRect();
    const 比 = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const v = 当前视频();
    if (Number.isFinite(v.duration)) v.currentTime = 比 * v.duration;
    更新时间();
  }
  进度.addEventListener('pointerdown', (e) => { 拖进度 = true; 定位(e); 进度.setPointerCapture?.(e.pointerId); });
  进度.addEventListener('pointermove', (e) => { if (拖进度) 定位(e); });
  进度.addEventListener('pointerup', () => { 拖进度 = false; });
  进度.addEventListener('pointercancel', () => { 拖进度 = false; });

  /* ---------------- 入戏 ---------------- */
  function 退出沉浸() {
    if (!状态.immersive) return;
    状态.immersive = false;
    页.classList.remove('沉浸');
    入戏钮.textContent = '入戏';
    try { parent.postMessage({ type: '装X-沉浸', value: false }, '*'); } catch (_) {}
  }

  入戏钮.addEventListener('click', () => {
    if (!状态.act) return;
    状态.immersive = !状态.immersive;
    页.classList.toggle('沉浸', 状态.immersive);
    入戏钮.textContent = 状态.immersive ? '出戏' : '入戏';
    if (状态.immersive) 当前视频().play().catch(() => {});
    try { parent.postMessage({ type: '装X-沉浸', value: 状态.immersive }, '*'); } catch (_) {}
    震动(8);
  });

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') 退出沉浸();
    if (e.code === 'Space' && 状态.act && e.target === document.body) {
      e.preventDefault();
      播放钮.click();
    }
  });
  addEventListener('message', (e) => {
    if (e.data && e.data.type === '装X-退出沉浸') 退出沉浸();
    if (e.data && e.data.type === '装X-暂停') 当前视频().pause();
    if (e.data && e.data.type === '装X-请主题') {
      try {
        parent.postMessage({
          type: '装X-主题',
          value: 状态.act === 'A' ? '暮' : 状态.act === 'B' ? '夜' : '日'
        }, '*');
      } catch (_) {}
    }
  });

  /* ---------------- 推屏 ---------------- */
  let 屏按下 = false, 屏起Y = 0, 屏拖 = false;
  大台.addEventListener('pointerdown', (e) => {
    if (!状态.act || 状态.immersive) return;
    屏按下 = true;
    屏起Y = e.clientY;
    屏拖 = false;
    大台.setPointerCapture?.(e.pointerId);
  });
  大台.addEventListener('pointermove', (e) => {
    if (!屏按下) return;
    const d = e.clientY - 屏起Y;
    if (d > 26) {
      屏拖 = true;
      大台.style.transform = `translate(-50%,-50%) translateY(${Math.min(18, d * .14)}px) scale(1.01)`;
    }
  });
  大台.addEventListener('pointerup', (e) => {
    if (!屏按下) return;
    屏按下 = false;
    const d = e.clientY - 屏起Y;
    大台.style.transform = '';
    if (屏拖 && d > 52) 入戏钮.click();
    else if (!屏拖) 播放钮.click();
    屏拖 = false;
  });
  大台.addEventListener('pointercancel', () => { 屏按下 = false; 大台.style.transform = ''; });

  /* ---------------- 红烛 ---------------- */
  document.querySelectorAll('[data-candle]').forEach((c) => {
    c.addEventListener('click', () => {
      c.classList.toggle('亮');
      const 亮 = document.querySelectorAll('.烛.亮').length;
      if (亮 >= 3) {
        页.classList.add('全亮');
        锣(.06, 240);
        震动(12);
      } else {
        页.classList.remove('全亮');
      }
    });
  });

  /* ---------------- 喝彩 ---------------- */
  彩.addEventListener('click', () => {
    状态.applause++;
    屏中撒花(false);
    锣(.035, 300);
    震动(7);
    if (状态.applause >= 10) 页.classList.add('满堂彩');
    if (状态.applause === 3 || 状态.applause === 6 || 状态.applause === 10) 屏中撒花(true);
  });

  /* ---------------- 蓄力盖章 ---------------- */
  function 按章() {
    if (!状态.charging) return;
    const 时长 = performance.now() - 状态.chargeAt;
    状态.charging = false;
    章.classList.remove('蓄力');
    if (时长 > 650) {
      盖章.textContent = 状态.act === 'A' ? '彩' : '绝';
      盖章.classList.remove('落');
      void 盖章.offsetWidth;
      盖章.classList.add('落');
      锣(.2, 92);
      震动([30, 30, 60]);
      屏中撒花(true);
      setTimeout(() => 盖章.classList.remove('落'), 1100);
    }
  }
  章.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    状态.charging = true;
    状态.chargeAt = performance.now();
    章.classList.add('蓄力');
    章.setPointerCapture?.(e.pointerId);
  });
  章.addEventListener('pointerup', 按章);
  章.addEventListener('pointercancel', 按章);
  章.addEventListener('pointerleave', 按章);

  /* ---------------- 退出 ---------------- */
  退出.addEventListener('click', () => {
    if (!状态.opened || 状态.exiting || 退出.classList.contains('退场')) return;
    状态.exiting = true;
    谢幕.hidden = true;
    退出.classList.add('退场');
    锣(.1, 160);
    震动([18, 24, 36]);
    换幕.classList.remove('闪');
    void 换幕.offsetWidth;
    换幕.classList.add('闪');
    const r = 退出.getBoundingClientRect();
    撒花(r.left + r.width / 2, r.top + r.height / 2, 14, false);
    setTimeout(() => {
      收盘();
      退出.classList.remove('退场');
    }, 520);
  });

  /* ---------------- 谢幕 ---------------- */
  重看.addEventListener('click', () => {
    谢幕.hidden = true;
    放片();
  });
  收戏.addEventListener('click', 收盘);

  /* ---------------- 启动 ---------------- */
  设主题(null);
  初始化Three();
  三设主题('日');
})();
