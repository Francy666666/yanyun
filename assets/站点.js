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
  const 默认 = Math.max(0, 栏目列.findIndex((c) => 键(c) === '合照' || c.名称.includes('合照')));

  品牌.setAttribute('href', `#${encodeURIComponent(键(栏目列[默认]))}`);

  function 显示(i, 改地址 = true) {
    if (i < 0 || i >= 栏目列.length) return;
    框架.forEach((f, k) => {
      if (k === i && f.dataset.src) {
        f.src = f.dataset.src;
        f.removeAttribute('data-src');
      }
      f.classList.toggle('active', k === i);
    });
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
  });

  if (!location.hash) {
    显示(默认);
  } else {
    从地址显示();
  }
})();
