const {chromium}=require('C:/Users/27616/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const assert=(ok,text)=>{if(!ok)throw Error(text);};
// Short PCM fixture verifies playback without relying on a remote music service.
const wav=Buffer.alloc(44+16000);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(16000,40);
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--allow-file-access-from-files']});
try{
const mobile=process.argv.includes('--mobile');const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile});page.setDefaultTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=pathToFileURL(path.resolve('古风长廊.html')).href;
if(process.argv.includes('--layout')){
await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><body style="background:#0a1820">');
await page.addScriptTag({content:fs.readFileSync('assets/js/shared/journey-captions.js','utf8')});await page.evaluate(()=>{new JourneyCaptions().enter(1);});
await page.addScriptTag({content:fs.readFileSync('assets/js/shared/journey-music.js','utf8')});await page.locator('.music-toggle').click();
assert(await page.locator('.music-volume').evaluate(e=>e.clientHeight<25),'Volume label wraps');
assert(await page.locator('.music-panel').evaluate(e=>e.getBoundingClientRect().right<=innerWidth),'Panel outside viewport');
await page.screenshot({path:`archive/screenshots/controls-layout-${mobile?'mobile':'desktop'}.png`});console.log(JSON.stringify({mobile,layout:true,errors}));return;
}
await page.goto(base);await page.locator('.music-toggle').waitFor();
await page.waitForFunction(()=>document.querySelectorAll('.journey-caption p.is-visible').length===1);
assert(!await page.locator('.caption-toggle').innerText().then(t=>t.includes('CC')),'CC remains');
assert(await page.locator('.journey-caption').evaluate(el=>el.firstElementChild.scrollWidth<=el.clientWidth+1),'Caption overflow');
const cap=await page.locator('.journey-caption').boundingBox();assert(cap.y> (mobile?720:650),'Caption not at bottom');
if(!mobile){await page.mouse.move(1100,200);await page.waitForTimeout(1000);}
await page.locator('.music-toggle').click();await page.screenshot({path:`archive/screenshots/controls-${mobile?'mobile':'desktop'}.png`});
assert(!await page.evaluate(()=>window.journeyMusic.getState().playing),'Unexpected autoplay');
await page.locator('.music-play').click();
await page.waitForFunction(()=>window.journeyMusic.audio.currentTime>.15&&window.journeyMusic.audio.duration>20);
console.log('First OGG plays',await page.evaluate(()=>({src:window.journeyMusic.audio.currentSrc,duration:window.journeyMusic.audio.duration})));
await page.locator('.music-next').click();
await page.waitForFunction(()=>window.journeyMusic.getState().selected===1&&window.journeyMusic.audio.currentTime>.15&&window.journeyMusic.audio.duration>20);
console.log('Second OGG plays',await page.evaluate(()=>({src:window.journeyMusic.audio.currentSrc,duration:window.journeyMusic.audio.duration})));
await page.locator('.music-volume input').evaluate(el=>{el.value='.23';el.dispatchEvent(new Event('input',{bubbles:true}));});
assert(await page.evaluate(()=>window.journeyMusic.audio.volume===.23),'Volume did not update');
await page.locator('.music-close').click();await page.reload();await page.locator('.music-toggle').waitFor();
await page.waitForFunction(()=>window.journeyMusic.getState().loaded.every(Boolean));assert(!await page.evaluate(()=>window.journeyMusic.getState().playing),'Audio autoplayed');
await page.goto(base+'?return=water');const frame=page.frameLocator('iframe');await frame.locator('body.ready').waitFor();await page.locator('.music-toggle').click();await page.locator('.music-play').click();await page.waitForFunction(()=>window.journeyMusic.getState().playing);await page.locator('.music-close').click();
await page.locator('canvas').click({position:{x:190,y:400}});
await page.waitForFunction(()=>!document.querySelector('.journey-welcome').hidden);assert(await page.locator('.journey-welcome').innerText()==='欢迎来到新世界','Welcome missing');
await page.waitForFunction(()=>document.querySelector('iframe').style.opacity==='1');await frame.locator('.music-toggle').waitFor();
assert(await page.locator('.journey-music').isHidden(),'Parent music overlaps child');
assert(await frame.locator('.journey-caption p').count()===0,'Seventh caption remains');
await frame.locator('body:not(.journey-active)').waitFor();await frame.locator('.journey-caption p.is-visible').nth(2).waitFor();
assert(await page.evaluate(()=>window.journeyMusic.getState().playing),'Music interrupted by entry');
await frame.locator('.music-toggle').click();await frame.locator('.music-next').click();await page.waitForFunction(()=>window.journeyMusic.getState().selected===0);
await frame.locator('.music-play').click();await page.waitForFunction(()=>!window.journeyMusic.getState().playing);
await frame.locator('.music-close').click();await frame.locator('#exit-world').click();await page.waitForFunction(()=>document.body.dataset.stop==='1'&&document.querySelector('iframe').style.opacity==='0');
assert(await page.locator('.journey-music').isVisible(),'Music control not restored');assert(!errors.length,errors.join(';'));
console.log(JSON.stringify({mobile,singleLine:true,welcome:true,musicImport:true,playback:true,switching:true,volume:true,persistence:true,crossPage:true,errors}));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
