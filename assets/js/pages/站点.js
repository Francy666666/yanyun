(function () {
  const 配置 = window.燕云内容 || {};
  const 站 = 配置.网站 || {};
  const 栏目列 = (配置.栏目 || []).filter((c) => c && c.名称 && c.页面);

  const 导航 = document.getElementById('顶层导航');
  const 视图 = document.getElementById('站点视图');
  const 站名 = document.getElementById('站名');
  const 副标 = document.getElementById('副标');
  const 日期 = document.getElementById('站日期');
  const 品牌 = document.querySelector('.站点品牌');

  const 转义 = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));

  站名.textContent = 站.标题 || '给洗衣粉的惊喜';
  副标.textContent = 站.副标 || 'SURPRISE';
  日期.textContent = 站.右上角 || '';

  if (!栏目列.length) {
    导航.innerHTML = '';
    视图.innerHTML = '<p style="padding:120px 28px;color:#f0e5cd;font-family:serif">还没有配置栏目。</p>';
    return;
  }

  const 键 = (c) => String(c.键 || c.名称);

  // 顶栏只生成顶层栏目，不再生成每个场景。
  导航.innerHTML = 栏目列.map((c, i) =>
    `<a href="#${encodeURIComponent(键(c))}" data-i="${i}">${转义(c.名称)}</a>`
  ).join('');

  // 每个栏目一个 iframe；第一个先加载，其余点开再加载，避免主站一进来就拖视频。
  视图.innerHTML = 栏目列.map((c, i) =>
    `<iframe class="站点框架" data-i="${i}" ${i === 0 ? `src="${转义(c.页面)}"` : `data-src="${转义(c.页面)}"`} title="${转义(c.名称)}" loading="lazy" allow="autoplay" allowfullscreen></iframe>`
  ).join('');

  const 框架 = [...视图.querySelectorAll('iframe')];
  const 链接 = [...导航.querySelectorAll('a')];
  function 同步场景留白(){
    const top=Math.ceil(document.querySelector('.站点顶栏').getBoundingClientRect().bottom)+12;
    框架.forEach(f=>f.contentWindow?.postMessage({type:'journey-host-layout',top,bottom:86},'*'));
  }
  function 同步场景可见(){
    框架.forEach(f=>f.contentWindow?.postMessage({type:'site-visibility',active:f.classList.contains('active')},'*'));
  }
  框架.forEach(f=>f.addEventListener('load',()=>{同步场景留白();同步场景可见();}));
  addEventListener('message',e=>{if(e.data?.type==='site-visibility-request'&&框架.some(f=>f.contentWindow===e.source))同步场景可见();});
  new ResizeObserver(同步场景留白).observe(document.querySelector('.站点顶栏'));
  addEventListener('message',e=>{if(e.data?.type==='journey-layout-request'&&框架.some(f=>f.contentWindow===e.source))同步场景留白();});

  const 默认 = Math.max(0, 栏目列.findIndex((c) => 键(c) === '合照' || c.名称.includes('合照')));

  品牌.setAttribute('href', `#${encodeURIComponent(键(栏目列[默认]))}`);

  // 主页自带返回：切到非默认栏目时出现，层级高于顶栏与 iframe
  const 返回键 = document.createElement('button');
  返回键.type = 'button';
  返回键.textContent = '← 返回';
  返回键.setAttribute('aria-label', '返回首页栏目');
  返回键.style.cssText = 'position:fixed;z-index:140;left:clamp(20px,3.6vw,52px);bottom:calc(26px + env(safe-area-inset-bottom));height:34px;padding:0 15px;border:1px solid rgba(230,220,200,.18);border-radius:18px;background:rgba(10,12,14,.62);color:rgba(240,230,210,.72);font:11px system-ui,sans-serif;letter-spacing:.16em;cursor:pointer;backdrop-filter:blur(8px);display:none';
  返回键.onclick = () => 显示(默认);
  document.body.append(返回键);

  function 显示(i, 改地址 = true) {
    if (i < 0 || i >= 栏目列.length) return;
    返回键.style.display = (i === 默认) ? 'none' : 'block';
    框架.forEach((f, k) => {
      if (k === i && f.dataset.src) {
        f.src = f.dataset.src;
        f.removeAttribute('data-src');
      }
      f.classList.toggle('active', k === i);
    });
    同步场景可见();
    // 离开“装X时刻”时，把它从全屏入戏状态里退出来。
    if (栏目列[i].键 !== '装X') {
      document.documentElement.classList.remove('装X-沉浸', '装X-日', '装X-暮', '装X-夜');
      框架.forEach((f) => { try { f.contentWindow?.postMessage({ type: '装X-退出沉浸' }, '*'); } catch (_) {} });
    } else {
      // 回到装X时刻时，让它把当前天色重新告诉外壳，并暂停看不见的播放。
      setTimeout(() => {
        try { 框架[i].contentWindow?.postMessage({ type: '装X-请主题' }, '*'); } catch (_) {}
      }, 260);
    }
    if (栏目列[i].键 !== '装X') {
      框架.forEach((f) => { try { f.contentWindow?.postMessage({ type: '装X-暂停' }, '*'); } catch (_) {} });
    }
    if (栏目列[i].键 === '生日') {
      try { 框架[i].contentWindow?.postMessage({ type: '燕云-进入' }, '*'); } catch (_) {}
    }
    链接.forEach((a, k) => {
      a.classList.toggle('active', k === i);
      if (k === i) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = `${栏目列[i].名称} · ${站.标题 || '燕云十六声'}`;
    if (改地址) {
      const 目标 = `#${encodeURIComponent(键(栏目列[i]))}`;
      if (location.hash !== 目标) history.replaceState(null, '', 目标);
    }
  }

  function 从地址显示() {
    const 原 = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    const i = 栏目列.findIndex((c) => 键(c) === 原);
    显示(i >= 0 ? i : 默认, false);
  }

  链接.forEach((a, i) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      显示(i);
    });
  });

  addEventListener('hashchange', 从地址显示);

  // 装X时刻进入“入戏”时，让外壳顶栏自动退场。
  addEventListener('message', (e) => {
    if (e.data && e.data.type === '装X-沉浸') {
      document.documentElement.classList.toggle('装X-沉浸', !!e.data.value);
    }
    if (e.data && e.data.type === '装X-主题') {
      document.documentElement.classList.remove('装X-日', '装X-暮', '装X-夜');
      if (e.data.value) document.documentElement.classList.add('装X-' + e.data.value);
    }
    if (e.data && e.data.type === 'hub-exit') {
      显示(默认);
    }
    if (e.data && e.data.type === '燕云-退出') {
      显示(默认);
    }
  });

  if (!location.hash) {
    显示(默认);
  } else {
    从地址显示();
  }
})();
