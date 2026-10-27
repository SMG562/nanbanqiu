/* ============================== 启动 ============================== */
(function tick(){const d=new Date();$('#clock').textContent=d.getHours()+':'+String(d.getMinutes()).padStart(2,'0');setTimeout(tick,3e4)})();
seed();ENV=detectEnv();setEnv(ENV);
const m=location.hash.match(/#\/g\/(\w+)/)||location.pathname.match(/\/g\/(\w+)/);
if(m){const g=GAMES.find(x=>x.share_code===m[1]);LOC.asked=true;go('disc');if(g)openDetail(g.id,true)}else if(!anRoute())go('disc');
