/* One continuous camera track, shared by both sides of the water crossing. */
(() => {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
  .water-veil{position:fixed;inset:0;z-index:30;pointer-events:none;opacity:0;overflow:hidden}
  .water-veil__body{position:absolute;inset:0;background:linear-gradient(180deg,#0b71892b,#03274045 65%,#03172760);transform:none}
  
  .water-veil__shade{position:absolute;inset:0;background:#020b16;opacity:0}
  .journey-skip{position:fixed;z-index:60;right:calc(28px + env(safe-area-inset-right));top:calc(26px + env(safe-area-inset-top));padding:10px 15px;border:1px solid #a5d5e126;border-radius:30px;background:#04121d70;color:#c6e7edaa;font:11px system-ui,sans-serif;letter-spacing:.18em;cursor:pointer}
  .journey-skip[hidden]{display:none}.journey-skip:focus-visible{outline:1px solid #b5e6f0;outline-offset:4px}
  body.journey-active>.bottom{opacity:0;pointer-events:none}
  .journey-welcome{position:fixed;inset:0;z-index:55;display:grid;place-items:center;pointer-events:none;opacity:0}
  .journey-welcome[hidden]{display:none}
  .journey-welcome span{padding-left:.2em;color:#dceff7;font:400 clamp(21px,3.3vw,38px)/1.6 "Songti SC","SimSun",serif;letter-spacing:.2em;white-space:nowrap;text-shadow:0 2px 20px #020b16,0 0 30px #7dc9e64d}
  `;
  document.head.append(style);
  window.WaterJourneyWelcome=class {
    constructor(){
      this.el=document.createElement('div');this.el.className='journey-welcome';this.el.hidden=true;
      const text=document.createElement('span');text.textContent='欢迎来到新世界';this.el.append(text);
      document.body.append(this.el);this.animation=null;
    }
    show(){
      this.clear();this.el.hidden=false;
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.animation=this.el.animate([
        {opacity:0,filter:reduced?'none':'blur(6px)',transform:'translateY(4px)',offset:0},
        {opacity:1,filter:'blur(0px)',transform:'translateY(0)',offset:.11},
        {opacity:1,filter:'blur(0px)',transform:'translateY(0)',offset:.72},
        {opacity:0,filter:reduced?'none':'blur(2px)',transform:'translateY(-2px)',offset:1}
      ],{duration:1750,easing:'ease-out',fill:'forwards'});
      this.animation.onfinish=()=>this.clear();
    }
    clear(){if(this.animation){this.animation.cancel();this.animation=null;}this.el.hidden=true;}
  };
  window.WaterJourneyVeil = class {
    constructor() {
      this.el = document.createElement('div'); this.el.className = 'water-veil';
      this.el.setAttribute('aria-hidden','true');
      this.el.innerHTML = '<div class="water-veil__body"></div><div class="water-veil__shade"></div>';
      document.body.append(this.el);
      this.body = this.el.firstElementChild; this.shade = this.el.lastElementChild;
    }
    set(depth, darkness = 0) {
      const a = Math.min(.3, Math.max(depth || 0, darkness || 0));
      this.el.style.opacity = a > 0.002 ? '1' : '0';
      this.body.style.opacity = String(a);
      this.shade.style.opacity = '0';
    }
  };
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
  // Hermite segments match height and vertical velocity at every join.
  const heights=[[0,1.41,0],[1.5,.36,-1.15],[2.5,-1.7,-.15],[5,-1.5,.35],[6.3,1.4,3.1],[7,3.2,0]];
  window.WaterJourneyMotion={duration:7,handoff:2.5,sample(t,simple=false){
    t=Math.max(0,Math.min(7,t));
    let i=0;while(i<heights.length-2&&t>heights[i+1][0])i++;
    const [a,y0,v0]=heights[i],[b,y1,v1]=heights[i+1],d=b-a,u=clamp((t-a)/d);
    const y=(2*u*u*u-3*u*u+1)*y0+(u*u*u-2*u*u+u)*d*v0+(-2*u*u*u+3*u*u)*y1+(u*u*u-u*u)*d*v1;
    const turn=smooth((t-2.5)/2.5),settle=smooth((t-5)/2);
    const pitch=simple?-.48*smooth(t/2.5)+.32*settle:-.48*smooth(t/2.5)-Math.PI*turn+.64*settle;
    // Bank back upright only as the half-turn completes; the waterline stays visible.
    const roll=simple?0:Math.PI*smooth((t-4.35)/2.65);
    const z=-37*(t/7-Math.sin(2*Math.PI*t/7)/(2*Math.PI));
    const submerged=1-smooth((y+.65)/1.0);
    const crossing=Math.exp(-Math.pow(y/.16,2));
    return {y,z,pitch,roll,veil:.16*submerged+.11*crossing,crossing,turn};
  }};
})();
