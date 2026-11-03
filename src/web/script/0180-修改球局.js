/* 日程卡片自己滚动、日期表头固定；进入发现页时第一屏定位到此刻所在的时段，内容一行不少（每次进入最多定位一次） */
function agAutoScroll(){if(UI.page!==0||UI._agScrolled)return;UI._agScrolled=true;
  requestAnimationFrame(()=>{const ag=document.querySelector('.card.ag'),b=document.querySelector('.ag-band.now'),fb=document.querySelector('.ag-band');if(!ag||!b||b===fb)return;
    const hh=(document.querySelector('.ag-h')||{}).offsetHeight||0;ag.scrollTop=Math.max(0,b.offsetTop-hh)})}
document.addEventListener('click',e=>{const t=e.target.closest('[data-tab="disc"]');if(t)UI._agScrolled=false},true);
