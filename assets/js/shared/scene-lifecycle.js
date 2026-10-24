/* Stop hidden GPU scenes without changing their entry state or music. */
(()=>{
 window.sceneVisible=true;
 const children=()=>document.querySelectorAll('iframe');
 function relay(){children().forEach(f=>f.contentWindow?.postMessage({type:'site-visibility',active:window.sceneVisible},'*'));}
 addEventListener('message',e=>{
  if(parent!==window&&e.source===parent&&e.data?.type==='site-visibility'){
   window.sceneVisible=!!e.data.active;relay();
  }
  if(e.data?.type==='site-visibility-request'&&[...children()].some(f=>f.contentWindow===e.source))relay();
 });
 if(parent!==window)parent.postMessage({type:'site-visibility-request'},'*');
})();
