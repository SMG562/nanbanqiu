  try{if(location.protocol==='https:'&&navigator.sendBeacon)navigator.sendBeacon('/api/client-errors',JSON.stringify(e))}catch(_){}};
  addEventListener('error',ev=>{if(ev.message)rep(ev.message,ev.filename,ev.lineno)});addEventListener('unhandledrejection',ev=>rep('unhandled: '+((ev.reason&&ev.reason.message)||ev.reason),'',0))})();
