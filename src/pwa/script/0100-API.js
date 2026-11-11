/* ============================== API ============================== */
const F={radius:10,levels:new Set(),types:new Set()};
const api={
  // GET /api/games?date&lat&lng&radius_km(≤50)&levels&types&club_ids   —— 已排除屏蔽关系
  list(){housekeep();return capList(GAMES.filter(g=>g.status!=='cancelled'&&canSee(g)&&!(ME&&blockedPair(ME.id,g.host_id))).map(V).filter(c=>{const o=dOff(c.start);if(o<0||o>13)return false;
    if(c.dist>F.radius)return false;
    if(F.levels.size&&!bandHit(c))return false;if(!utrHit(c))return false;
    if(F.types.size&&!F.types.has(c.game_type))return false;if(!tagFilter(c))return false;return true}).sort((a,b)=>a.start-b.start))},
  get(id){return V(GAMES.find(g=>g.id===id))},
