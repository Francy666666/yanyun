/* Adjust drawing resolution with hysteresis; CSS layout and camera stay unchanged. */
window.SceneQuality=class {
  constructor(renderer,mobile=false){
    this.renderer=renderer;this.mobile=mobile;this.scale=1;this.frames=0;this.total=0;this.fast=0;this.cooldown=90;
    this.resize();
  }
  limit(){return Math.min(devicePixelRatio||1,this.mobile?1.1:1.4,Math.sqrt((this.mobile?750000:1500000)/(innerWidth*innerHeight)));}
  apply(scale){this.scale=scale;this.renderer.setPixelRatio(scale);this.renderer.domElement.dataset.renderScale=scale.toFixed(2);}
  resize(){this.apply(Math.max(.5,this.limit()));this.frames=this.total=this.fast=0;this.cooldown=90;}
  sample(dt){
    if(this.cooldown>0){this.cooldown--;return;}
    if(dt<=0||dt>.2)return;
    this.total+=dt;this.frames++;
    if(this.frames<90)return;
    const ms=this.total/this.frames*1000;this.frames=this.total=0;
    if(ms>23){this.fast=0;const next=Math.max(.5,this.scale*.84);if(this.scale-next>.025){this.apply(next);this.cooldown=90;}}
    else if(ms<17.5){if(++this.fast>=3){this.apply(Math.min(this.limit(),this.scale+.08));this.fast=0;this.cooldown=90;}}
    else this.fast=0;
  }
};
