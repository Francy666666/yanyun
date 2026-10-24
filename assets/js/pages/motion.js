/* =========================================================
   燕云十六声 · 动效脚本
   ---------------------------------------------------------
   这个文件负责「怎么动」，一般不需要改。
   文字、图片、顺序都在「内容配置.js」里改。

   文件结构：
   1. 读取配置
   2. 生成页面（顶栏 / 场景 / 页脚）
   3. 各种动效（视差、粒子、聚光、换卷……）
   ========================================================= */
(() => {
  'use strict';

  /* =======================================================
     1. 读取配置
     ======================================================= */
  const 配置 = window.燕云内容;
  const 页面 = document.getElementById('页面');

  if (!配置 || !Array.isArray(配置.场景)) {
    页面.innerHTML = `
      <div style="min-height:100vh;display:grid;place-items:center;padding:40px;
                  background:#08070b;color:#f0e5cd;font-family:'Microsoft YaHei',sans-serif;
                  line-height:2;text-align:center">
        <div>
          <p style="font-size:18px">没有读到「内容配置.js」</p>
          <p style="opacity:.6;font-size:13px">
            请确认它和 motion.html 在同一个文件夹里，并且第一个 script 引用的是它。
          </p>
        </div>
      </div>`;
    return;
  }

  const 场景列 = 配置.场景.filter((s) => s && s.类型);
  const 主站场景列 = 场景列.filter((s) => s.类型 !== '问签');
  const 站 = 配置.网站 || {};
  const 脚 = 配置.页脚 || {};

  const 减少动效 = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const 触屏 = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  const 夹紧 = (v, a, b) => Math.min(b, Math.max(a, v));
  const 随机 = (a, b) => a + Math.random() * (b - a);
  const 编号 = (i) => String(i + 1).padStart(2, '0');

  /* 把用户填的文字变成安全的 HTML（防止引号、尖括号把页面弄坏） */
  const 转义 = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  /* 取配置里的值；没填就用默认值 */
  const 取 = (对象, 键, 默认值) => {
    const 值 = 对象[键];
    return 值 === undefined || 值 === null || 值 === '' ? 默认值 : 值;
  };

  /* 中文间隔点「·」做成淡淡的样式 */
  const 间隔点 = (文字) => 转义(文字).replace(/·/g, '<span class="dot">·</span>');

  /* 标题支持两种写法：一句字符串，或 ["第一行","第二行"] 的数组 */
  const 多行文字 = (值) => {
    if (Array.isArray(值)) return 值.map(转义).join('<br>');
    return 转义(值 ?? '');
  };

  // 可选的新增内容：不填写时不显示，方便给后三种页面逐步加内容。
  const 补充内容 = (s) => {
    const 标题 = 取(s, '补充标题', '');
    const 文字 = 取(s, '补充文字', '');
    const 链接文字 = 取(s, '补充链接文字', '');
    const 链接地址 = 取(s, '补充链接地址', '');
    if (!标题 && !文字 && !(链接文字 && 链接地址)) return '';
    return `<div class="extra-copy">${标题 ? `<h3>${转义(标题)}</h3>` : ''}${文字 ? `<p>${转义(文字)}</p>` : ''}${链接文字 && 链接地址 ? `<a href="${转义(链接地址)}">${转义(链接文字)}</a>` : ''}</div>`;
  };

  /* =======================================================
     2. 生成页面
     ======================================================= */

  // ---- 顶栏 ----
  function 生成顶栏() {
    const 导航 = 场景列.map((s) =>
      s.类型 === '问签'
        ? `<a href="问签.html">${转义(取(s, '导航', '古寺问签'))}</a>`
        : `<a href="#场景${主站场景列.indexOf(s) + 1}">${转义(取(s, '导航', s.类型))}</a>`
    ).join('');

    return `
      <header class="topbar">
        <a class="brand" href="#场景1">
          <span class="brand-cn">${转义(取(站, '标题', '燕云十六声'))}</span>
          <span class="brand-en">${转义(取(站, '副标', 'MOTION STUDY'))}</span>
        </a>
        <nav class="nav" aria-label="章节">${导航}</nav>
        <div class="topbar-mark" aria-hidden="true">${转义(取(站, '右上角', ''))}</div>
      </header>`;
  }

  // ---- 类型一：夜宴 ----
  // 竖排大标题、印章、水波、灯晕、视差
  function 生成夜宴(s, i) {
    const 标题 = String(取(s, '标题', '燕云十六声'));
    const 字 = Array.from(标题);
    const 图片 = 取(s, '图片', '');
    const 说明 = 取(s, '图片说明', '');
    const 副标题 = 取(s, '副标题', '');
    const 印章 = 取(s, '印章', '');
    const 效果 = 取(s, '效果说明', '夜宴');

    const 字HTML = 字.map((字, k) =>
      `<span style="--i:${k}">${转义(字)}</span>`
    ).join('');

    const 向下 = i < 场景列.length - 1
      ? `<a class="scroll-hint" href="#场景${i + 2}" aria-label="向下滚动">
           <span class="scroll-line"></span>
           <span class="scroll-word">${转义(取(s, '向下提示', '向下'))}</span>
         </a>`
      : '';

    return `
      <section class="scene scene--night" id="场景${i + 1}">
        <div class="night-media">
          <img class="night-img" src="${转义(图片)}" alt="${转义(说明)}">
          <canvas class="night-canvas" aria-hidden="true"></canvas>
        </div>
        <div class="night-warmth" aria-hidden="true"></div>
        <div class="night-sheen" aria-hidden="true"></div>
        <canvas class="fx fx--night" aria-hidden="true"></canvas>
        <div class="veil vignette" aria-hidden="true"></div>
        <div class="veil grain" aria-hidden="true"></div>

        <div class="hero-copy">
          <h1 class="hero-title" aria-label="${转义(标题)}">${字HTML}</h1>
          ${印章 ? `<div class="hero-seal" aria-hidden="true">${转义(印章)}</div>` : ''}
          ${副标题 ? `<p class="hero-sub">${间隔点(副标题)}</p>` : ''}
        </div>

        <div class="scene-tag"><b>${编号(i)}</b> ${转义(效果)}</div>
        ${向下}
      </section>`;
  }

  // ---- 类型二：聚光 ----
  // 整张图去色，光标像提灯一样照亮局部
  function 生成聚光(s, i) {
    const 图片 = 取(s, '图片', '');
    const 说明 = 取(s, '图片说明', '');
    const 小标题 = 取(s, '小标题', '聚光显影');
    const 标题 = 取(s, '标题', '');
    const 提示 = 取(s, '提示', '移动光标，点亮画中光');

    return `
      <section class="scene scene--focus" id="场景${i + 1}">
        <div class="focus-stage">
          <img class="focus-img focus-img--color" src="${转义(图片)}" alt="${转义(说明)}">
          <div class="focus-gray" aria-hidden="true">
            <img class="focus-img" src="${转义(图片)}" alt="">
          </div>
          <div class="focus-ring" aria-hidden="true"></div>
        </div>

        <div class="focus-copy">
          <p class="eyebrow">${编号(i)} / ${转义(小标题)}</p>
          <h2>${多行文字(标题)}</h2>
          <p class="hint">${转义(提示)}</p>
          ${补充内容(s)}
        </div>

        <div class="focus-edge" aria-hidden="true"></div>
      </section>`;
  }

  // ---- 类型三：山行 ----
  // 呼吸镜头、林间浮尘、宣纸题跋
  function 生成山行(s, i) {
    const 图片 = 取(s, '图片', '');
    const 说明 = 取(s, '图片说明', '');
    const 效果 = 取(s, '效果说明', '山行');
    const 诗句 = 取(s, '诗句', '');
    const 落款 = 取(s, '落款', '');
    const 印章 = 取(s, '印章', '');

    return `
      <section class="scene scene--day" id="场景${i + 1}">
        <div class="day-media">
          <img class="day-img" src="${转义(图片)}" alt="${转义(说明)}">
        </div>
        <div class="rays" aria-hidden="true"><i></i><i></i><i></i></div>
        <canvas class="fx fx--day" aria-hidden="true"></canvas>
        <div class="veil vignette-soft" aria-hidden="true"></div>
        <div class="veil grain" aria-hidden="true"></div>

        <div class="scene-tag scene-tag--dark"><b>${编号(i)}</b> ${转义(效果)}</div>

        <figure class="poem-card reveal">
          <blockquote>${转义(诗句)}</blockquote>
          <figcaption>${间隔点(落款)}</figcaption>
          ${印章 ? `<span class="seal" aria-hidden="true">${转义(印章)}</span>` : ''}
        </figure>
        ${补充内容(s)}
      </section>`;
  }

  // ---- 类型四：换卷 ----
  // 中间一条金线，左右拖动对剖两张图
  function 生成换卷(s, i) {
    const 小标题 = 取(s, '小标题', '昼夜换卷');
    const 标题 = 取(s, '标题', '同一卷，两种天光');
    const 提示 = 取(s, '提示', '拖动中间的金线，或在图上左右滑动');
    const 说明 = 取(s, '说明', '');
    const 左图 = 取(s, '左图', '');
    const 右图 = 取(s, '右图', '');
    const 左图说明 = 取(s, '左图说明', '');
    const 右图说明 = 取(s, '右图说明', '');
    const 左标 = 取(s, '左标', '昼');
    const 右标 = 取(s, '右标', '夜');

    return `
      <section class="scene scene--compare" id="场景${i + 1}">
        <div class="compare-head reveal">
          <p class="eyebrow">${编号(i)} / ${转义(小标题)}</p>
          <h2>${转义(标题)}</h2>
          <p class="hint">${转义(提示)}</p>
        </div>

        <div class="compare-stage" style="--split:50%">
          <div class="cmp-pane cmp-pane--left">
            <img class="cmp-img" src="${转义(左图)}" alt="${转义(左图说明)}">
          </div>
          <div class="cmp-pane cmp-pane--right">
            <img class="cmp-img cmp-img--night" src="${转义(右图)}" alt="${转义(右图说明)}">
          </div>
          <div class="cmp-handle" aria-hidden="true"><span class="cmp-knob"></span></div>
          <span class="cmp-label cmp-label--l">${转义(左标)}</span>
          <span class="cmp-label cmp-label--r">${转义(右标)}</span>
        </div>

        ${说明 ? `<p class="compare-note">${转义(说明)}</p>` : ''}
        ${补充内容(s)}
      </section>`;
  }

  // ---- 页脚 ----
  function 生成页脚() {
    const 品牌 = 取(脚, '品牌', '燕云十六声');
    return `
      <footer class="foot">
        <div class="foot-brand">${间隔点(品牌)}</div>
        <div class="foot-note">${转义(取(脚, '说明', ''))}</div>
        <div class="foot-meta">${转义(取(脚, '版权', ''))}</div>
      </footer>`;
  }

  // ---- 把一段配置变成一段页面 ----
  function 生成场景(s, i) {
    switch (s.类型) {
      case '夜宴': return 生成夜宴(s, i);
      case '聚光': return 生成聚光(s, i);
      case '山行': return 生成山行(s, i);
      case '换卷': return 生成换卷(s, i);
      default:
        console.warn(`第 ${i + 1} 段的「类型」写成了「${s.类型}」，只能填 夜宴 / 聚光 / 山行 / 换卷 / 问签，已按夜宴显示。`);
        return 生成夜宴(s, i);
    }
  }

  /* 真正把内容放进页面 */
  document.title = `${取(站, '标题', '燕云十六声')} · 动态影像样张`;
  const 简介 = document.querySelector('meta[name="description"]');
  if (简介) 简介.setAttribute('content', `用图片和文字做的动态影像样张：${场景列.map((s) => 取(s, '导航', s.类型)).join('、')}。`);

  /* ---------- 2.5 图片路径写错时，给一个看得见的提示 ----------
     注意：这段要放在生成页面之前，
     否则缓存里已经失败的图片可能来不及被捕获。 */
  document.addEventListener('error', (e) => {
    const 图 = e.target;
    if (!(图 instanceof HTMLImageElement)) return;
    const 路径 = 图.getAttribute('src') || '';
    console.warn('图片加载失败：' + 路径 + '（检查文件名和后缀是否一致）');

    const 区 = 图.closest('.scene');
    if (!区) return;
    let 提示 = 区.querySelector('.img-error');
    if (!提示) {
      提示 = document.createElement('div');
      提示.className = 'img-error';
      区.appendChild(提示);
    }
    提示.textContent = `图片没找到：${路径}　请检查「图片」文件夹里的文件名和后缀（.jpg / .png）`;
  }, true);

  页面.innerHTML = 生成顶栏() + 主站场景列.map(生成场景).join('') + 生成页脚();

  /* =======================================================
     3. 动效
     ======================================================= */

  /* ---------- 3.1 顶部阅读进度 ---------- */
  const 进度条 = document.querySelector('.scroll-progress i');
  let 进度排队 = false;
  function 更新进度() {
    if (进度排队) return;
    进度排队 = true;
    requestAnimationFrame(() => {
      const 可滚动 = document.documentElement.scrollHeight - innerHeight;
      进度条.style.width = (可滚动 > 0 ? (scrollY / 可滚动) * 100 : 0) + '%';
      进度排队 = false;
    });
  }
  addEventListener('scroll', 更新进度, { passive: true });
  addEventListener('resize', 更新进度);
  更新进度();

  /* ---------- 3.2 顶栏在亮色画面自动变深色 ---------- */
  const 顶栏 = document.querySelector('.topbar');
  const 亮色场景 = Array.from(document.querySelectorAll('.scene--focus, .scene--day'));
  if (顶栏 && 亮色场景.length) {
    const 同步顶栏 = () => {
      const 探针 = scrollY + 44;
      const 在亮色上 = 亮色场景.some((区) =>
        探针 >= 区.offsetTop && 探针 < 区.offsetTop + 区.offsetHeight
      );
      顶栏.classList.toggle('is-light', 在亮色上);
    };
    addEventListener('scroll', 同步顶栏, { passive: true });
    addEventListener('resize', 同步顶栏);
    同步顶栏();
  }

  /* ---------- 3.3 入场揭示（题跋、换卷标题） ---------- */
  const 揭示元素 = document.querySelectorAll('.reveal, .compare-head, .compare-stage');
  if (减少动效) {
    揭示元素.forEach((el) => el.classList.add('in'));
  } else {
    const 揭示观察 = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          揭示观察.unobserve(e.target);
        }
      });
    }, { threshold: 0.25 });
    揭示元素.forEach((el) => 揭示观察.observe(el));
  }

  /* ---------- 3.4 鼠标柔光（只在桌面端） ---------- */
  if (!减少动效 && !触屏) {
    const 柔光 = document.querySelector('.cursor-glow');
    if (柔光) {
      const 鼠标 = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
      addEventListener('pointermove', (e) => {
        鼠标.tx = e.clientX;
        鼠标.ty = e.clientY;
      }, { passive: true });

      const 画柔光 = () => {
        鼠标.x += (鼠标.tx - 鼠标.x) * 0.07;
        鼠标.y += (鼠标.ty - 鼠标.y) * 0.07;
        柔光.style.transform = `translate3d(${鼠标.x}px,${鼠标.y}px,0)`;
        requestAnimationFrame(画柔光);
      };
      requestAnimationFrame(画柔光);
    }
  }

  /* ---------- 3.5 夜宴：指针视差 + 滚动淡出 ---------- */
  if (!减少动效 && !触屏) {
    document.querySelectorAll('.scene--night').forEach((区) => {
      const 画面 = 区.querySelector('.night-media');
      const 文案 = 区.querySelector('.hero-copy');
      if (!画面) return;

      let nx = 0, ny = 0, tx = 0, ty = 0;
      区.addEventListener('pointermove', (e) => {
        const r = 区.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width) * 2 - 1;
        ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      }, { passive: true });
      区.addEventListener('pointerleave', () => { tx = 0; ty = 0; });

      let 可见 = true;
      new IntersectionObserver((es) => { 可见 = es[0].isIntersecting; }).observe(区);

      const 循环 = () => {
        if (可见) {
          nx += (tx - nx) * 0.06;
          ny += (ty - ny) * 0.06;
          const 相对滚动 = Math.max(0, scrollY - 区.offsetTop);
          const 下移 = Math.min(相对滚动, innerHeight) * 0.14;
          画面.style.transform = `translate3d(${nx * -10}px,${ny * -8 + 下移}px,0) scale(1.06)`;
          if (文案) {
            文案.style.opacity = String(夹紧(1 - 相对滚动 / (innerHeight * 0.72), 0, 1));
          }
        }
        requestAnimationFrame(循环);
      };
      requestAnimationFrame(循环);
    });
  }

  /* ---------- 3.5b 夜宴：水面波纹交互 ----------
     鼠标划过 / 手指点一下，画面会像水面一样荡开涟漪。
     原理：把照片画在 canvas 上，再在涟漪的圆环范围里
     把画面轻微放大/缩小，形成“水在动”的折射感。
     （file:// 下不能读像素，但把图片画进 canvas 是允许的） */
  if (!减少动效) {
    document.querySelectorAll('.scene--night').forEach(创建水波);
  }

  function 创建水波(区) {
    const 画面 = 区.querySelector('.night-media');
    const 画布 = 区.querySelector('.night-canvas');
    const 图 = 区.querySelector('.night-img');
    if (!画面 || !画布 || !图) return;

    const ctx = 画布.getContext('2d');
    if (!ctx) return;

    const 像素比 = Math.min(devicePixelRatio || 1, 触屏 ? 1.25 : 1.5);
    const 圆周 = Math.PI * 2;
    let 宽 = 0, 高 = 0, 图宽 = 0, 图高 = 0, 偏X = 0, 偏Y = 0;
    let 波纹 = [];
    let 运行中 = false;
    let 上次生成 = 0;

    const 底图 = document.createElement('canvas');
    const 底笔 = 底图.getContext('2d');

    // 按「铺满 + 保留人物头部」的方式，把照片画成一张底图
    const 计算 = () => {
      宽 = Math.max(1, 画布.clientWidth);
      高 = Math.max(1, 画布.clientHeight);
      画布.width = Math.round(宽 * 像素比);
      画布.height = Math.round(高 * 像素比);
      底图.width = 画布.width;
      底图.height = 画布.height;

      const iw = 图.naturalWidth || 1;
      const ih = 图.naturalHeight || 1;
      const 比例 = Math.max(宽 / iw, 高 / ih);
      图宽 = iw * 比例;
      图高 = ih * 比例;
      偏X = (宽 - 图宽) / 2;      // 水平居中
      偏Y = (高 - 图高) * 0.2;    // 与照片的 object-position 20% 一致

      底笔.setTransform(像素比, 0, 0, 像素比, 0, 0);
      底笔.clearRect(0, 0, 宽, 高);
      底笔.drawImage(图, 偏X, 偏Y, 图宽, 图高);

      波纹 = [];
      画底();
    };

    const 画底 = () => {
      ctx.setTransform(像素比, 0, 0, 像素比, 0, 0);
      ctx.clearRect(0, 0, 宽, 高);
      ctx.drawImage(底图, 0, 0, 宽, 高);
    };

    const 画一帧 = (t) => {
      ctx.setTransform(像素比, 0, 0, 像素比, 0, 0);
      ctx.clearRect(0, 0, 宽, 高);
      ctx.drawImage(底图, 0, 0, 宽, 高);

      const 对角线 = Math.hypot(宽, 高);

      for (let i = 波纹.length - 1; i >= 0; i--) {
        const b = 波纹[i];
        const 年龄 = Math.max(0, (t - b.起始) / 1000);
        if (年龄 > b.寿命) { 波纹.splice(i, 1); continue; }

        const 衰减 = Math.pow(1 - 年龄 / b.寿命, 2) * b.强度;
        const 半径 = Math.max(1, b.初半径 + 年龄 * b.速度);

        // 一圈涟漪由 5 条圆环组成；每条环轻微缩放，形成波浪折射
        for (let k = 0; k < 5; k++) {
          const 内 = Math.max(0.01, 半径 + k * 12);
          const 外 = 内 + 12;
          if (外 < 1) continue;
          if (内 > 对角线) break;

          const 伸缩 = 1 + Math.sin(k * 1.2 - 年龄 * 8) * 0.13 * 衰减;

          ctx.save();
          ctx.beginPath();
          ctx.arc(b.x, b.y, 外, 0, 圆周);
          ctx.arc(b.x, b.y, Math.max(0.01, 内), 0, 圆周, true);
          ctx.clip('evenodd');
          ctx.translate(b.x, b.y);
          ctx.scale(伸缩, 伸缩);
          ctx.translate(-b.x, -b.y);
          ctx.drawImage(底图, 0, 0, 宽, 高);
          ctx.restore();
        }

        // 水面上的一层柔白水光：没有硬边，只有一圈淡淡的提亮
        const 光带 = 42;
        const 水光 = ctx.createRadialGradient(
          b.x, b.y, Math.max(0, 半径 - 光带),
          b.x, b.y, 半径 + 光带
        );
        水光.addColorStop(0, 'rgba(255,252,245,0)');
        水光.addColorStop(0.5, `rgba(255,252,245,${0.25 * 衰减})`);
        水光.addColorStop(1, 'rgba(255,252,245,0)');

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 水光;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 半径 + 光带, 0, 圆周);
        ctx.fill();
        ctx.restore();
      }

      if (波纹.length) {
        requestAnimationFrame(画一帧);
      } else {
        运行中 = false;
        画底();
      }
    };

    const 启动 = () => {
      if (运行中) return;
      运行中 = true;
      requestAnimationFrame(画一帧);
    };

    const 加水波 = (e, 强度, 寿命) => {
      const r = 画布.getBoundingClientRect();
      if (!r.width) return;
      const now = performance.now();
      if (强度 < 0.8 && now - 上次生成 < 55) return;  // 划过时控制密度
      上次生成 = now;

      const x = (e.clientX - r.left) / r.width * 宽;
      const y = (e.clientY - r.top) / r.height * 高;
      波纹.push({
        x, y, 起始: now, 强度, 寿命,
        速度: 强度 > 0.8 ? 380 : 300,
        初半径: 强度 > 0.8 ? 14 : 8
      });
      if (波纹.length > 5) 波纹.shift();
      启动();
    };

    区.addEventListener('pointermove', (e) => 加水波(e, 0.32, 2.3), { passive: true });
    区.addEventListener('pointerdown', (e) => 加水波(e, 1, 2.8), { passive: true });

    const 就绪 = () => {
      计算();
      画面.classList.add('has-ripple');
      new ResizeObserver(计算).observe(画布);
    };

    if (图.complete && 图.naturalWidth) 就绪();
    else 图.addEventListener('load', 就绪, { once: true });
  }

  /* ---------- 3.6 粒子：金色浮尘 ---------- */  const 发光圆点 = (颜色, 尺寸 = 64) => {
    const c = document.createElement('canvas');
    c.width = c.height = 尺寸;
    const g = c.getContext('2d');
    const 渐变 = g.createRadialGradient(尺寸 / 2, 尺寸 / 2, 0, 尺寸 / 2, 尺寸 / 2, 尺寸 / 2);
    渐变.addColorStop(0, `rgba(${颜色},1)`);
    渐变.addColorStop(0.35, `rgba(${颜色},.55)`);
    渐变.addColorStop(1, `rgba(${颜色},0)`);
    g.fillStyle = 渐变;
    g.fillRect(0, 0, 尺寸, 尺寸);
    return c;
  };

  function 创建粒子场(画布, 种类) {
    if (!画布) return;
    const ctx = 画布.getContext('2d');
    const 像素比 = Math.min(devicePixelRatio || 1, 2);
    let 宽 = 0, 高 = 0, 帧 = 0, 上一帧 = 0, 运行中 = false;
    let 粒子 = [];

    const 贴图 = {
      gold: 发光圆点('255,210,150', 48),
      pollen: 发光圆点('255,248,225', 32),
      bokeh: 发光圆点('255,240,205', 160)
    };

    // 重新生成粒子
    const 播种 = () => {
      粒子 = [];

      if (种类 === 'night') {
        // 金色浮尘
        for (let i = 0; i < 22; i++) {
          粒子.push({
            t: 'ember',
            x: 随机(0, 宽), y: 随机(高 * 0.15, 高),
            r: 随机(1.2, 3.6), vy: 随机(0.15, 0.45),
            sway: 随机(0.4, 1.2), ph: 随机(0, 10),
            a: 随机(0.2, 0.6)
          });
        }
      } else {
        // 林间浮尘
        const 数量 = 夹紧(Math.round(宽 / 26), 24, 70);
        for (let i = 0; i < 数量; i++) {
          粒子.push({
            t: 'pollen',
            x: 随机(0, 宽), y: 随机(0, 高),
            r: 随机(1, 3.4), vx: 随机(0.08, 0.5), vy: 随机(0.05, 0.35),
            sway: 随机(0.4, 1.3), ph: 随机(0, 10),
            a: 随机(0.15, 0.55), c: Math.random() > 0.4 ? 'pollen' : 'gold'
          });
        }
        // 远处光斑
        for (let i = 0; i < 7; i++) {
          粒子.push({
            t: 'bokeh',
            x: 随机(0, 宽), y: 随机(0, 高),
            r: 随机(60, 150), vy: 随机(0.04, 0.12),
            sway: 随机(0.2, 0.6), ph: 随机(0, 10),
            a: 随机(0.05, 0.13)
          });
        }
      }
    };

    const 调整尺寸 = () => {
      const r = 画布.getBoundingClientRect();
      宽 = Math.max(1, Math.round(r.width));
      高 = Math.max(1, Math.round(r.height));
      画布.width = 宽 * 像素比;
      画布.height = 高 * 像素比;
      ctx.setTransform(像素比, 0, 0, 像素比, 0, 0);
      播种();
    };

    const 绘制 = (t) => {
      const dt = Math.min(0.05, (t - 上一帧) / 1000 || 0.016);
      上一帧 = t;
      ctx.clearRect(0, 0, 宽, 高);
      const 时间 = t / 1000;

      for (const p of 粒子) {
        if (p.t === 'ember') {
          p.y -= p.vy * 60 * dt;
          p.x += Math.sin(时间 * p.sway + p.ph) * 0.18;
          if (p.y < -20) { p.y = 高 + 20; p.x = 随机(0, 宽); }
          const 闪烁 = 0.55 + 0.45 * Math.sin(时间 * 2.2 + p.ph);
          ctx.globalAlpha = p.a * 闪烁;
          const 尺寸 = p.r * 8;
          ctx.drawImage(贴图.gold, p.x - 尺寸 / 2, p.y - 尺寸 / 2, 尺寸, 尺寸);
          ctx.globalAlpha = 1;
        } else if (p.t === 'pollen') {
          p.x += (p.vx + Math.sin(时间 * p.sway + p.ph) * 0.35) * 30 * dt;
          p.y += p.vy * 26 * dt;
          if (p.y > 高 + 10) { p.y = -10; p.x = 随机(0, 宽); }
          if (p.x > 宽 + 10) p.x = -10;
          ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(时间 * 1.6 + p.ph));
          const 尺寸 = p.r * 9;
          ctx.drawImage(贴图[p.c], p.x - 尺寸 / 2, p.y - 尺寸 / 2, 尺寸, 尺寸);
          ctx.globalAlpha = 1;
        } else if (p.t === 'bokeh') {
          p.y -= p.vy * 20 * dt;
          p.x += Math.sin(时间 * p.sway + p.ph) * 0.16;
          if (p.y < -p.r * 2) { p.y = 高 + p.r * 2; p.x = 随机(0, 宽); }
          ctx.globalAlpha = p.a;
          ctx.drawImage(贴图.bokeh, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
          ctx.globalAlpha = 1;
        }
      }
      帧 = requestAnimationFrame(绘制);
    };

    const 开始 = () => {
      if (运行中) return;
      运行中 = true;
      上一帧 = performance.now();
      帧 = requestAnimationFrame(绘制);
    };
    const 停止 = () => {
      运行中 = false;
      cancelAnimationFrame(帧);
    };

    调整尺寸();
    new ResizeObserver(调整尺寸).observe(画布);
    new IntersectionObserver((es) => {
      es[0].isIntersecting ? 开始() : 停止();
    }, { threshold: 0 }).observe(画布);

    addEventListener('visibilitychange', () => {
      document.hidden ? 停止() : 开始();
    });
  }

  if (!减少动效) {
    document.querySelectorAll('.fx--night').forEach((c) => 创建粒子场(c, 'night'));
    document.querySelectorAll('.fx--day').forEach((c) => 创建粒子场(c, 'day'));
  }

  /* ---------- 3.7 聚光：提灯照亮局部颜色 ---------- */
  if (!减少动效) {
    document.querySelectorAll('.scene--focus').forEach((区) => {
      const 舞台 = 区.querySelector('.focus-stage');
      if (!舞台) return;

      let fx = 0, fy = 0, tx = 0, ty = 0, 有鼠标 = false;

      const 设置 = (x, y) => {
        舞台.style.setProperty('--fx', x + 'px');
        舞台.style.setProperty('--fy', y + 'px');
      };

      舞台.addEventListener('pointermove', (e) => {
        const r = 舞台.getBoundingClientRect();
        tx = e.clientX - r.left;
        ty = e.clientY - r.top;
        有鼠标 = true;
      });

      const 初始化 = () => {
        const r = 舞台.getBoundingClientRect();
        if (!有鼠标) { tx = r.width * 0.62; ty = r.height * 0.38; }
        fx = tx; fy = ty;
        设置(tx, ty);
      };
      初始化();
      addEventListener('resize', 初始化);

      let 可见 = true;
      new IntersectionObserver((es) => { 可见 = es[0].isIntersecting; }).observe(舞台);

      const 循环 = (t) => {
        if (可见) {
          fx += (tx - fx) * 0.12;
          fy += (ty - fy) * 0.12;
          设置(fx + Math.sin(t / 2200) * 6, fy + Math.cos(t / 2600) * 5);
        }
        requestAnimationFrame(循环);
      };
      requestAnimationFrame(循环);
    });
  }

  /* ---------- 3.8 换卷：拖动对剖 ---------- */
  document.querySelectorAll('.compare-stage').forEach((舞台) => {
    const 左格 = 舞台.querySelector('.cmp-pane--left');
    if (!左格) return;

    let 位置 = 50;
    let 拖动中 = false;
    let 已操作 = false;

    舞台.tabIndex = 0;
    舞台.setAttribute('role', 'slider');
    舞台.setAttribute('aria-label', '左右拖动，对比两张图片');
    舞台.setAttribute('aria-valuemin', '0');
    舞台.setAttribute('aria-valuemax', '100');

    const 应用 = (v) => {
      位置 = 夹紧(v, 4, 96);
      舞台.style.setProperty('--split', 位置 + '%');
      舞台.setAttribute('aria-valuenow', Math.round(位置));
    };
    应用(50);

    const 从鼠标取位置 = (e) => {
      const r = 舞台.getBoundingClientRect();
      return ((e.clientX - r.left) / r.width) * 100;
    };

    舞台.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      拖动中 = true;
      已操作 = true;
      舞台.setPointerCapture(e.pointerId);
      应用(从鼠标取位置(e));
    });
    舞台.addEventListener('pointermove', (e) => {
      if (!拖动中) return;
      应用(从鼠标取位置(e));
    });
    const 结束 = (e) => {
      拖动中 = false;
      if (e.pointerId !== undefined && 舞台.hasPointerCapture?.(e.pointerId)) {
        舞台.releasePointerCapture(e.pointerId);
      }
    };
    舞台.addEventListener('pointerup', 结束);
    舞台.addEventListener('pointercancel', 结束);

    // 键盘也能玩
    舞台.addEventListener('keydown', (e) => {
      const 步长 = e.shiftKey ? 12 : 4;
      if (e.key === 'ArrowLeft') { 已操作 = true; 应用(位置 - 步长); e.preventDefault(); }
      if (e.key === 'ArrowRight') { 已操作 = true; 应用(位置 + 步长); e.preventDefault(); }
      if (e.key === 'Home') { 已操作 = true; 应用(0); e.preventDefault(); }
      if (e.key === 'End') { 已操作 = true; 应用(100); e.preventDefault(); }
    });

    // 第一次滚到这里时，金线自己扫一遍，提示“可以拖”
    if (!减少动效) {
      const 扫动观察 = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || 已操作) return;
          扫动观察.disconnect();
          const 开始时间 = performance.now();
          const 时长 = 3600;
          const 帧 = (now) => {
            if (已操作) return;
            const p = 夹紧((now - 开始时间) / 时长, 0, 1);
            const eased = p < 0.5
              ? 50 + (64 - 50) * (p / 0.5)
              : 64 - (64 - 36) * ((p - 0.5) / 0.5);
            应用(p >= 1 ? 50 : eased);
            if (p < 1) requestAnimationFrame(帧);
          };
          requestAnimationFrame(帧);
        });
      }, { threshold: 0.5 });
      扫动观察.observe(舞台);
    }
  });

})();
