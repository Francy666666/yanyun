const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = __dirname;
const out = path.join(root, 'public');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const files = [
  'index.html',
  'motion.html',
  '合照.html',
  '问签.html',
  '装X.html',
  '内容配置.js'
];

const videos = [
  '视频/装X-亮相.mp4',
  '视频/装X-正片.mp4'
];

function copy(rel) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) throw new Error('缺少文件: ' + rel);
  const dst = path.join(out, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

for (const file of files) copy(file);

// 优先只复制 Git 跟踪的站点资源，避免本地未跟踪的旧图被带进部署包。
let tracked = null;
try {
  tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'buffer' })
    .toString('utf8').split('\0').filter(Boolean);
} catch (_) {
  tracked = null;
}

if (tracked) {
  for (const rel of tracked) {
    if (rel.startsWith('assets/') || rel.startsWith('图片/')) copy(rel);
  }
} else {
  for (const dir of ['assets', '图片']) {
    fs.cpSync(path.join(root, dir), path.join(out, dir), { recursive: true });
  }
}

for (const file of videos) copy(file);

const count = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => {
  const p = path.join(dir, e.name);
  return n + (e.isDirectory() ? count(p) : 1);
}, 0);

console.log(`public ready: ${count(out)} files`);
