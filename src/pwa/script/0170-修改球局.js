/* 今天的日程：内容完整保留（包括已结束的），只是打开时第一屏从「此刻」开始——
 * 定位到第一局还没结束的球局所在的时段（跨时段正在打的球局，就停在它开始的那个时段）；都结束了就停在最后一个时段。
 * 只在打开应用、点「今天」时定位一次，不打断用户自己的滚动。 */
var _sn=(UI._scrollNow=true);
function calScrollNow(){if(UI.day!==0||UI.mode!=='cal')return;const cv=$('#calView'),bs=[...cv.querySelectorAll('.band[data-b]')];if(bs.length<2)return;
  const today=api.list().filter(c=>dOff(c.start)===0).sort((a,b)=>a.start-b.start),g=today.find(c=>c.end>NOW);
  const key=g?BANDS.find(b=>g.start.getHours()>=b[3]&&g.start.getHours()<b[4])[0]:bs[bs.length-1].dataset.b,el=cv.querySelector(`.band[data-b="${key}"]`);
  if(!el||el===bs[0])return;cv.scrollTop=Math.max(0,el.offsetTop-6)}
