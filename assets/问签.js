(() => {
  const 数据 = window.问签数据 || [];
  const $ = (s) => document.querySelector(s);

  const 签筒 = $('#签筒');
  const 签筒区域 = $('#签筒区域');
  const 提示 = $('#提示');
  const 状态 = $('#状态');
  const 面板 = $('#签牌区域');
  const 图 = $('#签牌图');

  const 入殿层 = $('#入殿层');
  const 入殿 = $('#入殿');
  const 默念 = $('#默念');

  const 掷筊区 = $('#掷筊区');
  const 筊杯 = $('#筊杯');
  const 掷筊按钮 = $('#掷筊');
  const 掷筊提示 = $('#掷筊提示');
  const 掷筊结果 = $('#掷筊结果');
  const 返回铃 = document.querySelector('.back-to-main');

  // 轻微视差：只移动背景层和光束，避免影响触控板操作。
  let 视差排队 = false;
  addEventListener('pointermove', (e) => {
    if (视差排队) return;
    视差排队 = true;
    requestAnimationFrame(() => {
      const x = (e.clientX / innerWidth - .5) * 2;
      const y = (e.clientY / innerHeight - .5) * 2;
      document.documentElement.style.setProperty('--mx', `${x.toFixed(3)}`);
      document.documentElement.style.setProperty('--my', `${y.toFixed(3)}`);
      视差排队 = false;
    });
  }, { passive: true });

  // idle：还没摇 | shaking：摇签中 | jiao：等掷筊 | done：签已解
  let 阶段 = 'idle';
  let 已上香 = false;
  let 按下时间 = 0;
  let 计时器 = null;
  let 掷筊次数 = 0;
  let 入殿隐藏计时 = null;

  返回铃?.addEventListener('click', (e) => {
    e.preventDefault();
    if (返回铃.classList.contains('bell-exit')) return;
    返回铃.classList.add('bell-exit');
    敲钟(0.28, 238);
    try { navigator.vibrate?.([18, 28, 46]); } catch (_) {}
    const 等待 = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 620;
    setTimeout(() => {
      返回入殿();
      setTimeout(() => 返回铃.classList.remove('bell-exit'), 500);
    }, 等待);
  });

  const 写入 = (id, value) => { $(id).textContent = value; };
  const 随机签 = () => 数据[Math.floor(Math.random() * 数据.length)];

  /* ---------------- 合成钟声（不需要音频文件） ---------------- */
  let 音频上下文 = null;

  function 敲钟(音量 = 0.2, 基频 = 176) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!音频上下文) 音频上下文 = new AC();
      const 上下文 = 音频上下文;
      if (上下文.state === 'suspended') 上下文.resume();

      const 总 = 上下文.createGain();
      总.gain.value = 音量;
      const 低通 = 上下文.createBiquadFilter();
      低通.type = 'lowpass';
      低通.frequency.value = 2800;
      总.connect(低通);
      低通.connect(上下文.destination);

      const 现在 = 上下文.currentTime;
      // 非整数倍泛音，才像金属钟
      const 泛音 = [
        [1, 0.55, 4.2],
        [2.01, 0.26, 3.6],
        [2.42, 0.18, 3.0],
        [3.03, 0.11, 2.4],
        [4.18, 0.07, 1.9],
        [5.43, 0.04, 1.5]
      ];

      for (const [倍, 增益, 时长] of 泛音) {
        const 振荡 = 上下文.createOscillator();
        const 包络 = 上下文.createGain();
        振荡.type = 'sine';
        振荡.frequency.value = 基频 * 倍;
        包络.gain.setValueAtTime(0.0001, 现在);
        包络.gain.exponentialRampToValueAtTime(增益, 现在 + 0.02);
        包络.gain.exponentialRampToValueAtTime(0.0001, 现在 + 时长);
        振荡.connect(包络);
        包络.connect(总);
        振荡.start(现在);
        振荡.stop(现在 + 时长 + 0.1);
      }

      // 木槌敲上去的那一下
      const 长度 = Math.floor(上下文.sampleRate * 0.05);
      const 缓冲 = 上下文.createBuffer(1, 长度, 上下文.sampleRate);
      const 数据 = 缓冲.getChannelData(0);
      for (let i = 0; i < 长度; i++) {
        数据[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / 长度, 4);
      }
      const 噪声 = 上下文.createBufferSource();
      噪声.buffer = 缓冲;
      const 带通 = 上下文.createBiquadFilter();
      带通.type = 'bandpass';
      带通.frequency.value = 820;
      带通.Q.value = 0.8;
      const 噪声包络 = 上下文.createGain();
      噪声包络.gain.value = 0.09;
      噪声.connect(带通);
      带通.connect(噪声包络);
      噪声包络.connect(总);
      噪声.start(现在);
    } catch (_) {}
  }

  /* ---------------- 入殿上香 ---------------- */
  入殿.addEventListener('click', () => {
    if (已上香) return;
    已上香 = true;
    敲钟(0.2, 176);
    document.body.classList.add('entered');
    入殿层.classList.add('leaving');
    状态.textContent = '香已上，心已定';

    入殿隐藏计时 = setTimeout(() => { 入殿层.hidden = true; }, 1100);
    setTimeout(() => {
      if (!已上香) return;
      默念.classList.add('show');
      状态.textContent = '心里想一件事，再摇签';
    }, 1200);
    setTimeout(() => { 默念.classList.remove('show'); }, 5200);
  });

  /* ---------------- 摇签 ---------------- */
  function 开始摇签(e) {
    if (!已上香 || 阶段 !== 'idle' || 按下时间) return;
    e.preventDefault();
    if (e.pointerId !== undefined && 签筒.setPointerCapture) {
      try { 签筒.setPointerCapture(e.pointerId); } catch (_) {}
    }
    按下时间 = Date.now();
    计时器 = setTimeout(() => {
      if (阶段 !== 'idle') return;
      签筒区域.classList.add('shaking');
      提示.textContent = '静心……';
      状态.textContent = '竹签正在回应你的念头';
    }, 160);
  }

  function 结束摇签(e) {
    if (阶段 !== 'idle' || !按下时间) return;
    e.preventDefault();
    clearTimeout(计时器);
    const 持续 = Date.now() - 按下时间;
    按下时间 = 0;
    阶段 = 'shaking';

    签筒区域.classList.add('shaking');
    提示.textContent = '静心……';
    状态.textContent = '竹签正在回应你的念头';

    const 等待 = Math.max(0, 320 - 持续);
    setTimeout(() => {
      if (!已上香) return;
      签筒区域.classList.remove('shaking');
      签筒区域.classList.add('falling');
      setTimeout(进入掷筊, 720);
    }, 等待);
  }

  /* ---------------- 掷筊 ---------------- */
  function 进入掷筊() {
    if (!已上香) return;
    阶段 = 'jiao';
    掷筊次数 = 0;
    掷筊结果.textContent = '';
    掷筊提示.textContent = '问菩萨：此签可解否';
    掷筊按钮.textContent = '掷 筊';
    掷筊按钮.disabled = false;
    掷筊区.hidden = false;
    requestAnimationFrame(() => 掷筊区.classList.add('open'));

    提示.textContent = '签已落定';
    状态.textContent = '签已落定，掷筊问菩萨';
  }

  function 掷筊() {
    if (阶段 !== 'jiao' || 掷筊按钮.disabled) return;
    掷筊次数++;
    掷筊按钮.disabled = true;
    掷筊结果.textContent = '';
    掷筊提示.textContent = '筊杯落地……';

    筊杯.classList.remove('throwing');
    void 筊杯.offsetWidth;
    筊杯.classList.add('throwing');

    setTimeout(() => {
      筊杯.classList.remove('throwing');
      if (!已上香) return;

      // 圣筊概率高一些；第三次无论怎样都给圣筊，不让人卡住
      let 左, 右;
      if (掷筊次数 >= 3) {
        左 = 'flat'; 右 = 'curved';
      } else {
        const r = Math.random();
        if (r < 0.55) { 左 = 'flat'; 右 = 'curved'; }        // 圣筊
        else if (r < 0.78) { 左 = 'flat'; 右 = 'flat'; }    // 笑筊
        else { 左 = 'curved'; 右 = 'curved'; }              // 阴筊
      }

      const 筊 = [...筊杯.children];
      筊[0].dataset.face = 左;
      筊[1].dataset.face = 右;

      const 圣 = 左 !== 右;
      if (圣) {
        掷筊结果.textContent = 掷筊次数 >= 3 ? '第三次 · 圣筊' : '圣筊 · 菩萨准了';
        掷筊提示.textContent = '一平一凸，此签可解';
        状态.textContent = '圣筊 · 此签可解';

        setTimeout(() => {
          if (!已上香) return;
          阶段 = 'done';
          掷筊区.classList.remove('open');
          setTimeout(() => { 掷筊区.hidden = true; }, 520);
          敲钟(0.08, 294);
          显示签文();
        }, 950);
      } else {
        const 笑 = 左 === 'flat' && 右 === 'flat';
        掷筊结果.textContent = 笑 ? '笑筊 · 再问一次' : '阴筊 · 心还未定';
        掷筊提示.textContent = 笑 ? '两平，菩萨笑而不答' : '两凸，先静一静再问';
        状态.textContent = 笑 ? '笑筊 · 再掷一次' : '阴筊 · 再静一静';
        掷筊按钮.disabled = false;
        掷筊按钮.textContent = '再掷一次';
      }
    }, 720);
  }

  /* ---------------- 牌面：兼容 png / jpg / jpeg / webp ---------------- */
  const 牌面缓存 = new Map();
  const 常见扩展 = ['png', 'jpg', 'jpeg', 'webp'];

  function 设置牌面(容器, 基础路径) {
    if (!基础路径) { 容器.style.backgroundImage = ''; 容器.classList.remove('has-image'); return; }
    const 基础 = String(基础路径).replace(/\.(png|jpe?g|webp)$/i, '');
    容器.dataset.牌面 = 基础;

    const 缓存 = 牌面缓存.get(基础);
    if (缓存 !== undefined) {
      容器.style.backgroundImage = 缓存 ? `url("${缓存}")` : '';
      容器.classList.toggle('has-image', !!缓存);
      return;
    }

    容器.style.backgroundImage = '';
    容器.classList.remove('has-image');
    let i = 0;
    const 试 = () => {
      if (i >= 常见扩展.length) { 牌面缓存.set(基础, ''); return; }
      const 路径 = `${基础}.${常见扩展[i++]}`;
      const 探 = new Image();
      探.onload = () => {
        牌面缓存.set(基础, 路径);
        if (容器.dataset.牌面 === 基础) {
          容器.style.backgroundImage = `url("${路径}")`;
          容器.classList.add('has-image');
        }
      };
      探.onerror = 试;
      探.src = 路径;
    };
    试();
  }

  /* ---------------- 签文 ---------------- */
  function 显示签文() {
    const 签 = 随机签();
    if (!签) { 状态.textContent = '签筒是空的'; return; }

    const 逆位 = Math.random() < .35;
    设置牌面(图, 签.图片);
    图.classList.toggle('reversed', 逆位);
    图.querySelector('.card-fallback').textContent = 签.牌名.charAt(0);

    写入('#牌名', 签.牌名);
    写入('#正逆位', 逆位 ? '逆位 · 回身观心' : '正位 · 顺势而行');
    写入('#签诗', 签.签诗.join('\n'));
    写入('#关键词', 签.关键词.join('  ·  '));
    写入('#牌义', 逆位 ? 签.逆位 : 签.正位);
    写入('#宜', 签.宜);
    写入('#忌', 签.忌);
    写入('#问你', `问你：${签.问你}`);

    面板.hidden = false;
    document.body.classList.add('reading-card');
    requestAnimationFrame(() => 面板.classList.add('open'));
    提示.textContent = '此签已落定';
    状态.textContent = '签已解，读完可收下';
  }

  /* ---------------- 收起与重置 ---------------- */
  function 重置() {
    面板.classList.remove('open');
    document.body.classList.remove('reading-card');
    setTimeout(() => { 面板.hidden = true; }, 450);

    阶段 = 'idle';
    掷筊次数 = 0;
    签筒区域.classList.remove('shaking', 'falling');
    掷筊区.classList.remove('open');
    掷筊区.hidden = true;
    筊杯.classList.remove('throwing');
    [...筊杯.children].forEach((j) => { j.dataset.face = 'curved'; });
    掷筊结果.textContent = '';
    掷筊提示.textContent = '问菩萨：此签可解否';
    掷筊按钮.textContent = '掷 筊';
    掷筊按钮.disabled = false;
    $('#收下此签').textContent = '收下此签';

    提示.textContent = '按住摇签，松手落签';
    状态.textContent = '再问，就再摇一签';
  }

  function 返回入殿() {
    clearTimeout(入殿隐藏计时);
    clearTimeout(计时器);
    计时器 = null;
    重置();
    已上香 = false;
    阶段 = 'idle';
    按下时间 = 0;
    默念.classList.remove('show');
    document.body.classList.remove('entered', 'reading-card');

    入殿层.hidden = false;
    入殿层.classList.add('leaving');
    void 入殿层.offsetWidth;
    入殿层.classList.remove('leaving');
    状态.textContent = '';
  }

  /* ---------------- 事件 ---------------- */
  签筒.addEventListener('pointerdown', 开始摇签);
  签筒.addEventListener('pointerup', 结束摇签);
  签筒.addEventListener('pointercancel', 结束摇签);
  签筒.addEventListener('mousedown', 开始摇签);
  签筒.addEventListener('mouseup', 结束摇签);
  签筒.addEventListener('touchstart', 开始摇签, { passive: false });
  签筒.addEventListener('touchend', 结束摇签, { passive: false });
  addEventListener('pointerup', 结束摇签);
  addEventListener('pointercancel', 结束摇签);
  addEventListener('mouseup', 结束摇签);

  签筒.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); 开始摇签(e); }
  });
  签筒.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') 结束摇签(e);
  });

  掷筊按钮.addEventListener('click', 掷筊);
  $('#收起签牌').addEventListener('click', 重置);
  $('#收下此签').addEventListener('click', () => {
    状态.textContent = '此签已收下，愿你心有所守，行有所向。';
    $('#收下此签').textContent = '已收下此签';
  });
})();

