/* ============================== 工具 ============================== */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DEV=$('#dev');
const NOW=new Date(), T0=new Date(NOW); T0.setHours(0,0,0,0);
const BASE=NOW.getHours()>=17?1:0;
const dayAt=(o,t='00:00')=>{const d=new Date(T0);d.setDate(d.getDate()+o);const[h,m]=t.split(':');d.setHours(+h,+m,0,0);return d};
const WD=['周日','周一','周二','周三','周四','周五','周六'], WDE=['SUN','MON','TUE','WED','THU','FRI','SAT'];
const hm=d=>String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
const dOff=d=>Math.round((new Date(d).setHours(0,0,0,0)-T0)/864e5);
const relDay=d=>{const o=dOff(d),ev=d.getHours()>=17;return o===0?(ev?'今晚':'今天'):o===1?(ev?'明晚':'明天'):o===2?'后天':o===-1?'昨天':WD[d.getDay()]};
const dateLine=d=>{const o=dOff(d);const r=o===0?'今天':o===1?'明天':o===2?'后天':o===-1?'昨天':'';return `${r?r+' · ':''}${d.getMonth()+1}月${d.getDate()}日 ${WD[d.getDay()]}`};
const f1=n=>(+n).toFixed(1);
const TYPE={singles:'单打',doubles:'双打',rally:'拉球'}, TYPE_EN={singles:'Singles',doubles:'Doubles',rally:'Rally'};
const CAP={singles:2,doubles:4,rally:2};
const SURF={hard:'硬地',clay:'红土',synclay:'人工红土',grass:'草地',synthetic:'人造草'};
const LEVELS=[2.5,3.0,3.5,4.0,4.5,5.0];
const RADII=[2,5,10,20,50];     // 上限 50 km，不提供“不限”
const BANDS=[['am','上午','6–12 点',0,12],['pm','下午','12–17 点',12,17],['ev','晚上','17 点后',17,24]];
const BAND_MAX=3;               // 每个时段最多直接显示 3 局
