function stats(uid){const u=U(uid),b=u.base||{};
  const played=GAMES.filter(g=>g.status!=='cancelled'&&new Date(+new Date(g.starts_at)+g.duration_min*6e4)<NOW&&PARTS.some(p=>p.game_id===g.id&&p.user_id===uid&&p.status==='approved'));
  const hosted=played.filter(g=>g.host_id===uid&&PARTS.filter(p=>p.game_id===g.id&&p.status==='approved').length>=2);
  const s={played:(b.played||0)+played.length,hosted:(b.hosted||0)+hosted.length,kudos:b.kudos||0,streak:b.streak||0,invites:b.invites||0,
    night:(b.night||0)+played.filter(g=>new Date(g.starts_at).getHours()>=18).length,early:(b.early||0)+played.filter(g=>new Date(g.starts_at).getHours()<9).length,
    surfaces:Math.max(b.surfaces||0,new Set(played.map(g=>VEN[g.venue_id].surface).filter(x=>x!=='synthetic')).size),clubs:Math.max(b.clubs||0,new Set(played.map(g=>g.venue_id)).size)};
  const vc={};played.forEach(g=>vc[g.venue_id]=(vc[g.venue_id]||0)+1);s.topClub=Object.keys(vc).sort((a,b)=>vc[b]-vc[a])[0]||null;
  {const pc={};played.forEach(g=>PARTS.filter(p=>p.game_id===g.id&&p.status==='approved'&&p.user_id!==uid).forEach(p=>pc[p.user_id]=(pc[p.user_id]||0)+1));s.partner=Math.max(b.partner||0,...Object.values(pc),0)}
  journey(u,s);
