/* Verify relocated runtime paths, inline programs and emitted JavaScript syntax. */
const fs=require('fs'),path=require('path'),vm=require('vm'),{spawnSync}=require('child_process');
const root=path.resolve(process.argv[2]||'.'),missing=[],programs=[];
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=path.join(dir,e.name);return e.isDirectory()?walk(p):[p];});}
const html=fs.readdirSync(root).filter(n=>n.endsWith('.html')).map(n=>path.join(root,n));
const files=[...html,...walk(path.join(root,'assets')).filter(p=>/\.(css|js)$/.test(p)),path.join(root,'内容配置.js')];
let refs=0;
function check(ref,base,from){
  if(!ref||/^(?:data:|blob:|https?:|#|javascript:|mailto:)/.test(ref)||ref.includes('${'))return;
  const name=decodeURIComponent(ref.split(/[?#]/)[0]);if(!name||name.startsWith('#'))return;
  const target=path.resolve(base,name);refs++;
  if(!fs.existsSync(target))missing.push(path.relative(root,from)+' → '+ref);
}
for(const file of files){
 const text=fs.readFileSync(file,'utf8'),ext=path.extname(file),base=path.dirname(file);
 if(ext==='.html'){
  for(const m of text.matchAll(/\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/g))check(m[1],base,file);
  let i=0;for(const m of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
   if(/\bsrc\s*=|type=["'](?:application\/ld\+json|module)/.test(m[1]))continue;
   try{new vm.Script(m[2],{filename:file+':inline-'+(++i)});}catch(e){programs.push(e.message);}
  }
 }
 if(ext==='.css'||ext==='.html')for(const m of text.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g))check(m[1],base,file);
 if(ext==='.js'){
  // Classic scripts load assets relative to root HTML; module imports are file-relative.
  for(const m of text.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))check(m[1],base,file);
  if(!file.includes(path.join('vendor','three')))for(const m of text.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/["'`]((?:assets|图片|视频|新动画合集)\/[^"'`\r\n]+?\.(?:png|jpg|jpeg|js|css|mp4))["'`]/g))check(m[1],root,file);
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status)programs.push(result.stderr);
 }
}
// Bundled music names are encoded at runtime, so verify their local files explicitly.
const music=fs.readFileSync(path.join(root,'assets/js/shared/journey-music.js'),'utf8').match(/const bundledFiles=(\[[^;]+\]);/);
if(music)for(const name of JSON.parse(music[1]))check('音乐/'+name,root,'journey-music.js');
if(missing.length||programs.length){console.error([...missing,...programs].join('\n'));process.exitCode=1;}
else console.log(JSON.stringify({htmlEntries:html.length,codeFiles:files.length,localReferences:refs,missing:0,syntaxErrors:0}));
