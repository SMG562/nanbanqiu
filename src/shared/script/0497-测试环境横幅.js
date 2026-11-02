/* 测试环境横幅（11-03）：分支预览域名连的是测试库（nanbanqiu-staging），页面顶上固定一条细横幅，标签页标题加「【测试】」，
 * 免得把测试数据当成正式数据，也免得在正式站上误以为是测试。正式站和演示模式不显示。 */
(function(){if(typeof NBQ_ENV==='undefined'||NBQ_ENV!=='staging'||typeof document==='undefined')return;
  try{document.title='【测试】'+document.title}catch(_){}
  const add=()=>{if(document.getElementById('nbqEnvBar'))return;
    const d=document.createElement('div');d.id='nbqEnvBar';d.setAttribute('role','status');d.textContent='测试环境 · 数据是测试数据，不会影响正式用户';
    d.style.cssText='position:fixed;left:0;right:0;top:0;z-index:2147483000;height:18px;line-height:18px;font:600 11px/18px system-ui,sans-serif;text-align:center;color:#fff;background:#C2410C;pointer-events:none';
    (document.body||document.documentElement).appendChild(d)};
  if(document.body)add();else addEventListener('DOMContentLoaded',add)})();
