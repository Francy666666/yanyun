(() => {
    'use strict';
    const canvas = document.getElementById('sky');
    const ctx = canvas.getContext('2d', { alpha: false });
    const stage = document.getElementById('stage');
    const intro = document.getElementById('intro');
    const startButton = document.getElementById('start');
    const skipButton = document.getElementById('skip');
    const replayButton = document.getElementById('replay');
    const star = document.getElementById('star');
    const title = document.getElementById('title');
    const titleImg = document.getElementById('titleImg');
    const titleSheen = document.getElementById('titleSheen');
    const status = document.getElementById('status');
    const wish = document.getElementById('wish');
    const wishLine = document.getElementById('wishLine');
    const wishHint = document.getElementById('wishHint');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = matchMedia('(max-width: 767px)');
    const coarse = matchMedia('(pointer: coarse)');
    const colors = ['#f0c987', '#ffe2b0', '#c9984a', '#c0304a', '#e08a3c'];
    const numberCount = mobile.matches ? 760 : 1280;
    const dustCount = mobile.matches ? 230 : 390;
    const dust = [];
    const numberParticles = [];
    const fireworks = [];
    const sprites = [];
    const targets = {};
    const durations = [1.55, 1.47, 1.42];
    // 时间轴（秒，从点击「开启惊喜」开始计）
    const marks = { star: 1.2, numbers: 1.9, zero: 6.34, ring: 8.49, collapse: 10.59, ignite: 11.05, text: 12.4, armed: 14.4 };
    const TAU = Math.PI * 2;

    let width = 1, height = 1, dpr = 1;
    let mode = 'intro', startTime = 0, elapsed = 0, lastTime = performance.now(), introTime = lastTime;
    let blowStart = 0, blowT = 0, pauseAt = 0, launched = new Set(), skipBurst = false, lastDraw = 0;
    let titleShown = false, armed = false, textShown = false, candleShown = false, finishTime = 0;
    let dustFade = 1;
    let fxActive = false;
    let fxHideTimer = 0;
    const fxCue = { start: false };

    const random = (min, max) => min + Math.random() * (max - min);
    const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
    const ease = (t) => 1 - Math.pow(1 - clamp(t), 3);
    const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
    const mix = (a, b, t) => a + (b - a) * t;

    function makeSprite(color) {
      const c = document.createElement('canvas');
      c.width = c.height = 48;
      const g = c.getContext('2d');
      const gradient = g.createRadialGradient(24, 24, 1, 24, 24, 23);
      gradient.addColorStop(0, '#fff6e4');
      gradient.addColorStop(.13, color);
      gradient.addColorStop(.36, color + 'aa');
      gradient.addColorStop(1, color + '00');
      g.fillStyle = gradient;
      g.fillRect(0, 0, 48, 48);
      return c;
    }
    colors.forEach((color) => sprites.push(makeSprite(color)));

    // ---------- 蜡烛：两张抠好的图，燃烧 / 熄灭 ----------
    const ON_SRC = 'assets/images/candle-on.png';
    const OFF_SRC = 'assets/images/candle-off.png';
    const onImg = new Image();
    const offImg = new Image();
    let onReady = false, offReady = false;
    onImg.onload = () => { onReady = true; layoutCandle(); };
    offImg.onload = () => { offReady = true; };
    onImg.src = ON_SRC;

    function loadOff() { if (!offImg.src) offImg.src = OFF_SRC; }

    // 抠图后实测：火焰在裁切图上的归一化位置
    const FLAME_U = .4984, FLAME_V = .1867;
    const candle = { x: 0, y: 0, w: 0, h: 0, fx: 0, fy: 0 };
    const IMG_ASPECT = 361 / 588;

    function layoutCandle() {
      const portrait = height >= width;
      const h = Math.min(height * (portrait ? .40 : .42), width * (portrait ? 1.10 : .84));
      const w = h * IMG_ASPECT;
      candle.w = w; candle.h = h;
      candle.x = (width - w) / 2;
      candle.y = height * .48 - h * FLAME_V;
      candle.fx = candle.x + w * FLAME_U;
      candle.fy = candle.y + h * FLAME_V;
      buildStrands();
    }

    // ---------- 烟：丝缕螺旋（不是粒子） ----------
    const strands = [];
    function buildStrands() {
      strands.length = 0;
      const base = [
        { phase: 0.0, omega: .92, speed: 26, r0: .020, rmax: .40, width: 1.00, alpha: .090 },
        { phase: 2.20, omega: 1.12, speed: 21, r0: .012, rmax: .34, width: .80, alpha: .072 },
        { phase: 4.35, omega: .80, speed: 31, r0: .030, rmax: .46, width: 1.10, alpha: .078 }
      ];
      for (const b of base) strands.push({
        phase: b.phase, omega: b.omega, speed: b.speed,
        r0: candle.w * b.r0, rmax: candle.w * b.rmax,
        width: b.width, alpha: b.alpha
      });
    }

    // 预渲染光晕贴图：运行时只改透明度，绝不再改半径/位置 —— 这是消除频闪的关键
    const glowSprite = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(128, 128, 0, 128, 128, 127);
      gr.addColorStop(0, 'rgba(255,246,228,1)');
      gr.addColorStop(.18, 'rgba(255,214,160,.55)');
      gr.addColorStop(.48, 'rgba(240,160,80,.16)');
      gr.addColorStop(1, 'rgba(200,90,30,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 256, 256);
      return c;
    })();

    function drawCandleLight(t, intensity) {
      if (intensity <= .01) return;
      // 只做极慢的透明度呼吸：外圈 0.19Hz ±5%，内圈 0.11Hz ±1.5%；位置与半径恒定
      const outer = .18 * (1 + .05 * Math.sin(t * .19));
      const inner = .28 * (1 + .015 * Math.sin(t * .11 + 1));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      let s = candle.w * 3.2;
      ctx.globalAlpha = clamp(outer * intensity, 0, 1);
      ctx.drawImage(glowSprite, candle.fx - s / 2, candle.fy - s / 2, s, s);
      s = candle.w * .95;
      ctx.globalAlpha = clamp(inner * intensity, 0, 1);
      ctx.drawImage(glowSprite, candle.fx - s / 2, candle.fy - s / 2, s, s);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    function strandPath(s, t, maxRise, u) {
      const rise = u * maxRise;
      const r = s.r0 + (s.rmax - s.r0) * u;
      const travel = maxRise / s.speed;
      const ang = s.phase + s.omega * (t - u * travel) + Math.sin(u * 3.1 + t * .5 + s.phase) * .18;
      return {
        x: candle.fx + Math.cos(ang) * r,
        y: candle.fy - rise + Math.sin(ang) * r * .10,
        a: Math.min(smooth(u / .10), 1) * (1 - smooth((u - .42) / .58))
      };
    }

    function smokeGradient(alpha, top) {
      const g = ctx.createLinearGradient(candle.fx, candle.fy + candle.h * .02, candle.fx, top);
      g.addColorStop(0, 'rgba(255,238,210,0)');
      g.addColorStop(.12, 'rgba(255,238,210,' + alpha + ')');
      g.addColorStop(.45, 'rgba(255,232,200,' + (alpha * .78) + ')');
      g.addColorStop(1, 'rgba(255,226,196,0)');
      return g;
    }

    function drawSmoke(t, boost) {
      const maxRise = candle.h * .78;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const s of strands) {
        ctx.beginPath();
        for (let i = 0; i <= 64; i++) {
          const p = strandPath(s, t, maxRise, i / 64);
          if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = smokeGradient(s.alpha * boost, candle.fy - maxRise);
        // 一层宽而极淡的底雾 + 一层细而亮的核心，叠出丝缕感
        ctx.globalAlpha = .5;
        ctx.lineWidth = s.width * 10;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = s.width * 2.2;
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // 熄灭后那一缕：更直、更慢、更浓
    function drawWisp(age) {
      if (age < 0 || age > 4.6) return;
      const k = age / 4.6;
      const maxRise = candle.h * .62;
      const alpha = Math.sin(Math.min(1, k * 1.25) * Math.PI) * .17;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const u = i / 48;
        const r = candle.w * .012 + candle.w * .05 * u;
        const ang = .4 + Math.sin(u * 2.2 + age * .5) * .55 + age * .12;
        const x = candle.fx + Math.cos(ang) * r;
        const y = candle.fy - u * maxRise;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      const g = ctx.createLinearGradient(candle.fx, candle.fy, candle.fx, candle.fy - maxRise);
      g.addColorStop(0, 'rgba(232,226,216,0)');
      g.addColorStop(.15, 'rgba(232,226,216,' + alpha + ')');
      g.addColorStop(.5, 'rgba(220,214,204,' + (alpha * .7) + ')');
      g.addColorStop(1, 'rgba(210,204,196,0)');
      ctx.strokeStyle = g;
      ctx.globalAlpha = .55;
      ctx.lineWidth = 11;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // lit: 1 = 燃烧图，0 = 熄灭图；中间做交叉溶解
    function drawCandle(alpha, clipR, lit) {
      if (alpha <= .005) return;
      ctx.save();
      if (clipR > 0) {
        ctx.beginPath();
        ctx.arc(candle.fx, candle.fy, Math.max(1, clipR), 0, TAU);
        ctx.clip();
      }
      if (offReady && lit < .995) {
        ctx.globalAlpha = clamp(alpha, 0, 1);
        ctx.drawImage(offImg, candle.x, candle.y, candle.w, candle.h);
      }
      if (onReady) {
        ctx.globalAlpha = clamp(alpha * lit, 0, 1);
        ctx.drawImage(onImg, candle.x, candle.y, candle.w, candle.h);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    function drawIgniteWave(r, strength) {
      if (r <= 0 || strength <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(candle.fx, candle.fy, Math.max(0, r - candle.w * .12), candle.fx, candle.fy, r + candle.w * .06);
      g.addColorStop(0, 'rgba(255,190,120,0)');
      g.addColorStop(.75, 'rgba(255,206,150,' + (.22 * strength) + ')');
      g.addColorStop(1, 'rgba(255,214,160,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(candle.fx, candle.fy, r + candle.w * .06, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // ---------- 原有粒子 ----------
    function buildDust() {
      dust.length = 0;
      for (let i = 0; i < dustCount; i++) dust.push({
        x: random(0, width), y: random(0, height), size: random(.8, 2.1),
        opacity: random(.18, .72), phase: random(0, Math.PI * 2),
        drift: random(6, 14), color: Math.random() < .2 ? 2 : 0,
        appear: random(0, 2.4)
      });
    }

    function sampleDigit(digit) {
      const off = document.createElement('canvas');
      off.width = 500; off.height = 600;
      const g = off.getContext('2d', { willReadFrequently: true });
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = '600 510px Georgia, "Times New Roman", serif';
      g.fillText(digit, 250, 302);
      const data = g.getImageData(0, 0, 500, 600).data;
      const candidates = [];
      for (let y = 46; y < 554; y += 5) for (let x = 30; x < 470; x += 5) {
        if (data[(y * 500 + x) * 4 + 3] > 110) candidates.push([x, y]);
      }
      const scale = Math.min(width * (mobile.matches ? .82 : .46) / 500, height * .59 / 600);
      const points = [];
      for (let i = 0; i < numberCount; i++) {
        const candidate = candidates[Math.floor(random(0, candidates.length))];
        points.push({
          x: width * .5 + (candidate[0] - 250 + random(-2, 2)) * scale,
          y: height * .48 + (candidate[1] - 300 + random(-2, 2)) * scale
        });
      }
      return points;
    }

    function resize() {
      const previousWidth = width, previousHeight = height;
      width = Math.max(1, stage.clientWidth); height = Math.max(1, stage.clientHeight);
      dpr = Math.min(devicePixelRatio || 1, mobile.matches ? 1.5 : 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (dust.length) for (const p of dust) { p.x *= width / previousWidth; p.y *= height / previousHeight; }
      else buildDust();
      for (const digit of ['3', '2', '1', '0']) targets[digit] = sampleDigit(digit);
      if (!numberParticles.length) for (let i = 0; i < numberCount; i++) numberParticles.push({
        angle: random(0, Math.PI * 2), radius: random(.2, 1),
        phase: random(0, Math.PI * 2), size: random(.85, 2.2),
        color: Math.random() < .14 ? 1 : 0,
        delay: random(0, .22)
      });
      layoutCandle();
    }
    addEventListener('resize', resize, { passive: true });
    resize();

    function clear() {
      ctx.fillStyle = '#06070b';
      ctx.fillRect(0, 0, width, height);
      const fog = ctx.createRadialGradient(width * .5, height * .43, 0, width * .5, height * .43, Math.max(width, height) * .65);
      fog.addColorStop(0, '#1b1820'); fog.addColorStop(.48, '#0c0b11'); fog.addColorStop(1, '#06070b');
      ctx.fillStyle = fog; ctx.fillRect(0, 0, width, height);
    }

    function glow(x, y, size, color, alpha) {
      if (alpha <= 0) return;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprites[color], x - size * 2.5, y - size * 2.5, size * 5, size * 5);
    }

    function drawDust(time, quiet = false, mult = 1) {
      ctx.globalCompositeOperation = 'lighter';
      const breath = 1 + Math.sin(time * .78) * (quiet ? .035 : .055);
      for (const p of dust) {
        const introFade = mode === 'intro' ? smooth((time - p.appear) / .8) : 1;
        const x = p.x + Math.sin(time * .35 + p.phase) * p.drift * (quiet ? .12 : .38);
        const y = p.y + Math.cos(time * .23 + p.phase) * p.drift * (quiet ? .12 : .38);
        glow(x, y, p.size, p.color, p.opacity * introFade * breath * (quiet ? .42 : 1) * mult);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawNumber(digit, next, local, duration, isZero = false, previous = null) {
      const current = targets[digit];
      const following = targets[next] || current;
      const preceding = previous ? targets[previous] : null;
      const forming = smooth(local / (isZero ? .8 : .74));
      const leaving = isZero ? 0 : smooth((local - (duration - .32)) / .32);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < numberCount; i++) {
        const p = numberParticles[i];
        const target = current[i];
        const nextTarget = following[i];
        const scatterX = preceding ? mix(preceding[i].x, target.x, .26) : width * .5 + Math.cos(p.angle) * p.radius * width * .72;
        const scatterY = preceding ? mix(preceding[i].y, target.y, .26) - 15 : height * .48 + Math.sin(p.angle) * p.radius * height * .7;
        let x = mix(scatterX, target.x, forming);
        let y = mix(scatterY, target.y, forming);
        x = mix(x, mix(target.x, nextTarget.x, .26), leaving);
        y = mix(y, mix(target.y, nextTarget.y, .26) - 15 * leaving, leaving);
        const wander = (1 - forming) * 5 + leaving * 3;
        x += Math.sin(elapsed * 2 + p.phase) * wander;
        y += Math.cos(elapsed * 1.7 + p.phase) * wander;
        glow(x, y, p.size, p.color, (.32 + .48 * forming) * (1 - leaving * .28));
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function drawRing(t) {
      const cx = width * .5, cy = height * .48;
      const radius = Math.min(width * (mobile.matches ? .37 : .18), height * .25);
      if (t < 1.2) {
        ctx.save(); ctx.lineWidth = 1.25; ctx.strokeStyle = '#f0c987';
        ctx.shadowColor = '#f0c987'; ctx.shadowBlur = 13;
        ctx.beginPath(); ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ease(t / 1.2)); ctx.stroke();
        ctx.restore();
      } else {
        const fade = 1 - clamp((t - 1.2) / .9);
        ctx.save(); ctx.globalAlpha = fade * .65; ctx.lineWidth = 1.2;
        ctx.strokeStyle = '#f0c987'; ctx.shadowColor = '#c9984a'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(cx, cy, radius * (1 + (1 - fade) * .85), 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        drawPetals((t - 1.2) / .9, radius);
      }
    }

    function drawPetals(t, radius) {
      if (t < 0 || t > 1) return;
      ctx.save();
      for (let i = 0; i < 14; i++) {
        const angle = i * 2.399 + .45;
        const travel = ease(t);
        const x = width * .5 + Math.cos(angle) * (radius + travel * width * .23);
        const y = height * .48 + Math.sin(angle) * (radius + travel * height * .17);
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle + travel * 4 + i);
        ctx.globalAlpha = Math.sin(Math.PI * t) * .64;
        ctx.fillStyle = '#c0304a'; ctx.beginPath();
        ctx.ellipse(0, 0, 5 + i % 3, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    function drawCollapse(t) {
      const cx = width * .5, cy = height * .48;
      const radius = Math.min(width * (mobile.matches ? .37 : .18), height * .25);
      const k = ease(t);
      const r = radius * (1 - k) + 1.5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1 + (1 - k) * 1.2;
      ctx.strokeStyle = 'rgba(255,226,176,' + (.25 + .55 * k) + ')';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26 + 30 * k);
      g.addColorStop(0, 'rgba(255,246,228,' + (.5 + .5 * k) + ')');
      g.addColorStop(.4, 'rgba(255,206,150,' + (.28 * k) + ')');
      g.addColorStop(1, 'rgba(240,160,70,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, 26 + 30 * k, 0, TAU); ctx.fill();
      ctx.restore();
    }

    function makeFirework(cue, index, small = false) {
      const w = width, h = height;
      const positions = mobile.matches ? [[.26,.18],[.74,.24],[.39,.17],[.35,.27],[.65,.27],[.62,.16]] : [[.27,.24],[.73,.26],[.45,.25],[.37,.29],[.64,.29],[.57,.23]];
      const pos = positions[index];
      const type = ['chrysanthemum','peony','willow','chrysanthemum','chrysanthemum','ring'][index];
      const count = small ? 80 : mobile.matches ? 115 : 190;
      const radius = Math.min(w, h) * (index === 2 ? .18 : index === 3 || index === 4 ? .105 : .14);
      const particles = [];
      for (let i = 0; i < count; i++) {
        const angle = Math.PI * 2 * i / count + random(-.035, .035);
        const variation = type === 'ring' ? random(.94, 1.05) : type === 'chrysanthemum' ? random(.65, 1.3) : random(.78, 1.12);
        const chosen = Math.random();
        const color = chosen < .6 ? 0 : chosen < .8 ? 1 : chosen < .95 ? 3 : 4;
        particles.push({
          angle, speed: radius * variation, color,
          size: random(.8, 1.9) * (Math.random() < .3 ? 1.4 : 1),
          phase: random(0, Math.PI * 2), life: random(1.65, 2.6),
          gravity: type === 'willow' ? random(85, 135) : random(35, 80),
          drift: random(-8, 8)
        });
      }
      fireworks.push({ cue, x: pos[0] * w, y: pos[1] * h, type, particles, small });
    }

    const fireCues = [0, 1.1, 2, 3.2, 3.2, 4.4];
    function drawFireworks(t) {
      for (let i = 0; i < fireCues.length; i++) if (t >= fireCues[i] && !launched.has(i)) {
        makeFirework(t, i, skipBurst); launched.add(i);
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const burst of fireworks) {
        const age = t - burst.cue;
        if (age < 0 || age > 3.4) continue;
        if (age < .43) {
          const rise = ease(age / .35);
          const x = burst.x - 8 * (1 - rise), y = burst.y + 80 * (1 - rise);
          ctx.strokeStyle = 'rgba(240,201,135,.28)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x, y); ctx.stroke();
          glow(x, y, 1.6, 0, .36);
          continue;
        }
        const burstAge = age - .43;
        for (const p of burst.particles) {
          if (burstAge > p.life) continue;
          const progress = clamp(burstAge / p.life);
          const expand = ease(burstAge / .7);
          const distance = p.speed * expand * (1 - progress * .18);
          const x = burst.x + Math.cos(p.angle) * distance + p.drift * burstAge * burstAge;
          const y = burst.y + Math.sin(p.angle) * distance + p.gravity * burstAge * burstAge * .12;
          const alpha = smooth(burstAge / .22) * Math.pow(1 - progress, 1.2) * .72;
          const tail = mobile.matches ? 3 : 5;
          for (let j = tail; j > 0; j--) {
            const back = j * .045;
            const past = Math.max(0, burstAge - back);
            const pastDistance = p.speed * ease(past / .7) * (1 - clamp(past / p.life) * .18);
            const tx = burst.x + Math.cos(p.angle) * pastDistance + p.drift * past * past;
            const ty = burst.y + Math.sin(p.angle) * pastDistance + p.gravity * past * past * .12;
            ctx.globalAlpha = alpha * Math.pow(.68, j);
            ctx.fillStyle = colors[p.color];
            ctx.fillRect(tx, ty, Math.max(.4, p.size * .42), Math.max(.4, p.size * .42));
          }
          glow(x, y, p.size, p.color, alpha);
        }
      }
      ctx.restore();
    }

    // ---------- 文案 ----------
    const WISH_TEXT = '小朋友，闭上眼睛，在心里默念你的愿望';
    function buildWish() {
      wishLine.innerHTML = '';
      [...WISH_TEXT].forEach((ch, i) => {
        const s = document.createElement('span');
        s.textContent = ch;
        s.style.transitionDelay = (i * .038) + 's';
        wishLine.appendChild(s);
      });
      wishHint.textContent = coarse.matches ? '念完，轻触屏幕' : '念完，点击鼠标';
    }
    buildWish();

    let wishTimers = [];
    function clearWishTimers() { wishTimers.forEach(clearTimeout); wishTimers.length = 0; }
    function later(fn, delay) { wishTimers.push(setTimeout(fn, delay)); }

    function showWish() {
      wish.classList.add('is-on');
      later(() => { armed = true; wish.classList.add('is-armed'); stage.classList.add('is-armed'); }, 2000);
    }
    function hideWish() { wish.classList.remove('is-on', 'is-armed'); stage.classList.remove('is-armed'); }

    let titleRaf = 0;
    function showTitle() {
      title.classList.add('is-visible');
      // 从左到右“写”出来：遮罩位置 100% → 0%
      titleImg.style.maskPosition = '100% 0';
      titleImg.style.webkitMaskPosition = '100% 0';
      const dur = 1500;
      const t0 = performance.now();
      cancelAnimationFrame(titleRaf);
      (function wipe() {
        const p = Math.min(1, (performance.now() - t0) / dur);
        const pos = (1 - ease(p)) * 100;
        titleImg.style.maskPosition = pos.toFixed(2) + '% 0';
        titleImg.style.webkitMaskPosition = pos.toFixed(2) + '% 0';
        if (p < 1) titleRaf = requestAnimationFrame(wipe);
      })();
      // 写完后一道金光扫过笔迹
      later(() => {
        titleSheen.style.transition = 'opacity .3s ease';
        titleSheen.style.opacity = '1';
        requestAnimationFrame(() => {
          titleSheen.style.transition = 'background-position 1.05s cubic-bezier(.4,0,.2,1), opacity .3s ease';
          titleSheen.style.backgroundPosition = '50% 0';
        });
        later(() => { titleSheen.style.opacity = '0'; }, 1150);
      }, 780);
    }
    function resetTitle() {
      cancelAnimationFrame(titleRaf);
      title.classList.remove('is-visible');
      titleImg.style.maskPosition = '100% 0';
      titleImg.style.webkitMaskPosition = '100% 0';
      titleSheen.style.transition = 'none';
      titleSheen.style.opacity = '0';
      titleSheen.style.backgroundPosition = '-50% 0';
    }

    // ---------- 流程 ----------
    function begin() {
      if (reduced) { finish(); return; }
      mode = 'playing'; elapsed = 0; startTime = performance.now();
      launched.clear(); fireworks.length = 0; skipBurst = false;
      titleShown = false; armed = false; textShown = false; candleShown = false;
      dustFade = 1;
      fxActive = false;
      fxCue.start = false; fxProgActive = false; FX.show(false);
      clearTimeout(fxHideTimer);
      cakeReset();
      clearWishTimers(); resetTitle(); hideWish();
      intro.classList.add('is-hidden'); intro.classList.remove('is-visible');
      skipButton.hidden = false; replayButton.hidden = true;
      status.textContent = 'THE LIGHT IS GATHERING';
      setTimeout(loadOff, 1500);
      FX.load();
    }

    function blow() {
      if (mode !== 'waiting' || !armed) return;
      mode = 'blow'; blowStart = performance.now(); blowT = 0;
      armed = false;
      skipButton.hidden = true;
      stage.classList.remove('is-armed');
      wish.classList.remove('is-armed');
      status.textContent = 'MAKE A WISH';
    }

    function finish() {
      mode = 'finished';
      finishTime = performance.now();
      intro.classList.add('is-hidden'); intro.classList.remove('is-visible');
      skipButton.hidden = true; replayButton.hidden = false;
      hideWish();
      if (!titleShown) { titleShown = true; showTitle(); }
      status.textContent = 'HAPPY BIRTHDAY';
      setTimeout(function () { if (mode === 'finished') cakeShow(); }, 900);
    }

    startButton.addEventListener('click', begin);
    replayButton.addEventListener('click', begin);
    skipButton.addEventListener('click', () => {
      if (mode !== 'playing' && mode !== 'waiting') return;
      fireworks.length = 0;
      fireCues.forEach((_, i) => launched.add(i));
      if (FX.ready) {
        fxStart();
      } else {
        skipBurst = true;
        makeFirework(0, 0, true);
        skipBurst = false;
      }
      finish();
    });

    stage.addEventListener('click', (e) => {
      if (mode !== 'waiting' || !armed) return;
      if (e.target.closest('button')) return;
      blow();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && mode === 'waiting' && armed) { e.preventDefault(); blow(); }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pauseAt = performance.now();
      else if (pauseAt) {
        const delta = performance.now() - pauseAt;
        if (mode === 'playing') startTime += delta;
        if (mode === 'blow') blowStart += delta;
      }
      pauseAt = 0;
    });

    const dbgEl = document.getElementById('fxdbg');
    const dbgOn = /[?&](fxdebug=1|fx=1)/.test(location.search);
    if (dbgOn) dbgEl.style.display = 'block';
    function fxd(s) { if (dbgOn) dbgEl.textContent = s; }
    function fxdAlways(s) { dbgEl.style.display = "block"; dbgEl.textContent = s; }
    addEventListener('error', function (e) {
      if (true) fxdAlways('JS ERROR: ' + (e.message || '?') + '\n@' + (e.filename || '') + ':' + (e.lineno || ''));
    });

    // 烟花节目单：15 秒，跳过与正常播放共用同一套
    const FXPROG = [
      { at: 0.0,  kind: 'single', nx: -0.38, ny: 0.34, s: 0.70, gold: true },
      { at: 0.9,  kind: 'volley' },
      { at: 3.7,  kind: 'volley' },
      { at: 6.5,  kind: 'volley' },
      { at: 9.3,  kind: 'volley' },
      { at: 12.1, kind: 'volley' },
      { at: 14.0, kind: 'single', nx: 0.38, ny: 0.30, s: 0.55, gold: true },
      { at: 15.0, kind: 'fade' }
    ];
    let fxProgActive = false, fxProgStart = 0, fxProgIndex = 0;

    function fxStart() {
      if (!FX.ready || fxProgActive) return;
      fxProgActive = true; fxProgStart = performance.now(); fxProgIndex = 0;
      fxActive = true; FX.show(true);
    }

    function fxSpot(nx, ny) {
      const halfH = Math.tan(Math.PI / 6) * 800;
      return { x: nx * halfH * (width / height), y: ny * halfH };
    }

    // ---------- 蛋糕退出键 ----------
    const cakeBtn = document.getElementById('cake');
    let exiting = false;

    function cakeShow() { if (exiting) return; cakeBtn.classList.add('is-in'); }
    function cakeReset() { cakeBtn.classList.remove('is-in', 'is-out'); exiting = false; }

    function cakeSparks() {
      for (let i = 0; i < 14; i++) {
        const s = document.createElement('i');
        s.className = 'cake__spark';
        cakeBtn.appendChild(s);
        const a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 48;
        const dx = Math.cos(a) * d, dy = Math.sin(a) * d - 16;
        const anim = s.animate([
          { transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 },
          { transform: 'translate(-50%,-50%) scale(1.1)', opacity: .9, offset: .15 },
          { transform: 'translate(calc(-50% + ' + dx.toFixed(1) + 'px), calc(-50% + ' + dy.toFixed(1) + 'px)) scale(.2)', opacity: 0 }
        ], { duration: 700 + Math.random() * 260, easing: 'cubic-bezier(.2,.7,.3,1)' });
        anim.onfinish = function () { if (s.parentNode) s.parentNode.removeChild(s); };
      }
    }

    function leaveShow() {
      if (exiting) return;
      exiting = true;
      cakeBtn.classList.add('is-out');
      cakeSparks();
      const embedded = window.self !== window.top || /[?&]embed=1/.test(location.search);
      setTimeout(function () {
        if (embedded) {
          try { parent.postMessage({ type: '燕云-退出' }, '*'); } catch (e) {}
        } else {
          location.href = 'index.html';
        }
      }, 640);
    }
    cakeBtn.addEventListener('click', leaveShow);
    addEventListener('message', function (e) {
      if (e.data && e.data.type === '燕云-进入') cakeReset();
    });

    // ---------- three.js 烟花层 ----------
    const FX = (function () {
      const cv = document.getElementById('fxgl');
      const mob = mobile.matches;
      const CFG = {
        sparks: mob ? 460 : 860,
        trail: mob ? 8 : 12,
        radius: mob ? .30 : .26,
        drag: 2.4,
        gravity: 105
      };
      const MAX = mob ? 5200 : 10000;
      const VIEW_H = 923.8;
      const PALETTE = [
        [0.95, 0.80, 0.52], [0.90, 0.55, 0.24], [0.78, 0.20, 0.30],
        [0.85, 0.28, 0.58], [0.56, 0.44, 0.86], [0.44, 0.66, 0.93], [0.48, 0.86, 0.84]
      ];
      const rand = (a, b) => a + Math.random() * (b - a);
      const pick = (a) => a[(Math.random() * a.length) | 0];

      let renderer = null, scene = null, camera = null;
      let ready = false, failed = false, loading = false, tAll = 0;
      let headPos, headCol, segPos, segCol, headGeo, segGeo;
      let coreMat, haloMat, glowMat, trailMat, smokeGeo, smokeMat, smokePos, smokeCol;
      let flashGeo = null;
      const flashes = [], sparks = [], smokes = [];

      function makeGlow(stops) {
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const g = c.getContext('2d');
        const gr = g.createRadialGradient(64, 64, 0, 64, 64, 63);
        for (let i = 0; i < stops.length; i++) gr.addColorStop(stops[i][0], 'rgba(255,255,255,' + stops[i][1] + ')');
        g.fillStyle = gr;
        g.fillRect(0, 0, 128, 128);
        const t = new THREE.CanvasTexture(c);
        t.needsUpdate = true;
        return t;
      }

      function load() {
        if (loading || ready || failed) return;
        loading = true;
        const s = document.createElement('script');
        s.src = 'assets/vendor/three/three.global.js';
        s.onload = function () { loading = false; fxd('脚本已加载\nTHREE=' + (typeof window.THREE)); init(); };
        s.onerror = function () { loading = false; failed = true; fxdAlways('脚本加载失败\n' + s.src); };
        document.head.appendChild(s);
      }

      function init() {
        if (ready || !window.THREE) { failed = true; return; }
        try {
          THREE.ColorManagement.enabled = false;
          renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: true, powerPreference: 'high-performance' });
          renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
          renderer.setSize(innerWidth, innerHeight, false);
          renderer.setClearAlpha(0);
          scene = new THREE.Scene();
          camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 1, 6000);
          camera.position.set(0, 0, 800);

          const TEX_CORE = makeGlow([[0, 1], [0.22, 0.85], [0.5, 0.22], [1, 0]]);
          const TEX_HALO = makeGlow([[0, 0.55], [0.35, 0.22], [1, 0]]);
          const TEX_SMOKE = makeGlow([[0, 0.5], [0.45, 0.22], [1, 0]]);

          headPos = new Float32Array(MAX * 3);
          headCol = new Float32Array(MAX * 3);
          segPos = new Float32Array(MAX * CFG.trail * 2 * 3);
          segCol = new Float32Array(MAX * CFG.trail * 2 * 3);

          headGeo = new THREE.BufferGeometry();
          headGeo.setAttribute('position', new THREE.BufferAttribute(headPos, 3));
          headGeo.setAttribute('color', new THREE.BufferAttribute(headCol, 3));
          segGeo = new THREE.BufferGeometry();
          segGeo.setAttribute('position', new THREE.BufferAttribute(segPos, 3));
          segGeo.setAttribute('color', new THREE.BufferAttribute(segCol, 3));

          coreMat = new THREE.PointsMaterial({ size: 3.2, map: TEX_CORE, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, sizeAttenuation: true });
          haloMat = new THREE.PointsMaterial({ size: 15, map: TEX_HALO, vertexColors: true, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, sizeAttenuation: true });
          glowMat = new THREE.PointsMaterial({ size: 46, map: TEX_HALO, vertexColors: true, transparent: true, opacity: .26, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, sizeAttenuation: true });
          trailMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .92, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });

          const headCore = new THREE.Points(headGeo, coreMat);
          const headHalo = new THREE.Points(headGeo, haloMat);
          const headGlow = new THREE.Points(headGeo, glowMat);
          const trailLines = new THREE.LineSegments(segGeo, trailMat);
          headCore.frustumCulled = headHalo.frustumCulled = headGlow.frustumCulled = trailLines.frustumCulled = false;
          scene.add(headGlow, headHalo, trailLines, headCore);

          flashGeo = new THREE.PlaneGeometry(1, 1);

          smokePos = new Float32Array(1200 * 3);
          smokeCol = new Float32Array(1200 * 3);
          smokeGeo = new THREE.BufferGeometry();
          smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
          smokeGeo.setAttribute('color', new THREE.BufferAttribute(smokeCol, 3));
          smokeMat = new THREE.PointsMaterial({ size: 320, map: TEX_SMOKE, vertexColors: true, transparent: true, opacity: .14, blending: THREE.NormalBlending, depthTest: false, depthWrite: false, sizeAttenuation: true });
          const smokePoints = new THREE.Points(smokeGeo, smokeMat);
          smokePoints.frustumCulled = false;
          scene.add(smokePoints);

          ready = true;
          renderer.render(scene, camera);
          fxd('就绪\nsparks=' + sparks.length + '  canvas=' + cv.width + 'x' + cv.height);
        } catch (err) {
          failed = true;
          ready = false;
          fxdAlways('初始化失败：' + (err && err.message));
        }
      }

      function addSpark(x, y, z, vx, vy, vz, life, r, g, b, dim, split) {
        if (sparks.length >= MAX) return;
        const hist = new Float32Array(CFG.trail * 3);
        for (let i = 0; i < CFG.trail; i++) { hist[i * 3] = x; hist[i * 3 + 1] = y; hist[i * 3 + 2] = z; }
        sparks.push({
          x: x, y: y, z: z, vx: vx, vy: vy, vz: vz,
          life: life, age: 0, head: 0, hist: hist,
          r: r, g: g, b: b, dim: dim, split: split,
          splitAt: split > 0 ? rand(.38, .62) * life : -1,
          ph: Math.random() * 6.283
        });
      }

      function addFlash(x, y, z, R, color) {
        const mat = new THREE.MeshBasicMaterial({ map: coreMat.map, color: color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
        const m = new THREE.Mesh(flashGeo, mat);
        m.position.set(x, y, z);
        m.scale.setScalar(R * .5);
        scene.add(m);
        flashes.push({ mesh: m, mat: mat, age: 0, life: .45, R: R });
      }

      function burst(cx, cy, scale, forcedColor) {
        if (!ready) return;
        const R = VIEW_H * CFG.radius * scale;
        const type = pick(['peony', 'willow', 'chrys']);
        const base = forcedColor || pick(PALETTE);
        const splitChance = Math.random() < .42 ? rand(.14, .26) : 0;
        const n = Math.round(CFG.sparks * (scale < .8 ? .72 : 1));

        function emit(dx, dy, dz, speed, life, split) {
          const depth = .55 + .45 * ((dz + 1) / 2);
          const mixK = Math.random() < .2 ? .7 : 0;
          const alt = mixK ? pick(PALETTE) : base;
          addSpark(cx, cy, 0, dx * speed, dy * speed, dz * speed * .85, life,
            base[0] + (alt[0] - base[0]) * mixK,
            base[1] + (alt[1] - base[1]) * mixK,
            base[2] + (alt[2] - base[2]) * mixK, depth, split);
        }

        for (let i = 0; i < n; i++) {
          const phi = Math.random() * Math.PI * 2;
          const ct = rand(-1, 1);
          const st = Math.sqrt(1 - ct * ct);
          let speed, life, split = 0;
          if (type === 'willow') {
            speed = CFG.drag * R * rand(.45, .72); life = rand(3.4, 4.6);
            split = Math.random() < splitChance * .6 ? 1 : 0;
          } else if (type === 'chrys') {
            speed = CFG.drag * R * (Math.random() < .5 ? rand(.40, .68) : rand(1.0, 1.35));
            life = rand(2.4, 3.4);
            split = Math.random() < splitChance ? 1 : 0;
          } else {
            speed = CFG.drag * R * rand(.72, 1.15); life = rand(2.6, 3.6);
            split = Math.random() < splitChance * .8 ? 1 : 0;
          }
          emit(st * Math.cos(phi), ct, st * Math.sin(phi), speed, life, split);
        }

        addFlash(cx, cy, 0, R, new THREE.Color(base[0], base[1], base[2]));
        for (let i = 0; i < 8; i++) {
          const a = Math.random() * Math.PI * 2;
          addSpark(cx, cy, 0, Math.cos(a) * R * .6, Math.sin(a) * R * .6, rand(-.4, .4) * R * .6, .4, 1, 1, 1, 1, 0);
        }
        const puffs = mob ? 6 : 9;
        for (let i = 0; i < puffs; i++) {
          smokes.push({
            x: cx + rand(-R * .3, R * .3), y: cy + rand(-R * .3, R * .3),
            vx: rand(-16, 16), vy: rand(6, 22), life: rand(5, 8), age: 0,
            r: base[0] * .5, g: base[1] * .5, b: base[2] * .5
          });
        }
      }

      function volley(count) {
        fxd('volley: ready=' + ready + ' failed=' + failed);
        if (!ready) return;
        const halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
        const halfW = halfH * camera.aspect;
        const n = count || (mob ? 4 : 6);
        for (let i = 0; i < n; i++) {
          const delay = i * rand(90, 200);
          const x = (-0.78 + ((i + .5) / n) * 1.56 + rand(-.04, .04)) * halfW;
          const y = halfH * rand(.10, .46);
          setTimeout(function () {
            burst(x, y, rand(.65, 1.02),
              Math.random() < .08 ? [0.44, 0.66, 0.93] : null);
          }, delay);
        }
      }

      function render(dt) {
        if (!ready) return;
        if (!sparks.length && !smokes.length && !flashes.length) return;
        tAll += dt;
        camera.position.x = Math.sin(tAll * .11) * 34;
        camera.position.y = Math.cos(tAll * .09) * 16;
        camera.lookAt(0, 0, 0);

        let hp = 0, cp = 0;
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          s.age += dt;
          if (s.age >= s.life) { sparks[i] = sparks[sparks.length - 1]; sparks.pop(); continue; }

          const damp = Math.exp(-CFG.drag * dt);
          s.vx *= damp; s.vz *= damp;
          s.vy = s.vy * damp - CFG.gravity * dt;
          s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;

          if (s.split > 0 && s.splitAt > 0 && s.age > s.splitAt) {
            s.splitAt = -1;
            for (let k = 0; k < 3; k++) {
              const a = Math.random() * Math.PI * 2, e = rand(-1, 1);
              const sq = Math.sqrt(1 - e * e);
              const sp = 60 + Math.random() * 90;
              addSpark(s.x, s.y, s.z, sq * Math.cos(a) * sp, e * sp, sq * Math.sin(a) * sp,
                rand(.4, .85), 1, .95, .85, 1, 0);
            }
            sparks[i] = sparks[sparks.length - 1]; sparks.pop();
            continue;
          }

          s.head = (s.head + 1) % CFG.trail;
          s.hist[s.head * 3] = s.x;
          s.hist[s.head * 3 + 1] = s.y;
          s.hist[s.head * 3 + 2] = s.z;

          const t = s.age / s.life;
          const fade = Math.pow(1 - t, 1.25);
          const white = Math.max(0, 1 - s.age / .28);
          const tw = .6 + .4 * Math.sin(s.age * 44 + s.ph);
          const d = s.dim * fade * tw;
          const r = (s.r + (1 - s.r) * white) * d;
          const g = (s.g + (1 - s.g) * white) * d;
          const b = (s.b + (1 - s.b) * white) * d;

          headPos[hp * 3] = s.x; headPos[hp * 3 + 1] = s.y; headPos[hp * 3 + 2] = s.z;
          headCol[hp * 3] = r; headCol[hp * 3 + 1] = g; headCol[hp * 3 + 2] = b;
          hp++;

          for (let j = 0; j < CFG.trail - 1; j++) {
            const i0 = (s.head - j + CFG.trail) % CFG.trail;
            const i1 = (s.head - j - 1 + CFG.trail) % CFG.trail;
            const k0 = (1 - j / CFG.trail) * .95;
            const k1 = (1 - (j + 1) / CFG.trail) * .95;
            const o = cp * 3;
            segPos[o] = s.hist[i0 * 3]; segPos[o + 1] = s.hist[i0 * 3 + 1]; segPos[o + 2] = s.hist[i0 * 3 + 2];
            segPos[o + 3] = s.hist[i1 * 3]; segPos[o + 4] = s.hist[i1 * 3 + 1]; segPos[o + 5] = s.hist[i1 * 3 + 2];
            segCol[o] = r * k0; segCol[o + 1] = g * k0; segCol[o + 2] = b * k0;
            segCol[o + 3] = r * k1; segCol[o + 4] = g * k1; segCol[o + 5] = b * k1;
            cp += 2;
          }
        }

        headGeo.setDrawRange(0, hp);
        headGeo.attributes.position.needsUpdate = true;
        headGeo.attributes.color.needsUpdate = true;
        segGeo.setDrawRange(0, cp);
        segGeo.attributes.position.needsUpdate = true;
        segGeo.attributes.color.needsUpdate = true;

        for (let i = flashes.length - 1; i >= 0; i--) {
          const f = flashes[i];
          f.age += dt;
          const k = f.age / f.life;
          if (k >= 1) { scene.remove(f.mesh); f.mat.dispose(); flashes.splice(i, 1); continue; }
          f.mesh.scale.setScalar(f.R * (.5 + 2.6 * k));
          f.mat.opacity = Math.pow(1 - k, 2) * .9;
        }

        let sp2 = 0;
        for (let i = smokes.length - 1; i >= 0; i--) {
          const s = smokes[i];
          s.age += dt;
          if (s.age >= s.life) { smokes.splice(i, 1); continue; }
          s.x += s.vx * dt; s.y += s.vy * dt;
          s.vx *= .995;
          const k = Math.sin(Math.min(1, s.age / s.life) * Math.PI) * .9;
          smokePos[sp2 * 3] = s.x; smokePos[sp2 * 3 + 1] = s.y; smokePos[sp2 * 3 + 2] = -70;
          smokeCol[sp2 * 3] = s.r * k; smokeCol[sp2 * 3 + 1] = s.g * k; smokeCol[sp2 * 3 + 2] = s.b * k;
          sp2++;
        }
        smokeGeo.setDrawRange(0, sp2);
        smokeGeo.attributes.position.needsUpdate = true;
        smokeGeo.attributes.color.needsUpdate = true;

        renderer.render(scene, camera);
      }

      function resize() {
        if (!ready) return;
        renderer.setSize(innerWidth, innerHeight, false);
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
      }

      function show(on) { cv.classList.toggle('is-on', !!on); }

      addEventListener('resize', resize);

      return {
        load: load, volley: volley, render: render, show: show, burst: burst,
        get ready() { return ready; },
        get failed() { return failed; }
      };
    })();

    // 调试用：地址加 ?fx=1 自动放一轮（手机也能测）
    if (/[?&]fx=1/.test(location.search)) {
      FX.load();
      (function waitFX() {
        if (FX.ready) { FX.show(true); FX.volley(); }
        else if (!FX.failed) setTimeout(waitFX, 120);
      })();
    }

    // 调试用：按 F 放一轮（第 1 步验收用，接入正式时间轴后删除）
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'f' && e.key !== 'F') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      FX.load();
      (function waitKey() {
        if (FX.ready) { FX.show(true); FX.volley(); setTimeout(function () { FX.show(false); }, 9000); }
        else if (!FX.failed) setTimeout(waitKey, 120);
      })();
    });

    // ---------- 主循环 ----------
    function draw(now) {
      requestAnimationFrame(draw);
      if (document.hidden || now - lastDraw < (mobile.matches ? 33 : 16)) return;
      lastDraw = now;
      const dt = Math.min(.05, (now - lastTime) / 1000); lastTime = now;
      if (mode === 'intro' && now - introTime > 3000) intro.classList.add('is-visible');
      if (mode === 'playing') elapsed = (now - startTime) / 1000;
      clear();
      const time = mode === 'intro' ? (now - introTime) / 1000 : now / 1000;

      let dustMult = 1;
      let lightIntensity = 0, candleAlpha = 0, clipR = -1, lit = 1, dark = 0;

      if (mode === 'playing') {
        const e = elapsed;
        // 开场金尘：点击后 0.8 秒淡出，不再汇聚
        dustFade = clamp(1 - e / .8);
        dustMult = .25 + .75 * dustFade;

        if (e >= marks.star && e < marks.numbers && !star.classList.contains('is-on')) {
          star.classList.add('is-on'); setTimeout(() => star.classList.remove('is-on'), 700);
        }
        if (e >= marks.numbers && e < marks.zero) {
          let local = e - marks.numbers;
          const sequence = ['3','2','1'];
          for (let i = 0; i < 3; i++) {
            if (local < durations[i]) { drawNumber(sequence[i], sequence[i + 1] || '0', local, durations[i], false, sequence[i - 1] || null); break; }
            local -= durations[i];
          }
        }
        if (e >= marks.zero && e < marks.ring) drawNumber('0', '0', e - marks.zero, marks.ring - marks.zero, true, '1');
        if (e >= marks.ring && e < marks.collapse) drawRing(e - marks.ring);

        if (e >= marks.collapse) {
          const ct = (e - marks.collapse) / (marks.ignite - marks.collapse);
          drawCollapse(clamp(ct));
          dustMult = .7;
        }
        if (e >= marks.ignite) {
          candleShown = true;
          const it = clamp((e - marks.ignite) / 1.2);
          clipR = ease(it) * Math.max(candle.w, candle.h) * 1.05;
          candleAlpha = smooth(it * 1.4);
          lightIntensity = smooth(it / .55);
          dustMult = .45;
          drawIgniteWave(clipR, 1 - it);
        }
        if (e >= marks.text && !textShown) { textShown = true; showWish(); status.textContent = 'MAKE A WISH'; }
        if (e >= marks.armed && mode === 'playing') { mode = 'waiting'; }
      }

      if (mode === 'waiting') {
        lightIntensity = 1; candleAlpha = 1; clipR = -1; dustMult = .35;
      }

      if (mode === 'blow') {
        blowT = (now - blowStart) / 1000;
        // 0.12–0.35s：交叉溶解到熄灭图
        lit = 1 - smooth((blowT - .12) / .23);
        lightIntensity = 1 - smooth(blowT / .42);
        candleAlpha = 1 - smooth((blowT - .2) / 1.1) * .70;
        // 「生日快乐」开始书写后，烛台在 1.8 秒内退干净
        const gone = smooth((blowT - 2.4) / 1.8);
        candleAlpha *= (1 - gone);
        dark = smooth((blowT - .3) / .9) * .78;
        dark *= (1 - smooth((blowT - 2.4) / 1.8) * .55);
        dustMult = .35 - dark * .25;
        if (blowT >= 1.6 && wish.classList.contains('is-on')) hideWish();
        if (blowT >= 2.4 && !titleShown) { titleShown = true; showTitle(); status.textContent = 'HAPPY BIRTHDAY'; }
        if (FX.ready) {
          if (!fxCue.start && blowT >= 3.2) { fxCue.start = true; fxStart(); }
        } else if (blowT >= 3.9) {
          drawFireworks(blowT - 3.9);
        }
        if (blowT >= (fxActive ? 19.4 : 12.5)) finish();
      }

      if (mode === 'finished') {
        dustMult = .3;
        if (candleShown) { candleAlpha = 0; dark = .30; lit = 0; }
        if (!fxActive && now - finishTime < 3400) drawFireworks((now - finishTime) / 1000);
      }

      // 金尘 → 烛身 → 灯光 → 烟 → 暗场
      drawDust(time, mode === 'finished', dustMult);

      if (candleShown) {
        drawCandle(candleAlpha, clipR, lit);
      }
      if (lightIntensity > .01) drawCandleLight(time, lightIntensity);

      if (candleShown) {
        const strandBoost = mode === 'blow' ? Math.max(0, 1 - blowT * 1.4) : mode === 'finished' ? 0 : 1;
        if (strandBoost > .01) drawSmoke(time, strandBoost);
        if (mode === 'blow' || mode === 'finished') drawWisp(mode === 'blow' ? blowT - .35 : 4.7);
      }

      if (dark > 0) {
        ctx.save();
        const g = ctx.createRadialGradient(candle.fx, candle.fy, 0, candle.fx, candle.fy, Math.max(candle.w, candle.h) * (.42 + .5 * dark));
        g.addColorStop(0, 'rgba(3,3,6,' + (.92 * dark) + ')');
        g.addColorStop(.55, 'rgba(3,3,6,' + (.45 * dark) + ')');
        g.addColorStop(1, 'rgba(3,3,6,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // 烟花节目单（15 秒，跳过与正常播放共用）
      if (fxProgActive) {
        const ft = (now - fxProgStart) / 1000;
        while (fxProgIndex < FXPROG.length && ft >= FXPROG[fxProgIndex].at) {
          const step = FXPROG[fxProgIndex++];
          if (step.kind === 'volley') FX.volley();
          else if (step.kind === 'fade') FX.show(false);
          else {
            const p = fxSpot(step.nx, step.ny);
            FX.burst(p.x, p.y, step.s, step.gold ? [0.94, 0.79, 0.53] : null);
          }
        }
        if (ft > 17) fxProgActive = false;
      }
      if (FX.ready) FX.render(dt);
    }
    requestAnimationFrame(draw);
    if (reduced) {
      intro.classList.add('is-visible');
      startButton.focus();
    }
  })();
