const {open,ok,lab,W,done}=require('./lib.cjs');
(async()=>{const {b,pg,errs}=await open();console.log('T4 详情、回复与菜单');await lab(pg,3);
const E='#d3';
const ev=(fn,arg)=>pg.evaluate(fn,arg);
// 打开 / 关闭
let r=await ev(async E=>{const el=document.querySelector(E);const ln=[...el.querySelectorAll('.ln:not(.pc)')].find(l=>l.querySelector('.rp'));el.querySelector('[data-sc="home"]').scrollTop=ln.closest('.it').offsetTop-80;await new Promise(r=>setTimeout(r,100));ln.click();await new Promise(r=>setTimeout(r,700));const o=el.classList.contains('sheeting');const t=el.querySelector('.sheet .sh-t').textContent,lt=ln.querySelector('.tx').textContent;return {o,same:t===lt,id:ln.dataset.ln,n:el.querySelectorAll('.sheet .rr').length,rh:el.querySelector('.sheet [data-rh]').textContent}},E);
ok(r.o&&r.same,'点一条打开详情，内容对得上');ok(r.n>0,'详情里有回复',r.rh);
// 回复某人
r=await ev(async E=>{const el=document.querySelector(E);const rr=[...el.querySelectorAll('.sheet .rr')].find(x=>x.dataset.rto);if(!rr)return {none:true};const n=rr.dataset.rto;rr.click();await new Promise(r=>setTimeout(r,300));const a={n,hint:el.querySelector('.sheet .hint').textContent,tgt:rr.classList.contains('tgt'),focus:document.activeElement===el.querySelector('[data-rin]')};
 rr.click();await new Promise(r=>setTimeout(r,300));a.hint2=el.querySelector('.sheet .hint').textContent;a.tgt2=rr.classList.contains('tgt');
 rr.click();await new Promise(r=>setTimeout(r,300));const ri=el.querySelector('[data-rin]');ri.value='好的，明天见';ri.oninput();const before=el.querySelectorAll('.sheet .rr').length;el.querySelector('[data-rsend]').click();await new Promise(r=>setTimeout(r,1500));
 a.after=el.querySelectorAll('.sheet .rr').length;a.before=before;a.last=[...el.querySelectorAll('.sheet .rr')].pop().textContent;a.hint3=el.querySelector('.sheet .hint').textContent;a.tgt3=el.querySelectorAll('.sheet .rr.tgt').length;a.rh=el.querySelector('.sheet [data-rh]').textContent;a.empty=ri.value;a.dis=el.querySelector('[data-rsend]').disabled;return a},E);
ok(!r.none,'有可以回复的人');ok(r.hint===`回复 ${r.n}…`&&r.tgt,'点某人的回复：输入框写「回复 某人…」，那条浮起淡绿',r.hint);ok(r.hint2==='回复…'&&!r.tgt2,'再点一次取消',r.hint2);
ok(r.after===r.before+1,'发送回复：多了一条',`${r.before}→${r.after}`);ok(r.hint3==='回复…'&&r.tgt3===0,'发出后回到「回复…」');ok(r.empty===''&&r.dis,'发出后输入框清空、发送键变灰');ok(r.rh.includes(String(r.after)),'回复数同步',r.rh);
// 列表里回复数同步
const lc=await ev(async([E,id])=>{const el=document.querySelector(E);el.querySelector('[data-shut]').click();await new Promise(r=>setTimeout(r,600));const c=el.querySelector(`.ln[data-ln="${id}"] .cnt .n`);return c?c.textContent:null},[E,r&&0||null].map((x,i)=>i?null:x).length&&[E,(await ev(E=>null,E))||null]);
// 三个点：不感兴趣 → 原因
r=await ev(async E=>{const el=document.querySelector(E);const ln=[...el.querySelectorAll('[data-s="home"] .ln:not(.pc)')].find(l=>!l.dataset.ln.startsWith('a'));const id=ln.dataset.ln;ln.click();await new Promise(r=>setTimeout(r,700));el.querySelector('.sheet [data-menu]').click();await new Promise(r=>setTimeout(r,300));const acts=el.classList.contains('acting'),items=[...el.querySelectorAll('.acts .g button')].map(b=>b.dataset.act);
 el.querySelector('[data-act="less"]').click();await new Promise(r=>setTimeout(r,700));const reasons=[...el.querySelectorAll('.acts .g button')].map(b=>b.dataset.act);const gone=!el.querySelector(`[data-s="home"] .ln[data-ln="${id}"]`);const closed=!el.classList.contains('sheeting');
 el.querySelector('[data-act="lc"]').click();await new Promise(r=>setTimeout(r,500));return {acts,items,reasons,gone,closed,actsOff:!el.classList.contains('acting'),toast:(el.querySelector('.toast')||{}).textContent}},E);
ok(r.acts&&r.items.includes('less')&&r.items.includes('report'),'三个点：不感兴趣、屏蔽、举报',r.items.join(','));ok(r.gone&&r.closed,'不感兴趣：这一条马上隐藏，详情关闭');ok(r.reasons.length>=3,'接着问原因',r.reasons.join(','));ok(r.actsOff,'选了原因后面板收起',r.toast);
// 屏蔽
r=await ev(async E=>{const el=document.querySelector(E);const ln=[...el.querySelectorAll('[data-s="home"] .ln:not(.pc)')].find(l=>{const u=l.querySelector('.un');return u});const name=ln.querySelector('.un').textContent.trim();ln.click();await new Promise(r=>setTimeout(r,700));el.querySelector('.sheet [data-menu]').click();await new Promise(r=>setTimeout(r,300));const bl=el.querySelector('[data-act="block"]');if(!bl)return {skip:true};const n=bl.dataset.un;bl.click();await new Promise(r=>setTimeout(r,700));const left=[...el.querySelectorAll('[data-s="home"] .ln .un')].filter(u=>u.textContent.trim()===n).length;return {n,left}},E);
ok(r.skip||r.left===0,'屏蔽某人：他的内容全部消失',r.n?`${r.n} 剩 ${r.left}`:'');
// 举报
r=await ev(async E=>{const el=document.querySelector(E);el.querySelector('[data-s="home"] .ln:not(.pc)').click();await new Promise(r=>setTimeout(r,700));el.querySelector('.sheet [data-menu]').click();await new Promise(r=>setTimeout(r,300));el.querySelector('[data-act="report"]').click();await new Promise(r=>setTimeout(r,200));const n=el.querySelectorAll('[data-act="r"]').length;el.querySelector('[data-act="r"]').click();await new Promise(r=>setTimeout(r,400));const off=!el.classList.contains('acting');el.querySelector('[data-shut]').click();await new Promise(r=>setTimeout(r,600));return {n,off}},E);
ok(r.n>=3&&r.off,'举报：选原因后收起',r.n);
// 自己发的：分享、关闭回复、删除
r=await ev(async E=>{const el=document.querySelector(E);const mine=[...el.querySelectorAll('[data-s="home"] .ln')].find(l=>l.querySelector('.un')&&l.querySelector('.un').textContent.trim()==='Nana');if(!mine)return {none:true};const id=mine.dataset.ln;mine.click();await new Promise(r=>setTimeout(r,800));
 const a={seen:!!el.querySelector('.sheet .seen'),keep:!!el.querySelector('.sheet [data-keep]')};
 if(a.keep){const k=el.querySelector('.sheet [data-keep]');const on0=k.querySelector('.tg').classList.contains('on');k.click();await new Promise(r=>setTimeout(r,600));a.keepFlip=el.querySelector('.sheet [data-keep] .tg').classList.contains('on')!==on0}
 el.querySelector('.sheet [data-menu]').click();await new Promise(r=>setTimeout(r,300));a.items=[...el.querySelectorAll('.acts .g button')].map(b=>b.dataset.act);
 el.querySelector('[data-act="mute"]').click();await new Promise(r=>setTimeout(r,500));a.closed=!el.querySelector('.sheet [data-rin]');
 el.querySelector('.sheet [data-menu]').click();await new Promise(r=>setTimeout(r,300));el.querySelector('[data-act="mute"]').click();await new Promise(r=>setTimeout(r,500));a.reopen=!!el.querySelector('.sheet [data-rin]');
 el.querySelector('.sheet [data-menu]').click();await new Promise(r=>setTimeout(r,300));el.querySelector('[data-act="del"]').click();await new Promise(r=>setTimeout(r,800));a.del=!el.querySelector(`[data-s="home"] .ln[data-ln="${id}"]`)&&!el.classList.contains('sheeting');return a},E);
ok(!r.none,'找到自己发的');ok(r.seen,'自己发的：显示多少人看过');ok(r.keep===false||r.keepFlip,'「留给自己」开关能切换');ok(r.items&&r.items.includes('del')&&r.items.includes('mute'),'自己发的菜单：关闭回复、删除',r.items&&r.items.join(','));ok(r.closed&&r.reopen,'关闭回复后输入框消失，再打开恢复');ok(r.del,'删除：列表里消失、详情关闭');
// 分享图
r=await ev(async E=>{const el=document.querySelector(E);const mine=[...el.querySelectorAll('[data-s="home"] .ln.pc')].find(l=>l.querySelector('.un')&&l.querySelector('.un').textContent.trim()==='Nana');if(!mine)return {none:true};mine.click();await new Promise(r=>setTimeout(r,800));const s=el.querySelector('.sheet [data-share]');if(!s)return {noshare:true};s.click();await new Promise(r=>setTimeout(r,600));const a={on:el.classList.contains('sharing'),tpls:el.querySelectorAll('[data-tpl]').length};const t=el.querySelectorAll('[data-tpl]')[1];if(t){t.click();await new Promise(r=>setTimeout(r,500));a.sw=t.classList.contains('on')}el.querySelector('[data-sx]').click();await new Promise(r=>setTimeout(r,500));a.off=!el.classList.contains('sharing');el.querySelector('[data-shut]').click();await new Promise(r=>setTimeout(r,500));return a},E);
ok(r.none||r.noshare||(r.on&&r.tpls>=2&&r.sw&&r.off),'分享图：打开、换样式、关闭',JSON.stringify(r));
await done(b,errs,'T4')})();
