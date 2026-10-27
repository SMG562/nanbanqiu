const {open,ok,lab,W,done}=require('./lib.cjs');
(async()=>{const {b,pg,errs}=await open();console.log('T6 发布页');
const E='#d2';const ev=(f,a)=>pg.evaluate(f,a);
let r=await ev(E=>{const el=document.querySelector(E);return {cmp:el.classList.contains('composing'),top:el.querySelector('.ctop').textContent,ph:el.querySelector('[data-ctext]').placeholder,st:[...el.querySelectorAll('.st')].map(s=>s.textContent)}},E);
ok(r.cmp&&r.top.includes('OOTD'),'从问题进来：话题已带上',r.top);ok(r.ph==='今天穿什么上场？','提示是话题的问题',r.ph);ok(r.st.length===3,'下面三行开头',r.st.join(' / '));
// 点开头 → 填进输入框，开头收起；清空后开头回来
r=await ev(async E=>{const el=document.querySelector(E);el.querySelectorAll('.st')[1].click();await new Promise(r=>setTimeout(r,200));const ct=el.querySelector('[data-ctext]');const a={v:ct.value,hidden:getComputedStyle(el.querySelector('.sts')).display==='none',focus:document.activeElement===ct};ct.value='';ct.dispatchEvent(new Event('input'));await new Promise(r=>setTimeout(r,100));a.back=getComputedStyle(el.querySelector('.sts')).display!=='none';return a},E);
ok(r.v.startsWith('第一次穿网球裙上场')&&r.focus,'点开头：填进输入框，光标在末尾',r.v);ok(r.hidden&&r.back,'有字时开头收起，清空后回来');
// 换话题单子
r=await ev(async E=>{const el=document.querySelector(E);el.querySelector('.ctop').click();await new Promise(r=>setTimeout(r,500));const tq=el.querySelector('[data-tq]');const ty=async v=>{tq.value=v;tq.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,60));return el.querySelector('.csh-p .tl').textContent.replace(/\s+/g,' ').trim()};
 const a={open:el.querySelector('.csh').classList.contains('on'),n:el.querySelectorAll('.csh-p [data-tp]').length,generic:await ty('网球'),sim:await ty('神仙球场')};
 a.newBtn=!!el.querySelector('[data-tnew]');await ty('周末夜场');el.querySelector('[data-tnew]').click();await new Promise(r=>setTimeout(r,700));a.top=el.querySelector('.ctop').textContent;a.ph=el.querySelector('[data-ctext]').placeholder;a.st=el.querySelectorAll('.st').length;a.closed=!el.querySelector('.csh').classList.contains('on');return a},E);
ok(r.open&&r.n>=10,'换话题：单子打开，列出话题',r.n);ok(r.generic.includes('太宽了')&&!r.generic.includes('新建 #网球'),'太宽的话题不能新建',r.generic.slice(0,30));ok(r.sim.includes('宝藏球场')&&r.newBtn,'输入相似的：先列出已有的，也能新建',r.sim.slice(0,40));
ok(r.top.includes('周末夜场')&&r.closed,'新建话题后带上',r.top);ok(r.ph.includes('周末夜场')&&r.st===0,'新话题没有开头，提示是「说说 #…」',r.ph);
// 不加话题
r=await ev(async E=>{const el=document.querySelector(E);el.querySelector('.ctop').click();await new Promise(r=>setTimeout(r,500));el.querySelector('.csh-p [data-tp=""]').click();await new Promise(r=>setTimeout(r,700));return {top:el.querySelector('.ctop').textContent,sug:el.querySelectorAll('.tsg [data-tp]').length}},E);
ok(r.top.includes('加个话题')&&r.sug===3,'不加话题：下面给三个话题',r.sug);
r=await ev(async E=>{const el=document.querySelector(E);el.querySelector('.tsg [data-tp]').click();await new Promise(r=>setTimeout(r,400));return {top:el.querySelector('.ctop').textContent,st:el.querySelectorAll('.st').length}},E);ok(r.st===3,'从建议里点一个话题：马上带上，出现三行开头',r.top);
// 照片：+ 打开、选 4 张只能 3 张、取消选中、色调
r=await ev(async E=>{const el=document.querySelector(E);el.querySelector('[data-lib]').click();await new Promise(r=>setTimeout(r,300));const pk=()=>[...el.querySelectorAll('.lib .pkb')];const a={lib:pk().length,imgs:pk().filter(p=>p.querySelector('svg')).length};
 for(const i of [0,1,2,3]){pk()[i].click();await new Promise(r=>setTimeout(r,200))}a.sel=el.querySelectorAll('.phs .ph1').length;a.toast=(el.querySelector('.toast')||{}).textContent||'';a.nums=pk().map(p=>p.querySelector('i').textContent).join('');
 pk()[1].click();await new Promise(r=>setTimeout(r,200));a.sel2=el.querySelectorAll('.phs .ph1').length;a.nums2=pk().map(p=>p.querySelector('i').textContent).join('');
 const tones=el.querySelectorAll('[data-tone]');a.tones=tones.length;if(tones[1]){tones[1].click();await new Promise(r=>setTimeout(r,200));a.toneOn=tones[1].classList.contains('on')}
 el.querySelector('.phx').click();await new Promise(r=>setTimeout(r,200));a.sel3=el.querySelectorAll('.phs .ph1').length;return a},E);
