  // 历史：Jason 60+ 场、Han 30 场（其中 12 场由 Han 组织）→ 演示长时间轴与游戏化
  const vids=Object.keys(VEN),others=['alex','sarah','david','chris','grace','tom','mia','leo'],times=['07:00','09:00','10:30','16:00','18:00','18:30','19:30'];
  for(let i=0;i<62;i++){const o=-2-Math.floor(i*4.6+rnd()*3),type=['singles','doubles','rally'][Math.floor(rnd()*3)],v=vids[Math.floor(rnd()*6)],t=times[Math.floor(rnd()*times.length)];
    const hostIsHan=i%5===0,host=hostIsHan?'han':others[Math.floor(rnd()*others.length)];const ppl=['jason'];if(!hostIsHan&&i%3===0&&CAP[type]>2)ppl.push('han');
    while(ppl.length<CAP[type]-1){const x=others[Math.floor(rnd()*others.length)];if(x!==host&&!ppl.includes(x))ppl.push(x)}
    add('h'+i,'H'+i,o,t,90,v,type,3.0,3.5,host,ppl,'')}
  for(let i=0;i<10;i++){const o=-5-i*9,v=vids[i%5];add('k'+i,'K'+i,o,'19:00',90,v,'singles',3.5,3.5,'han',['grace'],'')}
  PARTS.push({game_id:'g8',user_id:'grace',role:'player',status:'pending',message:'你好～我 3.0 偏上，双打站位没问题，住 Glen Iris 很近！',created_at:Date.now()-26*6e4});
  NOTIFS.push({id:1,user_id:'han',kind:'request',game_id:'g8',from:'grace',at:Date.now()-26*6e4,read:false});
  NOTIFS.push({id:2,user_id:'jason',kind:'approved',game_id:'g6',from:'tom',at:Date.now()-3*36e5,read:true});
  seedSocial();
  ME=null;LOC={label:CITY.center,lat:CITY.lat,lng:CITY.lng,source:'default',asked:false};PUSH={enabled:false};
  UI.sel=null;UI.tab='disc';UI.page=0;UI.exp=new Set();UI.pastShown=20;
}
const U=id=>USERS[id];
const myClubIds=()=>ME?ME.home_club_ids:[];
/* 屏蔽是双向不可见：任意一方屏蔽，对方的球局互相看不到，也不能申请 */
