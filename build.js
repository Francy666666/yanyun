const fs = require('fs');
const path = require('path');
const root = __dirname, out = path.join(root, 'public');
function filesIn(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => {
    const p=path.join(dir,e.name);return e.isDirectory()?filesIn(p):[p];
  });
}
// Preserve every existing HTML entry, including standalone experiments.
const entries=fs.readdirSync(root).filter(n=>n.endsWith('.html'));
const files=new Set([...entries,'内容配置.js']);
for(const dir of ['assets','图片','音乐','新动画合集']) {
  if(fs.existsSync(path.join(root,dir)))for(const p of filesIn(path.join(root,dir)))files.add(path.relative(root,p));
}
// Raw original videos stay local; copy the video paths actually referenced by code.
for(const name of [...files].filter(n=>/\.(html|js|css)$/.test(n))) {
  const source=fs.readFileSync(path.join(root,name),'utf8');
  for(const m of source.matchAll(/["'`](视频\/[^"'`\r\n]+\.(?:mp4|webm|mov))/g))files.add(m[1]);
}
for(const name of files)if(!fs.existsSync(path.join(root,name)))throw Error('缺少运行文件: '+name);
// public is generated output; archives, tools and dependencies are excluded.
fs.rmSync(out,{recursive:true,force:true});
for(const name of files){const dest=path.join(out,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,name),dest);}
console.log('public ready: '+files.size+' files, '+entries.length+' HTML entries');
