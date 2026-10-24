/* Shared DOM captions: no Three.js textures or extra render passes. */
(()=>{'use strict';
const lines=[[],['人总以为回忆是往回走，','其实回忆是站在原地，','把同一件事，再想一遍'],['时间不治愈任何东西，','它只是把伤口，','挪到你看不见的地方'],['你听见的每一声，都是风，','你以为是回应，','是因为你太想听见回应'],['会发光的东西，','大多是因为它在燃烧，','没有人问过它疼不疼'],['你越想被记住，','越说明你怕自己，','从来没真正存在过'],['走廊的尽头不是门，','是你终于承认：','有些路，走完了也没有出口'],['沉下去不是结束，','是第一次，','没有人能从上面叫你回去'],['新世界需要你','恭喜你','你拥有了新世界']];
const style=document.createElement('style');style.textContent=`
.caption-toggle{position:fixed;z-index:75;right:calc(26px + env(safe-area-inset-right));top:calc(25px + env(safe-area-inset-top));display:flex;align-items:center;gap:9px;padding:10px 13px;border:1px solid #d4dbce38;border-radius:3px;background:#101b1a9c;color:#e5e4d6ba;font:11px system-ui,sans-serif;letter-spacing:.1em;cursor:pointer;backdrop-filter:blur(10px)}
.caption-toggle b{font:10px system-ui,sans-serif;border:1px solid currentColor;border-radius:2px;padding:1px 3px;letter-spacing:0}.caption-toggle:hover{color:#fff3d7;border-color:#e2e6d382}.caption-toggle:focus-visible{outline:1px solid #deebec;outline-offset:4px}.caption-toggle[hidden]{display:none}
.journey-caption{position:fixed;z-index:54;left:50%;bottom:14%;transform:translateX(-50%);width:min(90vw,700px);text-align:center;pointer-events:none;color:#ebe8dc;font:400 clamp(19px,1.9vw,26px)/1.85 'Source Han Serif SC','Songti SC','SimSun',serif;letter-spacing:.08em;text-shadow:0 2px 7px #000,0 0 22px #0009;opacity:0;transition:opacity .25s ease}
.journey-caption::before{content:'';position:absolute;inset:-28px -14px;z-index:-1;background:radial-gradient(ellipse,#05101573,transparent 72%)}
.journey-caption p{margin:0;opacity:0;transform:translateY(4px);transition:opacity .6s ease,transform .6s ease}.journey-caption p.is-visible{opacity:1;transform:translateY(0)}
.journey-caption.is-water{color:#dcebf1}.caption-toggle.is-water{color:#c7e2edc9;border-color:#b5daec38;background:#071421a1}.journey-caption.is-finale{bottom:auto;top:42%;transform:translate(-50%,-50%);font-size:clamp(24px,3.1vw,38px);line-height:2}.journey-caption.is-finale p:nth-child(2){font-size:.7em}.journey-caption.is-finale p:last-child{text-shadow:0 2px 12px #001019,0 0 24px #85cef84d}
body.journey-active .journey-skip{top:calc(82px + env(safe-area-inset-top));left:28px;right:auto}
@media(max-width:600px){.caption-toggle{top:calc(18px + env(safe-area-inset-top));right:16px;padding:9px 10px}.journey-caption{font-size:clamp(16px,4.5vw,20px);bottom:calc(15% + env(safe-area-inset-bottom));letter-spacing:.035em;width:92vw}.journey-caption.is-finale{font-size:clamp(23px,6.8vw,32px)}}
@media(prefers-reduced-motion:reduce){.journey-caption p{transform:none;transition:opacity .2s}.journey-caption{transition:opacity .2s}}
.caption-toggle{height:36px;min-width:76px;justify-content:center;padding:0 12px;border-radius:20px;font-size:11px;letter-spacing:.13em;background:#07151db3;border-color:#d5e6e52b;box-shadow:0 4px 20px #0002}
.caption-toggle::before{content:'';width:4px;height:4px;border-radius:50%;background:#c5dfd9;box-shadow:0 0 7px #c5dfd944}.caption-toggle[aria-pressed=false]::before{background:#718080;box-shadow:none}
.journey-caption:not(.is-finale){bottom:calc(34px + env(safe-area-inset-bottom));width:calc(100% - 40px);max-width:1400px;white-space:nowrap;font-size:clamp(11px,1.15vw,16px);line-height:1.7;letter-spacing:.05em}
.journey-caption:not(.is-finale)::before{inset:-15px -10px;background:radial-gradient(ellipse,#05101588,transparent 75%)}
@media(max-width:600px){.caption-toggle{right:16px;top:calc(18px + env(safe-area-inset-top));min-width:70px;height:34px;padding:0 10px;font-size:10px}.journey-caption:not(.is-finale){bottom:calc(36px + env(safe-area-inset-bottom));width:calc(100% - 28px);letter-spacing:.025em}}

:root{--journey-controls-top:calc(25px + env(safe-area-inset-top));--journey-caption-bottom:calc(34px + env(safe-area-inset-bottom))}
.caption-toggle,.journey-music,.exit-world{top:var(--journey-controls-top)!important}
.music-panel{top:calc(var(--journey-controls-top) + 49px)!important}
body.journey-active .journey-skip{top:calc(var(--journey-controls-top) + 50px)!important}
.journey-caption:not(.is-finale){bottom:var(--journey-caption-bottom)!important}
@media(max-width:600px){:root{--journey-controls-top:calc(18px + env(safe-area-inset-top));--journey-caption-bottom:calc(36px + env(safe-area-inset-bottom))}}
`;document.head.append(style);
// Relay the outer navigation's occupied space through both embedded scenes.
let hostLayout=null;
function relayLayout(){if(hostLayout)document.querySelectorAll('iframe').forEach(f=>f.contentWindow?.postMessage(hostLayout,'*'));}
addEventListener('message',e=>{
 if(e.source!==parent||e.data?.type!=='journey-host-layout'||parent===window)return;
 const top=Number(e.data.top),bottom=Number(e.data.bottom);
 if(!Number.isFinite(top)||!Number.isFinite(bottom))return;
 hostLayout={type:'journey-host-layout',top:Math.max(18,Math.min(250,top)),bottom:Math.max(34,Math.min(160,bottom))};
 document.documentElement.style.setProperty('--journey-controls-top',hostLayout.top+'px');
 document.documentElement.style.setProperty('--journey-caption-bottom',hostLayout.bottom+'px');relayLayout();
});
addEventListener('message',e=>{if(e.data?.type==='journey-layout-request'&&[...document.querySelectorAll('iframe')].some(f=>f.contentWindow===e.source)&&hostLayout)e.source.postMessage(hostLayout,'*');});
if(parent!==window)parent.postMessage({type:'journey-layout-request'},'*');

window.JourneyCaptions=class{
 constructor(onSetting){
  this.onSetting=onSetting;this.active=true;this.index=0;this.elapsed=0;this.delay=0;
  try{this.enabled=localStorage.getItem('corridor-captions')!=='off';}catch{this.enabled=true;}
  this.button=document.createElement('button');this.button.type='button';this.button.className='caption-toggle';this.button.innerHTML='<span></span>';
  this.box=document.createElement('div');this.box.className='journey-caption';this.box.setAttribute('aria-hidden','true');
  document.body.append(this.button,this.box);this.button.onclick=e=>{e.stopPropagation();this.setEnabled(!this.enabled,true);};this.updateButton();addEventListener('resize',()=>this.fit());
  let previous=performance.now();const tick=now=>{const dt=(now-previous)/1000;previous=now;if(!document.hidden&&this.active&&this.enabled&&this.index){this.elapsed+=Math.min(dt,.1);this.draw();}requestAnimationFrame(tick);};requestAnimationFrame(tick);
 }
 updateButton(){this.button.lastElementChild.textContent=this.enabled?'字幕 开':'字幕 关';this.button.setAttribute('aria-pressed',String(this.enabled));this.button.setAttribute('aria-label',this.enabled?'关闭字幕':'开启字幕');}
 setEnabled(value,notify=false){if(typeof value!=='boolean')return;const changed=this.enabled!==value;this.enabled=value;try{localStorage.setItem('corridor-captions',value?'on':'off');}catch{}this.updateButton();if(changed){if(value&&this.index)this.restart();else if(!value){this.box.style.opacity='0';this.box.setAttribute('aria-hidden','true');}}if(notify&&this.onSetting)this.onSetting(value);}
 setActive(value){this.active=value;this.button.hidden=!value;if(!value){this.box.style.opacity='0';this.box.setAttribute('aria-hidden','true');}}
 transition(){this.index=0;this.box.style.opacity='0';this.box.setAttribute('aria-hidden','true');}
 enter(index,delay=index===8?1.2:.8){if(index===7){this.transition();return;}this.index=index;this.delay=delay;this.button.classList.toggle('is-water',index>=4);this.restart();}
 fit(){this.box.style.fontSize='';if(this.index===8)return;const p=this.box.firstElementChild;if(!p)return;const base=parseFloat(getComputedStyle(this.box).fontSize);if(p.scrollWidth>this.box.clientWidth)this.box.style.fontSize=(base*this.box.clientWidth/p.scrollWidth*.98)+'px';}
 restart(){this.elapsed=0;this.box.replaceChildren();this.box.className='journey-caption'+(this.index>=4?' is-water':'')+(this.index===8?' is-finale':'');const content=this.index===8?lines[8]:[(lines[this.index]||[]).join(' ')];for(const text of content){const p=document.createElement('p');p.textContent=text;this.box.append(p);}this.box.style.opacity='0';this.box.setAttribute('aria-hidden','true');this.fit();}
 draw(){const t=this.elapsed-this.delay;const starts=this.index===8?[0,3.4,4.6]:this.index===7?[0,.7,1.4]:[0,.9,1.8];const end=this.index===8?11.2:this.index===7?5:7.4;const fade=this.index===8?1.2:.8;
  const visible=t>=0&&t<end+fade;this.box.style.opacity=visible?String(t>end?Math.max(0,1-(t-end)/fade):1):'0';this.box.setAttribute('aria-hidden',String(!visible));for(let i=0;i<this.box.children.length;i++)this.box.children[i].classList.toggle('is-visible',t>=starts[i]);
 }
};
})();
