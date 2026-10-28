/* ============================== 启动 ============================== */
(function tick(){const d=new Date();$('#clock').textContent=d.getHours()+':'+String(d.getMinutes()).padStart(2,'0');setTimeout(tick,3e4)})();
seed();ENV=detectEnv();setEnv(ENV);
const m=location.hash.match(/#\/g\/(\w+)/)||location.pathname.match(/\/g\/(\w+)/);
if(m){const g=GAMES.find(x=>x.share_code===m[1]);LOC.asked=true;go('disc');if(g)openDetail(g.id,true)}else if(!anRoute())go('disc');

// 安卓 Chrome 的「安装」事件：留着，引导页里一键触发（没有这个事件就走 ⋮ 菜单的步骤）
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();A2HS_EV=e});window.addEventListener('appinstalled',()=>{A2HS_EV=null});