/* =========================================================
   点石灯 · 先觉菩萨的小秘密
   ========================================================= */
const 石灯 = document.getElementById('石灯');
const 秘密 = document.getElementById('秘密');
const 秘密罩 = document.getElementById('秘密罩');
const 秘密纸 = document.getElementById('秘密纸');
const 秘密关 = document.getElementById('秘密关');
const 秘密引 = document.getElementById('秘密引');
const 钱盘 = document.getElementById('钱盘');
const 红钱 = document.getElementById('红钱');
const 秘密文 = document.getElementById('秘密文');
const 秘密收 = document.getElementById('秘密收');
let 灯拾过 = false;
let 灯计时 = null;
let 钱音频 = null;

function 钱响() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!钱音频) 钱音频 = new AC();
    if (钱音频.state === 'suspended') 钱音频.resume();
    const t = 钱音频.currentTime;
    [0, .075, .16].forEach((延迟, i) => {
      const o = 钱音频.createOscillator();
      const g = 钱音频.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(1180 + i * 90, t + 延迟);
      g.gain.setValueAtTime(.0001, t + 延迟);
      g.gain.exponentialRampToValueAtTime(.022, t + 延迟 + .008);
      g.gain.exponentialRampToValueAtTime(.0001, t + 延迟 + .16);
      o.connect(g); g.connect(钱音频.destination);
      o.start(t + 延迟); o.stop(t + 延迟 + .18);
    });
  } catch (_) {}
}

