/* ============================== 城市（地区扩展 R3） ==============================
 * 每个城市一个网址：nanbanqiu.app/melbourne、/sydney……打开的网址决定城市；不带城市或认不出 → 墨尔本（现在只有墨尔本开放，不做切换）。
 * 分享链接保持短链接 /g/码、/p/编号（后端按球局 / 球员所在城市跳到对应城市的网址）。
 * 与数据库 cities 表逐条相同（tests/static/cities_front.mjs 对照）；页面里的城市名、话题、默认中心、时区、夜间时段都从这里读，不写死。 */
const CITIES=[
  {key:'melb',slug:'melbourne',state:'VIC',zh:'墨尔本',en:'Melbourne',tz:'Australia/Melbourne',lat:-37.8136,lng:144.9631,km:75,center:'Melbourne CBD',status:'on',tag:'墨尔本网球',quiet:['22:00','08:00']},
  {key:'syd',slug:'sydney',state:'NSW',zh:'悉尼',en:'Sydney',tz:'Australia/Sydney',lat:-33.8688,lng:151.2093,km:60,center:'Sydney CBD',status:'off',tag:'悉尼网球',quiet:['22:00','08:00']},
  {key:'bne',slug:'brisbane',state:'QLD',zh:'布里斯班',en:'Brisbane',tz:'Australia/Brisbane',lat:-27.4698,lng:153.0251,km:60,center:'Brisbane City',status:'off',tag:'布里斯班网球',quiet:['22:00','08:00']},
  {key:'per',slug:'perth',state:'WA',zh:'珀斯',en:'Perth',tz:'Australia/Perth',lat:-31.9505,lng:115.8605,km:60,center:'Perth',status:'off',tag:'珀斯网球',quiet:['22:00','08:00']},
  {key:'adl',slug:'adelaide',state:'SA',zh:'阿德莱德',en:'Adelaide',tz:'Australia/Adelaide',lat:-34.9285,lng:138.6007,km:50,center:'Adelaide',status:'off',tag:'阿德莱德网球',quiet:['22:00','08:00']},
  {key:'cbr',slug:'canberra',state:'ACT',zh:'堪培拉',en:'Canberra',tz:'Australia/Sydney',lat:-35.2809,lng:149.1300,km:40,center:'Canberra City',status:'off',tag:'堪培拉网球',quiet:['22:00','08:00']}];
const CITY=(()=>{const s=(location.pathname.split('/')[1]||'').toLowerCase();return CITIES.find(c=>c.slug===s)||CITIES[0]})();
const cityHM=x=>{const[h,m]=String(x).split(':');return +h*60+ +m};
// 号码按国家（与数据库 countries 表相同；现在只有澳洲）：输入 0412 345 678 / +61 412 345 678 都认
const COUNTRIES=[{code:'AU',zh:'澳大利亚',dial:'+61',re:'^\\+614[0-9]{8}$',hint:'04xx xxx xxx'}];
const phoneCountry=cc=>COUNTRIES.find(k=>k.dial===cc)||COUNTRIES[0];
const phoneE164=(cc,raw)=>{const k=phoneCountry(cc),dd=k.dial.slice(1);let d=String(raw||'').replace(/\D/g,'');if(d.startsWith(dd)&&d.length>dd.length+8)d=d.slice(dd.length);const e='+'+dd+d.replace(/^0+/,'');return new RegExp(k.re).test(e)?e:null};
// 手机时区和城市不同时，另标城市当地时间（例：人在墨尔本看珀斯的局 →「当地 07:30」）；同一时区什么都不加
const cityOffset=(d,tz)=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(d).reduce((o,x)=>(o[x.type]=x.value,o),{});return Math.round((Date.UTC(+p.year,p.month-1,+p.day,+p.hour,+p.minute)-Math.floor(+d/6e4)*6e4)/6e4)};
const lt=d=>{d=new Date(d);if(-d.getTimezoneOffset()===cityOffset(d,CITY.tz))return '';const p=new Intl.DateTimeFormat('en-AU',{timeZone:CITY.tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);return `<span class="lt">当地 ${p}</span>`};
// 还没开放的城市：盖一层「X 即将开放」+ 开放时通知我（POST /api/city-waitlist → api_city_waitlist）；下面给已开放城市的入口
function citySoon(){if(['on','beta'].includes(CITY.status)||document.getElementById('citySoon'))return false;
  const open=CITIES.filter(c=>c.status==='on'),box=document.getElementById('dev'),d=document.createElement('div'),st=document.createElement('style');
  st.textContent=`.csoon{position:${box?'absolute':'fixed'};inset:0;z-index:980;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:24px;text-align:center}
.csoon .cs-b{max-width:360px;width:100%}.csoon .cs-logo{font-weight:800;color:var(--g);letter-spacing:.04em}.csoon h1{font-size:24px;margin:10px 0 8px;color:var(--ink)}
.csoon p{color:var(--ink2);font-size:14px;margin:0 0 16px}.csoon form{display:flex;flex-direction:column;gap:10px}.csoon .inp{text-align:center}
.csoon .btn{height:46px;border-radius:12px;background:var(--g);color:#fff;font-weight:700;font-size:15px;border:0}
.csoon .cs-go{display:block;margin-top:18px;color:var(--g);font-weight:600;text-decoration:none}.csoon .cs-fine{font-size:12px;color:var(--mut);margin-top:22px}`;
  d.id='citySoon';d.className='csoon';d.setAttribute('role','dialog');
  d.innerHTML=`<div class="cs-b"><div class="cs-logo">南伴球</div><h1>${esc(CITY.zh)}即将开放</h1><p>南伴球目前在${open.map(c=>esc(c.zh)).join('、')}开放。留下邮箱，${esc(CITY.zh)}开放时第一时间通知你。</p>
<form id="csF" novalidate><input class="inp" id="csE" type="email" inputmode="email" autocomplete="email" placeholder="你的邮箱" maxlength="200"><button class="btn" type="submit">开放时通知我</button></form>
<p id="csOk" hidden>已登记，${esc(CITY.zh)}开放时会发邮件通知你 🎾</p>${open.map(c=>`<a class="cs-go" href="/${c.slug}/">先去看看${esc(c.zh)} ›</a>`).join('')}
<p class="cs-fine">邮箱只用来发这一封开放通知，通知后 30 天内删除。</p></div>`;
  document.head.appendChild(st);(box||document.body).appendChild(d);
  document.getElementById('csF').onsubmit=e=>{e.preventDefault();const i=document.getElementById('csE'),v=i.value.trim();
    if(!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v)){i.style.borderColor='var(--red)';i.focus();return}
    try{if(/^https?:$/.test(location.protocol))fetch('/api/city-waitlist',{method:'POST',headers:{'Content-Type':'application/json',...(typeof nbqBuildHdr==='function'?nbqBuildHdr():{})},body:JSON.stringify({city:CITY.key,email:v})}).catch(()=>{})}catch(_){}
    document.getElementById('csF').hidden=true;document.getElementById('csOk').hidden=false};
  return true}
addEventListener('DOMContentLoaded',()=>setTimeout(citySoon,0));
