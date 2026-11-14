/* ============================== 启动 ============================== */
(function tick(){const d=new Date();$('#clock').textContent=d.getHours()+':'+String(d.getMinutes()).padStart(2,'0');setTimeout(tick,3e4)})();
seed();nbqBoot();ENV=detectEnv();setEnv(ENV);
const m=location.hash.match(/#\/g\/(\w+)/)||location.pathname.match(/\/g\/(\w+)/);
if(typeof NBQ_PUSH_N!=='undefined'&&NBQ_PUSH_N)LOC.asked=true;
try{if(sessionStorage.getItem('nbq_a2hs_go')==='1')LOC.asked=true}catch(_){}   // 刷新回来是为了接着看「添加到主屏幕」步骤页（#299，shared 0496 hoGuide）：这次不弹位置授权，免得盖住它   // 从推送打开：这次不弹位置授权，免得盖住要打开的会话 / 球局（同 #/g/、#/u/ 等链接路由；#203 开正式站引导条时 real_chat 发现）
if(m){const g=GAMES.find(x=>x.share_code===m[1]);LOC.asked=true;go('disc');if(g)openDetail(g.id,true)}else if(!anRoute())go('disc');

// 安卓 Chrome 的「安装」事件：留着，引导页里一键触发（没有这个事件就走 ⋮ 菜单的步骤）
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();A2HS_EV=e});window.addEventListener('appinstalled',()=>{A2HS_EV=null});