function 生成钱() {
  if (钱盘.dataset.生成 === '1') return;
  const w = 钱盘.clientWidth || 360;
  const h = 钱盘.clientHeight || 180;
  const 字 = ['先', '觉', '平', '安', '一', '念'];
  for (let i = 0; i < 30; i++) {
    const c = document.createElement('i');
    c.className = '铜钱';
    c.dataset.字 = 字[i % 字.length];
    const x = (Math.random() - .5) * w * .82;
    const y = (Math.random() - .5) * h * .62;
    c.style.setProperty('--x', x.toFixed(1) + 'px');
    c.style.setProperty('--y', y.toFixed(1) + 'px');
    c.style.setProperty('--r', (Math.random() * 300 - 150).toFixed(1) + 'deg');
    c.style.setProperty('--d', (i * .018 + Math.random() * .12).toFixed(2) + 's');
    c.style.zIndex = String(2 + Math.floor(Math.random() * 8));
    钱盘.appendChild(c);
  }
  钱盘.dataset.生成 = '1';
}

function 开秘密() {
  if (!secretReady()) return;
  if (!秘密.hidden) return;
  石灯.classList.add('亮');
  秘密.hidden = false;
  秘密.classList.remove('拾', '开');
  秘密文.hidden = true;
  秘密收.hidden = true;
  红钱.hidden = false;
  钱盘.hidden = false;
  钱盘.classList.remove('收');
  if (灯拾过) {
    秘密.classList.add('拾');
    钱盘.hidden = true;
    秘密文.hidden = false;
    秘密收.hidden = false;
    秘密引.textContent = '灯下只剩一根红绳。';
  } else {
    秘密引.textContent = '灯座下，压着一枚旧铜钱。';
    生成钱();
  }
  requestAnimationFrame(() => {
    秘密.classList.add('开');
    setTimeout(() => {
      (灯拾过 ? 秘密收 : 红钱).focus({ preventScroll: true });
    }, 680);
  });
  钱响();
  try { navigator.vibrate?.(12); } catch (_) {}
}

