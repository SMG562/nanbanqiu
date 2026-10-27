const { chromium } = require('playwright');
const FILE=process.env.QA_FILE||'/mnt/user-data/outputs/南伴球_场边设计稿_v35.html';
let pass=0,fail=0;const fails=[];
const ok=(c,m,extra='')=>{if(c){pass++;console.log('  ✓',m,extra)}else{fail++;fails.push(m+' '+extra);console.log('  ✗',m,extra)}};
async function open(w=1440,h=1000){const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});const pg=await b.newPage({viewport:{width:w,height:h}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/TUNNEL|ERR_TUNNEL|net::/.test(m.text()))errs.push(m.text())});await pg.goto('file://'+FILE);await pg.waitForTimeout(1500);return {b,pg,errs}}
// 把一台展示中的手机变成干净的首页（关掉发布页、详情等）
const lab=async(pg,i)=>pg.evaluate(async i=>{const el=document.querySelector('#d'+i);const cx=el.querySelector('[data-cx]');if(el.classList.contains('composing')&&cx)cx.click();await new Promise(r=>setTimeout(r,700));return el.className},i);
const W=ms=>new Promise(r=>setTimeout(r,ms));
const done=async(b,errs,name)=>{ok(errs.length===0,name+'：没有脚本错误',errs.slice(0,3).join(' | '));await b.close();console.log(`\n${name}：通过 ${pass}，失败 ${fail}`);if(fails.length)console.log('失败项：\n - '+fails.join('\n - '));};
module.exports={open,ok,lab,W,done};