ok(r.lib===5&&r.imgs===5,'照片库 5 张都显示',r.imgs);ok(r.sel===3&&r.toast.includes('最多三张'),'最多选三张',r.toast);ok(r.nums==='123'&&r.sel2===2&&r.nums2==='12','取消一张后，序号重新排',`${r.nums}→${r.nums2}`);ok(r.tones>=3&&r.toneOn,'选了照片出现色调，可切换');ok(r.sel3===1,'照片右上 × 去掉一张');
// 球场
r=await ev(async E=>{const el=document.querySelector(E);el.querySelector('[data-cpl]').click();await new Promise(r=>setTimeout(r,600));const a={open:el.querySelector('.pick').classList.contains('on'),n:el.querySelectorAll('.pick [data-loc]').length};el.querySelector('.pick [data-loc="Hawthorn"]').click();await new Promise(r=>setTimeout(r,900));a.chip=el.querySelector('[data-cpl]').textContent;a.closed=!el.querySelector('.pick').classList.contains('on');return a},E);
ok(r.open&&r.n>=4,'发布页选球场：打开单子',r.n);ok(r.chip.includes('Hawthorn')&&r.closed,'选好后单子收起，按钮显示球场',r.chip);
// 发布设置
r=await ev(async E=>{const el=document.querySelector(E);el.querySelector('[data-cset]').click();await new Promise(r=>setTimeout(r,500));el.querySelector('[data-tg="later"]').click();await new Promise(r=>setTimeout(r,200));const a={go:el.querySelector('[data-cgo]').textContent};el.querySelector('[data-cshx]').click();await new Promise(r=>setTimeout(r,600));a.go2=el.querySelector('[data-cgo]').textContent;a.note=el.querySelector('.cnote').textContent;el.querySelector('[data-cset]').click();await new Promise(r=>setTimeout(r,500));el.querySelector('[data-tg="later"]').click();el.querySelector('[data-cshx]').click();await new Promise(r=>setTimeout(r,600));a.go3=el.querySelector('[data-cgo]').textContent;return a},E);
ok(r.go2==='稍后公开'&&r.note.includes('2 小时'),'打开「2 小时后再公开」：按钮和说明都变',`${r.go} / ${r.go2}`);ok(r.go3==='发布','关掉后回到「发布」');
// 空内容不能发
r=await ev(async E=>{const el=document.querySelector(E);el.querySelectorAll('.phx').forEach(x=>x.click());await new Promise(r=>setTimeout(r,200));const ct=el.querySelector('[data-ctext]');ct.value='';ct.dispatchEvent(new Event('input'));el.querySelector('[data-cgo]').click();await new Promise(r=>setTimeout(r,300));return {still:el.classList.contains('composing'),toast:(el.querySelector('.toast')||{}).textContent}},E);
ok(r.still&&r.toast.includes('写点什么'),'什么都没写不能发',r.toast);
// 发布：到信息流顶部，带话题编号，可以撤回
r=await ev(async E=>{const el=document.querySelector(E);const ct=el.querySelector('[data-ctext]');ct.value='测试发布';ct.dispatchEvent(new Event('input'));if(!el.querySelector('.lib'))el.querySelector('[data-lib]').click();await new Promise(r=>setTimeout(r,300));el.querySelector('.lib .pkb').click();await new Promise(r=>setTimeout(r,200));const tp=el.querySelector('.ctop').textContent;el.querySelector('[data-cgo]').click();await new Promise(r=>setTimeout(r,1400));
 const ln=el.querySelector('[data-s="home"] .ln');return {closed:!el.classList.contains('composing'),txt:ln.querySelector('.tx').textContent,pc:ln.classList.contains('pc'),court:(ln.querySelector('.pl')||{}).textContent,undo:(el.querySelector('.undo')||{}).textContent,tp}},E);
ok(r.closed&&r.txt==='测试发布'&&r.pc,'发布：关闭发布页，带照片出现在最上面');ok((r.court||'').toLowerCase().includes('hawthorn'),'带上了选的球场',r.court);ok(r.undo.includes('No.'),'带话题有编号，可撤回',r.undo);
// 取消：再打开是干净的
r=await ev(async E=>{const el=document.querySelector(E);el.querySelector('[data-cam]').click();await new Promise(r=>setTimeout(r,700));const ct=el.querySelector('[data-ctext]');ct.value='写一半';ct.dispatchEvent(new Event('input'));el.querySelector('[data-cx]').click();await new Promise(r=>setTimeout(r,600));el.querySelector('[data-cam]').click();await new Promise(r=>setTimeout(r,700));const v=el.querySelector('[data-ctext]').value;el.querySelector('[data-cx]').click();await new Promise(r=>setTimeout(r,600));return {v,closed:!el.classList.contains('composing')}},E);
ok(r.v===''&&r.closed,'取消后再打开是空的',r.v);
await done(b,errs,'T6')})();
