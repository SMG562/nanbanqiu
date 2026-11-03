  const vids=Object.keys(VEN),others=['alex','sarah','david','chris','grace','tom','mia','leo'],times=['07:00','09:00','10:30','16:00','18:00','18:30','19:30'];
  for(let i=0;i<62;i++){const o=-2-Math.floor(i*4.6+rnd()*3),type=['singles','doubles','rally'][Math.floor(rnd()*3)],v=vids[Math.floor(rnd()*6)],t=times[Math.floor(rnd()*times.length)];
    const hostIsHan=i%5===0,host=hostIsHan?'han':others[Math.floor(rnd()*others.length)];const ppl=['jason'];if(!hostIsHan&&i%3===0&&CAP[type]>2)ppl.push('han');
    while(ppl.length<CAP[type]-1){const x=others[Math.floor(rnd()*others.length)];if(x!==host&&!ppl.includes(x))ppl.push(x)}
    add('h'+i,'H'+i,o,t,90,v,type,3.0,3.5,host,ppl,'')}
  for(let i=0;i<10;i++)add('k'+i,'K'+i,-5-i*9,'19:00',90,vids[i%5],'singles',3.5,3.5,'han',['grace'],'');
  PARTS.push({game_id:'g8',user_id:'grace',role:'player',status:'pending',message:'你好～我 3.0 偏上，双打站位没问题，住 Glen Iris 很近！',created_at:Date.now()-26*6e4});
  NOTIFS.push({id:1,user_id:'han',kind:'request',game_id:'g8',from:'grace',at:Date.now()-26*6e4,read:false});
  NOTIFS.push({id:2,user_id:'jason',kind:'approved',game_id:'g6',from:'tom',at:Date.now()-3*36e5,read:true});
  seedSocial();
  ME=null;UI.day=0;UI.tab='disc';UI.mode='cal';UI.sel=null;UI.exp=new Set();UI.pastShown=20;
  LOC={label:CITY.center,lat:CITY.lat,lng:CITY.lng,source:'default',asked:false};PUSH={enabled:false};try{const s=JSON.parse(localStorage.getItem('nbq_loc')||'null');if(s&&s.city===CITY.slug&&isFinite(s.lat)&&isFinite(s.lng))LOC={label:String(s.label||CITY.center),lat:+s.lat,lng:+s.lng,source:s.source||'default',asked:true}}catch(e){}
}
const U=id=>USERS[id];
const myClubIds=()=>ME?(ME.home_club_ids||[]).filter(id=>VEN[id]):[];   // 已下线 / 读不到的球场不画（否则个人页直接报错）
