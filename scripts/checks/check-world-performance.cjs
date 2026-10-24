const {chromium}=require('C:/Users/27616/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('path'),{pathToFileURL}=require('url'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--allow-file-access-from-files']});
 try{
  for(const mobile of [false,true]){
   const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile});
   page.setDefaultTimeout(60000);const errors=[],failed=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')failed.push(r.url()+': '+r.failure()?.errorText);});
   // Count cache renders per animation frame, including the warm-up pass.
   await page.addInitScript(()=>{
    window.cacheFrames=[];let calls=0;
    const nativeRAF=requestAnimationFrame;
    window.requestAnimationFrame=fn=>nativeRAF(t=>{window.cacheFrames.push(calls);calls=0;fn(t);});
    Object.defineProperty(window,'THREE',{configurable:true,set(value){
     Object.defineProperty(window,'THREE',{value,writable:true,configurable:true});
     // setRenderTarget is assigned per instance, so wrap the constructor instead.
     const Native=value.WebGLRenderer;
     value.WebGLRenderer=class extends Native {constructor(...args){super(...args);const render=this.render.bind(this);this.render=(s,c)=>{if(this.getRenderTarget()?.isWebGLCubeRenderTarget)calls++;return render(s,c);};}};
    }});
   });
   await page.goto(pathToFileURL(path.resolve('新世界.html')).href);
   await page.locator('body.ready').waitFor();
   for(let i=0;i<9;i++){await page.mouse.move(150+i*30,200+(i%3)*90);await page.waitForTimeout(80);}
   await page.locator('#palette').click();await page.locator('canvas').click({position:{x:180,y:500}});await page.waitForTimeout(1500);
   const result=await page.evaluate(()=>({maxCacheFacesPerFrame:Math.max(...cacheFrames),cacheFrames:cacheFrames.filter(x=>x>0).length,scale:document.querySelector('canvas').dataset.renderScale,ready:document.body.classList.contains('ready')}));
   assert(result.maxCacheFacesPerFrame===1,'Cache still renders multiple faces in one frame');assert(result.cacheFrames>=12,'Cache refresh stopped');
   await page.screenshot({path:`archive/screenshots/world-optimized-${mobile?'mobile':'desktop'}.png`});
   assert.deepStrictEqual(errors,[]);assert.deepStrictEqual(failed,[]);console.log(JSON.stringify({mobile,...result,errors,failed}));await page.close();
  }
  // Check actual host navigation suspends the heavy scene and resumes it.
  const page=await browser.newPage({viewport:{width:1280,height:800}});page.setDefaultTimeout(60000);
  await page.goto(pathToFileURL(path.resolve('motion.html')).href);
  await page.locator('#顶层导航 a').last().click();const frame=page.frameLocator('iframe[data-i="4"]');
  await frame.locator('canvas').waitFor();await page.waitForFunction(()=>document.querySelector('iframe[data-i="4"]').contentWindow.sceneVisible===true);
  await page.locator('#顶层导航 a').first().click();await page.waitForFunction(()=>document.querySelector('iframe[data-i="4"]').contentWindow.sceneVisible===false);
  await page.locator('#顶层导航 a').last().click();await page.waitForFunction(()=>document.querySelector('iframe[data-i="4"]').contentWindow.sceneVisible===true);
  console.log('Hidden corridor suspends and resumes successfully.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
