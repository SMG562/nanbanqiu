/* ===== 场边页：第一次打开时建 Shadow DOM，之后一直留着（滚动位置、草稿都保留） ===== */
let SBV=null;
function sbBoot(){if(SBV)return SBV;const host=$('#sbHost');if(!host)return null;const root=host.attachShadow({mode:'open'});
  root.innerHTML=`<style>${SB_CSS}</style>${SB_SVG}<div class="dev"></div>`;const el=root.querySelector('.dev');
  SBV=SB.App(el,{embed:true,live:true,first:2200,every:5200,home:'',bell:()=>go('notif')});
  // 盖在上面的（发布、照片、球场页、相册……）要盖住 App 的底栏
  const top=()=>$('#scr-side').classList.toggle('top',/\b(composing|sheeting|viewing|sharing|acting|incourt|inwall|inalbum)\b/.test(el.className));
  // 从「我的」进相册：相册里点返回，回到「我的」
  new MutationObserver(()=>{top();if(SBV.fromMe&&!el.classList.contains('inalbum')){SBV.fromMe=false;go('me')}}).observe(el,{attributes:true,attributeFilter:['class']});sbBadge();return SBV}
// 右上角消息：数字以发现页那个为准，其他页（含场边）跟着同步
function sbBadge(){const b=$('#nBadge');if(!b)return;$$('.nb-m').forEach(x=>{x.hidden=b.hidden;x.textContent=b.textContent});if(SBV)SBV.api.badge(b.hidden?0:b.textContent)}
new MutationObserver(sbBadge).observe($('#nBadge'),{attributes:true,attributeFilter:['hidden'],childList:true,characterData:true,subtree:true});
DEV.addEventListener('click',e=>{const a=e.target.closest('[data-a="nBack"],[data-a="sbAlbum"]');if(!a)return;e.stopImmediatePropagation();
  if(a.dataset.a==='nBack'){go(UI.back&&UI.back!=='notif'?UI.back:'disc');return}
  go('side');if(SBV){SBV.api.album();SBV.fromMe=true}},true);
sbBadge();

