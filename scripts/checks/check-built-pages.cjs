const {chromium}=require('C:/Users/27616/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve('public');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.ogg':'audio/ogg'};
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 let browser;try{
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const problems=[];
  for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.html'))){
   const page=await browser.newPage(),errors=[],missing=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404&&!r.url().endsWith('/favicon.ico'))missing.push(decodeURI(r.url()));});
   await page.goto(origin+'/'+encodeURIComponent(name),{waitUntil:'load',timeout:60000});
   if(name==='新世界.html')await page.locator('body.ready').waitFor({timeout:60000});
   else await page.waitForTimeout(1000);
   if(errors.length||missing.length)problems.push({name,errors,missing});console.log(JSON.stringify({name,errors,missing}));await page.close();
  }
  if(problems.length)throw Error(JSON.stringify(problems));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
