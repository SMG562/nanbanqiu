
/* ===== 场边页（网页端，第八批 F3）：设计稿 v35 的电脑版（左边信息流、右边一列「此刻」），第一次打开时建 Shadow DOM，之后一直留着 ===== */
// 宽度 1240 居中（同设计稿）；窄于 900 时右边一列收起，球场页 / 详情占满宽度
const SB_WEB_CSS=`:host{background:var(--bg);background-image:var(--noise)}
.wb{position:relative;height:100%;max-width:1240px;margin:0 auto}
@media(max-width:900px){.desk .rail{display:none}.desk .home .scroll{padding-right:0}.desk .home .hd,.desk .home .bar{right:0}.desk .court,.desk .sheet,.desk .wall{width:100%}}`;
let SBV=null;
function sbBoot(){if(SBV)return SBV;const host=$('#sbHost');if(!host)return null;const root=host.attachShadow({mode:'open'});
  root.innerHTML=`<style>${SB_CSS}${SB_WEB_CSS}</style>${SB_SVG}<div class="wb"><div></div></div>`;const el=root.querySelector('.wb>div');
  SBV=SB.App(el,{desk:true,live:true,first:2200,every:5200,home:'',gate:sbGate,err:apiErrText,ntf:o=>sbNtf(o)});return SBV}
// 场边的写操作：没登录 → 先登录，登录后接着做；发布 / 回复 / 网球再看账号状态（同手机端，接口文档 §14.11）
const SB_WHY={post:'发布前，先用手机号验证一下',reply:'回复前，先用手机号验证一下',ball:'点网球前，先用手机号验证一下',less:'先用手机号验证一下',block:'屏蔽前，先用手机号验证一下',report:'举报前，先用手机号验证一下'};
function sbGate(k,fn){const ok=()=>{if((k==='post'||k==='reply'||k==='ball')&&acctGuard('sb_'+k))return;fn()};
  if(ME)return ok();AN.trig='sideline';try{openAuth(ok,SB_WHY[k]||SB_WHY.post)}finally{AN.trig=null}}
// 去场边（导航、右上角菜单「场边相册」、点开场边通知）
function sbGo(){closeModal();$('#umenu').classList.remove('show');if(UI.landing){UI.landing=null;history.replaceState(null,'','#/')}
  if(UI.tab!=='side'){UI.tab='side';UI.sel=null;render();scrollTo(0,0)}sbBoot()}
document.addEventListener('click',e=>{const a=e.target.closest('[data-a="sbAlbum"]');if(!a)return;e.stopImmediatePropagation();sbGo();SBV.api.album()},true);
// 场边通知（shared/side/0090）用的两处：通知弹层开着就重画；点开 → 场边那条发布
function sbNtfRedraw(){if($('#pop').classList.contains('show'))renderPop()}
function sbShow(id,rid){sbGo();SBV.api.open(id,rid)}

