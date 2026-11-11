/* ============================== 路由 ============================== */
function route(){if(anRoute())return;const m=location.hash.match(/#\/g\/(\w+)/)||location.pathname.match(/\/g\/(\w+)/);UI.landing=m?m[1]:null;render()}
seed();nbqBoot();if(/MicroMessenger/i.test(navigator.userAgent))document.body.classList.add('is-wechat');route();