function 关秘密() {
  if (秘密.hidden || !秘密.classList.contains('开')) return;
  秘密.classList.remove('开');
  setTimeout(() => {
    秘密.hidden = true;
    if (灯拾过) 石灯.classList.add('发现');
    石灯.focus({ preventScroll: true });
  }, 380);
}

function secretReady() {
  return document.body.classList.contains('entered');
}

function 点灯等三秒() {
  if (!secretReady()) return;
  if (!秘密.hidden) return;
  if (灯计时) return;
  石灯.classList.add('亮');
  try { navigator.vibrate?.(12); } catch (_) {}
  灯计时 = setTimeout(() => {
    灯计时 = null;
    开秘密();
  }, 3000);
}

石灯?.addEventListener('click', 点灯等三秒);
秘密关?.addEventListener('click', 关秘密);
秘密罩?.addEventListener('click', 关秘密);
秘密收?.addEventListener('click', 关秘密);

红钱?.addEventListener('click', () => {
  if (秘密.classList.contains('拾')) return;
  灯拾过 = true;
  秘密.classList.add('拾');
  钱盘.classList.add('收');
  秘密文.hidden = false;
  秘密收.hidden = false;
  秘密引.textContent = '灯座底下，传来一声——';
  钱响();
  钱响();
  try { navigator.vibrate?.([14, 26, 40]); } catch (_) {}
  setTimeout(() => {
    红钱.hidden = true;
    秘密收.focus({ preventScroll: true });
  }, 620);
});

addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !秘密.hidden) 关秘密();
});
